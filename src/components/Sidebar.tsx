import React, { useState, useEffect, MouseEventHandler } from "react";
import { SidebarProps } from "../types/FileTypes";
import { ChevronLeft, ChevronRight, FileText, Edit, Settings, MessageSquare, Folder } from "lucide-react";

const Sidebar = ({
  collapsed,
  toggleCollapsed,
  activePage = "select",
  setActivePage = () => {},
}: SidebarProps) => {
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

  // Min and max width constraints
  const MIN_SIDEBAR_WIDTH = 200;
  const MAX_SIDEBAR_WIDTH = 500;

  // Handle mouse down for resizing
  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
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
    { id: 'history', label: 'History', icon: <ChevronLeft size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <div 
      className={`sidebar ${collapsed ? 'collapsed' : ''}`} 
      style={{ width: collapsed ? '50px' : `${sidebarWidth}px` }}
    >
      {/* Collapse toggle button */}
      <div className="sidebar-collapse-toggle" onClick={toggleCollapsed}>
        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </div>
      
      {/* Navigation - added margin-top to move it down */}
      <div className="sidebar-nav" style={{ marginTop: '40px' }}>
        {navItems.map(item => (
          <div 
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => setActivePage(item.id)}
            title={item.label}
          >
            <div className="nav-icon">{item.icon}</div>
            {!collapsed && <div className="nav-label">{item.label}</div>}
          </div>
        ))}
      </div>
      
      {!collapsed && (
        <div className="sidebar-resize-handle" onMouseDown={handleResizeStart}></div>
      )}
    </div>
  );
};

export default Sidebar;
