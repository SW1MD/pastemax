import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';

const CodeEditor = ({ 
  filePath, 
  content, 
  onSave, 
  onClose,
  theme = 'dark',
  fileHistory = []
}) => {
  const [editorContent, setEditorContent] = useState(content || '');
  const [isModified, setIsModified] = useState(false);
  
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  
  // Update content when prop changes
  useEffect(() => {
    if (content !== undefined) {
      setEditorContent(content);
      setIsModified(false);
    }
  }, [filePath, content]);
  
  // Add resize observer to handle editor size changes
  useEffect(() => {
    if (editorRef.current) {
      // Force layout recalculation after mounting
      setTimeout(() => {
        editorRef.current.layout();
      }, 100);
    }
    
    const handleResize = () => {
      if (editorRef.current) {
        editorRef.current.layout();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [editorRef.current]);
  
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
      fontSize: 14,
      fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
      lineNumbers: 'on',
      scrollBeyondLastLine: true, // Allow scrolling beyond last line to prevent cutoff
      minimap: { enabled: true },
      lineHeight: 1.5,
      tabSize: 2,
      automaticLayout: true, // Enable automatic layout adjustment
      wordWrap: 'on',
      cursorBlinking: 'smooth',
      smoothScrolling: true,
      renderWhitespace: 'selection',
      theme: 'vs-dark',
      fixedOverflowWidgets: true, // Fix cut-off widgets
      padding: { bottom: 20 } // Add bottom padding to prevent cut-off
    };
  };
  
  // Handle editor mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Apply dark theme styles to ensure visibility
    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.style.backgroundColor = '#1E1E1E';
      domNode.classList.add('monaco-dark-theme');
    }
    
    // Force dark background on monaco editor components
    const editorContainer = domNode.closest('.monaco-editor');
    if (editorContainer) {
      editorContainer.style.backgroundColor = '#1E1E1E';
      editorContainer.classList.add('monaco-dark-forced');
      
      // Set full height to parent containers
      let parent = editorContainer.parentElement;
      while (parent && !parent.classList.contains('code-editor-container')) {
        parent.style.height = '100%';
        parent = parent.parentElement;
      }
    }
    
    // Force layout calculation
    setTimeout(() => {
      editor.layout();
    }, 100);
    
    // Add key binding for saving
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave && isModified) {
        onSave(editorContent);
        setIsModified(false);
      }
    });
  };
  
  return (
    <div className="code-editor-container dark-theme" ref={containerRef}>
      <div className="code-editor-content">
        <Editor
          height="100%"
          width="100%"
          language={getLanguage()}
          value={editorContent}
          theme="vs-dark"
          options={getEditorOptions()}
          defaultValue={editorContent}
          beforeMount={(monaco) => {
            // Define a custom dark theme with stronger contrast
            monaco.editor.defineTheme('vs-dark', {
              base: 'vs-dark',
              inherit: true,
              rules: [
                { token: 'comment', foreground: '6A9955' },
                { token: 'keyword', foreground: '569CD6' },
                { token: 'string', foreground: 'CE9178' }
              ],
              colors: {
                'editor.background': '#1E1E1E',
                'editor.foreground': '#D4D4D4',
                'editorCursor.foreground': '#FFFFFF',
                'editor.lineHighlightBackground': '#2A2D2E',
                'editorLineNumber.foreground': '#858585',
                'editor.selectionBackground': '#264F78',
                'editor.inactiveSelectionBackground': '#3A3D41'
              }
            });
          }}
          onChange={(value) => {
            setEditorContent(value);
            setIsModified(true);
          }}
          onMount={handleEditorDidMount}
          loading={
            <div className="loading-editor">
              Loading editor...
            </div>
          }
        />
      </div>
    </div>
  );
};

export default CodeEditor; 