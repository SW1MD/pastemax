import React, { useState, useEffect, useRef, useCallback } from "react";
import { File, Folder, FolderOpen } from 'lucide-react';
import Sidebar from "./components/Sidebar";
import FileList from "./components/FileList";
import CopyButton from "./components/CopyButton";
import WebBrowser from "./components/WebBrowser";
import PromptEngine from './components/PromptEngine';
import EditorPage from './components/EditorPage';
import FileManager from './components/FileManager';
import ProjectConfig from './components/ProjectConfig';
import './styles/settings.css';

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
  const savedProblemHighlight = localStorage.getItem(STORAGE_KEYS.PROBLEM_HIGHLIGHT);
  const savedViewMode = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
  const savedThemeMode = localStorage.getItem(STORAGE_KEYS.THEME_MODE);
  const savedTokenWarningLimit = localStorage.getItem(STORAGE_KEYS.TOKEN_WARNING_LIMIT);

  const [selectedFolder, setSelectedFolder] = useState(savedFolder);
  const [allFiles, setAllFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(
    savedFiles ? JSON.parse(savedFiles) : []
  );
  const [sortOrder] = useState(savedSortOrder || "tokens-desc");
  const [searchTerm, setSearchTerm] = useState(savedSearchTerm || "");
  const [expandedNodes, setExpandedNodes] = useState({});
  const [displayedFiles, setDisplayedFiles] = useState([]);
  const [, setCopyStatus] = useState(false);
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
  const [problemHighlightingActive] = useState(
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

  // Set up event listeners for file and folder operations
  useEffect(() => {
    if (!isElectron) return;

    // Set up event listeners
    window.electron.receive('file-created', (result) => {
      if (result.success) {
        console.log("File created successfully:", result.file);
        
        // Add the new file to allFiles
        setAllFiles(prevFiles => [...prevFiles, result.file]);
        
        // Add to recent files
        const updatedRecentFiles = [result.file.path, ...recentFiles.filter(f => f !== result.file.path)].slice(0, 10);
        setRecentFiles(updatedRecentFiles);
        localStorage.setItem('pastemax-recent-files', JSON.stringify(updatedRecentFiles));
        
        // Refresh the file list to update the tree
        window.electron.send("request-file-list", selectedFolder);
      } else {
        console.error("Error creating file:", result.error);
        setProcessingStatus({
          status: "error",
          message: "Error creating file: " + result.error
        });
      }
    });

    window.electron.receive('folder-created', (result) => {
      if (result.success) {
        console.log("Folder created successfully:", result.path);
        
        // Add to recent folders
        const updatedRecentFolders = [result.path, ...recentFolders.filter(f => f !== result.path)].slice(0, 10);
        setRecentFolders(updatedRecentFolders);
        localStorage.setItem('pastemax-recent-folders', JSON.stringify(updatedRecentFolders));
        
        // Update current directory to the newly created folder
        setCurrentDirectory(result.path);
        
        // Expand the newly created folder in the tree
        const newExpandedNodes = { ...expandedNodes };
        newExpandedNodes[`node-${result.path}`] = true;
        setExpandedNodes(newExpandedNodes);
        localStorage.setItem(STORAGE_KEYS.EXPANDED_NODES, JSON.stringify(newExpandedNodes));
        
        // Clear any error status
        setProcessingStatus({
          status: "complete",
          message: `Created folder: ${result.path.split('/').pop()}`
        });
        
        // Refresh the file list to update the tree
        window.electron.send("request-file-list", selectedFolder);
      } else {
        console.error("Error creating folder:", result.error);
        setProcessingStatus({
          status: "error",
          message: "Error creating folder: " + result.error
        });
      }
    });

    // Set up file list and folder selection listeners
    window.electron.receive("folder-selected", (folderPath) => {
      if (typeof folderPath === "string") {
        console.log("Folder selected:", folderPath);
        setSelectedFolder(folderPath);
        setSelectedFiles([]);
        setProcessingStatus({
          status: "processing",
          message: "Requesting file list..."
        });
        window.electron.send("request-file-list", folderPath);
      } else {
        console.error("Invalid folder path received:", folderPath);
        setProcessingStatus({
          status: "error",
          message: "Invalid folder path received"
        });
      }
    });

    window.electron.receive("file-list-data", (files) => {
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
    });

    window.electron.receive("file-processing-status", (status) => {
      console.log("Processing status:", status);
      setProcessingStatus(status);
    });

    window.electron.receive("file-saved", (result) => {
      if (result.success) {
        console.log("File saved successfully:", result.path);
        // Refresh the file list to get updated token counts and content
        window.electron.send("request-file-list", selectedFolder);
      } else {
        console.error("Error saving file:", result.error);
        setProcessingStatus({
          status: "error",
          message: "Error saving file: " + result.error
        });
      }
    });

  }, [isElectron, selectedFolder, expandedNodes, sortOrder, searchTerm]);

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

  // Handle search change

  // Toggle sort dropdown

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

  // Handle deselect all files

  // Sort options for the dropdown

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
  const [isResizing, setIsResizing] = useState(false);
  const pasteSizeRef = useRef(50); // Keep reference to avoid stale closures

  // Memoize handlers to avoid recreation on each render
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    document.body.classList.add('resizing');
    setIsResizing(true);
    pasteSizeRef.current = 50;
    
    // Capture the initial position of the mouse/touch and handle
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    resizeHandleRef.current = {
      startX: clientX,
      startPasteMaxWidth: pasteSizeRef.current
    };
  }, []);

  const handleResizeMove = useCallback(() => {
    // In a fixed-width approach, we don't need resize logic for the browser width
    // The CSS will now handle this with fixed dimensions
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
      localStorage.setItem('pastemax-panel-sizes', JSON.stringify({ pastemax: 50, browser: 50 }));
    }
  }, [isResizing]);
  
  // Load saved panel sizes on initial render
  useEffect(() => {
    const savedSizes = localStorage.getItem('pastemax-panel-sizes');
    if (savedSizes) {
      try {
        const parsedSizes = JSON.parse(savedSizes);
        pasteSizeRef.current = parsedSizes.pastemax;
      } catch (e) {
        console.error('Error parsing saved panel sizes', e);
      }
    }
  }, []);

  // Toggle problem highlighting

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
    if (allFiles.length === 0 || !selectedFolder) {
      return [];
    }

    try {
      // Create a structured representation using nested objects first
      const fileMap = {};

      // First pass: create directories and files
      allFiles.forEach((file) => {
        if (!file.path || !file.path.startsWith(selectedFolder)) return;

        // Get the path relative to the selected folder
        const relativePath = file.path
          .substring(selectedFolder.length)
          .replace(/^[/\\]+/, ""); // Remove leading slashes

        if (!relativePath) return; // Skip the selected folder itself

        const parts = relativePath.split(/[/\\]/).filter(Boolean);
        let currentPath = selectedFolder;
        let current = fileMap;

        // Build the path in the tree, creating intermediate directories
        parts.forEach((part, i) => {
          currentPath = `${currentPath}/${part}`;
          
          if (i === parts.length - 1 && !file.isDirectory) {
            // This is a file
            current[part] = {
              id: `node-${currentPath}`,
              name: part,
              path: currentPath,
              type: "file",
              level: i,
              fileData: file,
            };
          } else {
            // This is a directory (either intermediate or final)
            if (!current[part]) {
              current[part] = {
                id: `node-${currentPath}`,
                name: part,
                path: currentPath,
                type: "directory",
                level: i,
                children: {},
              };
            }
            current = current[part].children;
          }
        });
      });

      // Second pass: create any missing parent directories
      const ensureParentDirectories = (path) => {
        if (!path.startsWith(selectedFolder)) return;
        
        const relativePath = path
          .substring(selectedFolder.length)
          .replace(/^[/\\]+/, "");
        
        if (!relativePath) return;

        const parts = relativePath.split(/[/\\]/).filter(Boolean);
        let currentPath = selectedFolder;
        let current = fileMap;

        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          currentPath = `${currentPath}/${part}`;
          
          if (!current[part]) {
            current[part] = {
              id: `node-${currentPath}`,
              name: part,
              path: currentPath,
              type: "directory",
              level: i,
              children: {},
            };
          }
          current = current[part].children;
        }
      };

      // Ensure all parent directories exist
      allFiles.forEach((file) => {
        if (file.path) {
          ensureParentDirectories(file.path);
        }
      });

      // Convert the nested object structure to the TreeNode array format
      const convertToTreeNodes = (node, level = 0) => {
        return Object.entries(node).map(([, item]) => {
          if (item.type === "file") {
            return {
              ...item,
              level: 0  // Reset level to 0 since we're hiding parent folders
            };
          } else {
            const children = convertToTreeNodes(item.children, level + 1);
            const nodeId = `node-${item.path}`;
            const isExpanded = expandedNodes[nodeId] !== undefined
              ? expandedNodes[nodeId]
              : true; // Default to expanded if not in state

            return {
              ...item,
              level: level,  // Keep relative levels for nested folders
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
        return a.name.localeCompare(b.name);
      });
    } catch (err) {
      console.error("Error building file tree:", err);
      return [];
    }
  };

  // Update the renderFileTreeNode function to use Lucide icons
  const renderFileTreeNode = (node) => {
    const isDirectory = node.type === "directory";
    const isSelected = selectedFiles.includes(node.path);
    
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
              ? (node.isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />)
              : <File size={16} />
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

  // Update the file browser container to use FileManager
  const renderFileBrowser = () => (
    <div className="file-browser-container">
      <FileManager
        currentDirectory={currentDirectory || selectedFolder}
        onCreateFile={handleFileCreationWithContent}
        onCreateFolder={handleCreateFolder}
        onNavigate={(path, isFolder) => {
          if (isFolder) {
            setCurrentDirectory(path);
          } else {
            openFile(path);
          }
        }}
        recentFiles={recentFiles}
        recentFolders={recentFolders}
        navigateBack={() => {
          if (fileHistory.length > 1) {
            const prevFile = fileHistory[1];
            openFile(prevFile);
          }
        }}
        navigateForward={() => {
          // Implement forward navigation if needed
        }}
        navigateToParentFolder={() => {
          if (currentDirectory) {
            const parentDir = currentDirectory.split('/').slice(0, -1).join('/');
            setCurrentDirectory(parentDir || selectedFolder);
          }
        }}
        canNavigateBack={fileHistory.length > 1}
        canNavigateForward={false}
        breadcrumbs={
          (currentDirectory || selectedFolder)?.split('/').map((part, index, array) => ({
            name: part || 'Root',
            path: array.slice(0, index + 1).join('/'),
            isLast: index === array.length - 1
          })) || []
        }
        currentFilePath={currentFile}
      />
      <div className="file-browser">
        {buildFileTree().map(node => renderFileTreeNode(node))}
      </div>
    </div>
  );

  // Inside the App component
  const [currentFile, setCurrentFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [fileHistory, setFileHistory] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(''); // Track current folder for navigation

  // Add a recentFiles and recentFolders state
  const [recentFiles, setRecentFiles] = useState([]);
  const [recentFolders, setRecentFolders] = useState([]);

  // Add isLoading state
  const [isLoading, setIsLoading] = useState(false);

  // Update openFile to track recent files
  const openFile = async (filePath, isFolder = false) => {
    try {
      // If it's a folder, update currentDirectory and return
      if (isFolder) {
        setCurrentDirectory(filePath);
        
        // Add to recent folders
        if (!recentFolders.includes(filePath)) {
          const updatedRecentFolders = [filePath, ...recentFolders.filter(f => f !== filePath)].slice(0, 10);
          setRecentFolders(updatedRecentFolders);
          localStorage.setItem('pastemax-recent-folders', JSON.stringify(updatedRecentFolders));
        }
        
        return;
      }
      
      // Show loading indicator
      setIsLoading(true);
      
      // Read file content
      let fileContent = "";
      if (isElectron) {
        try {
          const result = await window.electron.ipcRenderer.invoke("read-file", filePath);
          if (result.success) {
            fileContent = result.content;
          } else {
            console.error("Error reading file:", result.error);
            return;
          }
        } catch (err) {
          console.error("Error invoking read-file:", err);
          return;
        }
      }
      
      // Add to recent files
      if (!recentFiles.includes(filePath)) {
        const updatedRecentFiles = [filePath, ...recentFiles.filter(f => f !== filePath)].slice(0, 10);
        setRecentFiles(updatedRecentFiles);
        localStorage.setItem('pastemax-recent-files', JSON.stringify(updatedRecentFiles));
      }
      
      // Set current file and content
      setCurrentFile(filePath);
      setFileContent(fileContent);
      setIsEditing(true);
      setActivePage("edit");
      setIsLoading(false);
      
      // Add to file history
      const existingIndex = fileHistory.findIndex(f => f === filePath);
      if (existingIndex !== -1) {
        // Remove the existing entry to avoid duplicates
        fileHistory.splice(existingIndex, 1);
      }
      
      // Add to the beginning of history
      setFileHistory([filePath, ...fileHistory].slice(0, 20));
      
    } catch (error) {
      console.error("Error opening file:", error);
      setIsLoading(false);
    }
  };

  // Function to handle folder navigation
  const handleFolderNavigation = (folderPath) => {
    // Update current folder
    setCurrentFolder(folderPath);
    
    // If we're in the file browser view, update the displayed files
    if (window.electron) {
      window.electron.ipcRenderer.send("request-file-list", folderPath);
    }
    
    // Switch to select page to show the file browser
    setActivePage("select");
    setViewMode("file-browser");
    
    // Expand the folder in the file tree
    const newExpandedNodes = { ...expandedNodes };
    
    // Split the path and expand each parent folder
    const pathParts = folderPath.split('/');
    let currentPath = '';
    
    for (let i = 0; i < pathParts.length; i++) {
      currentPath += (i === 0 ? '' : '/') + pathParts[i];
      newExpandedNodes[currentPath] = true;
    }
    
    setExpandedNodes(newExpandedNodes);
    localStorage.setItem(STORAGE_KEYS.EXPANDED_NODES, JSON.stringify(newExpandedNodes));
    
    // If we have a selected folder, make sure it's updated
    if (selectedFolder && folderPath.startsWith(selectedFolder)) {
      // This is a subfolder of the selected folder
      // Update UI to show this folder is selected in the file browser
      // This depends on your specific implementation
    }
  };

  // Function to handle file tree navigation from the editor
  const navigateToFileFromEditor = (filePath, isFolder = false) => {
    if (isFolder) {
      // If it's a folder, update the file browser to show that folder
      handleFolderNavigation(filePath);
    } else {
      // Always open the file directly rather than relying on cached data
      openFile(filePath);
    }
  };

  // Function to save file changes
  const saveFile = async (content) => {
    if (!currentFile) return;
    
    try {
      // Save the file using the electron API
      const result = await window.electron.writeFile(currentFile, content);
      
      if (result && result.success) {
        try {
          // Refresh the file to get the latest content and token count
          const refreshedFile = await window.electron.refreshFile(currentFile);
          
          if (refreshedFile) {
            // Update the file in allFiles array
            setAllFiles(prevFiles => 
              prevFiles.map(file => 
                file.path === currentFile ? refreshedFile : file
              )
            );
            
            // Update the current file content in editor state
            setFileContent(refreshedFile.content);
          }
        } catch (refreshError) {
          console.error('Error refreshing file:', refreshError);
          // Even if refresh fails, we still update with what we have
          setAllFiles(prevFiles => {
            return prevFiles.map(file => 
              file.path === currentFile ? { ...file, content } : file
            );
          });
          setFileContent(content);
        }
        
        return true;
      } else {
        console.error('Error saving file: Unknown error');
        return false;
      }
    } catch (error) {
      console.error('Error saving file:', error);
      return false;
    }
  };

  // Load recent files and folders on component mount
  useEffect(() => {
    const savedRecentFiles = localStorage.getItem('pastemax-recent-files');
    const savedRecentFolders = localStorage.getItem('pastemax-recent-folders');
    
    if (savedRecentFiles) {
      try {
        setRecentFiles(JSON.parse(savedRecentFiles));
      } catch (e) {
        console.error('Error parsing saved recent files:', e);
      }
    }
    
    if (savedRecentFolders) {
      try {
        setRecentFolders(JSON.parse(savedRecentFolders));
      } catch (e) {
        console.error('Error parsing saved recent folders:', e);
      }
    }
  }, []);

  // Define the handleFileCreationWithContent function
  const handleFileCreationWithContent = (directory, fileName, content = '') => {
    const fullPath = directory ? `${directory}/${fileName}` : fileName;
    
    if (isElectron) {
      window.electron.send("create-file", {
        folderPath: directory || selectedFolder,
        fileName: fileName,
        content: content
      });
      
      // If content was provided, prepare to open the file for editing
      if (content) {
        setCurrentFile(fullPath);
        setFileContent(content);
        setIsEditing(true);
      }
    }
  };

  // Get folder icon based on expanded state

  // Get file icon based on extension

  // Handle folder creation
  const handleCreateFolder = (directory, folderName) => {
    if (isElectron) {
      const targetDirectory = directory || selectedFolder;
      const fullPath = `${targetDirectory}/${folderName}`;
      
      // Show processing status
      setProcessingStatus({
        status: "processing",
        message: `Creating folder: ${folderName}`
      });
      
      window.electron.send("create-folder", {
        folderPath: targetDirectory,
        folderName: folderName
      });
      
      // Pre-expand the node that will be created
      const newExpandedNodes = { ...expandedNodes };
      newExpandedNodes[`node-${fullPath}`] = true;
      setExpandedNodes(newExpandedNodes);
      localStorage.setItem(STORAGE_KEYS.EXPANDED_NODES, JSON.stringify(newExpandedNodes));
      
      // Set current directory to the new folder's parent to ensure it's visible
      setCurrentDirectory(targetDirectory);
      
      // Force a refresh of the file list after a short delay to ensure the folder is created
      setTimeout(() => {
        window.electron.send("request-file-list", selectedFolder);
      }, 100);
    }
  };

  const [currentDirectory, setCurrentDirectory] = useState("");

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
          >
            <Sidebar
              collapsed={sidebarCollapsed}
              toggleCollapsed={toggleSidebar}
              activePage={activePage}
              setActivePage={setActivePage}
            />
            <div className="content-area">
              <div className={`content-header ${activePage === "project" ? 'project-page' : ''}`}>
                <div className="content-title">
                  {activePage === "select" && (
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
                  )}
                </div>
                
                {/* Token warning notification */}
                {showTokenWarning && activePage !== "project" && (
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
                    {selectedFiles.length} files | ~{calculateTotalTokens().toLocaleString()} tokens
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
                    <PromptEngine />
                  )}

                  {activePage === "edit" && (
                    <div className="editor-view">
                      <EditorPage
                        filePath={currentFile}
                        content={fileContent}
                        currentDirectory={currentDirectory || selectedFolder}
                        onSave={saveFile}
                        onClose={() => {
                          setIsEditing(false);
                          setActivePage("select");
                        }}
                        onCreateFile={handleFileCreationWithContent}
                        onCreateFolder={handleCreateFolder}
                        onNavigate={navigateToFileFromEditor}
                        theme={themeMode === 'dark' ? 'tomorrow_night' : 'github'}
                        fileHistory={fileHistory}
                        recentFiles={recentFiles}
                        recentFolders={recentFolders}
                      />
                    </div>
                  )}

                  {activePage === "project" && (
                    <ProjectConfig />
                  )}

                  {activePage === "settings" && (
                    <div className="settings-page">
                      <div className="settings-header">
                        <h2>Settings</h2>
                      </div>
                      
                      <div className="settings-content">
                        <div className="settings-section">
                          <div className="settings-section-header">
                            <h3>Appearance</h3>
                          </div>
                          <div className="settings-section-content">
                            <div className="settings-option">
                              <div className="settings-option-label">
                                <label>Theme</label>
                                <span className="settings-option-description">
                                  Choose between light and dark theme for the application
                                </span>
                              </div>
                              <div className="settings-option-control">
                                <div className="theme-selector">
                                  <button 
                                    className={`theme-option ${themeMode === 'light' ? 'active' : ''}`}
                                    onClick={() => toggleThemeMode()}
                                  >
                                    <div className="theme-preview light"></div>
                                    <span>Light</span>
                                  </button>
                                  <button 
                                    className={`theme-option ${themeMode === 'dark' ? 'active' : ''}`}
                                    onClick={() => toggleThemeMode()}
                                  >
                                    <div className="theme-preview dark"></div>
                                    <span>Dark</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="settings-section">
                          <div className="settings-section-header">
                            <h3>Token Management</h3>
                          </div>
                          <div className="settings-section-content">
                            <div className="settings-option">
                              <div className="settings-option-label">
                                <label htmlFor="token-warning-limit">Warning Limit</label>
                                <span className="settings-option-description">
                                  You'll receive a warning when your selected files approach or exceed this token limit
                                </span>
                              </div>
                              <div className="settings-option-control">
                                <div className="token-limit-control">
                                  <input 
                                    id="token-warning-limit"
                                    type="number" 
                                    min="100" 
                                    max="100000" 
                                    value={tokenWarningLimit}
                                    onChange={(e) => setTokenWarningThreshold(e.target.value)}
                                  />
                                  <span className="token-limit-unit">tokens</span>
                                </div>
                              </div>
                            </div>
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
              <div 
                className="resize-handle" 
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
              ></div>
              <div className="browser-container">
                <WebBrowser 
                  onClose={toggleBrowser} 
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