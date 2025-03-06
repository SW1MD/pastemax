import React, { useState, useCallback } from "react";
import { Plus, X, FileText, Eye } from "lucide-react";
import { Editor } from '@monaco-editor/react';
import CopyButton from "./CopyButton";
import ContextMenu from "./ContextMenu";

const FileCard = ({
  file,
  isSelected,
  toggleSelection,
  onViewFile,
  problemHighlightingActive
}) => {
  const { name, path: filePath, tokenCount, content } = file;
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);

  // Format token count for display
  const formattedTokens = tokenCount.toLocaleString();

  // Determine file language for Monaco editor
  const getLanguage = () => {
    const fileExtension = name.split('.').pop().toLowerCase();
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
    
    return languageMap[fileExtension] || 'plaintext';
  };

  // Monaco editor options
  const editorOptions = {
    readOnly: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    lineNumbers: 'off',
    folding: false,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 0,
    glyphMargin: false,
    scrollbar: {
      vertical: 'hidden',
      horizontal: 'hidden'
    },
    overviewRulerLanes: 0,
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    renderLineHighlight: 'none',
    fontSize: 12,
  };

  // Context menu handlers
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    setContextMenu({ 
      visible: true, 
      x: e.clientX, 
      y: e.clientY 
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ ...contextMenu, visible: false });
  }, [contextMenu]);

  // Menu items for the context menu
  const menuItems = [
    {
      icon: <Eye size={16} />,
      label: "View file",
      onClick: () => {
        closeContextMenu();
        onViewFile(file);
      }
    },
    {
      icon: <Plus size={16} />,
      label: isSelected ? "Remove from selection" : "Add to selection",
      onClick: () => {
        closeContextMenu();
        toggleSelection(filePath);
      }
    },
    { divider: true },
    {
      label: "Copy file path",
      onClick: () => {
        closeContextMenu();
        navigator.clipboard.writeText(filePath);
      }
    },
    {
      label: "Copy file content",
      onClick: () => {
        closeContextMenu();
        navigator.clipboard.writeText(content);
      }
    }
  ];

  // Toggle expanded state to show/hide code preview
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <div 
        className={`file-card ${isSelected ? "selected" : ""} ${isExpanded ? "expanded" : ""}`}
        onContextMenu={handleContextMenu}
      >
        <div className="file-card-header" onClick={toggleExpanded}>
          <div className="file-card-icon">
            <FileText size={16} />
          </div>
          <div className="file-card-name monospace">{name}</div>
        </div>
        <div className="file-card-info">
          <div className="file-card-tokens">~{formattedTokens} tokens</div>
        </div>

        <div className="file-card-actions">
          <button
            className="file-card-action"
            onClick={(e) => {
              e.stopPropagation();
              toggleSelection(filePath);
            }}
            title={isSelected ? "Remove from selection" : "Add to selection"}
          >
            {isSelected ? <X size={16} /> : <Plus size={16} />}
          </button>
          <button
            className="file-card-action"
            onClick={(e) => {
              e.stopPropagation();
              onViewFile && onViewFile(file);
            }}
            title="View file content"
          >
            <Eye size={16} />
          </button>
          <CopyButton text={file.content} className="file-card-action">
            {""}
          </CopyButton>
        </div>

        {isExpanded && content && (
          <div className="file-card-preview">
            <Editor
              height="150px"
              language={getLanguage()}
              value={content}
              theme="vs-dark"
              options={editorOptions}
              className={`monaco-editor ${problemHighlightingActive ? 'problem-highlighting-active' : ''}`}
            />
          </div>
        )}
      </div>

      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItems}
          onClose={closeContextMenu}
        />
      )}
    </>
  );
};

export default FileCard; 