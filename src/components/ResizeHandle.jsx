import React, { memo } from 'react';

/**
 * ResizeHandle component - provides a draggable handle between panels
 * Memoized to prevent unnecessary re-renders during parent state changes
 */
const ResizeHandle = memo(({ onResizeStart }) => {
  return (
    <div 
      className="resize-handle"
      onMouseDown={onResizeStart}
      onTouchStart={onResizeStart}
      aria-hidden="true"
      role="separator"
      tabIndex="-1"
      title="Drag to resize panels"
    ></div>
  );
});

ResizeHandle.displayName = 'ResizeHandle';

export default ResizeHandle; 