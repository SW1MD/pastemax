import React, { useState, useEffect } from "react";
import AceEditor from "react-ace";
import { FileData } from "../types/FileTypes";
import { X } from "lucide-react";

// Import ace modes and themes
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-html";
import "ace-builds/src-noconflict/mode-css";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/mode-csharp";
import "ace-builds/src-noconflict/mode-typescript";
import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/mode-text";

// Import theme (just one default theme now)
import "ace-builds/src-noconflict/theme-tomorrow_night";

// Import extensions
import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/ext-searchbox";

interface CodeEditorProps {
  file: FileData | null;
  readOnly?: boolean;
  onClose: () => void;
}

const CodeEditor = ({ file, readOnly = true, onClose }) => {
  const [mode, setMode] = useState("text");
  // We'll use a fixed theme now
  const theme = "tomorrow_night";
  
  // Determine the editor mode based on file extension
  useEffect(() => {
    if (!file || !file.name) return;
    
    const extension = file.name.split('.').pop()?.toLowerCase() || "";
    
    const modeMap = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      html: "html",
      css: "css",
      json: "json",
      py: "python",
      java: "java",
      cs: "csharp",
      md: "markdown"
    };
    
    setMode(modeMap[extension] || "text");
  }, [file]);
  
  if (!file) {
    return <div className="code-editor-placeholder">Select a file to preview</div>;
  }
  
  return (
    <div className="code-editor-container">
      <div className="code-editor-header">
        <div className="code-editor-file-info">
          <span className="code-editor-filename">{file.name}</span>
          <span className="code-editor-tokens">~{file.tokenCount.toLocaleString()} tokens</span>
        </div>
        <div className="code-editor-controls">
          <button 
            className="code-editor-close-btn" 
            onClick={onClose}
            title="Close editor"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <AceEditor
        mode={mode}
        theme={theme}
        name="code-editor"
        value={file.content || ""}
        readOnly={readOnly}
        width="100%"
        height="calc(100% - 40px)"
        fontSize={14}
        showPrintMargin={false}
        showGutter={true}
        highlightActiveLine={true}
        setOptions={{
          enableBasicAutocompletion: !readOnly,
          enableLiveAutocompletion: !readOnly,
          enableSnippets: !readOnly,
          showLineNumbers: true,
          tabSize: 2,
          useWorker: false
        }}
      />
    </div>
  );
};

export default CodeEditor; 