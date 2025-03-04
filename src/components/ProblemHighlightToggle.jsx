import React from 'react';
import { Code } from 'lucide-react';

const ProblemHighlightToggle = ({ isActive, toggleHighlight }) => {
  return (
    <div className={`problem-highlight-toggle ${isActive ? 'active' : ''}`} onClick={toggleHighlight}>
      <Code size={24} strokeWidth={2.5} />
      <span className="tooltip">Toggle Problem Highlighting</span>
    </div>
  );
};

export default ProblemHighlightToggle; 