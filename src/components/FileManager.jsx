import React, { useState } from 'react';
import { FilePlus, FolderPlus, X, Check, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Folder, FolderOpen, File, RefreshCw, CheckSquare, XSquare } from 'lucide-react';

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
  currentFilePath,
  isExpanded = false,
  sortOrder,
  onSortChange,
  getSortLabel,
  onSelectAll,
  onDeselectAll,
  isNewFile = false,
  fileName = ''
}) => {
  const [showCreateFileDialog, setShowCreateFileDialog] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [error, setError] = useState('');
  const [showRecentPanel, setShowRecentPanel] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  
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

  // Handle file opening
  const handleNodeClick = (path, isFolder = false) => {
    // Pass back to parent component
    onNavigate(path, isFolder);
  };
  
  return (
    <div className="file-manager">
      <div className="file-browser-header">
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
              title={isExpanded ? "Collapse all folders" : "Expand all folders"}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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
          </button>
          
          <button
            className="file-manager-action-btn"
            onClick={() => setShowRecentPanel(!showRecentPanel)}
            title="Recent files and folders"
          >
            <RefreshCw size={16} />
          </button>
          
          <div className="file-manager-separator"></div>
          
          <button
            className="file-manager-action-btn"
            onClick={onSelectAll}
            title="Select All"
          >
            <CheckSquare size={16} />
          </button>
          
          <button
            className="file-manager-action-btn"
            onClick={onDeselectAll}
            title="Deselect All"
          >
            <XSquare size={16} />
          </button>
        </div>
        
        {/* Current file or directory display */}
        <div className="current-file-display">
          {isNewFile ? (
            <span className="current-file-name">New File</span>
          ) : currentFilePath ? (
            <span className="current-file-name">{currentFilePath.split('/').pop()}</span>
          ) : (
            <span className="current-directory-name">{currentDirectory.split('/').pop() || 'Root'}</span>
          )}
        </div>
        
        {sortOrder && onSortChange && (
          <div className="sort-dropdown">
            <button 
              className="sort-dropdown-button"
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
            >
              Sort: {getSortLabel ? getSortLabel(sortOrder) : sortOrder}
            </button>
            
            {sortDropdownOpen && (
              <div className="sort-options">
                <div 
                  className={`sort-option ${sortOrder === 'name-asc' ? 'active' : ''}`}
                  onClick={() => {
                    onSortChange('name-asc');
                    setSortDropdownOpen(false);
                  }}
                >
                  Name (A-Z)
                </div>
                <div 
                  className={`sort-option ${sortOrder === 'name-desc' ? 'active' : ''}`}
                  onClick={() => {
                    onSortChange('name-desc');
                    setSortDropdownOpen(false);
                  }}
                >
                  Name (Z-A)
                </div>
                <div 
                  className={`sort-option ${sortOrder === 'tokens-asc' ? 'active' : ''}`}
                  onClick={() => {
                    onSortChange('tokens-asc');
                    setSortDropdownOpen(false);
                  }}
                >
                  Tokens (Low to High)
                </div>
                <div 
                  className={`sort-option ${sortOrder === 'tokens-desc' ? 'active' : ''}`}
                  onClick={() => {
                    onSortChange('tokens-desc');
                    setSortDropdownOpen(false);
                  }}
                >
                  Tokens (High to Low)
                </div>
                <div 
                  className={`sort-option ${sortOrder === 'size-asc' ? 'active' : ''}`}
                  onClick={() => {
                    onSortChange('size-asc');
                    setSortDropdownOpen(false);
                  }}
                >
                  Size (Small to Large)
                </div>
                <div 
                  className={`sort-option ${sortOrder === 'size-desc' ? 'active' : ''}`}
                  onClick={() => {
                    onSortChange('size-desc');
                    setSortDropdownOpen(false);
                  }}
                >
                  Size (Large to Small)
                </div>
                <div 
                  className={`sort-option ${sortOrder === 'date-asc' ? 'active' : ''}`}
                  onClick={() => {
                    onSortChange('date-asc');
                    setSortDropdownOpen(false);
                  }}
                >
                  Date (Oldest First)
                </div>
                <div 
                  className={`sort-option ${sortOrder === 'date-desc' ? 'active' : ''}`}
                  onClick={() => {
                    onSortChange('date-desc');
                    setSortDropdownOpen(false);
                  }}
                >
                  Date (Newest First)
                </div>
                <div 
                  className={`sort-option ${sortOrder === 'type-asc' ? 'active' : ''}`}
                  onClick={() => {
                    onSortChange('type-asc');
                    setSortDropdownOpen(false);
                  }}
                >
                  Type (A-Z)
                </div>
                <div 
                  className={`sort-option ${sortOrder === 'type-desc' ? 'active' : ''}`}
                  onClick={() => {
                    onSortChange('type-desc');
                    setSortDropdownOpen(false);
                  }}
                >
                  Type (Z-A)
                </div>
              </div>
            )}
          </div>
        )}
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