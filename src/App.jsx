import React, { useState, useEffect, useRef, useCallback } from "react";
import { File, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import Sidebar from "./components/Sidebar";
import CopyButton from "./components/CopyButton";
import WebBrowser from "./components/WebBrowser";
import PromptEngine from './components/PromptEngine';
import EditorPage from './components/EditorPage';
import FileManager from './components/FileManager';
import ProjectConfig from './components/ProjectConfig';
import CodeEditor from './components/CodeEditor';
import './styles/settings.css';
import './styles/checkbox-override.css';
import Editor from '@monaco-editor/react';

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
  const [sortOrder, setSortOrder] = useState(savedSortOrder || "tokens-desc");
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
  
  // History of recently viewed files
  const [fileHistory, setFileHistory] = useState([]);
  // Recent files and folders for quick access
  const [recentFiles, setRecentFiles] = useState(() => {
    const savedRecentFiles = localStorage.getItem('pastemax-recent-files');
    return savedRecentFiles ? JSON.parse(savedRecentFiles) : [];
  });
  const [recentFolders, setRecentFolders] = useState(() => {
    const savedRecentFolders = localStorage.getItem('pastemax-recent-folders');
    return savedRecentFolders ? JSON.parse(savedRecentFolders) : [];
  });
  // Current directory for file operations
  const [currentDirectory, setCurrentDirectory] = useState(savedFolder || '');

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

  // Load files from the selected folder
  useEffect(() => {
    if (selectedFolder && isElectron) {
      setProcessingStatus({
        status: "processing",
        message: "Loading files..."
      });
      
      // Use the Electron API to get files
      window.electron.getFiles(selectedFolder)
        .then(files => {
          console.log(`Loaded ${files.length} files from ${selectedFolder}`);
          
          // Process files to add token counts and other metadata
          const processedFiles = processFiles(files);
          
          setAllFiles(processedFiles);
          setProcessingStatus({
            status: "idle",
            message: ""
          });
          
          // Apply filters and sorting
          applyFiltersAndSort(processedFiles, sortOrder, searchTerm);
        })
        .catch(error => {
          console.error("Error loading files:", error);
          setProcessingStatus({
            status: "error",
            message: `Failed to load files: ${error.message || error}`
          });
        });
    }
  }, [isElectron, selectedFolder]);

  // Set up event listeners for file and folder operations
  useEffect(() => {
    if (!isElectron) return;

    // Set up event listeners
    window.electron.receive('file-created', (result) => {
      if (result.success) {
        // Add the new file to allFiles
        setAllFiles(prevFiles => [...prevFiles, result.file]);
        
        // Add to recent files
        setRecentFiles(prevRecentFiles => {
          const updatedRecentFiles = [result.file.path, ...prevRecentFiles.filter(f => f !== result.file.path)].slice(0, 10);
          localStorage.setItem('pastemax-recent-files', JSON.stringify(updatedRecentFiles));
          return updatedRecentFiles;
        });
        
        // Refresh the file list to update the tree
        window.electron.send("request-file-list", selectedFolder);
      } else {
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
        // Add to recent folders
        setRecentFolders(prevRecentFolders => {
          const updatedRecentFolders = [result.path, ...prevRecentFolders.filter(f => f !== result.path)].slice(0, 10);
          localStorage.setItem('pastemax-recent-folders', JSON.stringify(updatedRecentFolders));
          return updatedRecentFolders;
        });
        
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

      // Don't auto-select all files - start with empty selection
      // so only files the user explicitly clicks will be selected
      setSelectedFiles([]);
      setFileCounter(0);
      setTokenCounter(0);
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
      } else if (sortKey === "date") {
        // Sort by last modified date
        comparison = (a.lastModified || 0) - (b.lastModified || 0);
      } else if (sortKey === "type") {
        // Sort by file extension
        const extA = a.name.split('.').pop().toLowerCase() || '';
        const extB = b.name.split('.').pop().toLowerCase() || '';
        comparison = extA.localeCompare(extB);
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
    
    // Normalize file path to handle different path formats
    const normalizeFilePath = (path) => {
      // Replace backslashes with forward slashes for consistency
      return path.replace(/\\/g, '/');
    };
    
    const normalizedFilePath = normalizeFilePath(filePath);
    
    // First, check if this file is already selected to determine action type
    // Use normalized path for comparison
    const isCurrentlySelected = selectedFiles.some(path => normalizeFilePath(path) === normalizedFilePath);
    
    // Find the file object with more flexible matching
    let file = allFiles.find(f => normalizeFilePath(f.path) === normalizedFilePath);
    
    // If not found with exact match, try to match by the filename (last part of path)
    if (!file) {
      const fileName = normalizedFilePath.split('/').pop();
      file = allFiles.find(f => f.name === fileName);
      console.log(`Trying to find by filename ${fileName}`);
    }
    
    // As a fallback, try to find a file that ends with the same path
    if (!file && nodeData && nodeData.fileData) {
      console.log(`Using node data directly as fallback`);
      file = nodeData.fileData;
    }
    
    // Only proceed if we found the file
    if (!file) {
      console.error(`File not found: ${filePath}`);
      
      // Debug info to help diagnose the issue
      console.log('Available files:');
      allFiles.slice(0, 5).forEach(f => console.log(`- ${f.path} (${f.name})`));
      console.log(`Total files in allFiles: ${allFiles.length}`);
      
      return;
    }
    
    // Get the accurate token count from the file object
    const fileTokens = file.tokenCount || 0;
    
    console.log(`Toggling selection for file: ${file.name}, tokens: ${fileTokens}`);
    console.log(`File ${file.path} is currently ${isCurrentlySelected ? 'selected' : 'not selected'}`);
    
    // Update selected files state
    if (isCurrentlySelected) {
      // Remove the file from selection - using normalized paths
      setSelectedFiles((prev) => prev.filter(path => normalizeFilePath(path) !== normalizedFilePath));
      
      // Only decrement counter for valid files
      if (!file.isBinary && !file.isSkipped) {
        console.log(`Decreasing fileCounter from ${fileCounter} to ${fileCounter - 1}`);
        setFileCounter(current => Math.max(0, current - 1));
        
        console.log(`Decreasing tokenCounter from ${tokenCounter} to ${tokenCounter - fileTokens}`);
        setTokenCounter(current => Math.max(0, current - fileTokens));
        
        console.log(`Decremented counters: file: -1, tokens: -${fileTokens}`);
      }
    } else {
      // Add the normalized file path to selection
      setSelectedFiles((prev) => [...prev, normalizedFilePath]);
      
      // Only increment counter for valid files
      if (!file.isBinary && !file.isSkipped) {
        console.log(`Increasing fileCounter from ${fileCounter} to ${fileCounter + 1}`);
        setFileCounter(current => current + 1);
        
        console.log(`Increasing tokenCounter from ${tokenCounter} to ${tokenCounter + fileTokens}`);
        setTokenCounter(current => current + fileTokens);
        
        console.log(`Incremented counters: file: +1, tokens: +${fileTokens}`);
      }
    }
  };

  // Toggle folder selection (select/deselect all files in folder) - fixed for better folder handling
  const toggleFolderSelection = (folderPath, isSelected) => {
    console.log(`Toggle folder selection: ${folderPath}, isSelected: ${isSelected}`);
    
    // Normalize folder path
    const normalizeFilePath = (path) => {
      return path.replace(/\\/g, '/');
    };
    
    const normalizedFolderPath = normalizeFilePath(folderPath);
    
    // Get all files in this folder and subfolders that are valid (not binary/skipped)
    const filesInFolder = allFiles.filter(
      (file) => {
        const normalizedFilePath = normalizeFilePath(file.path);
        return (normalizedFilePath.startsWith(normalizedFolderPath + "/") || 
                normalizedFilePath === normalizedFolderPath) && 
               !file.isBinary && 
               !file.isSkipped;
      }
    );
    
    console.log(`Found ${filesInFolder.length} valid files in folder ${folderPath}`);

    // Get all normalized file paths in this folder
    const filePaths = filesInFolder.map(file => normalizeFilePath(file.path));
    
    setSelectedFiles(prev => {
      // Normalize all paths in the previous selection
      const normalizedPrev = prev.map(path => normalizeFilePath(path));
      let newSelection;
      
      if (isSelected) {
        // Add all files to selection
        newSelection = [...normalizedPrev];
        let addedCount = 0;
        let addedTokens = 0;
        
        filePaths.forEach(path => {
          if (!newSelection.includes(path)) {
            newSelection.push(path);
            addedCount++;
            
            // Add tokens for this file
            const file = allFiles.find(f => normalizeFilePath(f.path) === path);
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
        // Remove all files in this folder from selection - comparing normalized paths
        const removedPaths = normalizedPrev.filter(path => filePaths.includes(path));
        newSelection = normalizedPrev.filter(path => !filePaths.includes(path));
        
        let removedCount = removedPaths.length;
        let removedTokens = 0;
        
        // Calculate removed tokens
        removedPaths.forEach(path => {
          const file = allFiles.find(f => normalizeFilePath(f.path) === path);
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
  const handleSortOrderChange = (newSortOrder) => {
    setSortOrder(newSortOrder);
    localStorage.setItem(STORAGE_KEYS.SORT_ORDER, newSortOrder);
    applyFiltersAndSort(allFiles, newSortOrder, searchTerm);
  };

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
    
    // Normalize path function
    const normalizeFilePath = (path) => {
      return path.replace(/\\/g, '/');
    };
    
    // Map of normalized paths to file objects for quick lookup
    const filePathMap = new Map();
    allFiles.forEach(file => {
      if (!file.isBinary && !file.isSkipped) {
        filePathMap.set(normalizeFilePath(file.path), file);
      }
    });
    
    // Get the normalized selected paths
    const normalizedSelectedPaths = selectedFiles.map(path => normalizeFilePath(path));
    
    // Get all selected files by directly looking them up in allFiles
    const allSelectedFiles = normalizedSelectedPaths
      .map(path => filePathMap.get(path))
      .filter(Boolean);
    
    if (allSelectedFiles.length === 0) {
      return "No files found in selection for copying.";
    }
    
    // Sort the selected files according to the current sort order
    const [sortKey, sortDir] = sortOrder.split("-");
    allSelectedFiles.sort((a, b) => {
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
    allSelectedFiles.forEach((file) => {
      concatenatedString += `\n\n// ---- File: ${file.path} ----\n\n`;
      concatenatedString += file.content;
    });
    
    return concatenatedString;
  };

  // Handle select all files
  const selectAllFiles = () => {
    // Define path normalization function
    const normalizeFilePath = (path) => {
      return path.replace(/\\/g, '/');
    };
    
    // Get all valid files (not binary/skipped)
    const validFiles = allFiles.filter(file => !file.isBinary && !file.isSkipped);
    
    if (validFiles.length === 0) return;
    
    // Get file paths of all valid files with normalized paths
    const validFilePaths = validFiles.map(file => normalizeFilePath(file.path));
    
    // Calculate total tokens
    const totalTokens = validFiles.reduce((sum, file) => sum + (file.tokenCount || 0), 0);
    
    // Update selected files state with normalized paths
    setSelectedFiles(validFilePaths);
    
    // Update counters
    setFileCounter(validFiles.length);
    setTokenCounter(totalTokens);
    
    console.log(`Selected all ${validFiles.length} files with ${totalTokens} tokens`);
  };

  // Handle deselect all files
  const deselectAllFiles = () => {
    // Clear selected files
    setSelectedFiles([]);
    
    // Reset counters
    setFileCounter(0);
    setTokenCounter(0);
    
    console.log('Deselected all files');
  };

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
  const [isVerticalResize, setIsVerticalResize] = useState(false);
  const pasteSizeRef = useRef(50); // Keep reference to avoid stale closures

  // Check if we're in mobile view (for vertical resize)
  useEffect(() => {
    const checkOrientation = () => {
      setIsVerticalResize(window.innerWidth <= 992);
    };
    
    // Initial check
    checkOrientation();
    
    // Listen for resize events
    window.addEventListener('resize', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
    };
  }, []);

  // Memoize handlers to avoid recreation on each render
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    document.body.classList.add('resizing');
    // Add appropriate resize direction class
    document.body.classList.add(isVerticalResize ? 'vertical-resize' : 'horizontal-resize');
    setIsResizing(true);
    pasteSizeRef.current = 50;
    
    // Capture the initial position of the mouse/touch and handle
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    resizeHandleRef.current = {
      startX: clientX,
      startY: clientY,
      startPasteMaxWidth: pasteSizeRef.current
    };
  }, [isVerticalResize]);

  const handleResizeMove = useCallback(() => {
    // In a fixed-width approach, we don't need resize logic for the browser width
    // The CSS will now handle this with fixed dimensions
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    document.body.classList.remove('resizing');
    document.body.classList.remove('vertical-resize');
    document.body.classList.remove('horizontal-resize');
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
    
    // Normalize node path for consistent comparison
    const normalizedNodePath = node.path.replace(/\\/g, '/');
    
    // Check if file is selected with normalized path
    const isSelected = selectedFiles.some(path => {
      // Normalize selected path
      const normalizedSelectedPath = path.replace(/\\/g, '/');
      return normalizedSelectedPath === normalizedNodePath;
    });
    
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

  // Add state for files popover
  const [showFilesPopover, setShowFilesPopover] = useState(false);
  const filesPopoverRef = useRef(null);

  // Toggle files popover visibility
  const toggleFilesPopover = () => {
    setShowFilesPopover(prev => !prev);
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filesPopoverRef.current && !filesPopoverRef.current.contains(event.target)) {
        setShowFilesPopover(false);
      }
    };

    if (showFilesPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilesPopover]);

  // Get list of selected file names - simplify to ONLY show files the user has manually clicked (blue highlighted)
  const getSelectedFilesList = () => {
    // Normalize path function for consistent comparison
    const normalizeFilePath = (path) => {
      return path.replace(/\\/g, '/');
    };
    
    // Map of normalized paths to file objects for quick lookup
    const filePathMap = new Map();
    allFiles.forEach(file => {
      if (!file.isBinary && !file.isSkipped) {
        filePathMap.set(normalizeFilePath(file.path), file);
      }
    });
    
    // Get the normalized selected paths
    const normalizedSelectedPaths = selectedFiles.map(path => normalizeFilePath(path));
    
    // Get all selected files by directly looking them up in allFiles
    const selectedFilesList = normalizedSelectedPaths
      .map(path => {
        const file = filePathMap.get(path);
        if (file) {
          return {
            name: file.name,
            path: file.path,
            tokenCount: file.tokenCount || 0
          };
        }
        return null;
      })
      .filter(Boolean);
    
    // Sort by token count (largest first)
    return selectedFilesList.sort((a, b) => b.tokenCount - a.tokenCount);
  };

  // Update the renderFileBrowser function
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
          sortOrder={sortOrder}
          onSortChange={handleSortOrderChange}
          getSortLabel={getSortLabel}
          onSelectAll={selectAllFiles}
          onDeselectAll={deselectAllFiles}
        />
        
        <div className="file-browser">
          {buildFileTree().map(node => renderFileTreeNode(node))}
        </div>
      </div>
    );
  };

  // Inside the App component
  const [currentFile, setCurrentFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Add isLoading state
  const [isLoading, setIsLoading] = useState(false);

  // Log when activePage changes
  useEffect(() => {
    console.log('Active page changed to:', activePage);
    if (activePage === 'edit') {
      console.log('Editor page activated - viewedFile:', viewedFile?.path);
      
      // If no file is currently being viewed, we're in "New File" mode
      if (!viewedFile) {
        console.log('No viewed file, editor will start with a blank file');
      }
    }
  }, [activePage, viewedFile]);

  // Update openFile to correctly set viewedFile and switch to edit page
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
      console.log("Opening file:", filePath);
      
      // Read file content
      let fileContent = "";
      if (isElectron) {
        try {
          const result = await window.electron.invoke("read-file", filePath);
          if (result.success) {
            fileContent = result.content;
            console.log("File content loaded successfully:", filePath);
          } else {
            console.error("Error reading file:", result.error || "Unknown error");
            setProcessingStatus({
              status: "error",
              message: `Error reading file: ${result.error || "Unknown error"}`
            });
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error reading file:", error.message || "Unknown error");
          setProcessingStatus({
            status: "error",
            message: `Error reading file: ${error.message || "Unknown error"}`
          });
          setIsLoading(false);
          return;
        }
      } else {
        try {
          // Browser version file loading not implemented
          console.error("Browser-based file loading not implemented");
          return;
        } catch (err) {
          console.error("Error reading file:", err.message || "Unknown error");
          setProcessingStatus({
            status: "error",
            message: `Error reading file: ${err.message || "Unknown error"}`
          });
          setIsLoading(false);
          return;
        }
      }
      
      // Add to recent files
      if (!recentFiles.includes(filePath)) {
        const updatedRecentFiles = [filePath, ...recentFiles.filter(f => f !== filePath)].slice(0, 10);
        setRecentFiles(updatedRecentFiles);
        localStorage.setItem('pastemax-recent-files', JSON.stringify(updatedRecentFiles));
      }
      
      // Create a viewedFile object with required properties
      const fileName = filePath.split('/').pop();
      const viewedFileObj = {
        path: filePath,
        name: fileName,
        content: fileContent
      };
      
      console.log("Setting viewedFile:", viewedFileObj);
      
      // Set the viewedFile
      setViewedFile(viewedFileObj);
      
      // Switch to edit page
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
      console.error("Error opening file:", error.message || "Unknown error");
      setProcessingStatus({
        status: "error",
        message: `Error opening file: ${error.message || "Unknown error"}`
      });
      setIsLoading(false);
    }
  };

  // Function to handle folder navigation
  const handleFolderNavigation = (folderPath) => {
    // Update current folder
    setCurrentDirectory(folderPath);
    
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
      
      console.log("Saving file:", viewedFile.path, "with content length:", content.length);
      
      // Save the file using the electron API
      if (isElectron && window.electron && window.electron.writeFile) {
        const result = await window.electron.writeFile(viewedFile.path, content);
        
        if (result && result.success) {
          console.log("File saved successfully:", viewedFile.path);
          
          // Update the viewedFile with the new content
          setViewedFile({
            ...viewedFile,
            content: content
          });
          
          setProcessingStatus({
            status: "complete",
            message: `File saved: ${viewedFile.name}`
          });
          
          return true;
        } else {
          console.error("Error saving file:", result?.error || "Unknown error");
          setProcessingStatus({
            status: "error",
            message: `Error saving file: ${result?.error || "Unknown error"}`
          });
          return false;
        }
      } else {
        console.error("Electron API not available for saving");
        setProcessingStatus({
          status: "error", 
          message: "File saving not available in this environment"
        });
        return false;
      }
    } catch (error) {
      console.error("Error saving file:", error.message || "Unknown error");
      setProcessingStatus({
        status: "error",
        message: `Error saving file: ${error.message || "Unknown error"}`
      });
      return false;
    }
  };

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
    
    // Sync selections with renderer process - but don't update counters again
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
        const currentSelectionStr = JSON.stringify([...selectedFiles].sort());
        const newSelectionStr = JSON.stringify([...files].sort());
        
        if (currentSelectionStr !== newSelectionStr) {
          // Only update the selected files array, NOT the counters
          // This avoids double-counting when syncing between processes
          console.log('Received selection update from renderer, updating selection only');
          setSelectedFiles(files);
          
          // We need to reset and recalculate counters manually here to avoid double-counting
          let validCount = 0;
          let tokenCount = 0;
          
          // Calculate valid selected files and their token counts
          files.forEach(path => {
            const file = allFiles.find(f => f.path === path);
            if (file && !file.isBinary && !file.isSkipped) {
              validCount++;
              tokenCount += file.tokenCount || 0;
            }
          });
          
          console.log(`Setting counters directly: files=${validCount}, tokens=${tokenCount}`);
          setFileCounter(validCount);
          setTokenCounter(tokenCount);
        }
      };
      
      window.electron.receive("selected-files-updated", handleSelectionUpdate);
      
      return () => {
        // The cleanup function now safely removes listeners
        if (window.electron && window.electron.removeAllListeners) {
          window.electron.removeAllListeners("selected-files-updated");
        }
      };
    }
    
    // Empty return for the case when window.electron is not available
    return () => {};
  }, [selectedFiles, allFiles]);

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

  // Helper function to get a human-readable label for the current sort order
  const getSortLabel = (sortOrder) => {
    const sortMap = {
      'name-asc': 'Name (A-Z)',
      'name-desc': 'Name (Z-A)',
      'tokens-asc': 'Tokens (Low to High)',
      'tokens-desc': 'Tokens (High to Low)',
      'size-asc': 'Size (Small to Large)',
      'size-desc': 'Size (Large to Small)',
      'date-asc': 'Date (Oldest First)',
      'date-desc': 'Date (Newest First)',
      'type-asc': 'Type (A-Z)',
      'type-desc': 'Type (Z-A)'
    };
    
    return sortMap[sortOrder] || 'Default';
  };

  // Process files from Electron
  const processFiles = (files) => {
    if (!files || !Array.isArray(files)) {
      console.error("Invalid files data:", files);
      return [];
    }
    
    // Process files to add token counts and other metadata
    const processedFiles = files.map(file => {
      // Calculate token count if not already present
      if (file.content && !file.tokenCount) {
        // Use the existing token count function
        file.tokenCount = calculateTokenCount(file.content);
      }
      
      // Ensure lastModified is available for date sorting
      if (!file.lastModified && file.stats && file.stats.mtimeMs) {
        file.lastModified = file.stats.mtimeMs;
      }
      
      return file;
    });
    
    return processedFiles;
  };

  // Simple token count calculation (this is a basic implementation)
  const calculateTokenCount = (text) => {
    if (!text) return 0;
    // Simple approximation: split by whitespace and count
    return text.split(/\s+/).length;
  };

  // Add this useEffect to ensure dark mode is applied to the document element
  useEffect(() => {
    // Ensure theme is updated in real-time
    document.documentElement.setAttribute('data-theme', themeMode);
    
    // Add a specific class for the editor
    if (activePage === 'edit') {
      document.documentElement.classList.add('editor-active');
      document.documentElement.classList.add(`editor-${themeMode}`);
    } else {
      document.documentElement.classList.remove('editor-active');
      document.documentElement.classList.remove('editor-dark');
      document.documentElement.classList.remove('editor-light');
    }
  }, [themeMode, activePage]);

  return (
    <div className="app-container" data-theme={themeMode}>
      <div className="header">
        <h1>PasteMax</h1>
        <div className="folder-info">
          {selectedFolder ? (
            <>
              <div className="selected-folder">
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
                  {/* File browser dropdown removed */}
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
                        
                        // Normalize path function for consistent comparison
                        const normalizeFilePath = (path) => {
                          return path.replace(/\\/g, '/');
                        };
                        
                        // Map of normalized paths to file objects for quick lookup
                        const filePathMap = new Map();
                        allFiles.forEach(file => {
                          if (!file.isBinary && !file.isSkipped) {
                            filePathMap.set(normalizeFilePath(file.path), file);
                          }
                        });
                        
                        // Get the normalized selected paths
                        const normalizedSelectedPaths = selectedFiles.map(path => normalizeFilePath(path));
                        
                        // Get all selected files by directly looking them up in allFiles
                        const selectedFilesWithContent = normalizedSelectedPaths
                          .map(path => {
                            const file = filePathMap.get(path);
                            if (file) {
                              return {
                                path: file.path,
                                content: file.content
                              };
                            }
                            return null;
                          })
                          .filter(Boolean);
                        
                        if (selectedFilesWithContent.length === 0) {
                          console.log('No valid files found for prompt engine');
                          return [];
                        }
                        
                        return selectedFilesWithContent;
                      })()}
                      projectRules={(() => {
                        // Get project rules from localStorage
                        try {
                          const savedProjectConfig = localStorage.getItem('project-config');
                          if (savedProjectConfig) {
                            const config = JSON.parse(savedProjectConfig);
                            return config.projectRules || '';
                          }
                        } catch (e) {
                          console.error('Error loading project rules:', e);
                        }
                        return '';
                      })()}
                      fileCounter={fileCounter}
                      tokenCounter={tokenCounter}
                      toggleSidebar={toggleSidebar}
                      sidebarCollapsed={sidebarCollapsed}
                      onClose={() => setActivePage("select")}
                    />
                  )}

                  {activePage === "project" && (
                    <ProjectConfig 
                      currentFolder={selectedFolder}
                      onReload={() => {
                        if (isElectron) {
                          window.electron.send("load-files", selectedFolder);
                        }
                      }}
                    />
                  )}

                  {activePage === "history" && (
                    <div className="history-page">
                      <h2>History</h2>
                      <p>This page will show your recent files and activities.</p>
                    </div>
                  )}

                  {activePage === "edit" && (
                    <div className="full-height-editor-container" style={{
                      backgroundColor: '#1E1E1E',
                      height: 'calc(100vh - 60px)',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden'
                    }}>
                      <EditorPage 
                        filePath={viewedFile ? viewedFile.path : null}
                        content={viewedFile ? viewedFile.content : ''}
                        currentDirectory={selectedFolder}
                        onSave={saveFile}
                        onClose={() => {
                          setViewedFile(null);
                          setActivePage("select");
                        }}
                        onCreateFile={handleFileCreationWithContent}
                        onCreateFolder={handleCreateFolder}
                        onNavigate={navigateToFileFromEditor}
                        fileHistory={fileHistory}
                        theme="dark"
                        recentFiles={recentFiles}
                        recentFolders={recentFolders}
                      />
                    </div>
                  )}

                  {activePage === "settings" && (
                    <div className="settings-page">
                      <h2>Settings</h2>
                      
                      <div className="settings-section">
                        <h3>Theme</h3>
                        <div className="settings-option">
                          <label>
                            <input
                              type="radio"
                              name="theme"
                              value="light"
                              checked={themeMode === 'light'}
                              onChange={() => setThemeMode('light')}
                            />
                            Light
                          </label>
                          
                          <label>
                            <input
                              type="radio"
                              name="theme"
                              value="dark"
                              checked={themeMode === 'dark'}
                              onChange={() => setThemeMode('dark')}
                            />
                            Dark
                          </label>
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
                  theme="dark"
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
                className={`resize-handle ${isVerticalResize ? 'vertical' : 'horizontal'}`}
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
      
      {/* File Selection Counter - moved outside the main structure to fix positioning */}
      {selectedFolder && (
        <div className={`file-selection-counter ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="files-counter-label" onClick={toggleFilesPopover}>
            <span className="counter-label">Selected Files:</span>
            <span className="counter-value">{fileCounter}</span>
          </div>
          
          {showFilesPopover && (
            <div className={`selected-files-popover ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} ref={filesPopoverRef}>
              <div className="popover-header">
                <h3>Selected Files</h3>
                <button 
                  className="close-popover-btn"
                  onClick={() => setShowFilesPopover(false)}
                >
                  ×
                </button>
              </div>
              <div className="selected-files-list">
                {getSelectedFilesList().length > 0 ? (
                  getSelectedFilesList().map((file, index) => (
                    <div key={index} className="selected-file-item">
                      <span className="selected-file-name">{file.name}</span>
                      <span className="selected-file-tokens">{file.tokenCount.toLocaleString()} tokens</span>
                    </div>
                  ))
                ) : (
                  <div className="no-files-message">No files selected</div>
                )}
              </div>
            </div>
          )}
          
          <span className="token-counter">
            <span className="counter-label">Total Tokens:</span>
            <span className="counter-value">{tokenCounter.toLocaleString()}</span>
          </span>
          
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
            disabled={fileCounter === 0}
          >
            Copy
          </button>
          
          <button
            className="counter-clear-btn"
            onClick={resetCounters}
            disabled={fileCounter === 0}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default App; 