const { app, BrowserWindow, ipcMain, dialog, session } = require("electron");
const { existsSync, writeFileSync, statSync, mkdirSync, readFileSync, readdirSync } = require("fs");
const { join, extname, relative, basename } = require("path");
const windowStateKeeper = require('electron-window-state');

// Add handling for the 'ignore' module
let ignore;
try {
  ignore = require("ignore");
  console.log("Successfully loaded ignore module");
} catch (err) {
  console.error("Failed to load ignore module:", err);
  // Simple fallback implementation for when the ignore module fails to load
  ignore = {
    // Simple implementation that just matches exact paths
    createFilter: () => {
      return (path) => !excludedFiles.includes(path);
    },
  };
  console.log("Using fallback for ignore module");
}

// Initialize tokenizer with better error handling
let tiktoken;
try {
  tiktoken = require("tiktoken");
  console.log("Successfully loaded tiktoken module");
} catch (err) {
  console.error("Failed to load tiktoken module:", err);
  tiktoken = null;
}

// Import the excluded files list using require
const { excludedFiles, binaryExtensions } = require("./excluded-files");

// Initialize the encoder once at startup with better error handling
let encoder;
try {
  if (tiktoken) {
    encoder = tiktoken.get_encoding("o200k_base"); // gpt-4o encoding
    console.log("Tiktoken encoder initialized successfully");
  } else {
    throw new Error("Tiktoken module not available");
  }
} catch (err) {
  console.error("Failed to initialize tiktoken encoder:", err);
  // Fallback to a simpler method if tiktoken fails
  console.log("Using fallback token counter");
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

function createWindow() {
  // Load the previous state with fallback to defaults
  const mainWindowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 800
  });

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
      devTools: {
        isDevToolsExtension: false,
        htmlFullscreen: false,
      },
    },
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

  // Configure session permissions
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
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
      mainWindow.webContents.session.clearCache().then(() => {
        mainWindow.loadURL(startUrl);
        // Open DevTools in development mode with options to reduce warnings
        if (mainWindow.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools();
        }
        mainWindow.webContents.openDevTools({ mode: "detach" });
        console.log(`Loading from dev server at ${startUrl}`);
      });
    }, 1000);
  } else {
    const indexPath = join(__dirname, "dist", "index.html");
    console.log(`Loading from built files at ${indexPath}`);

    // Use loadURL with file protocol for better path resolution
    const indexUrl = `file://${indexPath}`;
    mainWindow.loadURL(indexUrl);
  }

  // Add basic error handling for failed loads
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription, validatedURL) => {
      console.error(
        `Failed to load the application: ${errorDescription} (${errorCode})`,
      );
      console.error(`Attempted to load URL: ${validatedURL}`);

      if (isDev) {
        const retryUrl =
          process.env.ELECTRON_START_URL || "http://localhost:3000";
        // Clear cache before retrying
        mainWindow.webContents.session.clearCache().then(() => {
          setTimeout(() => mainWindow.loadURL(retryUrl), 1000);
        });
      } else {
        // Retry with explicit file URL
        const indexPath = join(__dirname, "dist", "index.html");
        const indexUrl = `file://${indexPath}`;
        mainWindow.loadURL(indexUrl);
      }
    },
  );
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    // Show window if exists, create if doesn't
    if (mainWindow === null) {
      createWindow();
    } else {
      // Restore and focus the window
      mainWindow.restore();
      mainWindow.focus();
    }
  });
});

// Set quitting flag before quit
app.on('before-quit', () => {
  app.isQuitting = true;
});

// Handle window-all-closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
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
      console.log("Sending folder-selected event with path:", pathString);
      event.sender.send("folder-selected", pathString);
    } catch (err) {
      console.error("Error sending folder-selected event:", err);
      // Try a more direct approach as a fallback
      event.sender.send("folder-selected", String(selectedPath));
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
    console.error("Error creating file:", err);
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
    console.error("Error creating folder:", err);
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

// Handle file list request
ipcMain.on("request-file-list", (event, folderPath) => {
  try {
    console.log("Processing file list for folder:", folderPath);

    // Send initial progress update
    event.sender.send("file-processing-status", {
      status: "processing",
      message: "Scanning directory structure...",
    });

    // Process files in chunks to avoid blocking the UI
    const processFiles = () => {
      const files = readFilesRecursively(folderPath, folderPath);

      // Update with processing complete status
      event.sender.send("file-processing-status", {
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
        console.log(`Sending ${serializableFiles.length} files to renderer`);
        event.sender.send("file-list-data", serializableFiles);
      } catch (sendErr) {
        console.error("Error sending file data:", sendErr);

        // If sending fails, try again with minimal data
        const minimalFiles = serializableFiles.map((file) => ({
          name: file.name,
          path: file.path,
          tokenCount: file.tokenCount,
          size: file.size,
          isBinary: file.isBinary,
          isSkipped: file.isSkipped,
          excludedByDefault: file.excludedByDefault,
        }));

        event.sender.send("file-list-data", minimalFiles);
      }
    };

    // Use setTimeout to allow UI to update before processing starts
    setTimeout(processFiles, 100);
  } catch (err) {
    console.error("Error reading directory:", err);
    event.sender.send("file-processing-status", {
      status: "error",
      message: "Error processing directory",
    });
    event.sender.send("file-list-data", []);
  }
});

// Handle file writing
ipcMain.on("write-file", (event, { filePath, content }) => {
  try {
    console.log("Writing to file:", filePath);
    
    // Write content to file
    writeFileSync(filePath, content, 'utf8');
    
    // Report success
    event.sender.send("file-saved", { 
      success: true, 
      path: filePath 
    });
    
    console.log("File saved successfully:", filePath);
  } catch (err) {
    console.error("Error writing file:", err);
    event.sender.send("file-saved", { 
      success: false, 
      error: err.message,
      path: filePath
    });
  }
});

// Handle file reading
ipcMain.on("read-file", (event, filePath) => {
  try {
    console.log("Reading file:", filePath);
    
    // Read file content
    const content = readFileSync(filePath, 'utf8');
    
    // Report success with content
    event.sender.send("file-read", { 
      success: true, 
      path: filePath,
      content: content
    });
    
    console.log("File read successfully:", filePath);
  } catch (err) {
    console.error("Error reading file:", err);
    event.sender.send("file-read", { 
      success: false, 
      error: err.message,
      path: filePath
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
    console.error("Error refreshing file:", err);
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

