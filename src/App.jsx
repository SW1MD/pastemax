import React, { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import FileList from "./components/FileList";
import CopyButton from "./components/CopyButton";
import WebBrowser from "./components/WebBrowser";
import ResizeHandle from "./components/ResizeHandle";
import { FileData } from "./types/FileTypes";

// Keys for localStorage
const STORAGE_KEYS = {
  SELECTED_FOLDER: "pastemax-selected-folder",
  SELECTED_FILES: "pastemax-selected-files",
  SORT_ORDER: "pastemax-sort-order",
  SEARCH_TERM: "pastemax-search-term",
  EXPANDED_NODES: "pastemax-expanded-nodes",
  BROWSER_VISIBLE: "pastemax-browser-visible",
  BROWSER_URL: "pastemax-browser-url",
};

const App = () => {
  // Load initial state from localStorage if available
  const savedFolder = localStorage.getItem(STORAGE_KEYS.SELECTED_FOLDER);
  const savedFiles = localStorage.getItem(STORAGE_KEYS.SELECTED_FILES);
  const savedSortOrder = localStorage.getItem(STORAGE_KEYS.SORT_ORDER);
  const savedSearchTerm = localStorage.getItem(STORAGE_KEYS.SEARCH_TERM);
  const savedBrowserVisible = localStorage.getItem(STORAGE_KEYS.BROWSER_VISIBLE);
  const savedBrowserUrl = localStorage.getItem(STORAGE_KEYS.BROWSER_URL);

  const [selectedFolder, setSelectedFolder] = useState(savedFolder);
  const [allFiles, setAllFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(
    savedFiles ? JSON.parse(savedFiles) : []
  );
  const [sortOrder, setSortOrder] = useState(savedSortOrder || "tokens-desc");
  const [searchTerm, setSearchTerm] = useState(savedSearchTerm || "");
  const [expandedNodes, setExpandedNodes] = useState({});
  const [displayedFiles, setDisplayedFiles] = useState([]);
  const [copyStatus, setCopyStatus] = useState(false);
  const [processingStatus, setProcessingStatus] = useState({
    status: "idle",
    message: ""
  });
  // Add viewedFile state to track which file is being viewed in the editor
  const [viewedFile, setViewedFile] = useState(null);

  // State for sort dropdown
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // Add new state for browser
  const [browserVisible, setBrowserVisible] = useState(false);
  const [browserUrl, setBrowserUrl] = useState(
    savedBrowserUrl || "https://www.google.com"
  );

  // Check if we're running in Electron or browser environment
  const isElectron = window.electron !== undefined;

  // Load expanded nodes state from localStorage
  useEffect(() => {
    const savedExpandedNodes = localStorage.getItem(
      STORAGE_KEYS.EXPANDED_NODES
    );
    if (savedExpandedNodes) {
      try {
        setExpandedNodes(JSON.parse(savedExpandedNodes));
      } catch (error) {
        console.error("Error parsing saved expanded nodes:", error);
      }
    }
  }, []);

  // Persist selected folder when it changes
  useEffect(() => {
    if (selectedFolder) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_FOLDER, selectedFolder);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_FOLDER);
    }
  }, [selectedFolder]);

  // Persist selected files when they change
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.SELECTED_FILES,
      JSON.stringify(selectedFiles)
    );
  }, [selectedFiles]);

  // Persist sort order when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SORT_ORDER, sortOrder);
  }, [sortOrder]);

  // Persist search term when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SEARCH_TERM, searchTerm);
  }, [searchTerm]);

  // Load initial data from saved folder
  useEffect(() => {
    if (!isElectron || !selectedFolder) return;

    // Use a flag in sessionStorage to ensure we only load data once per session
    const hasLoadedInitialData = sessionStorage.getItem("hasLoadedInitialData");
    if (hasLoadedInitialData === "true") return;

    console.log("Loading saved folder on startup:", selectedFolder);
    setProcessingStatus({
      status: "processing",
      message: "Loading files from previously selected folder..."
    });
    window.electron.ipcRenderer.send("request-file-list", selectedFolder);

    // Mark that we've loaded the initial data
    sessionStorage.setItem("hasLoadedInitialData", "true");
  }, [isElectron, selectedFolder]);

  // Listen for folder selection from main process
  useEffect(() => {
    if (!isElectron) {
      console.warn("Not running in Electron environment");
      return;
    }

    const handleFolderSelected = (folderPath) => {
      // Check if folderPath is valid string
      if (typeof folderPath === "string") {
        console.log("Folder selected:", folderPath);
        setSelectedFolder(folderPath);
        // We'll select all files after they're loaded
        setSelectedFiles([]);
        setProcessingStatus({
          status: "processing",
          message: "Requesting file list..."
        });
        window.electron.ipcRenderer.send("request-file-list", folderPath);
      } else {
        console.error("Invalid folder path received:", folderPath);
        setProcessingStatus({
          status: "error",
          message: "Invalid folder path received"
        });
      }
    };

    const handleFileListData = (files) => {
      console.log("Received file list data:", files.length, "files");
      setAllFiles(files);
      setProcessingStatus({
        status: "complete",
        message: `Loaded ${files.length} files`
      });

      // Apply filters and sort to the new files
      applyFiltersAndSort(files, sortOrder, searchTerm);

      // Select only files that are not binary, not skipped, and not excluded by default
      const selectablePaths = files
        .filter(
          (file) =>
            !file.isBinary && !file.isSkipped && !file.excludedByDefault
        )
        .map((file) => file.path);

      setSelectedFiles(selectablePaths);
    };

    const handleProcessingStatus = (status) => {
      console.log("Processing status:", status);
      setProcessingStatus(status);
    };

    const handleFileSaved = (result) => {
      if (result.success) {
        console.log("File saved successfully:", result.path);
        // Optionally show a success message
      } else {
        console.error("Error saving file:", result.error);
        // Show an error message
        setProcessingStatus({
          status: "error",
          message: "Error saving file: " + result.error
        });
      }
    };

    window.electron.ipcRenderer.on("folder-selected", handleFolderSelected);
    window.electron.ipcRenderer.on("file-list-data", handleFileListData);
    window.electron.ipcRenderer.on(
      "file-processing-status",
      handleProcessingStatus
    );
    window.electron.ipcRenderer.on("file-saved", handleFileSaved);

    return () => {
      window.electron.ipcRenderer.removeListener(
        "folder-selected",
        handleFolderSelected
      );
      window.electron.ipcRenderer.removeListener(
        "file-list-data",
        handleFileListData
      );
      window.electron.ipcRenderer.removeListener(
        "file-processing-status",
        handleProcessingStatus
      );
      window.electron.ipcRenderer.removeListener(
        "file-saved",
        handleFileSaved
      );
    };
  }, [isElectron, sortOrder, searchTerm]);

  const openFolder = () => {
    if (isElectron) {
      console.log("Opening folder dialog");
      setProcessingStatus({ status: "idle", message: "Select a folder..." });
      window.electron.ipcRenderer.send("open-folder");
    } else {
      console.warn("Folder selection not available in browser");
    }
  };

  // Apply filters and sorting to files
  const applyFiltersAndSort = (files, sort, filter) => {
    let filtered = files;

    // Apply filter
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      filtered = files.filter(
        (file) =>
          file.name.toLowerCase().includes(lowerFilter) ||
          file.path.toLowerCase().includes(lowerFilter)
      );
    }

    // Apply sort
    const [sortKey, sortDir] = sort.split("-");
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortKey === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortKey === "tokens") {
        comparison = a.tokenCount - b.tokenCount;
      } else if (sortKey === "size") {
        comparison = a.size - b.size;
      }

      return sortDir === "asc" ? comparison : -comparison;
    });

    setDisplayedFiles(sorted);
  };

  // Toggle file selection
  const toggleFileSelection = (filePath) => {
    setSelectedFiles((prev) => {
      if (prev.includes(filePath)) {
        return prev.filter((path) => path !== filePath);
      } else {
        return [...prev, filePath];
      }
    });
  };

  // Toggle folder selection (select/deselect all files in folder)
  const toggleFolderSelection = (folderPath, isSelected) => {
    const filesInFolder = allFiles.filter(
      (file) =>
        file.path.startsWith(folderPath) && !file.isBinary && !file.isSkipped
    );

    if (isSelected) {
      // Add all files from this folder that aren't already selected
      const filePaths = filesInFolder.map((file) => file.path);
      setSelectedFiles((prev) => {
        const newSelection = [...prev];
        filePaths.forEach((path) => {
          if (!newSelection.includes(path)) {
            newSelection.push(path);
          }
        });
        return newSelection;
      });
    } else {
      // Remove all files from this folder
      setSelectedFiles((prev) =>
        prev.filter(
          (path) => !filesInFolder.some((file) => file.path === path)
        )
      );
    }
  };

  // Handle sort change
  const handleSortChange = (newSort) => {
    setSortOrder(newSort);
    applyFiltersAndSort(allFiles, newSort, searchTerm);
    setSortDropdownOpen(false); // Close dropdown after selection
  };

  // Handle search change
  const handleSearchChange = (newSearch) => {
    setSearchTerm(newSearch);
    applyFiltersAndSort(allFiles, sortOrder, newSearch);
  };

  // Toggle sort dropdown
  const toggleSortDropdown = () => {
    setSortDropdownOpen(!sortDropdownOpen);
  };

  // Calculate total tokens from selected files
  const calculateTotalTokens = () => {
    return selectedFiles.reduce((total, path) => {
      const file = allFiles.find((f) => f.path === path);
      return total + (file ? file.tokenCount : 0);
    }, 0);
  };

  // Concatenate selected files content for copying
  const getSelectedFilesContent = () => {
    // Sort selected files according to current sort order
    const [sortKey, sortDir] = sortOrder.split("-");
    const sortedSelected = allFiles
      .filter((file) => selectedFiles.includes(file.path))
      .sort((a, b) => {
        let comparison = 0;

        if (sortKey === "name") {
          comparison = a.name.localeCompare(b.name);
        } else if (sortKey === "tokens") {
          comparison = a.tokenCount - b.tokenCount;
        } else if (sortKey === "size") {
          comparison = a.size - b.size;
        }

        return sortDir === "asc" ? comparison : -comparison;
      });

    if (sortedSelected.length === 0) {
      return "No files selected.";
    }

    let concatenatedString = "";
    sortedSelected.forEach((file) => {
      concatenatedString += `\n\n// ---- File: ${file.name} ----\n\n`;
      concatenatedString += file.content;
    });

    return concatenatedString;
  };

  // Handle select all files
  const selectAllFiles = () => {
    const selectablePaths = displayedFiles
      .filter((file) => !file.isBinary && !file.isSkipped)
      .map((file) => file.path);

    setSelectedFiles((prev) => {
      const newSelection = [...prev];
      selectablePaths.forEach((path) => {
        if (!newSelection.includes(path)) {
          newSelection.push(path);
        }
      });
      return newSelection;
    });
  };

  // Handle deselect all files
  const deselectAllFiles = () => {
    const displayedPaths = displayedFiles.map((file) => file.path);
    setSelectedFiles((prev) =>
      prev.filter((path) => !displayedPaths.includes(path))
    );
  };

  // Sort options for the dropdown
  const sortOptions = [
    { value: "tokens-desc", label: "Tokens: High to Low" },
    { value: "tokens-asc", label: "Tokens: Low to High" },
    { value: "name-asc", label: "Name: A to Z" },
    { value: "name-desc", label: "Name: Z to A" },
  ];

  // Handle expand/collapse state changes
  const toggleExpanded = (nodeId) => {
    setExpandedNodes((prev) => {
      const newState = {
        ...prev,
        [nodeId]: prev[nodeId] === undefined ? false : !prev[nodeId],
      };

      // Save to localStorage
      localStorage.setItem(
        STORAGE_KEYS.EXPANDED_NODES,
        JSON.stringify(newState)
      );

      return newState;
    });
  };

  // Update localStorage when browser state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BROWSER_VISIBLE, browserVisible.toString());
  }, [browserVisible]);

  useEffect(() => {
    if (browserUrl) {
      localStorage.setItem(STORAGE_KEYS.BROWSER_URL, browserUrl);
    }
  }, [browserUrl]);

  // Toggle browser visibility
  const toggleBrowser = () => {
    setBrowserVisible(!browserVisible);
  };

  // Update browser URL
  const handleBrowserUrlChange = (newUrl) => {
    setBrowserUrl(newUrl);
  };

  // Add reference for the container and state for panel sizes
  const splitContainerRef = useRef(null);
  const resizeHandleRef = useRef(null);
  const [panelSizes, setPanelSizes] = useState({
    pastemax: 50, // Default to 50% width
    browser: 50   // Default to 50% width
  });
  const [isResizing, setIsResizing] = useState(false);
  const pasteSizeRef = useRef(50); // Keep reference to avoid stale closures

  // Memoize handlers to avoid recreation on each render
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    document.body.classList.add('resizing');
    setIsResizing(true);
    pasteSizeRef.current = panelSizes.pastemax;
    
    // Capture the initial position of the mouse/touch and handle
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    resizeHandleRef.current = {
      startX: clientX,
      startPasteMaxWidth: pasteSizeRef.current
    };
  }, [panelSizes.pastemax]);

  const handleResizeMove = useCallback((e) => {
    if (!isResizing || !splitContainerRef.current || !resizeHandleRef.current) return;
    
    // Get the container and its width
    const container = splitContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    
    // Calculate the change in position
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - resizeHandleRef.current.startX;
    const deltaPercent = (deltaX / containerWidth) * 100;
    
    // Calculate new width percentages
    const minWidth = 20; // Minimum 20% width for each panel
    let pasteMaxPercent = resizeHandleRef.current.startPasteMaxWidth + deltaPercent;
    
    // Enforce minimum widths
    pasteMaxPercent = Math.max(minWidth, Math.min(pasteMaxPercent, 100 - minWidth));
    
    // Update the width with the calculated value
    pasteSizeRef.current = pasteMaxPercent;
    
    // Use requestAnimationFrame to throttle updates for better performance
    requestAnimationFrame(() => {
      setPanelSizes({
        pastemax: pasteMaxPercent,
        browser: 100 - pasteMaxPercent
      });
    });
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    document.body.classList.remove('resizing');
    setIsResizing(false);
    resizeHandleRef.current = null;
  }, []);

  // Set up event listeners for resize more efficiently
  useEffect(() => {
    const handleMoveEvent = (e) => {
      if (isResizing) {
        e.preventDefault();
        handleResizeMove(e);
      }
    };
    
    const handleEndEvent = () => {
      if (isResizing) {
        handleResizeEnd();
      }
    };
    
    if (isResizing) {
      // Mouse events
      window.addEventListener('mousemove', handleMoveEvent, { passive: false });
      window.addEventListener('mouseup', handleEndEvent);
      
      // Touch events for mobile
      window.addEventListener('touchmove', handleMoveEvent, { passive: false });
      window.addEventListener('touchend', handleEndEvent);
      window.addEventListener('touchcancel', handleEndEvent);
      
      // Also handle cases where mouse leaves the window
      window.addEventListener('mouseleave', handleEndEvent);
    }
    
    return () => {
      // Clean up all event listeners
      window.removeEventListener('mousemove', handleMoveEvent);
      window.removeEventListener('mouseup', handleEndEvent);
      window.removeEventListener('mouseleave', handleEndEvent);
      window.removeEventListener('touchmove', handleMoveEvent);
      window.removeEventListener('touchend', handleEndEvent);
      window.removeEventListener('touchcancel', handleEndEvent);
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Save panel sizes in localStorage when they change
  useEffect(() => {
    if (!isResizing) {
      localStorage.setItem('pastemax-panel-sizes', JSON.stringify(panelSizes));
    }
  }, [panelSizes, isResizing]);
  
  // Load saved panel sizes on initial render
  useEffect(() => {
    const savedSizes = localStorage.getItem('pastemax-panel-sizes');
    if (savedSizes) {
      try {
        const parsedSizes = JSON.parse(savedSizes);
        setPanelSizes(parsedSizes);
        pasteSizeRef.current = parsedSizes.pastemax;
      } catch (e) {
        console.error('Error parsing saved panel sizes', e);
      }
    }
  }, []);

  return (
    <div className="app-container">
      <div className="header">
        <h1>PasteMax</h1>
        <div className="folder-info">
          {selectedFolder ? (
            <div className="selected-folder">{selectedFolder}</div>
          ) : (
            <span>No folder selected</span>
          )}
          <button
            className="select-folder-btn"
            onClick={openFolder}
            disabled={processingStatus.status === "processing"}
          >
            Select Folder
          </button>
          <button
            className={`toggle-browser-btn ${browserVisible ? 'active' : ''}`}
            onClick={toggleBrowser}
            title={browserVisible ? "Hide Browser" : "Show Browser"}
          >
            {browserVisible ? "Hide Browser" : "Show Browser"}
          </button>
        </div>
      </div>

      {processingStatus.status === "processing" && (
        <div className="processing-indicator">
          <div className="spinner"></div>
          <span>{processingStatus.message}</span>
        </div>
      )}

      {processingStatus.status === "error" && (
        <div className="error-message">Error: {processingStatus.message}</div>
      )}

      {selectedFolder && (
        <div 
          className={`main-content ${browserVisible ? 'split-view' : ''}`}
          ref={splitContainerRef}
        >
          <div 
            className={`pastemax-container ${!browserVisible ? 'full-width' : ''}`}
            style={browserVisible ? { width: `${panelSizes.pastemax}%` } : {}}
          >
            <Sidebar
              selectedFolder={selectedFolder}
              openFolder={openFolder}
              allFiles={allFiles}
              selectedFiles={selectedFiles}
              toggleFileSelection={toggleFileSelection}
              toggleFolderSelection={toggleFolderSelection}
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              selectAllFiles={selectAllFiles}
              deselectAllFiles={deselectAllFiles}
              expandedNodes={expandedNodes}
              toggleExpanded={toggleExpanded}
            />
            <div className="content-area">
              <div className="content-header">
                <div className="content-title">
                  {viewedFile ? "Viewing File" : "Selected Files"}
                </div>
                <div className="content-actions">
                  {!viewedFile && (
                    <>
                      <div className="sort-dropdown">
                        <button
                          className="sort-dropdown-button"
                          onClick={toggleSortDropdown}
                        >
                          Sort:{" "}
                          {sortOptions.find((opt) => opt.value === sortOrder)
                            ?.label || sortOrder}
                        </button>
                        {sortDropdownOpen && (
                          <div className="sort-options">
                            {sortOptions.map((option) => (
                              <div
                                key={option.value}
                                className={`sort-option ${
                                  sortOrder === option.value ? "active" : ""
                                }`}
                                onClick={() => handleSortChange(option.value)}
                              >
                                {option.label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="file-stats">
                        {selectedFiles.length} files | ~
                        {calculateTotalTokens().toLocaleString()} tokens
                      </div>
                    </>
                  )}
                </div>
              </div>

              <FileList
                files={displayedFiles}
                selectedFiles={selectedFiles}
                toggleFileSelection={toggleFileSelection}
                viewedFile={viewedFile}
                onViewFile={(file) => setViewedFile(file)}
                onCloseView={() => setViewedFile(null)}
              />

              {!viewedFile && (
                <div className="copy-button-container">
                  <CopyButton
                    text={getSelectedFilesContent()}
                    className="primary full-width"
                  >
                    <span>COPY ALL SELECTED ({selectedFiles.length} files)</span>
                  </CopyButton>
                </div>
              )}
            </div>
          </div>
          
          {browserVisible && (
            <>
              <ResizeHandle onResizeStart={handleResizeStart} />
              
              <div 
                className="browser-container"
                style={{ width: `${panelSizes.browser}%` }}
              >
                <WebBrowser 
                  initialUrl={browserUrl}
                  onUrlChange={handleBrowserUrlChange}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default App; 