export interface FileData {
  name: string;
  path: string;
  content: string;
  tokenCount: number;
  size: number;
  isBinary: boolean;
  isSkipped: boolean;
  error?: string;
  fileType?: string;
  excludedByDefault?: boolean;
}

export interface TreeNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "directory";
  children?: TreeNode[];
  isExpanded?: boolean;
  level: number;
  fileData?: FileData;
}

export interface SidebarProps {
  collapsed?: boolean;
  toggleCollapsed?: () => void;
  activePage?: string;
  setActivePage?: (page: string) => void;
}

export interface FileListProps {
  files: FileData[];
  selectedFiles: string[];
  toggleFileSelection: (filePath: string) => void;
}

export interface FileCardProps {
  file: FileData;
  isSelected: boolean;
  toggleSelection: (filePath: string) => void;
}

export interface TreeItemProps {
  node: TreeNode;
  selectedFiles: string[];
  toggleFileSelection: (filePath: string) => void;
  toggleFolderSelection: (folderPath: string, isSelected: boolean) => void;
  toggleExpanded: (nodeId: string) => void;
}

export interface SortOption {
  value: string;
  label: string;
}

export interface SearchBarProps {
  value: string;
  onChange: (term: string) => void;
  placeholder?: string;
}

export interface CopyButtonProps {
  onCopy: () => void;
  isDisabled: boolean;
  copyStatus: boolean;
}
