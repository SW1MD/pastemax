import React, { useState, useEffect, useRef } from 'react';
import { Save, Copy, Settings, FileText } from 'lucide-react';
import { Editor } from '@monaco-editor/react';

const CodeEditor = ({ 
  filePath, 
  content, 
  onSave, 
  onClose,
  theme = 'auto',
  fileHistory = []
}) => {
  const [editorContent, setEditorContent] = useState(content || '');
  const [isModified, setIsModified] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(theme === 'dark' ? 'vs-dark' : 'vs');
  
  const editorRef = useRef(null);
  
  // Update content when prop changes
  useEffect(() => {
    if (content !== undefined) {
      setEditorContent(content);
      setIsModified(false);
    }
  }, [filePath, content]);

  // Update theme when prop changes
  useEffect(() => {
    setCurrentTheme(theme === 'dark' ? 'vs-dark' : 'vs');
  }, [theme]);
  
  // Determine file language for Monaco editor
  const getLanguage = () => {
    if (!filePath || filePath === 'New File') return 'plaintext';
    
    const fileExt = filePath.split('.').pop().toLowerCase();
    
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
    
    return languageMap[fileExt] || 'plaintext';
  };
  
  // Monaco editor options
  const getEditorOptions = () => {
    return {
      fontSize: 16,
      fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      minimap: { enabled: true },
      lineHeight: 1.6,
      tabSize: 2,
      automaticLayout: true,
      wordWrap: 'on',
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      renderWhitespace: 'selection',
      fontLigatures: true,
      renderLineHighlight: 'all',
      colorDecorators: true,
      mouseWheelZoom: true
    };
  };
  
  // Handle editor mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Add key binding for saving
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave && isModified) {
        onSave(editorContent);
        setIsModified(false);
      }
    });
    
    // Set editor options
    editor.updateOptions({
      fontLigatures: true,
      renderLineHighlight: 'all'
    });
    
    // Set better colors for selection and line highlighting
    monaco.editor.defineTheme('enhanced-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#E8E8E8',
        'editor.lineHighlightBackground': '#303030',
        'editor.selectionBackground': '#264F78',
        'editor.selectionHighlightBackground': '#22374A',
        'editorCursor.foreground': '#569CD6',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#C6C6C6'
      }
    });
    
    monaco.editor.defineTheme('enhanced-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#FFFFFF',
        'editor.foreground': '#000000',
        'editor.lineHighlightBackground': '#F0F0F0',
        'editor.selectionBackground': '#ADD6FF',
        'editor.selectionHighlightBackground': '#D8EBFF',
        'editorCursor.foreground': '#1976D2',
        'editorLineNumber.foreground': '#999999',
        'editorLineNumber.activeForeground': '#333333'
      }
    });
    
    // Apply the enhanced theme
    monaco.editor.setTheme(theme === 'dark' ? 'enhanced-dark' : 'enhanced-light');
  };
  
  const handleSave = () => {
    if (onSave && isModified) {
      onSave(editorContent);
      setIsModified(false);
    }
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(editorContent)
      .then(() => {
        console.log('Content copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy content: ', err);
      });
  };
  
  return (
    <div className="code-editor-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>      
      <div className="code-editor-content" style={{ flex: 1, position: 'relative', height: 'calc(100vh - 120px)' }}>
        <Editor
          height="100%"
          width="100%"
          language={getLanguage()}
          value={editorContent}
          theme={currentTheme}
          options={getEditorOptions()}
          onChange={(value) => {
            setEditorContent(value);
            setIsModified(true);
          }}
          onMount={handleEditorDidMount}
          loading={<div className="loading-editor">Loading editor...</div>}
        />
      </div>
    </div>
  );
};

export default CodeEditor; 