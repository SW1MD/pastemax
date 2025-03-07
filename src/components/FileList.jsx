import React, { useState, useCallback } from "react";
import FileCard from "./FileCard";
import EditorPage from "./EditorPage";
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
  const [recentFiles, setRecentFiles] = useState([]);
  const [recentFolders, setRecentFolders] = useState([]);

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
    const fallbackToReadFile = () => {
      // If file.content is already available, we can use it directly
      if (file.content) {
        onViewFile(file);
        
        // Add to recent files
        updateRecentFiles(file.path);
      } 
      // If we need to fetch content via electron
      else if (window.electron && window.electron.readFile) {
        window.electron.readFile(file.path)
          .then(content => {
            const fileWithContent = {...file, content};
            onViewFile(fileWithContent);
            
            // Add to recent files
            updateRecentFiles(file.path);
          })
          .catch(err => {
            console.error("Error reading file:", err);
            // Still try to open with whatever we have
            onViewFile(file);
            
            // Add to recent files anyway
            updateRecentFiles(file.path);
          });
      } else {
        // Fallback
        onViewFile(file);
        
        // Add to recent files
        updateRecentFiles(file.path);
      }
    };

    // For refresh file if using electron
    if (window.electron && window.electron.refreshFile) {
      window.electron.refreshFile(file.path)
        .then(refreshedFile => {
          if (refreshedFile) {
            onViewFile(refreshedFile);
            
            // Add to recent files
            updateRecentFiles(file.path);
          } else {
            fallbackToReadFile();
          }
        })
        .catch(err => {
          console.error("Error refreshing file:", err);
          fallbackToReadFile();
        });
    } else {
      fallbackToReadFile();
    }
  };

  // Handle saving the file if edited
  const handleSaveFile = async (content) => {
    if (viewedFile && window.electron) {
      try {
        await window.electron.writeFile(viewedFile.path, content);
        // Update viewed file with new content
        onViewFile({...viewedFile, content});
        return true;
      } catch (err) {
        console.error("Error saving file:", err);
        return false;
      }
    }
    return false;
  };
  
  // Handle file navigation
  const handleNavigate = (filePath, isFolder) => {
    if (isFolder) {
      // Update recent folders
      updateRecentFolders(filePath);
      
      // Here you would typically navigate to that folder
      // but for now we'll just close the view
      onCloseView();
    } else {
      // Find the file in our list
      const file = files.find(f => f.path === filePath);
      if (file) {
        handleViewFile(file);
      } else {
        // Try to read it directly
        if (window.electron && window.electron.readFile) {
          window.electron.readFile(filePath)
            .then(content => {
              const fileObj = {
                path: filePath,
                name: filePath.split('/').pop(),
                content,
                tokenCount: 0, // We don't know the token count yet
                isBinary: false,
                isSkipped: false
              };
              onViewFile(fileObj);
              
              // Add to recent files
              updateRecentFiles(filePath);
            })
            .catch(err => {
              console.error("Error reading file:", err);
            });
        }
      }
    }
  };
  
  // Update recent files
  const updateRecentFiles = (filePath) => {
    const updatedRecentFiles = [filePath, ...recentFiles.filter(f => f !== filePath)].slice(0, 10);
    setRecentFiles(updatedRecentFiles);
    localStorage.setItem('pastemax-recent-files', JSON.stringify(updatedRecentFiles));
  };
  
  // Update recent folders
  const updateRecentFolders = (folderPath) => {
    const updatedRecentFolders = [folderPath, ...recentFolders.filter(f => f !== folderPath)].slice(0, 10);
    setRecentFolders(updatedRecentFolders);
    localStorage.setItem('pastemax-recent-folders', JSON.stringify(updatedRecentFolders));
  };
  
  // Get the current directory from the viewed file path
  const getCurrentDirectory = () => {
    if (!viewedFile || !viewedFile.path) return '';
    const pathParts = viewedFile.path.split('/');
    pathParts.pop(); // Remove the filename
    return pathParts.join('/');
  };
  
  // Load recent files and folders on mount
  React.useEffect(() => {
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

  // Define dummy file creation handlers (we don't actually create files here)
  const handleCreateFile = (directory, fileName, content) => {
    console.log(`Would create file ${fileName} in ${directory} with content length ${content?.length || 0}`);
    // In a real implementation, this would create the file
  };
  
  const handleCreateFolder = (directory, folderName) => {
    console.log(`Would create folder ${folderName} in ${directory}`);
    // In a real implementation, this would create the folder
  };

  // Track file history
  const [fileHistory, setFileHistory] = React.useState([]);
  
  React.useEffect(() => {
    if (viewedFile && viewedFile.path) {
      setFileHistory(prev => {
        // Remove the file if it already exists
        const filtered = prev.filter(p => p !== viewedFile.path);
        // Add it to the end
        return [...filtered, viewedFile.path];
      });
    }
  }, [viewedFile]);

  if (viewedFile) {
    return (
      <div className="full-height-editor">
        <EditorPage
          filePath={viewedFile.path}
          content={viewedFile.content}
          currentDirectory={getCurrentDirectory()}
          onSave={handleSaveFile}
          onClose={onCloseView}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
          onNavigate={handleNavigate}
          theme={document.documentElement.getAttribute('data-theme') === 'dark' ? 'tomorrow_night' : 'github'}
          fileHistory={fileHistory}
          recentFiles={recentFiles}
          recentFolders={recentFolders}
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