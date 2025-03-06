// Preload script
const { contextBridge, ipcRenderer } = require("electron");

// Helper function to ensure data is serializable
function ensureSerializable(data) {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitive types directly
  if (typeof data !== "object") {
    return data;
  }

  // For arrays, map each item
  if (Array.isArray(data)) {
    return data.map(ensureSerializable);
  }

  // For objects, create a new object with serializable properties
  const result = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      // Skip functions or symbols which are not serializable
      if (typeof data[key] === "function" || typeof data[key] === "symbol") {
        continue;
      }
      // Recursively process nested objects
      result[key] = ensureSerializable(data[key]);
    }
  }
  return result;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  send: (channel, data) => {
    // whitelist channels
    const validChannels = [
      "open-folder", 
      "request-file-list", 
      "create-file", 
      "create-folder",
      "write-file",
      "read-file",
      "count-tokens",
      "refresh-file"
    ];
    if (validChannels.includes(channel)) {
      // Ensure data is serializable before sending
      const serializedData = ensureSerializable(data);
      ipcRenderer.send(channel, serializedData);
    }
  },
  receive: (channel, func) => {
    const validChannels = [
      "folder-selected",
      "file-list-data",
      "file-processing-status",
      "file-created",
      "folder-created",
      "file-saved",
      "file-read",
      "tokens-counted",
      "file-refreshed"
    ];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => {
        // Convert args to serializable form
        const serializedArgs = args.map(ensureSerializable);
        func(...serializedArgs);
      });
    }
  },
  // For backward compatibility (but still ensure serialization)
  ipcRenderer: {
    send: (channel, data) => {
      const serializedData = ensureSerializable(data);
      ipcRenderer.send(channel, serializedData);
    },
    on: (channel, func) => {
      const wrapper = (event, ...args) => {
        try {
          // Don't pass the event object to the callback, only pass the serialized args
          const serializedArgs = args.map(ensureSerializable);
          func(...serializedArgs); // Only pass the serialized args, not the event
        } catch (err) {
          console.error(`Error in IPC handler for channel ${channel}:`, err);
        }
      };
      ipcRenderer.on(channel, wrapper);
      // Store the wrapper function for removal later
      return wrapper;
    },
    removeListener: (channel, func) => {
      try {
        ipcRenderer.removeListener(channel, func);
      } catch (err) {
        console.error(`Error removing listener for channel ${channel}:`, err);
      }
    },
  },
  writeFile: (filePath, content) => {
    return new Promise((resolve, reject) => {
      // Set up a one-time listener for the response
      const responseHandler = (_, response) => {
        ipcRenderer.removeListener('file-saved', responseHandler);
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Failed to save file'));
        }
      };
      
      // Listen for the response
      ipcRenderer.once('file-saved', responseHandler);
      
      // Send the request
      ipcRenderer.send('write-file', { filePath, content });
    });
  },
  readFile: (filePath) => {
    return new Promise((resolve, reject) => {
      // Set up a one-time listener for the response
      const responseHandler = (_, response) => {
        ipcRenderer.removeListener('file-read', responseHandler);
        if (response.success) {
          resolve(response.content);
        } else {
          reject(new Error(response.error || 'Failed to read file'));
        }
      };
      
      // Listen for the response
      ipcRenderer.once('file-read', responseHandler);
      
      // Send the request
      ipcRenderer.send('read-file', filePath);
    });
  },
  countTokens: (content) => {
    return new Promise((resolve, reject) => {
      // Set up a one-time listener for the response
      const responseHandler = (_, response) => {
        ipcRenderer.removeListener('tokens-counted', responseHandler);
        if (response.success) {
          resolve(response.tokenCount);
        } else {
          reject(new Error(response.error || 'Failed to count tokens'));
        }
      };
      
      // Listen for the response
      ipcRenderer.once('tokens-counted', responseHandler);
      
      // Send the request
      ipcRenderer.send('count-tokens', content);
    });
  },
  refreshFile: (filePath) => {
    return new Promise((resolve, reject) => {
      // Set up a one-time listener for the response
      const responseHandler = (_, response) => {
        ipcRenderer.removeListener('file-refreshed', responseHandler);
        if (response.success) {
          resolve(response.file);
        } else {
          reject(new Error(response.error || 'Failed to refresh file'));
        }
      };
      
      // Listen for the response
      ipcRenderer.once('file-refreshed', responseHandler);
      
      // Send the request
      ipcRenderer.send('refresh-file', filePath);
    });
  }
});
