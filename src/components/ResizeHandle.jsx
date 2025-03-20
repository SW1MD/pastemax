import React, { memo, useEffect, useState } from 'react';

/**
 * ResizeHandle component - provides a draggable handle between panels
 * Memoized to prevent unnecessary re-renders during parent state changes
 */
const ResizeHandle = memo(({ onResizeStart, orientation = 'horizontal' }) => {
  const [currentOrientation, setCurrentOrientation] = useState(orientation);
  
  // Detect screen size changes for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      // Auto switch to vertical orientation on mobile screens
      setCurrentOrientation(window.innerWidth <= 992 ? 'vertical' : orientation);
    };
    
    // Initial check
    handleResize();
    
    // Set up listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, [orientation]);
  
  return (
    <div 
      className={`resize-handle ${currentOrientation}`}
      onMouseDown={onResizeStart}
      onTouchStart={onResizeStart}
      aria-hidden="true"
      role="separator"
      tabIndex="-1"
      title={`Drag to resize panels ${currentOrientation === 'vertical' ? 'up and down' : 'left and right'}`}
    ></div>
  );
});

ResizeHandle.displayName = 'ResizeHandle';

export default ResizeHandle; 