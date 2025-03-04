import React, { useState, useCallback } from "react";
import { Plus, X, FileText, Eye } from "lucide-react";
import CopyButton from "./CopyButton";
import ContextMenu from "./ContextMenu";

const FileCard = ({
  file,
  isSelected,
  toggleSelection,
  onViewFile
}) => {
  const { name, path: filePath, tokenCount, content } = file;
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });

  // Format token count for display
  const formattedTokens = tokenCount.toLocaleString();

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

  return (
    <>
      <div 
        className={`file-card ${isSelected ? "selected" : ""}`}
        onContextMenu={handleContextMenu}
      >
        <div className="file-card-header">
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
            onClick={() => toggleSelection(filePath)}
            title={isSelected ? "Remove from selection" : "Add to selection"}
          >
            {isSelected ? <X size={16} /> : <Plus size={16} />}
          </button>
          <button
            className="file-card-action"
            onClick={() => onViewFile(file)}
            title="View file content"
          >
            <Eye size={16} />
          </button>
          <CopyButton text={file.content} className="file-card-action">
            {""}
          </CopyButton>
        </div>
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