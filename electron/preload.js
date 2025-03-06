contextBridge.exposeInMainWorld('electron', {
  // ... existing methods ...
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
});

// ... existing code ... 