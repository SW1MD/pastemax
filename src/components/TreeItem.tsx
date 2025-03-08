import React, {
  useRef,
  useEffect,
} from "react";
import { TreeItemProps, TreeNode } from "../types/FileTypes";
import { ChevronRight, File, Folder, FolderOpen } from "lucide-react";

const TreeItem = ({
  node,
  selectedFiles,
  toggleFileSelection,
  toggleFolderSelection,
  toggleExpanded,
}: TreeItemProps) => {
  const { id, name, path, type, level, isExpanded, fileData, children } = node;
  const checkboxRef = useRef(null);

  const isSelected = type === "file" && selectedFiles.includes(path);

  // For directories, check if all children are selected - fixed algorithm
  const isDirectorySelected =
    type === "directory" && children && children.length > 0
      ? children.every((child: TreeNode) => {
          if (child.type === "file") {
            // For files, simply check if they're in selectedFiles
            return !child.fileData?.isBinary && !child.fileData?.isSkipped && selectedFiles.includes(child.path);
          } else if (child.type === "directory") {
            // For directories, need to check if all valid files in the directory are selected
            // This is more complex and would require recursion
            // For now, we'll use a simplified approach of checking if path is in selectedFiles
            return selectedFiles.includes(child.path);
          }
          return false;
        })
      : false;

  // Check if some but not all files in this directory are selected - fixed algorithm
  const isDirectoryPartiallySelected =
    type === "directory" && children && children.length > 0
      ? (children.some((child: TreeNode) => {
          if (child.type === "file") {
            return !child.fileData?.isBinary && !child.fileData?.isSkipped && selectedFiles.includes(child.path);
          } else if (child.type === "directory") {
            return selectedFiles.some(path => path.startsWith(child.path + "/")) || selectedFiles.includes(child.path);
          }
          return false;
        }) && !isDirectorySelected)
      : false;

  // Update the indeterminate state and checked state whenever it changes
  useEffect(() => {
    if (checkboxRef.current) {
      if (type === "file") {
        checkboxRef.current.checked = isSelected;
      } else {
        checkboxRef.current.checked = isDirectorySelected;
        checkboxRef.current.indeterminate = isDirectoryPartiallySelected;
      }
    }
  }, [selectedFiles, isSelected, isDirectorySelected, isDirectoryPartiallySelected, type, path]);

  const handleToggle = (e: any) => {
    e.stopPropagation();
    toggleExpanded(id);
  };

  const handleItemClick = (e: any) => {
    // Get the target element
    const target = e.target as HTMLElement;
    
    // Don't process clicks on checkboxes - they have their own handler
    const isCheckbox = target.tagName === 'INPUT';
    const isCheckboxParent = !!target.closest('input[type="checkbox"]');
    if (isCheckbox || isCheckboxParent) {
      return;
    }

    // Don't process clicks on toggle buttons - they have their own handler
    if (target.closest('.tree-item-toggle')) {
      return;
    }
    
    if (type === "directory") {
      toggleExpanded(id);
    } else if (type === "file" && !isDisabled) {
      toggleFileSelection(path);
    }
  };

  const handleCheckboxChange = (e: any) => {
    e.stopPropagation();
    
    const target = e.target as HTMLInputElement;
    
    if (type === "file") {
      // Always call toggleFileSelection to handle both selection and deselection
      toggleFileSelection(path);
    } else if (type === "directory") {
      // For directories, pass the checked state to toggleFolderSelection
      toggleFolderSelection(path, target.checked);
    }
  };

  // Check if file is binary or otherwise unselectable
  const isDisabled = fileData ? fileData.isBinary || fileData.isSkipped : false;

  // Check if the file is excluded by default (but still selectable)
  const isExcludedByDefault = fileData?.excludedByDefault || false;

  return (
    <div className="tree-item-container">
      <div
        className={`tree-item ${isSelected ? "selected" : ""} ${
          isExcludedByDefault ? "excluded-by-default" : ""
        }`}
        style={{ paddingLeft: `${level * 16}px` }}
        onClick={handleItemClick}
        data-path={path}
      >
        {type === "directory" && (
          <div
            className={`tree-item-toggle ${isExpanded ? "expanded" : ""}`}
            onClick={handleToggle}
            aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
          >
            <ChevronRight size={16} />
          </div>
        )}

        {type === "file" && <div className="tree-item-indent"></div>}

        <input
          type="checkbox"
          className="tree-item-checkbox"
          checked={type === "file" ? isSelected : isDirectorySelected}
          ref={checkboxRef}
          onChange={handleCheckboxChange}
          disabled={isDisabled}
          onClick={(e: any) => {
            // This is important to prevent double handling
            e.stopPropagation();
          }}
        />

        <div className="tree-item-content">
          <div className="tree-item-icon">
            {type === "directory" 
              ? (isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />)
              : <File size={16} />
            }
          </div>

          <div className="tree-item-name">{name}</div>

          {fileData && fileData.tokenCount > 0 && (
            <span className="tree-item-tokens">
              (~{fileData.tokenCount.toLocaleString()})
            </span>
          )}

          {isDisabled && fileData && (
            <span className="tree-item-badge">
              {fileData.isBinary ? "Binary" : "Skipped"}
            </span>
          )}

          {!isDisabled && isExcludedByDefault && (
            <span className="tree-item-badge excluded">Excluded</span>
          )}
        </div>
      </div>

      {type === "directory" && isExpanded && children && children.length > 0 && (
        <div className="tree-item-children">
          {children.map((child: TreeNode) => (
            <TreeItem
              key={child.id}
              node={child}
              selectedFiles={selectedFiles}
              toggleFileSelection={toggleFileSelection}
              toggleFolderSelection={toggleFolderSelection}
              toggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeItem;
