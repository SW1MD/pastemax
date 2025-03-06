import React, { useState, useEffect, useRef } from 'react';
import { Save, Copy, Download, Settings, Code, FileText, Check, ChevronLeft, ChevronRight, Home, Folder } from 'lucide-react';

const CodeEditor = ({ 
  filePath, 
  content, 
  onSave, 
  onClose,
  readOnly = false,
  theme = 'github',
  onNavigate = null,
  fileHistory = []
}) => {
  const [editorContent, setEditorContent] = useState(content || '');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('text');
  const [isSaving, setIsSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [isModified, setIsModified] = useState(false);
  const [tabSize, setTabSize] = useState(2);
  const [lineCount, setLineCount] = useState(1);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [fileBreadcrumbs, setFileBreadcrumbs] = useState([]);
  
  const editorRef = useRef(null);
  const lineNumbersRef = useRef(null);
  
  // Determine file type and set appropriate editor mode
  useEffect(() => {
    if (filePath) {
      const name = filePath.split('/').pop();
      setFileName(name);
      
      // Create breadcrumbs from file path
      const pathParts = filePath.split('/');
      const breadcrumbs = [];
      let currentPath = '';
      
      pathParts.forEach((part, index) => {
        currentPath += (index === 0 ? '' : '/') + part;
        breadcrumbs.push({
          name: part,
          path: currentPath
        });
      });
      
      setFileBreadcrumbs(breadcrumbs);
      
      // Determine file type
      const extension = name.split('.').pop().toLowerCase();
      setFileType(extension);
      
      // Update history index if this file is in history
      const index = fileHistory.findIndex(f => f === filePath);
      if (index !== -1) {
        setHistoryIndex(index);
      }
    }
  }, [filePath, fileHistory]);
  
  // Update content when prop changes
  useEffect(() => {
    if (content !== undefined) {
      setEditorContent(content);
      setIsModified(false);
      updateLineCount(content);
    }
  }, [content]);
  
  // Update line numbers when content changes
  const updateLineCount = (text) => {
    const lines = text.split('\n').length;
    setLineCount(lines);
    
    // Update line numbers display
    if (lineNumbersRef.current) {
      const lineNumbers = Array.from({ length: lines }, (_, i) => i + 1);
      lineNumbersRef.current.innerHTML = lineNumbers.map(num => `<div>${num}</div>`).join('');
    }
  };
  
  const handleChange = (e) => {
    const newContent = e.target.value;
    setEditorContent(newContent);
    setIsModified(true);
    updateLineCount(newContent);
  };
  
  const handleSave = async () => {
    if (!onSave || readOnly) return;
    
    setIsSaving(true);
    try {
      await onSave(editorContent);
      setIsModified(false);
      
      // Show success message
      setShowSaveSuccess(true);
      setTimeout(() => {
        setShowSaveSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error saving file:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(editorContent);
    
    // Show feedback
    const tempShowSuccess = showSaveSuccess;
    setShowSaveSuccess(true);
    setTimeout(() => {
      setShowSaveSuccess(tempShowSuccess);
    }, 1000);
  };
  
  const handleDownload = () => {
    const blob = new Blob([editorContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'download.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };
  
  // Handle tab key in textarea
  const handleKeyDown = (e) => {
    // Save with Ctrl+S
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
      return;
    }
    
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      
      // Insert tab at cursor position
      const newValue = editorContent.substring(0, start) + 
                      ' '.repeat(tabSize) + 
                      editorContent.substring(end);
      
      setEditorContent(newValue);
      updateLineCount(newValue);
      
      // Move cursor after the inserted tab
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + tabSize;
      }, 0);
      
      setIsModified(true);
    }
  };
  
  // Track cursor position
  const handleCursorMove = (e) => {
    const textarea = e.target;
    const value = textarea.value;
    
    const cursorPos = textarea.selectionStart;
    let lineNumber = 1;
    let columnNumber = 1;
    
    // Count newlines before cursor position
    for (let i = 0; i < cursorPos; i++) {
      if (value[i] === '\n') {
        lineNumber++;
        columnNumber = 1;
      } else {
        columnNumber++;
      }
    }
    
    setCursorPosition({ line: lineNumber, column: columnNumber });
  };
  
  // Initialize line numbers on mount
  useEffect(() => {
    updateLineCount(editorContent);
  }, []);
  
  // Sync scroll between textarea and line numbers
  const handleScroll = (e) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
  };
  
  // Navigation functions
  const navigateBack = () => {
    if (historyIndex > 0 && onNavigate) {
      onNavigate(fileHistory[historyIndex - 1]);
    }
  };
  
  const navigateForward = () => {
    if (historyIndex < fileHistory.length - 1 && onNavigate) {
      onNavigate(fileHistory[historyIndex + 1]);
    }
  };
  
  const navigateToParentFolder = () => {
    if (filePath && onNavigate) {
      const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));
      if (parentPath) {
        onNavigate(parentPath, true); // true indicates it's a folder
      }
    }
  };
  
  const navigateToBreadcrumb = (path) => {
    if (onNavigate) {
      const isFolder = !path.includes('.');
      onNavigate(path, isFolder);
    }
  };

  // Add a compatibility layer for different prop formats
  useEffect(() => {
    // If we receive a file object instead of separate props
    if (typeof filePath === 'object' && filePath !== null) {
      const file = filePath;
      setFileName(file.name || '');
      setEditorContent(file.content || '');
      // Update other state as needed
    }
  }, [filePath]);

  return (
    <div className="code-editor-container">
      <div className="code-editor-nav">
        <div className="code-editor-nav-actions">
          <button 
            className="editor-nav-btn"
            onClick={navigateBack}
            disabled={historyIndex <= 0}
            title="Navigate back"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            className="editor-nav-btn"
            onClick={navigateForward}
            disabled={historyIndex >= fileHistory.length - 1}
            title="Navigate forward"
          >
            <ChevronRight size={16} />
          </button>
          <button 
            className="editor-nav-btn"
            onClick={navigateToParentFolder}
            title="Go to parent folder"
          >
            <Folder size={16} />
          </button>
        </div>
        
        <div className="code-editor-breadcrumbs">
          {fileBreadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="breadcrumb-separator">/</span>}
              <button 
                className="breadcrumb-item"
                onClick={() => navigateToBreadcrumb(crumb.path)}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
      
      <div className="code-editor-header">
        <div className="code-editor-file-info">
          <div className="code-editor-icon">
            {fileType === 'js' || fileType === 'jsx' || fileType === 'ts' || fileType === 'tsx' ? (
              <Code size={18} />
            ) : (
              <FileText size={18} />
            )}
          </div>
          <div className="code-editor-filename">
            {fileName}
            {isModified && <span className="modified-indicator">*</span>}
          </div>
        </div>
        
        <div className="code-editor-actions">
          {!readOnly && (
            <button 
              className="editor-action-btn"
              onClick={handleSave}
              disabled={isSaving || !isModified}
              title="Save file (Ctrl+S)"
            >
              <Save size={16} className={isSaving ? 'spin' : ''} />
              <span>Save</span>
            </button>
          )}
          
          <button 
            className="editor-action-btn"
            onClick={handleCopy}
            title="Copy content"
          >
            <Copy size={16} />
            <span>Copy</span>
          </button>
          
          <button 
            className="editor-action-btn"
            onClick={handleDownload}
            title="Download file"
          >
            <Download size={16} />
            <span>Download</span>
          </button>
          
          <button 
            className="editor-action-btn"
            onClick={toggleSettings}
            title="Editor settings"
          >
            <Settings size={16} />
          </button>
          
          {onClose && (
            <button 
              className="editor-close-btn"
              onClick={onClose}
              title="Close editor"
            >
              <span>×</span>
            </button>
          )}
        </div>
      </div>
      
      {showSettings && (
        <div className="editor-settings-panel">
          <div className="editor-setting">
            <label>Font Size:</label>
            <input 
              type="number" 
              min="10" 
              max="24" 
              value={fontSize} 
              onChange={(e) => setFontSize(parseInt(e.target.value))}
            />
          </div>
          
          <div className="editor-setting">
            <label>Tab Size:</label>
            <input 
              type="number" 
              min="1" 
              max="8" 
              value={tabSize} 
              onChange={(e) => setTabSize(parseInt(e.target.value))}
            />
          </div>
        </div>
      )}
      
      <div className="code-editor-content">
        <div 
          ref={lineNumbersRef} 
          className="code-editor-line-numbers"
          style={{ fontSize: `${fontSize}px` }}
        ></div>
        
        <textarea
          ref={editorRef}
          value={editorContent}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onClick={handleCursorMove}
          onKeyUp={handleCursorMove}
          className={`code-editor-textarea ${fileType}`}
          style={{ 
            fontSize: `${fontSize}px`,
            backgroundColor: theme === 'github' ? '#ffffff' : '#1e1e1e',
            color: theme === 'github' ? '#000000' : '#d4d4d4'
          }}
          readOnly={readOnly}
          spellCheck="false"
          wrap="off"
        />
        
        <div className={`save-success-message ${showSaveSuccess ? 'visible' : ''}`}>
          <Check size={14} /> {isSaving ? 'Saving...' : 'File saved successfully'}
        </div>
      </div>
      
      <div className="code-editor-status-bar">
        <div className="code-editor-status-bar-left">
          <span>{fileType.toUpperCase()}</span>
          <span>{lineCount} lines</span>
        </div>
        <div className="code-editor-status-bar-right">
          <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
          <span>Spaces: {tabSize}</span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor; 