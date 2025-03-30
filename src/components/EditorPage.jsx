import React, { useState, useEffect } from 'react';
import CodeEditor from './CodeEditor';
import { FilePlus, FolderPlus, Save, ChevronLeft, ChevronRight, Folder, X } from 'lucide-react';

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
      setEditorContent(''); // Ensure content is cleared for new files
    }
  }, [filePath, fileHistory]);
  
  useEffect(() => {
    setEditorContent(content || '');
  }, [content]);
  
  const handleEditorSave = async (content) => {
    try {
      if (isNewFile) {
        console.log("New file save not implemented");
      } else {
        // For existing files, just save the content
        await onSave(content);
      }
    } catch (error) {
      console.error("Error saving file:", error);
    }
  };
  
  return (
    <div className="editor-page">
      <div className="editor-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={onClose}
            className="editor-back-btn"
            title="Back to file browser"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="file-name">{fileName}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handleEditorSave(editorContent)}
            className="editor-save-btn"
          >
            <Save size={16} />
            Save
          </button>
          <button
            onClick={onClose}
            className="editor-close-btn"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      <div className="editor-content-wrapper">
        <CodeEditor
          filePath={filePath || 'New File'}
          content={editorContent}
          onSave={handleEditorSave}
          onClose={onClose}
          theme={theme}
          fileHistory={fileHistory}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
};

export default EditorPage; 