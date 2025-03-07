import React, { useState, useEffect } from 'react';
import CodeEditor from './CodeEditor';
import FileManager from './FileManager';
import { FilePlus, FolderPlus, Save, ChevronLeft, ChevronRight, Folder } from 'lucide-react';

const EditorPage = ({ 
  filePath,
  content,
  currentDirectory,
  onSave,
  onClose,
  onCreateFile,
  onCreateFolder,
  onNavigate,
  fileHistory = [],
  theme,
  recentFiles = [],
  recentFolders = []
}) => {
  const [isNewFile, setIsNewFile] = useState(!filePath);
  const [editorContent, setEditorContent] = useState(content || '');
  const [fileName, setFileName] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  useEffect(() => {
    if (filePath) {
      // Extract just the file name from the path
      const parts = filePath.split('/');
      setFileName(parts[parts.length - 1]);
      setIsNewFile(false);
      
      // Set the history index for the current file
      const index = fileHistory.findIndex(f => f === filePath);
      if (index !== -1) {
        setHistoryIndex(index);
      }
    } else {
      setIsNewFile(true);
      setFileName('New File');
    }
  }, [filePath, fileHistory]);
  
  useEffect(() => {
    setEditorContent(content || '');
  }, [content]);
  
  const handleCreateFile = (directory, name) => {
    // Call the parent component's createFile function
    onCreateFile(directory, name);
  };
  
  const handleCreateFolder = (directory, name) => {
    // Call the parent component's createFolder function
    onCreateFolder(directory, name);
  };
  
  const handleEditorSave = async (content, newFilePath) => {
    try {
      if (isNewFile || newFilePath) {
        // For new files, use the provided path from the save dialog
        const saveFilePath = newFilePath || filePath;
        if (!saveFilePath) {
          console.error("No file path provided for save");
          return;
        }
        // For new files, create them first
        if (isNewFile) {
          // Handle absolute paths correctly
          const normalizedPath = saveFilePath.replace(/\\/g, '/');
          const lastSlashIndex = normalizedPath.lastIndexOf('/');
          const directory = lastSlashIndex > -1 ? normalizedPath.substring(0, lastSlashIndex) : '';
          const filename = lastSlashIndex > -1 ? normalizedPath.substring(lastSlashIndex + 1) : normalizedPath;
          
          // If directory is absolute path (starts with C:, D:, etc), use it as is
          const finalDirectory = /^[A-Za-z]:/.test(directory) ? directory : currentDirectory + '/' + directory;
          
          await onCreateFile(finalDirectory, filename, content);
        } else {
          // For files with a new path (Save As), just save
          await onSave(content, saveFilePath);
        }
        setIsNewFile(false);
      } else {
        // For existing files, just save the content
        await onSave(content, filePath);
      }
    } catch (error) {
      console.error("Error saving file:", error);
    }
  };
  
  // Navigation handlers for breadcrumbs
  const navigateBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onNavigate(fileHistory[newIndex], false);
    }
  };

  const navigateForward = () => {
    if (historyIndex < fileHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onNavigate(fileHistory[newIndex], false);
    }
  };

  const navigateToParentFolder = () => {
    if (filePath) {
      const lastSlashIndex = filePath.lastIndexOf('/');
      if (lastSlashIndex > 0) {
        const parentFolder = filePath.substring(0, lastSlashIndex);
        onNavigate(parentFolder, true);
      }
    } else if (currentDirectory) {
      const lastSlashIndex = currentDirectory.lastIndexOf('/');
      if (lastSlashIndex > 0) {
        const parentFolder = currentDirectory.substring(0, lastSlashIndex);
        onNavigate(parentFolder, true);
      }
    }
  };
  
  // Create breadcrumbs for the current file path
  const getBreadcrumbs = () => {
    if (!filePath) return [];
    
    const pathParts = filePath.split('/');
    const crumbs = [];
    let currentPath = '';
    
    for (let i = 0; i < pathParts.length; i++) {
      currentPath += (i > 0 ? '/' : '') + pathParts[i];
      crumbs.push({
        name: pathParts[i],
        path: currentPath,
        isLast: i === pathParts.length - 1
      });
    }
    
    return crumbs;
  };
  
  return (
    <div className="editor-page">
      <FileManager
        currentDirectory={currentDirectory}
        onCreateFile={handleCreateFile}
        onCreateFolder={handleCreateFolder}
        onNavigate={onNavigate}
        recentFiles={recentFiles}
        recentFolders={recentFolders}
        navigateBack={navigateBack}
        navigateForward={navigateForward}
        navigateToParentFolder={navigateToParentFolder}
        canNavigateBack={historyIndex > 0}
        canNavigateForward={historyIndex < fileHistory.length - 1}
        breadcrumbs={getBreadcrumbs()}
        currentFilePath={filePath}
      />
      
      <CodeEditor
        filePath={filePath}
        content={editorContent}
        onSave={handleEditorSave}
        onClose={onClose}
        theme={theme}
        fileHistory={fileHistory}
        onNavigate={onNavigate}
        hideNavigation={true}
      />
    </div>
  );
};

export default EditorPage; 