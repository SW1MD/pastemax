import React, { useState } from 'react';
import { FilePlus, FolderPlus, X, Check, ChevronRight, ChevronLeft, Folder, FolderOpen, File, RefreshCw } from 'lucide-react';

const FileManager = ({ 
  currentDirectory, 
  onCreateFile, 
  onCreateFolder,
  onNavigate,
  recentFiles = [],
  recentFolders = [],
  navigateBack,
  navigateForward,
  navigateToParentFolder,
  canNavigateBack = false,
  canNavigateForward = false,
  breadcrumbs = [],
  currentFilePath
}) => {
  const [showCreateFileDialog, setShowCreateFileDialog] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [error, setError] = useState('');
  const [showRecentPanel, setShowRecentPanel] = useState(false);
  
  const handleCreateFile = () => {
    if (!newFileName.trim()) {
      setError('File name cannot be empty');
      return;
    }
    
    onCreateFile(currentDirectory, newFileName);
    setNewFileName('');
    setShowCreateFileDialog(false);
  };
  
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      setError('Folder name cannot be empty');
      return;
    }
    
    onCreateFolder(currentDirectory, newFolderName);
    setNewFolderName('');
    setShowCreateFolderDialog(false);
  };
  
  const handleCancel = () => {
    setShowCreateFileDialog(false);
    setShowCreateFolderDialog(false);
    setNewFileName('');
    setNewFolderName('');
    setError('');
  };

  const handleBreadcrumbClick = (path) => {
    const isFolder = path !== currentFilePath;
    onNavigate(path, isFolder);
  };
  
  return (
    <div className="file-manager">
      <div className="file-manager-header">
        <div className="file-manager-actions">
          <div className="file-manager-nav-actions">
            <button 
              className={`file-manager-nav-btn ${!canNavigateBack ? 'disabled' : ''}`}
              onClick={navigateBack}
              disabled={!canNavigateBack}
              title="Navigate back"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              className={`file-manager-nav-btn ${!canNavigateForward ? 'disabled' : ''}`}
              onClick={navigateForward}
              disabled={!canNavigateForward}
              title="Navigate forward"
            >
              <ChevronRight size={16} />
            </button>
            <button 
              className="file-manager-nav-btn"
              onClick={navigateToParentFolder}
              title="Go to parent folder"
            >
              <Folder size={16} />
            </button>
          </div>
          
          <div className="file-manager-separator"></div>
          
          <button 
            className="file-manager-action-btn"
            onClick={() => {
              setShowCreateFileDialog(true);
              setShowCreateFolderDialog(false);
              setError('');
            }}
            title="Create new file"
          >
            <FilePlus size={16} />
            <span>New File</span>
          </button>
          
          <button 
            className="file-manager-action-btn"
            onClick={() => {
              setShowCreateFolderDialog(true);
              setShowCreateFileDialog(false);
              setError('');
            }}
            title="Create new folder"
          >
            <FolderPlus size={16} />
            <span>New Folder</span>
          </button>
          
          <button
            className="file-manager-action-btn"
            onClick={() => setShowRecentPanel(!showRecentPanel)}
            title="Recent files"
          >
            <File size={16} />
            <span>Recent</span>
          </button>
        </div>
        
        <div className="file-manager-breadcrumbs">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="breadcrumb-separator">/</span>}
              <button 
                className={`breadcrumb-item ${crumb.isLast ? 'active' : ''}`}
                onClick={() => handleBreadcrumbClick(crumb.path)}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {showCreateFileDialog && (
        <div className="create-dialog">
          <div className="create-dialog-header">
            <h3>Create New File</h3>
            <button onClick={handleCancel} className="close-btn">
              <X size={16} />
            </button>
          </div>
          
          <div className="create-dialog-content">
            <div className="create-dialog-field">
              <label>File Name:</label>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="e.g., index.js"
                autoFocus
              />
            </div>
            
            {error && <div className="create-dialog-error">{error}</div>}
            
            <div className="create-dialog-actions">
              <button onClick={handleCancel} className="cancel-btn">
                Cancel
              </button>
              <button onClick={handleCreateFile} className="create-btn">
                <Check size={16} />
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showCreateFolderDialog && (
        <div className="create-dialog">
          <div className="create-dialog-header">
            <h3>Create New Folder</h3>
            <button onClick={handleCancel} className="close-btn">
              <X size={16} />
            </button>
          </div>
          
          <div className="create-dialog-content">
            <div className="create-dialog-field">
              <label>Folder Name:</label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g., components"
                autoFocus
              />
            </div>
            
            {error && <div className="create-dialog-error">{error}</div>}
            
            <div className="create-dialog-actions">
              <button onClick={handleCancel} className="cancel-btn">
                Cancel
              </button>
              <button onClick={handleCreateFolder} className="create-btn">
                <Check size={16} />
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showRecentPanel && (
        <div className="recent-panel">
          <div className="recent-panel-header">
            <h3>Recent Files</h3>
            <button onClick={() => setShowRecentPanel(false)} className="close-btn">
              <X size={16} />
            </button>
          </div>
          
          <div className="recent-panel-content">
            {recentFiles.length > 0 ? (
              <div className="recent-files-list">
                {recentFiles.map((file, index) => (
                  <div 
                    key={`file-${index}`}
                    className="recent-item"
                    onClick={() => {
                      onNavigate(file, false);
                      setShowRecentPanel(false);
                    }}
                  >
                    <File size={16} />
                    <span className="recent-item-name">{file.split('/').pop()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-recent">No recent files</div>
            )}
            
            <h3 className="recent-section-title">Recent Folders</h3>
            
            {recentFolders.length > 0 ? (
              <div className="recent-folders-list">
                {recentFolders.map((folder, index) => (
                  <div 
                    key={`folder-${index}`}
                    className="recent-item"
                    onClick={() => {
                      onNavigate(folder, true);
                      setShowRecentPanel(false);
                    }}
                  >
                    <FolderOpen size={16} />
                    <span className="recent-item-name">{folder.split('/').pop()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-recent">No recent folders</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManager; 