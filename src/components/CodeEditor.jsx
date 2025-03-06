import React, { useState, useEffect, useRef } from 'react';
import { Save, Copy, Download, Settings, Code, FileText, Check, ChevronLeft, ChevronRight, Home, Folder } from 'lucide-react';
import { Editor } from '@monaco-editor/react';

const CodeEditor = ({ 
  filePath, 
  content, 
  onSave, 
  onClose,
  readOnly = false,
  theme = 'auto',
  onNavigate = null,
  fileHistory = [],
  problemHighlightingActive = false
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
  const [currentTheme, setCurrentTheme] = useState(theme);
  
  const editorRef = useRef(null);
  const lineNumbersRef = useRef(null);
  
  // Detect system theme preference when theme is set to 'auto'
  useEffect(() => {
    if (theme === 'auto') {
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const updateTheme = (e) => {
        setCurrentTheme(e.matches ? 'dark' : 'github');
      };
      
      // Set initial theme
      updateTheme(darkModeMediaQuery);
      
      // Listen for changes
      darkModeMediaQuery.addEventListener('change', updateTheme);
      
      return () => {
        darkModeMediaQuery.removeEventListener('change', updateTheme);
      };
    } else {
      setCurrentTheme(theme);
    }
  }, [theme]);
  
  // Add a compatibility layer for different prop formats
  useEffect(() => {
    // If we receive a file object instead of separate props
    if (typeof filePath === 'object' && filePath !== null) {
      const file = filePath;
      setFileName(file.name || '');
      setEditorContent(file.content || '');
      
      // Extract file type from name
      if (file.name) {
        const extension = file.name.split('.').pop().toLowerCase();
        setFileType(extension);
      }
    } else if (typeof filePath === 'string') {
      // Extract filename from path
      const name = filePath.split('/').pop();
      setFileName(name);
      
      // Extract file type from name
      if (name) {
        const extension = name.split('.').pop().toLowerCase();
        setFileType(extension);
      }
      
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
  
  // Handle text changes in the editor
  const handleChange = (e) => {
    const newContent = e.target.value;
    setEditorContent(newContent);
    setIsModified(true);
    updateLineCount(newContent);
  };
  
  // Determine file language for Monaco editor
  const getLanguage = () => {
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'sh': 'shell',
      'sql': 'sql',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'dockerfile': 'dockerfile'
    };
    
    return languageMap[fileType.toLowerCase()] || 'plaintext';
  };
  
  // Monaco editor options
  const getEditorOptions = () => {
    return {
      fontSize: fontSize,
      fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      minimap: { enabled: false },
      lineHeight: 1.5,
      tabSize: tabSize,
      readOnly: readOnly,
      automaticLayout: true,
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
      }
    };
  };
  
  // Handle editor mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Set the line count based on the content
    setLineCount(editor.getModel().getLineCount());
    
    // Add key binding for saving
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
    
    // Track cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column
      });
    });
    
    // Track content changes
    editor.onDidChangeModelContent(() => {
      setIsModified(true);
      setLineCount(editor.getModel().getLineCount());
    });
  };
  
  // Save file content
  const handleSave = async () => {
    if (!onSave || !isModified) return;
    
    try {
      setIsSaving(true);
      await onSave(filePath, editorContent);
      setIsModified(false);
      setShowSaveSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Error saving file:", error);
      // TODO: Show error message
    } finally {
      setIsSaving(false);
    }
  };
  
  // Navigate back in file history
  const navigateBack = () => {
    if (historyIndex > 0 && onNavigate) {
      onNavigate(fileHistory[historyIndex - 1]);
    }
  };
  
  // Navigate forward in file history
  const navigateForward = () => {
    if (historyIndex < fileHistory.length - 1 && onNavigate) {
      onNavigate(fileHistory[historyIndex + 1]);
    }
  };
  
  // Navigate to a specific breadcrumb
  const navigateToBreadcrumb = (path) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };
  
  // Navigate to parent folder
  const navigateToParentFolder = () => {
    if (filePath && onNavigate) {
      const pathParts = filePath.split('/');
      pathParts.pop(); // Remove the file name
      const parentPath = pathParts.join('/');
      onNavigate(parentPath);
    }
  };
  
  // Toggle settings panel
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };
  
  // Download file
  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([editorContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  // Copy file content
  const handleCopy = () => {
    navigator.clipboard.writeText(editorContent)
      .catch(err => console.error('Could not copy text: ', err));
  };

  return (
    <div className={`code-editor-container theme-${currentTheme}`}>
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
          <button 
            className="editor-action-btn"
            onClick={handleSave}
            disabled={!isModified || !onSave}
            title="Save file (Ctrl+S)"
          >
            <Save size={16} />
            <span>Save</span>
          </button>
          
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
          
          <div className="editor-setting">
            <label>Theme:</label>
            <select
              value={currentTheme}
              onChange={(e) => setCurrentTheme(e.target.value)}
            >
              <option value="github">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto (System)</option>
            </select>
          </div>
        </div>
      )}
      
      <div className="code-editor-content">
        <Editor
          height="100%"
          language={getLanguage()}
          value={editorContent}
          theme={currentTheme === 'dark' ? 'vs-dark' : 'vs-light'}
          options={getEditorOptions()}
          onChange={(value) => {
            setEditorContent(value);
            setIsModified(true);
          }}
          onMount={handleEditorDidMount}
          className={`monaco-editor ${problemHighlightingActive ? 'problem-highlighting-active' : ''}`}
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
          <span>Theme: {currentTheme}</span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor; 