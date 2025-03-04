import React, { useEffect, useRef } from 'react';

/**
 * A reusable context menu component
 * @param {Object} props Component props
 * @param {boolean} props.visible Whether the context menu is visible
 * @param {Object} props.position Position of the context menu {x, y}
 * @param {Array} props.items Menu items to display
 * @param {Function} props.onClose Callback to close the menu
 */
const ContextMenu = ({ visible, position, items, onClose }) => {
  const menuRef = useRef(null);
  
  // Handle clicks outside the menu to close it
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    
    // Handle escape key to close menu
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscKey);
      // Also close menu if window is scrolled
      document.addEventListener('scroll', onClose, true);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('scroll', onClose, true);
    };
  }, [visible, onClose]);
  
  // Adjust menu position to keep it within viewport
  useEffect(() => {
    if (!visible || !menuRef.current) return;
    
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Check if menu extends beyond right edge
    if (position.x + rect.width > viewportWidth) {
      menu.style.left = `${viewportWidth - rect.width - 10}px`;
    } else {
      menu.style.left = `${position.x}px`;
    }
    
    // Check if menu extends beyond bottom edge
    if (position.y + rect.height > viewportHeight) {
      menu.style.top = `${viewportHeight - rect.height - 10}px`;
    } else {
      menu.style.top = `${position.y}px`;
    }
  }, [visible, position]);
  
  if (!visible) return null;
  
  return (
    <div 
      className="context-menu"
      ref={menuRef}
      style={{ 
        position: 'fixed',
        left: position.x, 
        top: position.y,
        zIndex: 1000
      }}
    >
      <div className="context-menu-items">
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {item.divider ? (
              <div className="context-menu-divider" />
            ) : (
              <div 
                className={`context-menu-item ${item.disabled ? 'disabled' : ''}`}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    onClose();
                  }
                }}
              >
                {item.icon && (
                  <span className="context-menu-item-icon">{item.icon}</span>
                )}
                <span className="context-menu-item-label">{item.label}</span>
                {item.shortcut && (
                  <span className="context-menu-item-shortcut">{item.shortcut}</span>
                )}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ContextMenu;