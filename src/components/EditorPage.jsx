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
  const [showNewFileForm, setShowNewFileForm] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [error, setError] = useState('');
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
  
  const handleSave = async () => {
    if (isNewFile && !newFileName.trim() && showNewFileForm) {
      setError('File name is required');
      return;
    }
    
    if (isNewFile && showNewFileForm) {
      // Save new file with provided name
      onCreateFile(currentDirectory, newFileName, editorContent);
      setShowNewFileForm(false);
      setNewFileName('');
    } else {
      // Save existing file
      await onSave(editorContent);
    }
  };
  
  const handleEditorSave = async (content) => {
    if (isNewFile) {
      setEditorContent(content);
      setShowNewFileForm(true);
    } else {
      await onSave(content);
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
  
  const renderNewFileForm = () => (
    <div className="new-file-form">
      <div className="new-file-form-header">
        <h3>Save New File</h3>
      </div>
      <div className="new-file-form-content">
        <div className="new-file-form-field">
          <label>File Name:</label>
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="e.g., index.js"
            autoFocus
          />
        </div>
        
        {error && <div className="new-file-form-error">{error}</div>}
        
        <div className="new-file-form-location">
          <span>Location:</span>
          <span className="new-file-path">{currentDirectory || '/'}</span>
        </div>
        
        <div className="new-file-form-actions">
          <button 
            className="cancel-btn"
            onClick={() => setShowNewFileForm(false)}
          >
            Cancel
          </button>
          <button 
            className="save-btn"
            onClick={handleSave}
          >
            <Save size={16} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
  
  const breadcrumbs = getBreadcrumbs();
  
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
        breadcrumbs={breadcrumbs}
        currentFilePath={filePath}
      />
      
      {showNewFileForm && renderNewFileForm()}
      
      <CodeEditor
        filePath={filePath}
        content={editorContent}
        onSave={handleEditorSave}
        onClose={onClose}
        theme={theme}
        fileHistory={fileHistory}
        onNavigate={onNavigate}
        hideNavigation={true} // Hide the navigation bar in CodeEditor
      />
    </div>
  );
};

export default EditorPage; 