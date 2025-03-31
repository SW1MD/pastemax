import React, { useState, useEffect, useRef } from 'react';
import CodeEditor from './CodeEditor';
import { Save, ChevronLeft, X } from 'lucide-react';

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
  const editorPageRef = useRef(null);
  
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
  
  // Add resize handling for the editor container
  useEffect(() => {
    const handleResize = () => {
      // Force recalculation of editor size
      if (editorPageRef.current) {
        const wrapperElement = editorPageRef.current.querySelector('.editor-content-wrapper');
        if (wrapperElement) {
          // Force height calculation based on header
          const headerHeight = editorPageRef.current.querySelector('.editor-header')?.offsetHeight || 48;
          wrapperElement.style.height = `calc(100vh - ${headerHeight}px)`;
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    // Initial calculation
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
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
    <div className="editor-page" ref={editorPageRef}>
      <div className="editor-header">
        <div className="editor-header-left">
          <button
            onClick={onClose}
            className="editor-back-btn"
            title="Back to file browser"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="file-name">{fileName}</span>
        </div>
        <div className="editor-header-actions">
          <button
            onClick={() => handleEditorSave(editorContent)}
            className="editor-save-btn"
          >
            <Save size={14} />
            <span>Save</span>
          </button>
          <button
            onClick={onClose}
            className="editor-close-btn"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      <div className="editor-content-wrapper">
        <CodeEditor
          filePath={filePath || 'New File'}
          content={editorContent}
          onSave={handleEditorSave}
          onClose={onClose}
          theme="dark"
          fileHistory={fileHistory}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
};

export default EditorPage; 