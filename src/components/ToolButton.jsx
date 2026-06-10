import React from 'react';
import QuickDrawPreviewGlyph from './QuickDrawPreviewGlyph';

function ToolButton({ tool, active, onSelect }) {
  return (
    <button
      className={`tool-button ${active ? 'active' : ''}`}
      style={{ '--tool-color': tool.color, color: tool.color }}
      onClick={() => onSelect(tool.id)}
      title={tool.prompt}
    >
      <span className="tool-button__glyph" aria-hidden="true">
        <QuickDrawPreviewGlyph toolId={tool.id} size={58} tone="currentColor" className={`tool-button__glyph-art tool-entry tool-entry-${tool.id}`} />
      </span>
      <span className="tool-button__fallback-icon" aria-hidden="true" />
      <span className="tool-button__label">{tool.label}</span>
      {active && <small>{tool.prompt}</small>}
    </button>
  );
}

export default ToolButton;
