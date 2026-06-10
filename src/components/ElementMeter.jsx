import React from 'react';
import QuickDrawPreviewGlyph from './QuickDrawPreviewGlyph';
import { tools } from '../data/tools';

function ElementMeter({ elements }) {
  return (
    <div className="element-meter">
      {tools.map((tool) => {
        return (
          <div className="element-meter__item" key={tool.id}>
            <QuickDrawPreviewGlyph toolId={tool.id} size={28} tone={tool.color} live />
            <span>{elements[tool.id] || 0}</span>
          </div>
        );
      })}
    </div>
  );
}

export default ElementMeter;
