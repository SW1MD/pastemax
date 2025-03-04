import React from "react";
import FileCard from "./FileCard";
import CodeEditor from "./CodeEditor";

const FileList = ({
  files,
  selectedFiles,
  toggleFileSelection,
  viewedFile,
  onViewFile,
  onCloseView
}) => {
  // Only show files that are in the selectedFiles array and not binary/skipped
  const displayableFiles = files.filter(
    (file) =>
      selectedFiles.includes(file.path) && !file.isBinary && !file.isSkipped
  );

  // If a file is being viewed, show the code editor instead of the file list
  if (viewedFile) {
    return <CodeEditor file={viewedFile} onClose={onCloseView} />;
  }

  return (
    <div className="file-list-container">
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
  );
};

export default FileList; 