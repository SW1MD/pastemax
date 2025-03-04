import React, { useState, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { X, Save, Info, Copy, ExternalLink, DownloadCloud } from "lucide-react";
import ContextMenu from "./ContextMenu";

const CodeEditor = ({ file, onClose }) => {
  // Always declare hooks at the top level, before any conditional returns
  const [content, setContent] = useState(file ? file.content : '');
  const [isSaved, setIsSaved] = useState(true);
  const [showTip, setShowTip] = useState(true);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  
  // Hide the tip after 8 seconds
  useEffect(() => {
    if (showTip) {
      const timer = setTimeout(() => {
        setShowTip(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showTip]);
  
  // Context menu handlers
  const handleContextMenu = useCallback((e) => {
    if (e.target.closest(".monaco-editor")) {
      e.preventDefault();
      setContextMenu({ 
        visible: true, 
        x: e.clientX, 
        y: e.clientY 
      });
    }
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ ...contextMenu, visible: false });
  }, [contextMenu]);

  // Download the file content
  const downloadFile = useCallback(() => {
    if (!file) return;
    const element = document.createElement("a");
    const fileBlob = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(fileBlob);
    element.download = file.name;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    closeContextMenu();
  }, [content, file, closeContextMenu]);

  // Open in system default app (only works in Electron)
  const openInDefaultApp = useCallback(() => {
    if (!file) return;
    if (window.electron) {
      window.electron.openFileInDefaultApp(file.path);
    }
    closeContextMenu();
  }, [file, closeContextMenu]);
  
  if (!file) return null;

  // Context menu items
  const menuItems = [
    {
      icon: <Copy size={16} />,
      label: "Copy all content",
      onClick: () => {
        navigator.clipboard.writeText(content);
        closeContextMenu();
      }
    },
    {
      icon: <DownloadCloud size={16} />,
      label: "Download file",
      onClick: downloadFile
    },
    { divider: true },
    {
      icon: <ExternalLink size={16} />,
      label: "Open in default app",
      onClick: openInDefaultApp,
      disabled: !window.electron
    }
  ];

  // Define language for editor based on file extension
  const getLanguage = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    
    const languageMap = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      java: "java",
      c: "c",
      cpp: "cpp",
      cs: "csharp",
      go: "go",
      rs: "rust",
      rb: "ruby",
      php: "php",
      html: "html",
      css: "css",
      json: "json",
      md: "markdown",
      // Add more mappings as needed
    };
    
    return languageMap[extension] || "plaintext";
  };

  const handleEditorChange = (value) => {
    setContent(value);
    setIsSaved(false);
  };

  const handleSave = () => {
    // Update the file content in memory
    file.content = content;
    setIsSaved(true);
    
    // If you need to save to disk in an Electron app, you would send an IPC message here
    if (window.electron) {
      window.electron.ipcRenderer.send("save-file", {
        path: file.path,
        content: content
      });
    }
  };

  // Handle editor will mount - we can set up the editor before it's mounted
  const handleEditorWillMount = (monaco) => {
    // Configure editor options for immediate autocompletion
    monaco.editor.EditorOptions.quickSuggestionsDelay.defaultValue = 10; // Reduce the delay to 10ms
    monaco.editor.EditorOptions.snippetSuggestions.defaultValue = 'top'; // Show snippets at top of suggestion list
    
    // Define custom completions based on the file content
    // Let's extract potential words and symbols from the file content
    const createFileBasedCompletions = () => {
      if (!file || !file.content) return [];
      
      // Extract unique words from the content
      const uniqueWords = {};
      
      // Replace common code separators with spaces, then split by whitespace
      const words = file.content
        .replace(/[.,/#!$%^&*;:{}[\]=\-_`~()]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3) // Only words with more than 3 chars
        .filter(word => !word.match(/^\d+$/)); // Filter out numbers
      
      // Extract potential variable/function names using regex
      const codeSymbols = [];
      const language = getLanguage(file.name);
      
      if (language === 'javascript' || language === 'typescript') {
        // Extract variable declarations
        const varRegex = /(?:const|let|var)\s+(\w+)\s*=/g;
        let match;
        while ((match = varRegex.exec(file.content)) !== null) {
          codeSymbols.push(match[1]);
        }
        
        // Extract function declarations
        const funcRegex = /function\s+(\w+)\s*\(/g;
        while ((match = funcRegex.exec(file.content)) !== null) {
          codeSymbols.push(match[1]);
        }
        
        // Extract object properties
        const propRegex = /(\w+):/g;
        while ((match = propRegex.exec(file.content)) !== null) {
          codeSymbols.push(match[1]);
        }
        
        // Extract method declarations
        const methodRegex = /(\w+)\s*\(\s*\)\s*{/g;
        while ((match = methodRegex.exec(file.content)) !== null) {
          codeSymbols.push(match[1]);
        }
      }
      
      // Add all words and symbols to our unique words object
      [...words, ...codeSymbols].forEach(word => {
        uniqueWords[word] = true;
      });
      
      // Convert to array of completion items
      return Object.keys(uniqueWords).map(word => ({
        label: word,
        kind: monaco.languages.CompletionItemKind.Text,
        insertText: word,
        detail: 'From current file',
        sortText: '0' + word, // Sort extracted words first
      }));
    };
    
    // Register a completion provider for the language
    const language = getLanguage(file.name);
    monaco.languages.registerCompletionItemProvider(language, {
      provideCompletionItems: (model, position) => {
        // Generate file-based completions
        const fileCompletions = createFileBasedCompletions();
        
        // Add common language-specific snippets
        let snippets = [];
        
        if (language === 'javascript' || language === 'typescript') {
          snippets = [
            {
              label: 'function',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: [
                'function ${1:name}(${2:params}) {',
                '\t${0}',
                '}'
              ].join('\n'),
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Function definition',
              sortText: '1function'
            },
            {
              label: 'arrow function',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '(${1:params}) => ${0}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Arrow function',
              sortText: '1arrow'
            },
            {
              label: 'arrow function with block',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: [
                '(${1:params}) => {',
                '\t${0}',
                '}'
              ].join('\n'),
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Arrow function with block body',
              sortText: '1arrowblock'
            },
            {
              label: 'if statement',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: [
                'if (${1:condition}) {',
                '\t${0}',
                '}'
              ].join('\n'),
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'If statement',
              sortText: '1if'
            },
            {
              label: 'if-else statement',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: [
                'if (${1:condition}) {',
                '\t${2}',
                '} else {',
                '\t${0}',
                '}'
              ].join('\n'),
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'If-else statement',
              sortText: '1ifelse'
            },
            // New snippets
            {
              label: 'for loop',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: [
                'for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {',
                '\t${0}',
                '}'
              ].join('\n'),
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'For loop',
              sortText: '1for'
            },
            {
              label: 'forEach',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '${1:array}.forEach((${2:item}) => {\n\t${0}\n});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Array forEach method',
              sortText: '1forEach'
            },
            {
              label: 'map',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '${1:array}.map((${2:item}) => {\n\t${0}\n});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Array map method',
              sortText: '1map'
            },
            {
              label: 'filter',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '${1:array}.filter((${2:item}) => {\n\t${0}\n});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Array filter method',
              sortText: '1filter'
            },
            {
              label: 'try-catch',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: [
                'try {',
                '\t${1}',
                '} catch (${2:error}) {',
                '\t${0}',
                '}'
              ].join('\n'),
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Try-catch block',
              sortText: '1trycatch'
            }
          ];
        }
        
        return {
          suggestions: [...fileCompletions, ...snippets]
        };
      }
    });
  };

  // Handle editor did mount - we can configure the editor after it's mounted
  const handleEditorDidMount = (editor, monaco) => {
    // Set focus to the editor
    editor.focus();
    
    // You can add custom commands, keybindings, etc. here
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (!isSaved) {
        handleSave();
      }
    });
  };

  return (
    <div className="code-editor-container" onContextMenu={handleContextMenu}>
      <div className="code-editor-header">
        <div className="code-editor-filename">{file.name}</div>
        <div className="code-editor-controls">
          <button 
            className="code-editor-save" 
            onClick={handleSave}
            disabled={isSaved}
            title="Save changes"
          >
            <Save size={16} />
          </button>
          <button className="code-editor-close" onClick={onClose} title="Close editor">
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="code-editor-content">
        <Editor
          height="calc(100vh - 200px)"
          defaultLanguage={getLanguage(file.name)}
          value={content}
          onChange={handleEditorChange}
          theme="vs-dark"
          beforeMount={handleEditorWillMount}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 14,
            wordWrap: "on",
            // Autocomplete settings - enhanced for automatic display
            quickSuggestions: {
              other: true,
              comments: true,
              strings: true
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "on",
            tabCompletion: "on",
            suggestSelection: "first",
            snippetSuggestions: "inline",
            wordBasedSuggestions: true,
            parameterHints: { enabled: true },
            // Make suggestions appear faster and more often
            suggest: {
              showIcons: true,
              showStatusBar: true,
              preview: true,
              showMethods: true,
              showFunctions: true,
              showConstructors: true,
              showFields: true,
              showVariables: true,
              showClasses: true,
              showStructs: true,
              showInterfaces: true,
              showModules: true,
              showProperties: true,
              showEvents: true,
              showOperators: true,
              showUnits: true,
              showValues: true,
              showConstants: true,
              showEnums: true,
              showEnumMembers: true,
              showKeywords: true,
              showWords: true,
              showColors: true,
              showFiles: true,
              showReferences: true,
              showFolders: true,
              showTypeParameters: true,
              showSnippets: true,
              showUsers: true,
              showIssues: true,
              filterGraceful: true,
              maxVisibleSuggestions: 12,
              insertMode: "insert"
            },
            // For JSX/HTML automatic tag closing
            autoClosingTags: true,
            // Auto closing settings
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoClosingOvertype: "always",
            autoSurround: "languageDefined",
            // Other helpful editor settings
            formatOnPaste: true,
            formatOnType: true,
            autoIndent: "full",
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true },
            matchBrackets: "always",
            renderWhitespace: "selection",
            // Performance settings
            folding: true,
            foldingStrategy: "auto",
            // Accessibility
            accessibilitySupport: "auto"
          }}
        />
      </div>
      
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItems}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
};

export default CodeEditor; 