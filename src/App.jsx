import React, { useState, useEffect, useRef, useCallback } from "react";
import { File, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import Sidebar from "./components/Sidebar";
import CopyButton from "./components/CopyButton";
import WebBrowser from "./components/WebBrowser";
import PromptEngine from './components/PromptEngine';
import EditorPage from './components/EditorPage';
import FileManager from './components/FileManager';
import ProjectConfig from './components/ProjectConfig';
import './styles/settings.css';
import './styles/checkbox-override.css';

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
  const [viewMode] = useState("file-browser");

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

  // New counter state that starts at 0
  const [fileCounter, setFileCounter] = useState(0);
  // New token counter state that starts at 0
  const [tokenCounter, setTokenCounter] = useState(0);

  // Check if we're running in Electron or browser environment
  const isElectron = window.electron !== undefined;

  // Apply theme on initial load
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
  }, []);

  // Reset selection and counter on initial load
  useEffect(() => {
    resetCounters();
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
        // Removed console.error
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

    // Removed console.log
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
        // Removed console.log
        
        // Add the new file to allFiles
        setAllFiles(prevFiles => [...prevFiles, result.file]);
        
        // Add to recent files
        const updatedRecentFiles = [result.file.path, ...recentFiles.filter(f => f !== result.file.path)].slice(0, 10);
        setRecentFiles(updatedRecentFiles);
        localStorage.setItem('pastemax-recent-files', JSON.stringify(updatedRecentFiles));
        
        // Refresh the file list to update the tree
        window.electron.send("request-file-list", selectedFolder);
      } else {
        // Removed console.error
        setProcessingStatus({
          status: "error",
          message: "Error creating file: " + result.error
        });
      }
    });

    // Add listener for folder selection to reset counter
    window.electron.receive("folder-selected", (folderPath) => {
      if (typeof folderPath === "string") {
        // Reset selection and counter when a new folder is selected
        resetCounters();
        
        // Set the selected folder
        setSelectedFolder(folderPath);
        setProcessingStatus({
          status: "processing",
          message: "Requesting file list..."
        });
        window.electron.send("request-file-list", folderPath);
      } else {
        setProcessingStatus({
          status: "error",
          message: "Invalid folder path received"
        });
      }
    });

    window.electron.receive('folder-created', (result) => {
      if (result.success) {
        // Removed console.log
        
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
        // Removed console.error
        setProcessingStatus({
          status: "error",
          message: "Error creating folder: " + result.error
        });
      }
    });

    window.electron.receive("file-list-data", (files) => {
      // Debug log to check file structure
      console.log("Received file list data:", files.slice(0, 3));
      
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
      // Removed console.log
      setProcessingStatus(status);
    });

    window.electron.receive("file-saved", (result) => {
      if (result.success) {
        // Removed console.log
        setProcessingStatus({
          status: "complete",
          message: `File saved: ${result.path.split('/').pop()}`
        });
      } else {
        // Removed console.error
        setProcessingStatus({
          status: "error",
          message: `Error saving file: ${result.error}`
        });
      }
    });

  }, [isElectron, selectedFolder, expandedNodes, sortOrder, searchTerm]);

  // Function to reset all counters
  const resetCounters = () => {
    console.log("Resetting all counters");
    setSelectedFiles([]);
    console.log("Setting fileCounter to 0");
    setFileCounter(0);
    console.log("Setting tokenCounter to 0");
    setTokenCounter(0);
  };

  // Handle folder opening - auto-select all files
  const openFolder = () => {
    if (isElectron) {
      window.electron.send("open-folder");
      
      // Reset selection and counter when opening a new folder
      resetCounters();
    }
  };

  // Apply filters and sorting to files - simplify to just focus on selected files
  const applyFiltersAndSort = (files, sort, filter) => {
    // Make sure we're working with a valid array
    if (!files || !Array.isArray(files) || files.length === 0) {
      console.log("No files to filter/sort");
      setDisplayedFiles([]);
      return;
    }

    // First filter to include only selected files that aren't binary or skipped
    let filtered = files.filter(
      (file) => 
        selectedFiles.includes(file.path) && 
        !file.isBinary && 
        !file.isSkipped
    );

    // Apply text search filter
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      filtered = filtered.filter(
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

    console.log(`Displaying ${sorted.length} files out of ${getValidSelectedCount()} selected valid files`);
    
    // Update displayed files
    setDisplayedFiles(sorted);
  };

  // Get token count for a specific file
  const getFileTokenCount = (filePath) => {
    // Try to find the file directly
    let file = allFiles.find(f => f.path === filePath);
    
    // If not found, try to normalize the path
    if (!file) {
      // Try to find the file by name (last part of the path)
      const fileName = filePath.split(/[/\\]/).pop();
      file = allFiles.find(f => f.path.endsWith(fileName));
    }
    
    if (file && !file.isBinary && !file.isSkipped) {
      console.log(`File ${filePath} has ${file.tokenCount} tokens`);
      return file.tokenCount || 0;
    }
    
    // If we still can't find the file, check if it's in the file tree
    const fileTree = buildFileTree();
    const findFileInTree = (nodes) => {
      for (const node of nodes) {
        if (node.path === filePath && node.fileData) {
          console.log(`Found file in tree: ${filePath} with ${node.fileData.tokenCount} tokens`);
          return node.fileData.tokenCount || 0;
        }
        if (node.children && Object.keys(node.children).length > 0) {
          const result = findFileInTree(Object.values(node.children));
          if (result > 0) return result;
        }
      }
      return 0;
    };
    
    const treeTokens = findFileInTree(fileTree);
    if (treeTokens > 0) {
      return treeTokens;
    }
    
    console.log(`File ${filePath} has 0 tokens (not found or invalid)`);
    return 0;
  };

  // Toggle file selection - fixed to ensure consistent selection state
  const toggleFileSelection = (filePath, nodeData = null) => {
    if (!filePath) return;
    
    // Get the token count for this file
    let fileTokens = 0;
    
    // If nodeData is provided, use its tokenCount directly
    if (nodeData && nodeData.fileData && nodeData.fileData.tokenCount) {
      fileTokens = nodeData.fileData.tokenCount;
      console.log(`Using direct token count from node: ${fileTokens}`);
    } else {
      // Otherwise, try to find the token count
      fileTokens = getFileTokenCount(filePath);
    }
    
    console.log(`Toggling selection for file: ${filePath}, tokens: ${fileTokens}`);
    
    setSelectedFiles(prev => {
      // Check if the file is already selected
      const isCurrentlySelected = prev.includes(filePath);
      console.log(`File ${filePath} is currently ${isCurrentlySelected ? 'selected' : 'not selected'}`);
      
      let newSelectedFiles;
      if (isCurrentlySelected) {
        // Remove the file from selection
        newSelectedFiles = prev.filter(path => path !== filePath);
        // Decrement counter when removing a file
        setFileCounter(current => {
          const newValue = Math.max(0, current - 1);
          console.log(`File counter: ${current} -> ${newValue}`);
          return newValue;
        });
        // Decrement token counter
        setTokenCounter(current => {
          const newValue = Math.max(0, current - fileTokens);
          console.log(`Token counter: ${current} -> ${newValue}`);
          return newValue;
        });
      } else {
        // Add the file to selection
        newSelectedFiles = [...prev, filePath];
        // Increment counter when adding a file
        setFileCounter(current => {
          const newValue = current + 1;
          console.log(`File counter: ${current} -> ${newValue}`);
          return newValue;
        });
        // Increment token counter
        setTokenCounter(current => {
          const newValue = current + fileTokens;
          console.log(`Token counter: ${current} -> ${newValue}`);
          return newValue;
        });
      }
      
      return newSelectedFiles;
    });
  };

  // Toggle folder selection (select/deselect all files in folder) - fixed for better folder handling
  const toggleFolderSelection = (folderPath, isSelected) => {
    console.log(`Toggle folder selection: ${folderPath}, isSelected: ${isSelected}`);
    
    // Get all files in this folder and subfolders that are valid (not binary/skipped)
    const filesInFolder = allFiles.filter(
      (file) =>
        (file.path.startsWith(folderPath + "/") || file.path === folderPath) && 
        !file.isBinary && 
        !file.isSkipped
    );
    
    console.log(`Found ${filesInFolder.length} valid files in folder ${folderPath}`);

    // Get all file paths in this folder
    const filePaths = filesInFolder.map(file => file.path);
    
    setSelectedFiles(prev => {
      let newSelection;
      
      if (isSelected) {
        // Add all files to selection
        newSelection = [...prev];
        let addedCount = 0;
        let addedTokens = 0;
        
        filePaths.forEach(path => {
          if (!newSelection.includes(path)) {
            newSelection.push(path);
            addedCount++;
            
            // Add tokens for this file
            const file = allFiles.find(f => f.path === path);
            if (file) {
              addedTokens += file.tokenCount || 0;
            }
          }
        });
        
        console.log(`Added ${addedCount} files to selection with ${addedTokens} tokens`);
        
        // Update counters
        setFileCounter(current => current + addedCount);
        setTokenCounter(current => current + addedTokens);
      } else {
        // Remove all files in this folder from selection
        const removedPaths = prev.filter(path => filePaths.includes(path));
        newSelection = prev.filter(path => !filePaths.includes(path));
        
        let removedCount = removedPaths.length;
        let removedTokens = 0;
        
        // Calculate removed tokens
        removedPaths.forEach(path => {
          const file = allFiles.find(f => f.path === path);
          if (file) {
            removedTokens += file.tokenCount || 0;
          }
        });
        
        console.log(`Removed ${removedCount} files from selection with ${removedTokens} tokens`);
        
        // Update counters
        setFileCounter(current => Math.max(0, current - removedCount));
        setTokenCounter(current => Math.max(0, current - removedTokens));
      }
      
      return newSelection;
    });
  };

  // Handle sort change

  // Handle search change

  // Toggle sort dropdown

  // Calculate total tokens from selected files
  const calculateTotalTokens = () => {
    // Create a Set to ensure we only count each file once
    const countedPaths = new Set();
    
    return selectedFiles.reduce((total, path) => {
      // Skip if we've already counted this file
      if (countedPaths.has(path)) {
        return total;
      }
      
      // Find the file data
      const file = allFiles.find((f) => f.path === path);
      
      // Only count if file exists and isn't binary/skipped
      if (file && !file.isBinary && !file.isSkipped) {
        countedPaths.add(path);
        return total + file.tokenCount;
      }
      
      return total;
    }, 0);
  };

  // Calculate tokens for selected files in the counter
  const calculateCounterTokens = () => {
    // Simply return the tokenCounter state
    return tokenCounter;
  };

  // Concatenate selected files content for copying
  const getSelectedFilesContent = () => {
    // If fileCounter is 0, return a message
    if (fileCounter === 0) {
      return "No files selected.";
    }
    
    // Get the files that are actually selected (counted in fileCounter)
    const actuallySelectedFiles = [];
    
    // Iterate through the file tree to find selected files
    const findSelectedFilesInTree = (nodes) => {
      for (const node of nodes) {
        if (node.type === "file" && selectedFiles.includes(node.path)) {
          if (node.fileData) {
            actuallySelectedFiles.push(node.fileData);
          }
        }
        if (node.children && Object.keys(node.children).length > 0) {
          findSelectedFilesInTree(Object.values(node.children));
        }
      }
    };
    
    // Find selected files in the tree
    findSelectedFilesInTree(buildFileTree());
    
    // If no files were found, try to use the selectedFiles array directly
    if (actuallySelectedFiles.length === 0) {
      console.log("No files found in tree, using selectedFiles directly");
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
        concatenatedString += `\n\n// ---- File: ${file.path} ----\n\n`;
        concatenatedString += file.content;
      });

      return concatenatedString;
    }
    
    // Sort the actually selected files
    const [sortKey, sortDir] = sortOrder.split("-");
    actuallySelectedFiles.sort((a, b) => {
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
    
    // Concatenate the content of the selected files
    let concatenatedString = "";
    actuallySelectedFiles.forEach((file) => {
      concatenatedString += `\n\n// ---- File: ${file.path} ----\n\n`;
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
  
  // Load saved panel sizes
  useEffect(() => {
    try {
      const savedPanelSizes = localStorage.getItem('pastemax-panel-sizes');
      if (savedPanelSizes) {
        const parsedSizes = JSON.parse(savedPanelSizes);
        pasteSizeRef.current = parsedSizes.pastemax;
      }
    } catch (e) {
      // Removed console.error
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

  // Helper function to generate breadcrumbs from the current directory
  const getBreadcrumbs = () => {
    return (currentDirectory || selectedFolder)?.split('/').map((part, index, array) => ({
      name: part || 'Root',
      path: array.slice(0, index + 1).join('/'),
      isLast: index === array.length - 1
    })) || [];
  };

  // Build file tree structure from flat list of files
  const buildFileTree = () => {
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
      // Removed console.error
      return { children: [] };
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
          onClick={(e) => {
            // Stop propagation to prevent parent handlers from firing
            e.stopPropagation();
            
            if (isDirectory) {
              toggleExpanded(node.id);
              setCurrentDirectory(node.path);
            } else {
              // Toggle file selection on single click - pass the node data
              toggleFileSelection(node.path, node);
            }
          }}
          onDoubleClick={(e) => {
            // Stop propagation to prevent parent handlers from firing
            e.stopPropagation();
            
            if (!isDirectory && node.fileData) {
              // Open file on double click
              setViewedFile(node.fileData);
            }
          }}
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
                {node.isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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
            {Object.values(node.children).map(child => renderFileTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  // Update the file browser container to use FileManager
  const renderFileBrowser = () => {
    // Check if most folders are expanded or collapsed
    const expandedCount = Object.values(expandedNodes).filter(Boolean).length;
    const totalNodes = Object.keys(expandedNodes).length;
    const isExpanded = expandedCount > totalNodes / 2;
    
    return (
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
              setFileHistory(prev => prev.slice(1));
              openFile(prevFile);
            }
          }}
          navigateForward={() => {
            // Not implemented yet
          }}
          navigateToParentFolder={() => {
            // Toggle expand/collapse all folders
            if (isExpanded) {
              collapseAllFolders();
            } else {
              expandAllFolders();
            }
          }}
          canNavigateBack={fileHistory.length > 1}
          canNavigateForward={false}
          breadcrumbs={getBreadcrumbs()}
          currentFilePath={viewedFile?.path}
          isExpanded={isExpanded}
        />
        <div className="file-browser">
          {buildFileTree().map(node => renderFileTreeNode(node))}
        </div>
        
        {/* File Selection Counter */}
        <div className="file-selection-counter">
          <span className="counter-label">Selected Files:</span>
          <span className="counter-value">{fileCounter}</span>
          
          <span className="token-counter">
            <span className="counter-label">Total Tokens:</span>
            <span className="counter-value">{tokenCounter.toLocaleString()}</span>
          </span>
          
          {/* Always show buttons */}
          <button 
            className="counter-copy-btn"
            onClick={() => {
              // Copy the content of all selected files
              const content = getSelectedFilesContent();
              navigator.clipboard.writeText(content);
              // Show a temporary success message
              setProcessingStatus({
                status: "complete",
                message: "Copied content to clipboard"
              });
              // Clear the message after 2 seconds
              setTimeout(() => {
                setProcessingStatus({
                  status: "idle",
                  message: ""
                });
              }, 2000);
            }}
            title="Copy content of selected files"
            disabled={fileCounter === 0}
          >
            Copy
          </button>
          <button 
            className="counter-clear-btn"
            onClick={() => {
              resetCounters();
            }}
            title="Clear selection"
            disabled={fileCounter === 0}
          >
            Clear
          </button>
        </div>
      </div>
    );
  };

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
          const result = await window.electron.invoke("read-file", filePath);
          if (result.success) {
            fileContent = result.content;
          } else {
            // Removed console.error
            setProcessingStatus({
              status: "error",
              message: `Error reading file: ${result.error || "Unknown error"}`
            });
            return;
          }
        } catch (result) {
          // Removed console.error
          setProcessingStatus({
            status: "error",
            message: `Error reading file: ${result.error || "Unknown error"}`
          });
          return;
        }
      } else {
        try {
          // ... existing code ...
        } catch (err) {
          // Removed console.error
          setProcessingStatus({
            status: "error",
            message: `Error reading file: ${err.message || "Unknown error"}`
          });
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
      // Removed console.error
      setProcessingStatus({
        status: "error",
        message: `Error opening file: ${error.message}`
      });
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
    if (!viewedFile) {
      setProcessingStatus({
        status: "error",
        message: "No file is currently open for editing"
      });
      return;
    }

    try {
      setProcessingStatus({
        status: "processing",
        message: `Saving file: ${viewedFile.name}`
      });
      
      // Save the file using the electron API
      const result = await window.electron.writeFile(viewedFile.path, content);
      
      if (result && result.success) {
        try {
          // Refresh the file to get the latest content and token count
          const refreshedFile = await window.electron.refreshFile(viewedFile.path);
          
          if (refreshedFile) {
            // Update the file in allFiles array
            setAllFiles(prevFiles => 
              prevFiles.map(file => 
                file.path === viewedFile.path ? refreshedFile : file
              )
            );
          }
        } catch (refreshError) {
          // Removed console.error
        }
        
        setProcessingStatus({
          status: "complete",
          message: `File saved: ${viewedFile.name}`
        });
        
        return true;
      } else {
        setProcessingStatus({
          status: "error",
          message: "Error saving file: Unknown error"
        });
        return false;
      }
    } catch (error) {
      setProcessingStatus({
        status: "error",
        message: `Error saving file: ${error.message || "Unknown error"}`
      });
      return false;
    }
  };

  const [currentDirectory, setCurrentDirectory] = useState("");

  // Fix the syntax error in the handleCreateFolder function
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
        
        // Create an empty file inside the new folder without opening it
        window.electron.send("create-file", {
          folderPath: fullPath,
          fileName: "empty.txt",
          content: ""
        });
      }, 500);
    }
  };

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
        setViewedFile({
          path: fullPath,
          name: fileName
        });
        setFileContent(content);
        setIsEditing(true);
      }
    }
  };

  // Effect to update displayed files when selectedFiles changes
  useEffect(() => {
    // Only update if we have files loaded
    if (allFiles.length > 0) {
      console.log("Selected files changed, updating displayed files...");
      applyFiltersAndSort(allFiles, sortOrder, searchTerm);
    }
  }, [selectedFiles, allFiles, sortOrder, searchTerm]);

  // Debug effect to log selected files and token count
  useEffect(() => {
    console.log(`Selected files: ${selectedFiles.length}, File counter: ${fileCounter}`);
    console.log(`Token count: ${calculateCounterTokens()}`);
  }, [selectedFiles, fileCounter]);

  // Update the useEffect to sync selection changes with the renderer process
  useEffect(() => {
    // Save selection to localStorage
    console.log('Saving selectedFiles to localStorage:', selectedFiles);
    localStorage.setItem(STORAGE_KEYS.SELECTED_FILES, JSON.stringify(selectedFiles));
    
    // Sync selections with renderer process
    if (window.electron) {
      window.electron.send("update-selected-files", selectedFiles);
    }
    
    // Check token warning limit
    const totalTokens = calculateTotalTokens();
    setShowTokenWarning(totalTokens > tokenWarningLimit);
  }, [selectedFiles, tokenWarningLimit]);

  // Add listener for selection updates from renderer
  useEffect(() => {
    if (window.electron) {
      const handleSelectionUpdate = (files) => {
        // Only update if the selection is different to avoid loops
        if (JSON.stringify(files) !== JSON.stringify(selectedFiles)) {
          setSelectedFiles(files);
        }
      };
      
      window.electron.receive("selected-files-updated", handleSelectionUpdate);
    }
    
    return () => {
      // The cleanup function now safely removes listeners
      if (window.electron && window.electron.removeAllListeners) {
        window.electron.removeAllListeners("selected-files-updated");
      }
    };
  }, [selectedFiles]);

  // Helper function to count valid selected files
  const getValidSelectedCount = () => {
    return selectedFiles.filter(path => {
      const file = allFiles.find(f => f.path === path);
      return file && !file.isBinary && !file.isSkipped;
    }).length;
  };

  // Helper function to format the file counter text
  const getFileCountText = () => {
    const validCount = getValidSelectedCount();
    const displayedCount = displayedFiles.length;
    
    if (displayedCount === validCount) {
      return `${validCount} files selected`;
    } else {
      return `${displayedCount} files displayed (${validCount} total selected)`;
    }
  };

  // Debug effect to log fileCounter
  useEffect(() => {
    console.log(`fileCounter: ${fileCounter}`);
  }, [fileCounter]);

  // Function to expand all folders
  const expandAllFolders = () => {
    const fileTree = buildFileTree();
    const newExpandedNodes = { ...expandedNodes };
    
    // Recursive function to set all directory nodes to expanded
    const expandAllNodes = (nodes) => {
      for (const node of nodes) {
        if (node.type === "directory") {
          newExpandedNodes[node.id] = true;
          if (node.children && Object.keys(node.children).length > 0) {
            expandAllNodes(Object.values(node.children));
          }
        }
      }
    };
    
    expandAllNodes(fileTree);
    setExpandedNodes(newExpandedNodes);
    localStorage.setItem(STORAGE_KEYS.EXPANDED_NODES, JSON.stringify(newExpandedNodes));
  };
  
  // Function to collapse all folders
  const collapseAllFolders = () => {
    const fileTree = buildFileTree();
    const newExpandedNodes = { ...expandedNodes };
    
    // Recursive function to set all directory nodes to collapsed
    const collapseAllNodes = (nodes) => {
      for (const node of nodes) {
        if (node.type === "directory") {
          newExpandedNodes[node.id] = false;
          if (node.children && Object.keys(node.children).length > 0) {
            collapseAllNodes(Object.values(node.children));
          }
        }
      }
    };
    
    collapseAllNodes(fileTree);
    setExpandedNodes(newExpandedNodes);
    localStorage.setItem(STORAGE_KEYS.EXPANDED_NODES, JSON.stringify(newExpandedNodes));
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>PasteMax</h1>
        <div className="folder-info">
          {selectedFolder ? (
            <>
              <div className="selected-folder">
                <span className="folder-label">Selected Folder:</span>
                <span className="folder-path">{selectedFolder}</span>
              </div>
            </>
          ) : (
            <div className="no-folder-message">
              No folder selected. Please open a folder to get started.
            </div>
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
                      <div className="view-dropdown-button">
                        File Browser
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="content-actions">
                  {/* File stats removed */}
                </div>
              </div>

              {!viewedFile && (
                <>
                  {activePage === "select" && (
                    <>
                      {renderFileBrowser()}
                    </>
                  )}

                  {activePage === "prompt" && (
                    <PromptEngine 
                      selectedFiles={(() => {
                        console.log('App passing selectedFiles to PromptEngine, fileCounter:', fileCounter);
                        
                        // If fileCounter is 0, return an empty array
                        if (fileCounter === 0) {
                          console.log('No files selected according to fileCounter');
                          return [];
                        }
                        
                        // Get the files that are actually selected (counted in fileCounter)
                        const actuallySelectedFiles = [];
                        
                        // Iterate through the file tree to find selected files
                        const findSelectedFilesInTree = (nodes) => {
                          for (const node of nodes) {
                            if (node.type === "file" && selectedFiles.includes(node.path)) {
                              if (node.fileData) {
                                actuallySelectedFiles.push({
                                  path: node.path,
                                  content: node.fileData.content
                                });
                              }
                            }
                            if (node.children && Object.keys(node.children).length > 0) {
                              findSelectedFilesInTree(Object.values(node.children));
                            }
                          }
                        };
                        
                        // Find selected files in the tree
                        findSelectedFilesInTree(buildFileTree());
                        
                        // If no files were found, try to use the selectedFiles array directly
                        if (actuallySelectedFiles.length === 0 && fileCounter > 0) {
                          console.log("No files found in tree, using selectedFiles directly");
                          // Get selected files from allFiles
                          return selectedFiles.map(path => {
                            const file = allFiles.find(f => f.path === path);
                            return {
                              path,
                              content: file ? file.content : null
                            };
                          }).filter(file => file.content !== null); // Only include files with content
                        }
                        
                        console.log('Passing actuallySelectedFiles to PromptEngine:', actuallySelectedFiles);
                        return actuallySelectedFiles;
                      })()}
                      projectRules={allFiles.find(f => f.path === '.rules')?.content || ''}
                    />
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
                    <ProjectConfig 
                      selectedFolder={selectedFolder}
                      onClose={() => setActivePage("select")}
                    />
                  )}

                  {activePage === "terminal" && (
                    <div className="placeholder-message" style={{ 
                      padding: '2rem', 
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%'
                    }}>
                      <h3>Terminal functionality has been removed</h3>
                      <p>The terminal feature has been disabled for security reasons.</p>
                      <button 
                        className="btn" 
                        style={{ 
                          marginTop: '1rem',
                          padding: '0.5rem 1rem',
                          background: 'var(--primary-color)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }} 
                        onClick={() => setActivePage("select")}
                      >
                        Go Back
                      </button>
                    </div>
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
                <EditorPage
                  filePath={viewedFile.path}
                  content={viewedFile.content}
                  currentDirectory={currentDirectory || selectedFolder}
                  onSave={saveFile}
                  onClose={() => setViewedFile(null)}
                  onCreateFile={handleFileCreationWithContent}
                  onCreateFolder={handleCreateFolder}
                  onNavigate={navigateToFileFromEditor}
                  theme={themeMode === 'dark' ? 'tomorrow_night' : 'github'}
                  fileHistory={fileHistory}
                  recentFiles={recentFiles}
                  recentFolders={recentFolders}
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