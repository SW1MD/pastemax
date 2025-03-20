const { app, BrowserWindow, ipcMain, dialog, session } = require("electron");
const { existsSync, writeFileSync, statSync, mkdirSync, readFileSync, readdirSync, accessSync, constants, rmdirSync, unlinkSync } = require("fs");
const { join, extname, relative, basename } = require("path");
const windowStateKeeper = require('electron-window-state');
const path = require('path');

// Add handling for the 'ignore' module
let ignore;
try {
  ignore = require("ignore");
} catch (err) {
  // Simple fallback implementation for when the ignore module fails to load
  ignore = {
    // Simple implementation that just matches exact paths
    createFilter: () => {
      return (path) => !excludedFiles.includes(path);
    },
  };
}

// Initialize tokenizer with better error handling
let tiktoken;
try {
  tiktoken = require("tiktoken");
} catch (err) {
  tiktoken = null;
}

// Import the excluded files list using require
const { excludedFiles, binaryExtensions } = require("./excluded-files");

// Initialize the encoder once at startup with better error handling
let encoder;
try {
  if (tiktoken) {
    encoder = tiktoken.get_encoding("o200k_base"); // gpt-4o encoding
  } else {
    throw new Error("Tiktoken module not available");
  }
} catch (err) {
  encoder = null;
}

// Binary file extensions that should be excluded from token counting
const BINARY_EXTENSIONS = [
  // Images
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".tiff",
  ".ico",
  ".webp",
  ".svg",
  // Audio/Video
  ".mp3",
  ".mp4",
  ".wav",
  ".ogg",
  ".avi",
  ".mov",
  ".mkv",
  ".flac",
  // Archives
  ".zip",
  ".rar",
  ".tar",
  ".gz",
  ".7z",
  // Documents
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  // Compiled
  ".exe",
  ".dll",
  ".so",
  ".class",
  ".o",
  ".pyc",
  // Database
  ".db",
  ".sqlite",
  ".sqlite3",
  // Others
  ".bin",
  ".dat",
].concat(binaryExtensions || []); // Add any additional binary extensions from excluded-files.js

// Max file size to read (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

let mainWindow = null;

// Add a helper function for detailed logging
function logWithDetails(message, error = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  if (error) {
    // Removed console.error
  } else {
    // Removed console.log
  }
}

// Log app data paths
logWithDetails(`App data path: ${app.getPath('userData')}`);
logWithDetails(`App cache path: ${app.getPath('cache')}`);
logWithDetails(`App temp path: ${app.getPath('temp')}`);

// Add a function to check if files in a directory are locked
function checkLockedFiles(directoryPath) {
  logWithDetails(`Checking for locked files in: ${directoryPath}`);
  
  if (!existsSync(directoryPath)) {
    logWithDetails(`Directory does not exist: ${directoryPath}`);
    return;
  }
  
  try {
    const files = readdirSync(directoryPath);
    logWithDetails(`Found ${files.length} files in ${directoryPath}`);
    
    files.forEach(file => {
      const filePath = join(directoryPath, file);
      try {
        // Try to open the file for writing to check if it's locked
        accessSync(filePath, constants.W_OK);
        logWithDetails(`File is accessible: ${filePath}`);
      } catch (err) {
        logWithDetails(`File is locked or inaccessible: ${filePath}`, err);
      }
    });
  } catch (err) {
    logWithDetails(`Error reading directory: ${directoryPath}`, err);
  }
}

// Add a function to clean up cache directory
function cleanupCacheDirectory(directoryPath) {
  logWithDetails(`Attempting to clean up cache directory: ${directoryPath}`);
  
  if (!existsSync(directoryPath)) {
    logWithDetails(`Directory does not exist: ${directoryPath}`);
    return;
  }
  
  try {
    // First try to delete the entire directory and recreate it
    try {
      rmdirSync(directoryPath, { recursive: true });
      logWithDetails(`Successfully deleted cache directory: ${directoryPath}`);
      mkdirSync(directoryPath, { recursive: true });
      logWithDetails(`Successfully recreated cache directory: ${directoryPath}`);
      return true;
    } catch (err) {
      logWithDetails(`Could not delete entire cache directory, will try individual files`, err);
    }
    
    // If that fails, try to delete individual files
    const files = readdirSync(directoryPath);
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = join(directoryPath, file);
      try {
        unlinkSync(filePath);
        deletedCount++;
      } catch (err) {
        logWithDetails(`Could not delete file: ${filePath}`, err);
      }
    }
    
    logWithDetails(`Deleted ${deletedCount} of ${files.length} files from ${directoryPath}`);
    return deletedCount > 0;
  } catch (err) {
    logWithDetails(`Error cleaning up cache directory: ${directoryPath}`, err);
    return false;
  }
}

// Add a more robust function to initialize cache
function initializeCache() {
  logWithDetails("Initializing cache directories");
  
  try {
    // Configure Electron to use different cache directories
    // This can help avoid permission issues with existing cache
    const userDataPath = app.getPath('userData');
    const customCachePath = join(userDataPath, 'CustomCache');
    
    try {
      app.commandLine.appendSwitch('disk-cache-dir', customCachePath);
      app.commandLine.appendSwitch('disable-http-cache');
      logWithDetails(`Set custom cache directory to: ${customCachePath}`);
      
      // Create custom cache directory if it doesn't exist
      if (!existsSync(customCachePath)) {
        mkdirSync(customCachePath, { recursive: true });
        logWithDetails(`Created custom cache directory: ${customCachePath}`);
      }
    } catch (switchErr) {
      logWithDetails("Error setting cache switches", switchErr);
    }
    
    // Define cache directories to clean/create
    const cacheDirs = [
      join(userDataPath, 'Cache'),
      join(userDataPath, 'GPUCache'),
      join(userDataPath, 'Code Cache'),
      join(userDataPath, 'DawnGraphiteCache'),
      join(userDataPath, 'DawnWebGPUCache'),
      join(userDataPath, 'blob_storage')
    ];
    
    // Process each cache directory with improved error handling
    cacheDirs.forEach(dir => {
      try {
        if (existsSync(dir)) {
          logWithDetails(`Cache directory exists: ${dir}`);
          
          // Instead of deleting files that might be in use, we'll just ensure
          // the directory is writable and let Electron manage the files
          try {
            accessSync(dir, constants.W_OK);
            logWithDetails(`Cache directory is writable: ${dir}`);
          } catch (accessErr) {
            logWithDetails(`Cannot write to cache directory: ${dir}`, accessErr);
            
            // Try to create a new directory with a different name
            const altDir = `${dir}_new`;
            try {
              if (!existsSync(altDir)) {
                mkdirSync(altDir, { recursive: true });
                logWithDetails(`Created alternative cache directory: ${altDir}`);
              }
            } catch (altErr) {
              logWithDetails(`Failed to create alternative cache directory`, altErr);
            }
          }
        } else {
          // Create if doesn't exist
          logWithDetails(`Creating cache directory: ${dir}`);
          try {
            mkdirSync(dir, { recursive: true });
          } catch (createErr) {
            logWithDetails(`Error creating cache directory: ${dir}`, createErr);
          }
        }
      } catch (err) {
        logWithDetails(`Error processing cache directory: ${dir}`, err);
      }
    });
    
    logWithDetails("Cache initialization completed");
  } catch (err) {
    logWithDetails("Cache initialization failed", err);
  }
}

function createWindow() {
  // Log before window state initialization
  logWithDetails("Starting window creation process");
  
  // Initialize cache before creating the window
  initializeCache();
  
  // Load the previous state with fallback to defaults
  const mainWindowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 800
  });
  
  logWithDetails("Window state loaded");

  // Add GPU-related flags to improve stability
  try {
    // Hardware acceleration can cause issues, disable if having GPU problems
    // app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('disable-gpu-compositing');
    app.commandLine.appendSwitch('disable-gpu-memory-buffer-video-frames');
    app.commandLine.appendSwitch('disable-accelerated-video-decode');
    app.commandLine.appendSwitch('disable-accelerated-video-encode');
    logWithDetails("Set GPU optimization flags");
  } catch (err) {
    logWithDetails("Error setting GPU flags", err);
  }

  // Add cache directory check
  const cachePath = app.getPath('cache');
  logWithDetails(`Main cache directory: ${cachePath}`);
  
  try {
    if (!existsSync(cachePath)) {
      logWithDetails(`Main cache directory doesn't exist, creating: ${cachePath}`);
      mkdirSync(cachePath, { recursive: true });
    } else {
      logWithDetails(`Main cache directory exists: ${cachePath}`);
      // Instead of just checking locked files, attempt gentle cleanup
      try {
        const files = readdirSync(cachePath);
        logWithDetails(`Found ${files.length} files in main cache directory`);
        
        // Clean up files that might be causing problems
        for (const file of files) {
          try {
            const filePath = join(cachePath, file);
            if (statSync(filePath).isFile()) {
              try {
                unlinkSync(filePath);
                logWithDetails(`Cleaned up cache file: ${filePath}`);
              } catch (unlinkErr) {
                // If we can't delete, just log and continue
                logWithDetails(`Could not clean cache file: ${filePath}`, unlinkErr);
              }
            }
          } catch (fileErr) {
            logWithDetails(`Error processing cache file: ${file}`, fileErr);
          }
        }
      } catch (readErr) {
        logWithDetails(`Cannot read main cache directory`, readErr);
      }
    }
  } catch (err) {
    logWithDetails(`Error with main cache directory`, err);
  }

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, "preload.js"),
      webviewTag: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      backgroundThrottling: false, // Prevent throttling when hidden
      // Add these lines to control GPU-related features
      disableBlinkFeatures: "AcceleratedVideo",
      offscreen: false,
      devTools: {
        isDevToolsExtension: false,
        htmlFullscreen: false,
      },
    },
  });

  // Configure session for improved caching behavior
  const ses = mainWindow.webContents.session;
  ses.clearCache().then(() => {
    logWithDetails("Session cache cleared");
  }).catch(err => {
    logWithDetails("Error clearing session cache", err);
  });

  // Let us register listeners on the window, so we can update the state
  mainWindowState.manage(mainWindow);

  // Hide window instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide(); // Just hide the window, don't minimize
      return false;
    }
    return true;
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Configure session permissions with logging
  logWithDetails("Configuring session permissions");
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    logWithDetails(`Received headers for URL: ${details.url}`);
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' * 'unsafe-inline' 'unsafe-eval' data: blob:"]
      }
    });
  });

  // Allow webview to make requests to Google and other domains
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({ requestHeaders: details.requestHeaders });
  });

  // Set custom CSP header to allow webview content to be loaded
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    if (details.responseHeaders['Content-Security-Policy']) {
      delete details.responseHeaders['Content-Security-Policy'];
    }
    
    callback({ 
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-src *"]
      } 
    });
  });

  // In development, load from Vite dev server
  // In production, load from built files
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    // Use the URL provided by the dev script, or fall back to default
    const startUrl = process.env.ELECTRON_START_URL || "http://localhost:3000";
    // Wait a moment for dev server to be ready
    setTimeout(() => {
      // Clear any cached data to prevent redirection loops
      logWithDetails("Clearing cache in development mode");
      mainWindow.webContents.session.clearCache().then(() => {
        logWithDetails("Cache cleared successfully");
        mainWindow.loadURL(startUrl);
        // Open DevTools in development mode with options to reduce warnings
        if (mainWindow.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools();
        }
        mainWindow.webContents.openDevTools({ mode: "detach" });
        logWithDetails(`Loading from dev server at ${startUrl}`);
      }).catch(err => {
        logWithDetails("Error clearing cache", err);
        // Try to load URL anyway
        mainWindow.loadURL(startUrl);
      });
    }, 1000);
  } else {
    // Check all possible paths for index.html, same as in the main load logic
    const possiblePaths = [
      join(__dirname, "dist", "index.html"),
      join(__dirname, "index.html"),
      join(process.cwd(), "dist", "index.html"),
      join(process.cwd(), "index.html")
    ];
    
    // Find the first path that exists
    let validPath = null;
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        validPath = path;
        logWithDetails(`Found valid index.html at: ${validPath}`);
        break;
      }
    }
    
    if (validPath) {
      // Use loadFile with the resolved path
      mainWindow.loadFile(validPath);
    } else {
      // No valid path found, show error
      logWithDetails("ERROR: Could not find index.html at any location");
      mainWindow.loadURL(`data:text/html,<html><body><h1>Error: Could not load application</h1><p>The application files could not be found. Please reinstall the application.</p></body></html>`);
    }
  }

  // Add basic error handling for failed loads
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription, validatedURL) => {
      logWithDetails(
        `Failed to load the application: ${errorDescription} (${errorCode})`,
      );
      logWithDetails(`Attempted to load URL: ${validatedURL}`);

      if (isDev) {
        const retryUrl =
          process.env.ELECTRON_START_URL || "http://localhost:3000";
        // Clear cache before retrying
        logWithDetails("Clearing cache before retry");
        mainWindow.webContents.session.clearCache().then(() => {
          logWithDetails("Cache cleared successfully before retry");
          setTimeout(() => mainWindow.loadURL(retryUrl), 1000);
        }).catch(err => {
          logWithDetails("Error clearing cache before retry", err);
          // Try to load URL anyway
          setTimeout(() => mainWindow.loadURL(retryUrl), 1000);
        });
      } else {
        // Retry with explicit file URL
        const indexPath = join(__dirname, "dist", "index.html");
        if (existsSync(indexPath)) {
          logWithDetails(`Retrying with file: ${indexPath}`);
          mainWindow.loadFile(indexPath);
        } else {
          logWithDetails(`ERROR: index.html not found during retry at ${indexPath}`);
          // Show an error page
          mainWindow.loadURL(`data:text/html,<html><body><h1>Error: Could not load application</h1><p>The application files could not be found. Please reinstall the application.</p></body></html>`);
        }
      }
    },
  );
}

// Add logging for app lifecycle events
app.on('ready', () => {
  logWithDetails("App ready event fired");
});

app.on('window-all-closed', () => {
  logWithDetails("All windows closed event fired");
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  logWithDetails("App before-quit event fired");
  app.isQuitting = true;
});

app.whenReady().then(() => {
  logWithDetails("App is ready, initializing cache...");
  
  // Initialize cache before creating window
  initializeCache();
  
  logWithDetails("Creating window after cache initialization");
  createWindow();

  app.on("activate", () => {
    // Show window if exists, create if doesn't
    if (mainWindow === null) {
      logWithDetails("Activate event fired, creating new window");
      createWindow();
    } else {
      // Restore and focus the window
      logWithDetails("Activate event fired, restoring existing window");
      mainWindow.restore();
      mainWindow.focus();
    }
  });
});

// Handle folder selection
ipcMain.on("open-folder", async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });

  if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    try {
      // Ensure we're only sending a string, not an object
      const pathString = String(selectedPath);
      event.sender.send("folder-selected", pathString);
    } catch (err) {
      event.sender.send("folder-selected", null);
    }
  }
});

// Handle creating a new file
ipcMain.on("create-file", (event, { folderPath, fileName }) => {
  try {
    const filePath = join(folderPath, fileName);
    
    // Check if file already exists
    if (existsSync(filePath)) {
      event.sender.send("file-created", { 
        success: false, 
        error: "File already exists" 
      });
      return;
    }
    
    // Create the file with empty content
    writeFileSync(filePath, "");
    
    // Read the file info to return
    const stats = statSync(filePath);
    const fileData = {
      name: fileName,
      path: filePath,
      content: "",
      tokenCount: 0,
      size: stats.size,
      isBinary: false,
      isSkipped: false,
      fileType: extname(fileName).slice(1) || "txt"
    };
    
    event.sender.send("file-created", { 
      success: true, 
      file: fileData 
    });
  } catch (err) {
    event.sender.send("file-created", {
      success: false,
      error: err.message
    });
  }
});

// Handle creating a new folder
ipcMain.on("create-folder", (event, { folderPath, folderName }) => {
  try {
    const newFolderPath = join(folderPath, folderName);
    
    // Check if folder already exists
    if (existsSync(newFolderPath)) {
      event.sender.send("folder-created", { 
        success: false, 
        error: "Folder already exists" 
      });
      return;
    }
    
    // Create the folder
    mkdirSync(newFolderPath);
    
    event.sender.send("folder-created", { 
      success: true, 
      path: newFolderPath 
    });
  } catch (err) {
    event.sender.send("folder-created", {
      success: false,
      error: err.message
    });
  }
});

// Function to parse .gitignore file if it exists
function loadGitignore(rootDir) {
  const ig = ignore();
  const gitignorePath = join(rootDir, ".gitignore");

  if (existsSync(gitignorePath)) {
    const gitignoreContent = readFileSync(gitignorePath, "utf8");
    ig.add(gitignoreContent);
  }

  // Add some default ignores that are common
  ig.add([".git", "node_modules", ".DS_Store"]);

  // Add the excludedFiles patterns for gitignore-based exclusion
  ig.add(excludedFiles);

  return ig;
}

// Check if file is binary based on extension
function isBinaryFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.includes(ext);
}

// Count tokens using tiktoken with o200k_base encoding
function countTokens(text) {
  // Simple fallback implementation if encoder fails
  if (!encoder) {
    // Very rough estimate: ~4 characters per token on average
    return Math.ceil(text.length / 4);
  }

  try {
    const tokens = encoder.encode(text);
    return tokens.length;
  } catch (err) {
    console.error("Error counting tokens:", err);
    // Fallback to character-based estimation on error
    return Math.ceil(text.length / 4);
  }
}

// Function to recursively read files from a directory
function readFilesRecursively(dir, rootDir, ignoreFilter) {
  rootDir = rootDir || dir;
  ignoreFilter = ignoreFilter || loadGitignore(rootDir);

  let results = [];

  try {
    const dirents = readdirSync(dir, { withFileTypes: true });

    // Process directories first, then files
    const directories = [];
    const files = [];

    dirents.forEach((dirent) => {
      const fullPath = join(dir, dirent.name);
      const relativePath = relative(rootDir, fullPath);

      // Skip if the path is ignored
      if (ignoreFilter.ignores(relativePath)) {
        return;
      }

      if (dirent.isDirectory()) {
        directories.push(dirent);
      } else if (dirent.isFile()) {
        files.push(dirent);
      }
    });

    // Process directories first
    directories.forEach((dirent) => {
      const fullPath = join(dir, dirent.name);
      // Recursively read subdirectory
      results = results.concat(
        readFilesRecursively(fullPath, rootDir, ignoreFilter),
      );
    });

    // Then process files
    files.forEach((dirent) => {
      const fullPath = join(dir, dirent.name);
      try {
        // Get file stats for size
        const stats = statSync(fullPath);
        const fileSize = stats.size;

        // Skip files that are too large
        if (fileSize > MAX_FILE_SIZE) {
          results.push({
            name: dirent.name,
            path: fullPath,
            tokenCount: 0,
            size: fileSize,
            content: "",
            isBinary: false,
            isSkipped: true,
            error: "File too large to process",
          });
          return;
        }

        // Check if the file is binary
        const isBinary = isBinaryFile(fullPath);

        if (isBinary) {
          // Skip token counting for binary files
          results.push({
            name: dirent.name,
            path: fullPath,
            tokenCount: 0,
            size: fileSize,
            content: "",
            isBinary: true,
            isSkipped: false,
            fileType: extname(fullPath).substring(1).toUpperCase(),
          });
        } else {
          // Read file content
          const fileContent = readFileSync(fullPath, "utf8");

          // Calculate token count
          const tokenCount = countTokens(fileContent);

          // Add file info with content and token count
          results.push({
            name: dirent.name,
            path: fullPath,
            content: fileContent,
            tokenCount: tokenCount,
            size: fileSize,
            isBinary: false,
            isSkipped: false,
          });
        }
      } catch (err) {
        console.error(`Error reading file ${fullPath}:`, err);
        results.push({
          name: dirent.name,
          path: fullPath,
          tokenCount: 0,
          size: 0,
          isBinary: false,
          isSkipped: true,
          error: "Could not read file",
        });
      }
    });
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err);
  }

  return results;
}

// Function to process folder and send results to the specified webContents
function processFolder(folderPath, sender) {
  if (!folderPath) {
    sender.send("file-list-data", []);
    return;
  }
  
  try {
    // Send initial progress update
    sender.send("file-processing-status", {
      status: "processing",
      message: "Scanning directory structure...",
    });

    // Process files in chunks to avoid blocking the UI
    const processFiles = () => {
      const files = readFilesRecursively(folderPath, folderPath);

      // Update with processing complete status
      sender.send("file-processing-status", {
        status: "complete",
        message: `Found ${files.length} files`,
      });

      // Process the files to ensure they're serializable
      const serializableFiles = files.map((file) => {
        // Create a clean file object
        return {
          name: file.name ? String(file.name) : "",
          path: file.path ? String(file.path) : "",
          tokenCount: typeof file.tokenCount === "number" ? file.tokenCount : 0,
          size: typeof file.size === "number" ? file.size : 0,
          content: file.isBinary
            ? ""
            : typeof file.content === "string"
            ? file.content
            : "",
          isBinary: Boolean(file.isBinary),
          isSkipped: Boolean(file.isSkipped),
          error: file.error ? String(file.error) : null,
          fileType: file.fileType ? String(file.fileType) : null,
          excludedByDefault: shouldExcludeByDefault(file.path, folderPath), // Add new flag to identify excluded files
        };
      });

      try {
        sender.send("file-list-data", serializableFiles);
      } catch (sendErr) {
        sender.send("file-list-data", []);
      }
    };

    // Use setTimeout to allow UI to update before processing starts
    setTimeout(processFiles, 100);
  } catch (err) {
    sender.send("file-processing-status", {
      status: "error",
      message: "Error processing directory",
    });
    sender.send("file-list-data", []);
  }
}

// Handle file list request
ipcMain.on("request-file-list", (event, folderPath) => {
  processFolder(folderPath, event.sender);
});

// Handle file selection synchronization
ipcMain.on("update-selected-files", (event, selectedFiles) => {
  // Relay to all windows except sender
  BrowserWindow.getAllWindows().forEach(window => {
    if (window.webContents.id !== event.sender.id) {
      window.webContents.send("update-selected-files", selectedFiles);
    }
  });
});

ipcMain.on("selected-files-updated", (event, selectedFiles) => {
  // Relay to all windows except sender
  BrowserWindow.getAllWindows().forEach(window => {
    if (window.webContents.id !== event.sender.id) {
      window.webContents.send("selected-files-updated", selectedFiles);
    }
  });
});

// Handle file writing
ipcMain.on("write-file", (event, { filePath, content }) => {
  try {
    // Write content to file
    writeFileSync(filePath, content, 'utf8');
    
    // Report success
    event.sender.send("file-saved", { 
      success: true, 
      path: filePath 
    });
  } catch (err) {
    event.sender.send("file-saved", {
      success: false,
      error: err.message
    });
  }
});

// Handle file reading
ipcMain.on("read-file", (event, filePath) => {
  try {
    // Read file content
    const content = readFileSync(filePath, 'utf8');
    
    // Report success with content
    event.sender.send("file-read", { 
      success: true, 
      path: filePath,
      content: content
    });
  } catch (err) {
    event.sender.send("file-read", {
      success: false,
      error: err.message
    });
  }
});

// Handle token counting
ipcMain.on("count-tokens", (event, content) => {
  try {
    // Calculate token count
    const tokenCount = countTokens(content);
    
    // Report success with token count
    event.sender.send("tokens-counted", { 
      success: true,
      tokenCount: tokenCount
    });
  } catch (err) {
    console.error("Error counting tokens:", err);
    event.sender.send("tokens-counted", { 
      success: false, 
      error: err.message
    });
  }
});

// Handle file refresh after save
ipcMain.on("refresh-file", (event, filePath) => {
  try {
    // Check if file exists
    if (!existsSync(filePath)) {
      event.sender.send("file-refreshed", { 
        success: false, 
        error: "File not found",
        path: filePath
      });
      return;
    }
    
    // Read file content
    const stats = statSync(filePath);
    const fileSize = stats.size;
    
    // Skip files that are too large
    if (fileSize > MAX_FILE_SIZE) {
      event.sender.send("file-refreshed", { 
        success: true, 
        file: {
          name: basename(filePath),
          path: filePath,
          tokenCount: 0,
          size: fileSize,
          content: "",
          isBinary: false,
          isSkipped: true,
          error: "File too large to process",
        }
      });
      return;
    }
    
    // Check if the file is binary
    const isBinary = isBinaryFile(filePath);
    
    if (isBinary) {
      // Skip token counting for binary files
      event.sender.send("file-refreshed", { 
        success: true, 
        file: {
          name: basename(filePath),
          path: filePath,
          tokenCount: 0,
          size: fileSize,
          content: "",
          isBinary: true,
          isSkipped: false,
          fileType: extname(filePath).substring(1).toUpperCase(),
        }
      });
    } else {
      // Read file content
      const fileContent = readFileSync(filePath, "utf8");
      
      // Calculate token count
      const tokenCount = countTokens(fileContent);
      
      // Send updated file info
      event.sender.send("file-refreshed", { 
        success: true, 
        file: {
          name: basename(filePath),
          path: filePath,
          content: fileContent,
          tokenCount: tokenCount,
          size: fileSize,
          isBinary: false,
          isSkipped: false,
        }
      });
    }
  } catch (err) {
    event.sender.send("file-refreshed", { 
      success: false, 
      error: err.message,
      path: filePath
    });
  }
});

// Check if a file should be excluded by default, using glob matching
function shouldExcludeByDefault(filePath, rootDir) {
  const relativePath = relative(rootDir, filePath);
  const relativePathNormalized = relativePath.replace(/\\/g, "/"); // Normalize for consistent pattern matching

  // Use the ignore package to do glob pattern matching
  const ig = ignore().add(excludedFiles);
  return ig.ignores(relativePathNormalized);
}

// Handle file opening dialog
ipcMain.on("open-file", (event) => {
  dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      try {
        const content = readFileSync(filePath, 'utf8');
        event.sender.send("file-opened", { 
          success: true, 
          path: filePath,
          content: content
        });
      } catch (err) {
        event.sender.send("file-opened", { 
          success: false, 
          error: err.message,
          path: filePath
        });
      }
    }
  }).catch(err => {
    event.sender.send("file-opened", { 
      success: false, 
      error: err.message 
    });
  });
});

// Add tray click handler if needed
ipcMain.on("show-window", () => {
  if (mainWindow) {
    mainWindow.show();
  }
});

// Handle save dialog
ipcMain.on("show-save-dialog", (event) => {
  dialog.showSaveDialog({
    properties: ['createDirectory', 'showOverwriteConfirmation'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'JavaScript', extensions: ['js', 'jsx', 'ts', 'tsx'] },
      { name: 'HTML', extensions: ['html', 'htm'] },
      { name: 'CSS', extensions: ['css', 'scss', 'sass'] },
      { name: 'JSON', extensions: ['json'] }
    ]
  }).then(result => {
    event.sender.send("save-dialog-response", result);
  }).catch(err => {
    event.sender.send("save-dialog-response", { 
      canceled: true, 
      error: err.message 
    });
  });
});

