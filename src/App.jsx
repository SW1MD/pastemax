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
  PROBLEM_HIGHLIGHT: "pastemax-problem-highlight",
  VIEW_MODE: "pastemax-view-mode",
  THEME_MODE: "pastemax-theme-mode",
  TOKEN_WARNING_LIMIT: "pastemax-token-warning-limit",
};

const App = () => {
  // Load initial state from localStorage if available
  const savedFolder = localStorage.getItem(STORAGE_KEYS.SELECTED_FOLDER);
  const savedFiles = localStorage.getItem(STORAGE_KEYS.SELECTED_FILES);
  const savedSortOrder = localStorage.getItem(STORAGE_KEYS.SORT_ORDER);
  const savedSearchTerm = localStorage.getItem(STORAGE_KEYS.SEARCH_TERM);
  const savedBrowserVisible = localStorage.getItem(STORAGE_KEYS.BROWSER_VISIBLE);
  const savedBrowserUrl = localStorage.getItem(STORAGE_KEYS.BROWSER_URL);
  const savedProblemHighlight = localStorage.getItem(STORAGE_KEYS.PROBLEM_HIGHLIGHT);
  const savedViewMode = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
  const savedThemeMode = localStorage.getItem(STORAGE_KEYS.THEME_MODE);
  const savedTokenWarningLimit = localStorage.getItem(STORAGE_KEYS.TOKEN_WARNING_LIMIT);

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
  const [viewedFile, setViewedFile] = useState(null);
  const [viewMode, setViewMode] = useState(savedViewMode || "selected-files");
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);

  // State for sort dropdown
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // Add new state for browser
  const [browserVisible, setBrowserVisible] = useState(false);
  const [browserUrl, setBrowserUrl] = useState(
    window.electron 
      ? "file://" + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + "/browser-home.html"
      : "/browser-home.html"
  );
  const [problemHighlightingActive, setProblemHighlightingActive] = useState(
    savedProblemHighlight === "true"
  );

  // Add state for sidebar collapse
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Add state for active page
  const [activePage, setActivePage] = useState("select");

  // Add state for theme mode and token warning limit
  const [themeMode, setThemeMode] = useState(savedThemeMode || "dark");
  const [tokenWarningLimit, setTokenWarningLimit] = useState(
    savedTokenWarningLimit ? parseInt(savedTokenWarningLimit) : 4000
  );
  const [showTokenWarning, setShowTokenWarning] = useState(false);

  // Check if we're running in Electron or browser environment
  const isElectron = window.electron !== undefined;

  // Apply theme on initial load
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
  }, []);

  // Update theme when it changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
  }, [themeMode]);

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
    const newState = !browserVisible;
    setBrowserVisible(newState);
    localStorage.setItem(STORAGE_KEYS.BROWSER_VISIBLE, String(newState));
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

  // Toggle problem highlighting
  const toggleProblemHighlighting = () => {
    const newState = !problemHighlightingActive;
    setProblemHighlightingActive(newState);
    localStorage.setItem(STORAGE_KEYS.PROBLEM_HIGHLIGHT, newState.toString());
  };

  // Toggle theme mode between light and dark
  const toggleThemeMode = () => {
    const newTheme = themeMode === "dark" ? "light" : "dark";
    setThemeMode(newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  // Set token warning limit
  const setTokenWarningThreshold = (limit) => {
    const newLimit = parseInt(limit);
    if (!isNaN(newLimit) && newLimit > 0) {
      setTokenWarningLimit(newLimit);
      localStorage.setItem(STORAGE_KEYS.TOKEN_WARNING_LIMIT, newLimit.toString());
    }
  };

  // Check if token count exceeds warning limit
  const checkTokenWarning = useCallback(() => {
    const totalTokens = calculateTotalTokens();
    const isNearLimit = totalTokens > tokenWarningLimit * 0.9;
    const isOverLimit = totalTokens > tokenWarningLimit;
    
    if (isOverLimit || isNearLimit) {
      setShowTokenWarning(true);
    } else {
      setShowTokenWarning(false);
    }
  }, [tokenWarningLimit]);

  // Check token warning when selected files change
  useEffect(() => {
    if (selectedFiles.length > 0) {
      checkTokenWarning();
    } else {
      setShowTokenWarning(false);
    }
  }, [selectedFiles, checkTokenWarning]);

  // Clear browser visibility and URL in localStorage on load
  useEffect(() => {
    localStorage.removeItem(STORAGE_KEYS.BROWSER_URL);
    localStorage.setItem(STORAGE_KEYS.BROWSER_VISIBLE, "false");
  }, []);

  // Toggle sidebar collapse
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Toggle view mode between selected files and file browser
  const toggleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
    setViewDropdownOpen(false);
  };

  // Toggle view dropdown
  const toggleViewDropdown = () => {
    setViewDropdownOpen(!viewDropdownOpen);
    // Close sort dropdown if open
    if (sortDropdownOpen) {
      setSortDropdownOpen(false);
    }
  };

  // Build file tree structure from flat list of files
  const buildFileTree = () => {
    if (allFiles.length === 0) {
      return [];
    }

    try {
      // Create a structured representation using nested objects first
      const fileMap = {};

      // First pass: create directories and files
      allFiles.forEach((file) => {
        if (!file.path) return;

        const relativePath =
          selectedFolder && file.path.startsWith(selectedFolder)
            ? file.path
                .substring(selectedFolder.length)
                .replace(/^\/|^\\/, "")
            : file.path;

        const parts = relativePath.split(/[/\\]/);
        let currentPath = "";
        let current = fileMap;

        // Build the path in the tree
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (!part) continue;

          currentPath = currentPath ? `${currentPath}/${part}` : part;
          const fullPath = selectedFolder
            ? `${selectedFolder}/${currentPath}`
            : currentPath;

          if (i === parts.length - 1) {
            // This is a file
            current[part] = {
              id: `node-${fullPath}`,
              name: part,
              path: fullPath,
              type: "file",
              level: i,
              fileData: file,
            };
          } else {
            // This is a directory
            if (!current[part]) {
              current[part] = {
                id: `node-${fullPath}`,
                name: part,
                path: fullPath,
                type: "directory",
                level: i,
                children: {},
              };
            }
            current = current[part].children;
          }
        }
      });

      // Convert the nested object structure to the TreeNode array format
      const convertToTreeNodes = (node, level = 0) => {
        return Object.keys(node).map((key) => {
          const item = node[key];

          if (item.type === "file") {
            return item;
          } else {
            const children = convertToTreeNodes(item.children, level + 1);
            const isExpanded = expandedNodes[item.id] !== undefined
              ? expandedNodes[item.id]
              : true; // Default to expanded if not in state

            return {
              ...item,
              children: children.sort((a, b) => {
                // Sort directories first
                if (a.type === "directory" && b.type === "file") return -1;
                if (a.type === "file" && b.type === "directory") return 1;

                // Sort files by token count (largest first)
                if (a.type === "file" && b.type === "file") {
                  const aTokens = a.fileData?.tokenCount || 0;
                  const bTokens = b.fileData?.tokenCount || 0;
                  return bTokens - aTokens;
                }

                // Default to alphabetical
                return a.name.localeCompare(b.name);
              }),
              isExpanded,
            };
          }
        });
      };

      // Convert to proper tree structure
      const treeRoots = convertToTreeNodes(fileMap);

      // Sort the top level (directories first, then by name)
      return treeRoots.sort((a, b) => {
        if (a.type === "directory" && b.type === "file") return -1;
        if (a.type === "file" && b.type === "directory") return 1;

        // Sort files by token count (largest first)
        if (a.type === "file" && b.type === "file") {
          const aTokens = a.fileData?.tokenCount || 0;
          const bTokens = b.fileData?.tokenCount || 0;
          return bTokens - aTokens;
        }

        return a.name.localeCompare(b.name);
      });
    } catch (err) {
      console.error("Error building file tree:", err);
      return [];
    }
  };

  // Add state for new file/folder creation
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [currentDirectory, setCurrentDirectory] = useState("");
  const [createItemError, setCreateItemError] = useState("");

  // Add handlers for file/folder creation
  const handleCreateFile = () => {
    if (!newFileName.trim()) {
      setCreateItemError("File name cannot be empty");
      return;
    }

    setCreateItemError("");
    
    if (isElectron) {
      window.electron.ipcRenderer.send("create-file", {
        folderPath: currentDirectory || selectedFolder,
        fileName: newFileName
      });
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      setCreateItemError("Folder name cannot be empty");
      return;
    }

    setCreateItemError("");
    
    if (isElectron) {
      window.electron.ipcRenderer.send("create-folder", {
        folderPath: currentDirectory || selectedFolder,
        folderName: newFolderName
      });
    }
  };

  // Add effect to listen for file/folder creation responses
  useEffect(() => {
    if (!isElectron) return;

    const handleFileCreated = (result) => {
      if (result.success) {
        console.log("File created successfully:", result.file);
        setShowNewFileDialog(false);
        setNewFileName("");
        
        // Add the new file to allFiles
        setAllFiles(prevFiles => [...prevFiles, result.file]);
        
        // Refresh the file list
        window.electron.ipcRenderer.send("request-file-list", selectedFolder);
      } else {
        console.error("Error creating file:", result.error);
        setCreateItemError(result.error);
      }
    };

    const handleFolderCreated = (result) => {
      if (result.success) {
        console.log("Folder created successfully:", result.path);
        setShowNewFolderDialog(false);
        setNewFolderName("");
        
        // Refresh the file list
        window.electron.ipcRenderer.send("request-file-list", selectedFolder);
      } else {
        console.error("Error creating folder:", result.error);
        setCreateItemError(result.error);
      }
    };

    window.electron.ipcRenderer.on("file-created", handleFileCreated);
    window.electron.ipcRenderer.on("folder-created", handleFolderCreated);

    return () => {
      window.electron.ipcRenderer.removeListener("file-created", handleFileCreated);
      window.electron.ipcRenderer.removeListener("folder-created", handleFolderCreated);
    };
  }, [isElectron, selectedFolder]);

  // Update the renderFileTreeNode function to use better icons
  const renderFileTreeNode = (node) => {
    const isDirectory = node.type === "directory";
    const isSelected = selectedFiles.includes(node.path);
    
    // Function to get file icon based on extension
    const getFileIcon = (fileName) => {
      const extension = fileName.split('.').pop().toLowerCase();
      
      // Map of file extensions to icons
      const iconMap = {
        js: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z"/>
          </svg>
        ),
        jsx: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14h2v2h-2v-2zm0-10h2v8h-2V6z" />
          </svg>
        ),
        ts: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"/>
          </svg>
        ),
        tsx: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"/>
          </svg>
        ),
        css: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.565-2.438L1.5 0zm17.09 4.413L5.41 4.41l.213 2.622 10.125.002-.255 2.716h-6.64l.24 2.573h6.182l-.366 3.523-2.91.804-2.956-.81-.188-2.11h-2.61l.29 3.855L12 19.288l5.373-1.53L18.59 4.414v-.001z"/>
          </svg>
        ),
        html: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm7.031 9.75l-.232-2.718 10.059.003.23-2.622L5.412 4.41l.698 8.01h9.126l-.326 3.426-2.91.804-2.955-.81-.188-2.11H6.248l.33 4.171L12 19.351l5.379-1.443.744-8.157H8.531z"/>
          </svg>
        ),
        json: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12.043 23.968c.479-.004.953-.029 1.426-.094a11.805 11.805 0 003.146-.863 12.404 12.404 0 003.793-2.542 11.977 11.977 0 002.44-3.427 11.794 11.794 0 001.02-3.476c.149-1.16.135-2.346-.045-3.499a11.96 11.96 0 00-.793-2.788 11.197 11.197 0 00-.854-1.617c-1.168-1.837-2.861-3.314-4.81-4.3a12.835 12.835 0 00-2.172-.87h-.005c.119.063.24.132.24.345.201.074.239.146.351.351.225a8.93 8.93 0 011.559 1.33c1.063 1.145 1.797 2.548 2.218 4.041.284.982.434 1.998.495 3.017.044.743.044 1.491-.047 2.229-.149 1.27-.554 2.51-1.228 3.596a7.475 7.475 0 01-1.903 2.084c-1.244.928-2.877 1.482-4.436 1.114a3.916 3.916 0 01-.748-.258 4.692 4.692 0 01-.779-.45 6.08 6.08 0 01-1.244-1.105 6.507 6.507 0 01-1.049-1.747 7.366 7.366 0 01-.494-2.54c-.03-1.273.225-2.553.854-3.67a6.43 6.43 0 011.663-1.918c.225-.178.464-.333.704-.479l.016-.007a5.121 5.121 0 00-1.441-.12 4.963 4.963 0 00-1.228.24c-.359.12-.704.27-1.019.45-.315.18-.614.39-.898.63-.765.66-1.383 1.5-1.732 2.43a5.51 5.51 0 00-.3 1.242c-.045.346-.06.698-.044 1.049.03.698.194 1.388.465 2.022.255.634.614 1.215 1.049 1.049 1.721a6.306 6.306 0 003.656 2.022c.42.075.854.12 1.273.135.195 0 .39-.044.585-.044 1.305-.09 2.579-.48 3.716-1.138a8.114 8.114 0 001.333-1.034 7.874 7.874 0 001.138-1.336c.149-.227.285-.45.405-.689.225-.406.405-.826.54-1.259a7.8 7.8 0 00.33-1.499c.045-.272.045-.556.06-.823 0-.15 0-.3-.015-.45a10.641 10.641 0 00-.299-2.022 10.537 10.537 0 00-.958-2.55c-.42-.824-.944-1.56-1.56-2.235a8.363 8.363 0 00-1.349-1.229 6.917 6.917 0 00-1.499-.914c-.136-.06-.271-.136-.419-.196l.015.016c1.049.48 2.007 1.143 2.877 1.928.854.779.779.779 1.604 1.692 2.112 2.699.51 1.004.854 2.097.958 3.236.06.779.045 1.558-.044 2.322a9.897 9.897 0 01-.689 2.548c-.329.914-.779 1.772-1.348 2.519-.899 1.199-2.098 2.112-3.476 2.609-.196.074-.404.15-.6.209z"/>
          </svg>
        ),
        md: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M22.27 19.385H1.73A1.73 1.73 0 010 17.655V6.345a1.73 1.73 0 011.73-1.73h20.54A1.73 1.73 0 0124 6.345v11.308a1.73 1.73 0 01-1.73 1.731zM5.769 15.923v-4.5l2.308 2.885 2.307-2.885v4.5h2.308V8.078h-2.308l-2.307 2.885-2.308-2.885H3.46v7.847zM21.232 12h-2.309V8.077h-2.307V12h-2.308l3.461 4.039z"/>
          </svg>
        ),
        // Add more file types as needed
      };
      
      // Return the icon for the file type or a default icon
      return iconMap[extension] || (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z"></path>
        </svg>
      );
    };
    
    // Get folder icon based on expanded state
    const getFolderIcon = (isExpanded) => {
      return isExpanded ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z"></path>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          <line x1="12" y1="11" x2="12" y2="17"></line>
          <line x1="9" y1="14" x2="15" y2="14"></line>
        </svg>
      );
    };
    
    return (
      <div key={node.id} className="file-browser-node">
        <div 
          className={`file-browser-item ${isDirectory ? 'directory' : 'file'} ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${node.level * 16 + 4}px` }}
          onClick={() => {
            if (isDirectory) {
              toggleFolderSelection(node.path, !isSelected);
              setCurrentDirectory(node.path);
            } else {
              toggleFileSelection(node.path);
            }
          }}
          onDoubleClick={() => !isDirectory && node.fileData && setViewedFile(node.fileData)}
        >
          {isDirectory && (
            <div className="file-browser-item-icon">
              <span 
                className={`directory-icon ${node.isExpanded ? 'expanded' : 'collapsed'}`} 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(node.id);
                }}
              >
                {node.isExpanded ? '▼' : '►'}
              </span>
            </div>
          )}
          <div className="file-browser-item-icon">
            {isDirectory 
              ? getFolderIcon(node.isExpanded)
              : getFileIcon(node.name)
            }
          </div>
          <div className="file-browser-item-name">{node.name}</div>
          {!isDirectory && node.fileData && (
            <div className="file-browser-item-tokens">{node.fileData.tokenCount.toLocaleString()}</div>
          )}
        </div>
        
        {isDirectory && node.isExpanded && node.children && (
          <div className="file-browser-children">
            {node.children.map(child => renderFileTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  // Update the file browser container to include new file/folder buttons
  const renderFileBrowser = () => (
    <div className="file-browser-container">
      <div className="file-browser-actions">
        <button 
          className="file-browser-action-btn"
          title="New File"
          onClick={() => {
            setShowNewFileDialog(true);
            setShowNewFolderDialog(false);
            setCreateItemError("");
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
        </button>
        <button 
          className="file-browser-action-btn"
          title="New Folder"
          onClick={() => {
            setShowNewFolderDialog(true);
            setShowNewFileDialog(false);
            setCreateItemError("");
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            <line x1="12" y1="11" x2="12" y2="17"></line>
            <line x1="9" y1="14" x2="15" y2="14"></line>
          </svg>
        </button>
        <button 
          className="file-browser-action-btn"
          title="Refresh"
          onClick={() => {
            if (isElectron && selectedFolder) {
              window.electron.ipcRenderer.send("request-file-list", selectedFolder);
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M23 4v6h-6"></path>
            <path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
          </svg>
        </button>
        <div className="current-directory">
          <span className="path-label">Path:</span> {currentDirectory || selectedFolder || '/'}
        </div>
      </div>
      
      {showNewFileDialog && (
        <div className="create-item-dialog">
          <input
            type="text"
            placeholder="Enter file name"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
            autoFocus
          />
          <div className="create-item-actions">
            <button onClick={handleCreateFile}>Create</button>
            <button onClick={() => {
              setShowNewFileDialog(false);
              setCreateItemError("");
            }}>Cancel</button>
          </div>
          {createItemError && <div className="create-item-error">{createItemError}</div>}
        </div>
      )}
      
      {showNewFolderDialog && (
        <div className="create-item-dialog">
          <input
            type="text"
            placeholder="Enter folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            autoFocus
          />
          <div className="create-item-actions">
            <button onClick={handleCreateFolder}>Create</button>
            <button onClick={() => {
              setShowNewFolderDialog(false);
              setCreateItemError("");
            }}>Cancel</button>
          </div>
          {createItemError && <div className="create-item-error">{createItemError}</div>}
        </div>
      )}
      
      <div className="file-browser">
        {buildFileTree().map(node => renderFileTreeNode(node))}
      </div>
    </div>
  );

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
              collapsed={sidebarCollapsed}
              toggleCollapsed={toggleSidebar}
              activePage={activePage}
              setActivePage={setActivePage}
            />
            <div className="content-area">
              <div className="content-header">
                <div className="content-title">
                  <div className="view-dropdown">
                    <div 
                      className="view-dropdown-button"
                      onClick={toggleViewDropdown}
                    >
                      {viewMode === "selected-files" ? "Selected Files" : "File Browser"}
                    </div>
                    {viewDropdownOpen && (
                      <div className="view-dropdown-menu">
                        <div 
                          className={`view-dropdown-item ${viewMode === "selected-files" ? "active" : ""}`}
                          onClick={() => toggleViewMode("selected-files")}
                        >
                          Selected Files
                        </div>
                        <div 
                          className={`view-dropdown-item ${viewMode === "file-browser" ? "active" : ""}`}
                          onClick={() => toggleViewMode("file-browser")}
                        >
                          File Browser
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Token warning notification */}
                {showTokenWarning && (
                  <div className={`token-warning ${calculateTotalTokens() > tokenWarningLimit ? 'exceeded' : 'near'}`}>
                    <div className="token-warning-icon">⚠️</div>
                    <div className="token-warning-message">
                      {calculateTotalTokens() > tokenWarningLimit 
                        ? `Token limit exceeded: ${calculateTotalTokens()} / ${tokenWarningLimit} tokens` 
                        : `Approaching token limit: ${calculateTotalTokens()} / ${tokenWarningLimit} tokens`}
                    </div>
                    <button className="token-warning-close" onClick={() => setShowTokenWarning(false)}>×</button>
                  </div>
                )}
                
                <div className="content-actions">
                  <div className="file-stats">
                    {selectedFiles.length} files | ~
                    {calculateTotalTokens().toLocaleString()} tokens
                  </div>
                </div>
              </div>

              {!viewedFile && (
                <>
                  {activePage === "select" && (
                    <>
                      {viewMode === "selected-files" ? (
                        <FileList
                          files={displayedFiles}
                          selectedFiles={selectedFiles}
                          toggleFileSelection={toggleFileSelection}
                          viewedFile={viewedFile}
                          onViewFile={(file) => setViewedFile(file)}
                          onCloseView={() => setViewedFile(null)}
                          problemHighlightingActive={problemHighlightingActive}
                        />
                      ) : (
                        renderFileBrowser()
                      )}
                      
                      {viewMode === "selected-files" && (
                        <div className="copy-button-container">
                          <CopyButton
                            text={getSelectedFilesContent()}
                            className="primary full-width"
                          >
                            <span>COPY ALL SELECTED ({selectedFiles.length} files)</span>
                          </CopyButton>
                        </div>
                      )}
                    </>
                  )}

                  {activePage === "prompt" && (
                    <div className="prompt-container">
                      <h2>Prompt Engineering</h2>
                      <p>This page will contain prompt engineering tools.</p>
                    </div>
                  )}

                  {activePage === "edit" && (
                    <div className="edit-container">
                      <h2>Edit Files</h2>
                      <p>This page will contain file editing tools.</p>
                    </div>
                  )}

                  {activePage === "settings" && (
                    <div className="settings-container">
                      <h2>Settings</h2>
                      
                      <div className="settings-section">
                        <h3>Theme</h3>
                        <div className="settings-option">
                          <label>Application Theme</label>
                          <div className="theme-selector">
                            <div 
                              className={`theme-option ${themeMode === 'light' ? 'active' : ''}`}
                              onClick={() => toggleThemeMode()}
                            >
                              <div className="theme-preview light"></div>
                              <span>Light</span>
                            </div>
                            <div 
                              className={`theme-option ${themeMode === 'dark' ? 'active' : ''}`}
                              onClick={() => toggleThemeMode()}
                            >
                              <div className="theme-preview dark"></div>
                              <span>Dark</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="settings-section">
                        <h3>Token Limits</h3>
                        <div className="settings-option">
                          <label htmlFor="token-warning-limit">Token Warning Limit</label>
                          <div className="token-limit-input">
                            <input 
                              id="token-warning-limit"
                              type="number" 
                              min="100" 
                              max="100000" 
                              value={tokenWarningLimit}
                              onChange={(e) => setTokenWarningThreshold(e.target.value)}
                            />
                            <p className="settings-description">
                              You'll receive a warning when your selected files approach or exceed this token limit.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {viewedFile && (
                <FileList
                  files={displayedFiles}
                  selectedFiles={selectedFiles}
                  toggleFileSelection={toggleFileSelection}
                  viewedFile={viewedFile}
                  onViewFile={(file) => setViewedFile(file)}
                  onCloseView={() => setViewedFile(null)}
                  problemHighlightingActive={problemHighlightingActive}
                />
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