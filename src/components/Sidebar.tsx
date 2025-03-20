import React, { useState, useEffect, MouseEventHandler } from "react";
import { SidebarProps } from "../types/FileTypes";
import { ChevronLeft, ChevronRight, FileText, Edit, Settings, MessageSquare, Folder, MoreVertical } from "lucide-react";

const Sidebar = ({
  collapsed,
  toggleCollapsed,
  activePage = "select",
  setActivePage = () => {},
}: SidebarProps) => {
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [isResizing, setIsResizing] = useState(false);

  // Minimum and maximum sidebar widths
  const MIN_SIDEBAR_WIDTH = 180;
  const MAX_SIDEBAR_WIDTH = 320;

  // Handle mouse down for resizing
  const handleResizeStart = () => {
    setIsResizing(true);
  };

  // Handle resize effect
  useEffect(() => {
    const handleResize = (e: globalThis.MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX;
        if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
          setSidebarWidth(newWidth);
        }
      }
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", handleResizeEnd);

    return () => {
      document.removeEventListener("mousemove", handleResize);
      document.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [isResizing]);

  // Navigation items
  const navItems = [
    { id: 'project', label: 'Project', icon: <Folder size={20} /> },
    { id: 'prompt', label: 'Prompt', icon: <MessageSquare size={20} /> },
    { id: 'select', label: 'Select', icon: <FileText size={20} /> },
    { id: 'edit', label: 'Edit', icon: <Edit size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <div 
      className={`sidebar ${collapsed ? 'collapsed' : ''}`} 
      style={{ width: collapsed ? '60px' : `${sidebarWidth}px` }}
    >
      {/* App logo/branding */}
      <div className="sidebar-brand" onClick={toggleCollapsed} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
        {collapsed ? (
          <span className="brand-icon">P</span>
        ) : (
          <span className="brand-name">PasteMax</span>
        )}
      </div>
      
      {/* Navigation */}
      <div className="sidebar-nav">
        {navItems.map(item => (
          <div 
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => setActivePage(item.id)}
            title={collapsed ? item.label : undefined}
          >
            <div className="nav-icon">{item.icon}</div>
            {!collapsed && <div className="nav-label">{item.label}</div>}
            {!collapsed && activePage === item.id && <div className="nav-active-indicator"></div>}
          </div>
        ))}
      </div>
      
      {/* Bottom actions */}
      <div className="sidebar-footer">
        <div className="sidebar-collapse-toggle" onClick={toggleCollapsed} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </div>
        
        {!collapsed && (
          <div className="sidebar-more-options" title="More options">
            <MoreVertical size={18} />
          </div>
        )}
      </div>
      
      {!collapsed && (
        <div className="sidebar-resize-handle" onMouseDown={handleResizeStart}></div>
      )}
    </div>
  );
};

export default Sidebar;
