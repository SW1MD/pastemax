import React, { useState, useCallback } from "react";
import FileCard from "./FileCard";
import CodeEditor from "./CodeEditor";
import ContextMenu from "./ContextMenu";
import { Copy } from "lucide-react";

const FileList = ({
  files,
  selectedFiles,
  toggleFileSelection,
  viewedFile,
  onViewFile,
  onCloseView,
  problemHighlightingActive
}) => {
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });

  // Only show files that are in the selectedFiles array and not binary/skipped
  const displayableFiles = files.filter(
    (file) =>
      selectedFiles.includes(file.path) && !file.isBinary && !file.isSkipped
  );

  // Context menu handlers
  const handleContextMenu = useCallback((e) => {
    // Only show context menu when right-clicking on the container, not on file cards
    if (e.target.closest('.file-card')) return;
    
    e.preventDefault();
    setContextMenu({ 
      visible: true, 
      x: e.clientX, 
      y: e.clientY 
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ ...contextMenu, visible: false });
  }, [contextMenu]);

  // Copy all file contents
  const copyAllContents = useCallback(() => {
    const allContent = displayableFiles
      .map(file => `// ${file.path}\n${file.content}`)
      .join('\n\n');
    
    navigator.clipboard.writeText(allContent);
    closeContextMenu();
  }, [displayableFiles]);

  // Copy all file paths
  const copyAllPaths = useCallback(() => {
    const allPaths = displayableFiles
      .map(file => file.path)
      .join('\n');
    
    navigator.clipboard.writeText(allPaths);
    closeContextMenu();
  }, [displayableFiles]);

  // Menu items for the context menu
  const menuItems = [
    {
      icon: <Copy size={16} />,
      label: "Copy all file paths",
      onClick: copyAllPaths,
      disabled: displayableFiles.length === 0
    },
    {
      icon: <Copy size={16} />,
      label: "Copy all file contents",
      onClick: copyAllContents,
      disabled: displayableFiles.length === 0
    }
  ];

  // Ensure we have a proper file viewing handler
  const handleViewFile = (file) => {
    // Helper function for readFile fallback - moved to function body root
    const fallbackToReadFile = () => {
      // If file.content is already available, we can use it directly
      if (file.content) {
        onViewFile(file);
      } 
      // If we need to fetch content via electron
      else if (window.electron && window.electron.readFile) {
        window.electron.readFile(file.path)
          .then(content => {
            const fileWithContent = {...file, content};
            onViewFile(fileWithContent);
          })
          .catch(err => {
            console.error("Error reading file:", err);
            // Still try to open with whatever we have
            onViewFile(file);
          });
      } else {
        // Fallback
        onViewFile(file);
      }
    };
    
    if (onViewFile && typeof onViewFile === 'function') {
      // Always try to refresh the file from disk to get the latest content
      if (window.electron && window.electron.refreshFile) {
        window.electron.refreshFile(file.path)
          .then(refreshedFile => {
            // Update the file in the files array with refreshed content
            const updatedFiles = files.map(f => 
              f.path === file.path ? refreshedFile : f
            );
            
            // Open the file with fresh content
            onViewFile(refreshedFile);
          })
          .catch(refreshError => {
            console.error("Error refreshing file:", refreshError);
            // Fall back to regular file reading if refresh fails
            fallbackToReadFile();
          });
      } else {
        // If refreshFile is not available, fall back to readFile
        fallbackToReadFile();
      }
    }
  };

  // Add a function to handle saving files
  const handleSaveFile = async (filePath, content) => {
    try {
      // Check if we have access to the electron API
      if (window.electron && window.electron.writeFile) {
        // Use the direct writeFile method instead of a custom implementation
        const result = await window.electron.writeFile(filePath, content);
        
        if (result.success) {
          // Update the file in the local files array
          const updatedFiles = files.map(file => {
            if (file.path === filePath) {
              // Update the current file with new content
              return {
                ...file,
                content: content
              };
            }
            return file;
          });
          
          // Update the viewedFile with the new content
          if (viewedFile && viewedFile.path === filePath) {
            onViewFile({
              ...viewedFile,
              content: content
            });
          }
          
          // Calculate tokens for the updated file
          if (window.electron && window.electron.countTokens) {
            try {
              const tokenCount = await window.electron.countTokens(content);
              // Further update the file with new token count
              const fileWithTokens = updatedFiles.find(f => f.path === filePath);
              if (fileWithTokens) {
                fileWithTokens.tokenCount = tokenCount;
              }
            } catch (err) {
              console.error("Error counting tokens:", err);
            }
          }
        }
        
        return result.success;
      } else {
        console.error("Electron API not available for file saving");
        return false;
      }
    } catch (error) {
      console.error("Error saving file:", error);
      return false;
    }
  };

  // If a file is being viewed, show the code editor instead of the file list
  if (viewedFile) {
    return (
      <div className="full-height-editor">
        <CodeEditor 
          filePath={viewedFile.path}
          content={viewedFile.content}
          onClose={onCloseView}
          onSave={handleSaveFile}
          readOnly={false}
          problemHighlightingActive={problemHighlightingActive}
        />
      </div>
    );
  }

  return (
    <>
      <div 
        className="file-list-container"
        onContextMenu={handleContextMenu}
      >
        {displayableFiles.length > 0 ? (
          <div className="file-list">
            {displayableFiles.map((file) => (
              <FileCard
                key={file.path}
                file={file}
                isSelected={true} // All displayed files are selected
                toggleSelection={toggleFileSelection}
                onViewFile={handleViewFile}  // Pass our enhanced handler
                problemHighlightingActive={problemHighlightingActive}
              />
            ))}
          </div>
        ) : (
          <div className="file-list-empty">
            {files.length > 0
              ? "No files selected. Select files from the sidebar."
              : "Select a folder to view files"}
          </div>
        )}
      </div>

      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItems}
          onClose={closeContextMenu}
        />
      )}
    </>
  );
};

export default FileList;