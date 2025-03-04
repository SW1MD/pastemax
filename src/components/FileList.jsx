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
  onCloseView
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

  // If a file is being viewed, show the code editor instead of the file list
  if (viewedFile) {
    return <CodeEditor file={viewedFile} onClose={onCloseView} />;
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
                onViewFile={onViewFile}
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