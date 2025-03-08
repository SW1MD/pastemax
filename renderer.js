// Use the exposed electron API instead of direct require
// const { ipcRenderer } = require("electron");

// Track selected files
let selectedFiles = [];
let allFiles = []; // Store all file data
let displayedFiles = []; // Files after filtering and sorting
let currentSort = "name-asc"; // Default sort
let currentFilter = ""; // Current filter text

const openFolderButton = document.getElementById("open-folder-button");
const selectAllButton = document.getElementById("select-all-button");
const deselectAllButton = document.getElementById("deselect-all-button");
const sortDropdown = document.getElementById("sort-dropdown");
const filterInput = document.getElementById("filter-input");
const copyButton = document.getElementById("copy-button");
const copyStatus = document.getElementById("copy-status");

openFolderButton.addEventListener("click", () => {
  // Use the exposed IPC method from preload.js
  window.electron.send("open-folder");
});

// Set up the IPC listeners using the exposed API
window.electron.receive("folder-selected", (selectedPath) => {
  // Store or display the selected path
  const selectedFolderDisplay = document.getElementById(
    "selected-folder-display",
  );
  selectedFolderDisplay.textContent = `Selected Folder: ${selectedPath}`;

  // Reset selected files when a new folder is selected
  selectedFiles = [];
  allFiles = [];
  displayedFiles = [];

  // Reset filter input
  filterInput.value = "";
  currentFilter = "";

  // Request file list data
  window.electron.send("request-file-list", selectedPath);
});

// Also update the file-list-data listener
window.electron.receive("file-list-data", (files) => {
  // Handle received files data
  allFiles = files;
  
  // Auto-select all valid files (not binary or skipped)
  const validFiles = files.filter(file => !file.isBinary && !file.isSkipped);
  
  if (validFiles.length > 0) {
    // Clear and re-add selected files
    selectedFiles = validFiles.map(file => file.path);
    console.log(`Auto-selected ${selectedFiles.length} files`);
    
    // Apply filters and sort to update the displayed files
    applyFiltersAndSort();
    
    // Notify React app about selection
    window.electron.send("selected-files-updated", selectedFiles);
  } else {
    applyFiltersAndSort();
  }
});

// Add listener for selection updates from React app
window.electron.receive("update-selected-files", (newSelectedFiles) => {
  // Only update if selection has changed to avoid loops
  if (JSON.stringify(newSelectedFiles) !== JSON.stringify(selectedFiles)) {
    console.log("Received updated selection from React app:", newSelectedFiles.length, "files");
    selectedFiles = newSelectedFiles;
    updateTotalTokens();
    
    // Update UI to reflect new selections - all checkboxes, not just currently displayed ones
    const checkboxes = document.querySelectorAll('#file-list input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
      const filePath = checkbox.value;
      checkbox.checked = selectedFiles.includes(filePath);
    });
  }
});

// Sort the files based on the selected sort option
function sortFiles(files, sortValue) {
  const [sortKey, sortDir] = sortValue.split("-"); // e.g. 'name', 'asc'

  return [...files].sort((a, b) => {
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
}

// Sort dropdown change handler
sortDropdown.addEventListener("change", () => {
  currentSort = sortDropdown.value;
  applyFiltersAndSort();
});

// Filter function to filter files by name or path
function filterFiles(files, filterText) {
  if (!filterText) {
    return files;
  }

  const lowerFilter = filterText.toLowerCase();
  return files.filter((file) => {
    return (
      file.name.toLowerCase().includes(lowerFilter) ||
      file.path.toLowerCase().includes(lowerFilter)
    );
  });
}

// Filter input event handler
filterInput.addEventListener("input", () => {
  currentFilter = filterInput.value;
  applyFiltersAndSort();
});

// Apply both filtering and sorting
function applyFiltersAndSort() {
  // Ensure we're working with a deduplicated list of files
  const uniqueFilePaths = new Set();
  const uniqueAllFiles = [];
  
  allFiles.forEach(file => {
    if (!uniqueFilePaths.has(file.path)) {
      uniqueFilePaths.add(file.path);
      uniqueAllFiles.push(file);
    }
  });

  // First filter to only include selected files that aren't binary or skipped
  let filteredFiles = uniqueAllFiles.filter(
    (file) => 
      selectedFiles.includes(file.path) && 
      !file.isBinary && 
      !file.isSkipped
  );
  
  // Then apply text search filter
  if (currentFilter) {
    filteredFiles = filterFiles(filteredFiles, currentFilter);
  }
  
  // Then sort
  displayedFiles = sortFiles(filteredFiles, currentSort);
  
  // Render the list
  renderFileList(displayedFiles);
}

// Calculate total tokens from selected files
function calculateTotalTokens() {
  let total = 0;
  // Create a Set to ensure we only count each file once
  const countedPaths = new Set();

  selectedFiles.forEach((selectedPath) => {
    // Skip if we've already counted this file
    if (countedPaths.has(selectedPath)) {
      return;
    }
    
    const fileData = allFiles.find((f) => f.path === selectedPath);
    if (fileData && !fileData.isBinary && !fileData.isSkipped) {
      countedPaths.add(selectedPath);
      total += fileData.tokenCount;
    }
  });

  return total;
}

// Update the total tokens display
function updateTotalTokens() {
  const totalTokens = calculateTotalTokens();
  const totalTokensElement = document.getElementById("total-tokens");
  if (totalTokensElement) {
    totalTokensElement.textContent = `Total Tokens: ${totalTokens.toLocaleString()}`;
  }
  
  // Also update file count display
  const fileCountDisplay = document.getElementById("file-count-display");
  if (fileCountDisplay) {
    // Count only valid selected files
    const validSelectedFiles = selectedFiles.filter(path => {
      const file = allFiles.find(f => f.path === path);
      return file && !file.isBinary && !file.isSkipped;
    });
    
    fileCountDisplay.textContent = `${validSelectedFiles.length} files selected`;
  }
}

// Handle checkbox changes
function handleCheckboxChange(event) {
  const filePath = event.target.value;
  
  if (event.target.checked) {
    // Add to selection if not already there
    if (!selectedFiles.includes(filePath)) {
      selectedFiles.push(filePath);
    }
  } else {
    // Remove from selection
    selectedFiles = selectedFiles.filter((path) => path !== filePath);
  }
  
  // Update displayed files based on new selection
  updateTotalTokens();
  applyFiltersAndSort();
  
  // Send updated selection to React app
  window.electron.send("selected-files-updated", selectedFiles);
  
  console.log("Selection changed, total selected:", selectedFiles.length);
}

// Select All button functionality
selectAllButton.addEventListener("click", () => {
  // Get all selectable files (not binary/skipped)
  const selectableFiles = allFiles.filter(file => !file.isBinary && !file.isSkipped);
  
  // For the current filter, get the paths that should be displayed
  const displayedPaths = selectableFiles
    .filter(file => 
      currentFilter === "" || 
      file.name.toLowerCase().includes(currentFilter.toLowerCase()) || 
      file.path.toLowerCase().includes(currentFilter.toLowerCase())
    )
    .map(file => file.path);
  
  // Add all displayed files to selection
  displayedPaths.forEach(path => {
    if (!selectedFiles.includes(path)) {
      selectedFiles.push(path);
    }
  });
  
  // Update UI checkboxes
  updateTotalTokens();
  
  // Re-render the list with new selections
  applyFiltersAndSort();
  
  // Send updated selection to React app
  window.electron.send("selected-files-updated", selectedFiles);
  
  console.log("Selected all files:", selectedFiles.length);
});

// Deselect All button functionality
deselectAllButton.addEventListener("click", () => {
  // For the current filter, get the paths that should be displayed
  const displayedPaths = displayedFiles.map(file => file.path);
  
  // Remove all displayed files from selection
  selectedFiles = selectedFiles.filter(path => !displayedPaths.includes(path));
  
  // Update UI checkboxes
  updateTotalTokens();
  
  // Re-render the list with new selections
  applyFiltersAndSort();
  
  // Send updated selection to React app
  window.electron.send("selected-files-updated", selectedFiles);
  
  console.log("Deselected all displayed files, remaining:", selectedFiles.length);
});

// Format file size to be human-readable
function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + units[i];
}

// Concatenate selected files
function concatenateSelectedFiles() {
  // Get sorted files (both displayed and not displayed)
  const sortedFiles = sortFiles(allFiles, currentSort);

  // Filter to only include selected files
  const sortedSelectedFiles = sortedFiles.filter((file) =>
    selectedFiles.includes(file.path),
  );

  if (sortedSelectedFiles.length === 0) {
    return "No files selected.";
  }

  let concatenatedString = "";

  sortedSelectedFiles.forEach((file) => {
    concatenatedString += `\n\n// ---- File: ${file.name} ----\n\n`;
    concatenatedString += file.content;
  });

  return concatenatedString;
}

// Copy to clipboard functionality
copyButton.addEventListener("click", async () => {
  const content = concatenateSelectedFiles();

  try {
    await navigator.clipboard.writeText(content);

    // Show the "Copied!" status
    copyStatus.classList.add("visible");

    // Hide the status after 2 seconds
    setTimeout(() => {
      copyStatus.classList.remove("visible");
    }, 2000);

    console.log("Content copied to clipboard");
  } catch (err) {
    console.error("Could not copy content: ", err);
    alert("Failed to copy to clipboard");
  }
});

// Render the file list with the current data and sorting
function renderFileList(files) {
  const fileList = document.getElementById("file-list");
  // Clear existing list
  fileList.innerHTML = "";

  // First deduplicate files to ensure we don't count duplicates
  const uniqueFilePaths = new Set();
  const uniqueFiles = [];
  
  files.forEach(file => {
    if (!uniqueFilePaths.has(file.path)) {
      uniqueFilePaths.add(file.path);
      uniqueFiles.push(file);
    }
  });

  // Now render the unique files
  uniqueFiles.forEach((file) => {
    const li = document.createElement("li");
    li.className = "file-item";

    // Create checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = file.path;
    checkbox.id = `file-${file.path.replace(/[^a-z0-9]/gi, '_')}`;
    checkbox.className = "file-checkbox";

    // Checkbox should be checked if file is in selectedFiles
    checkbox.checked = selectedFiles.includes(file.path);
    checkbox.addEventListener("change", handleCheckboxChange);

    // Create label for the checkbox
    const checkboxLabel = document.createElement("label");
    checkboxLabel.htmlFor = checkbox.id;
    checkboxLabel.className = "file-label";

    // Create file name display
    const nameDiv = document.createElement("div");
    nameDiv.className = "file-name";
    nameDiv.textContent = file.name;

    // Create token count display
    const tokenCountSpan = document.createElement("span");
    tokenCountSpan.className = "file-tokens";
    tokenCountSpan.textContent = `Tokens: ${file.tokenCount.toLocaleString()}`;

    // Create file size display
    const fileSizeSpan = document.createElement("span");
    fileSizeSpan.className = "file-size";
    fileSizeSpan.textContent = `Size: ${formatFileSize(file.size)}`;

    // Add the checkbox and labels to the list item
    li.appendChild(checkbox);
    li.appendChild(checkboxLabel);
    li.appendChild(nameDiv);
    li.appendChild(tokenCountSpan);
    li.appendChild(fileSizeSpan);

    fileList.appendChild(li);
  });
  
  // Update token count and file count
  updateTotalTokens();
}
