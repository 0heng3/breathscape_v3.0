import React from 'react';
import AnimatedQuickDrawGlyph from './AnimatedQuickDrawGlyph';

function QuickDrawPreviewGlyph({ toolId, size = 64, className = '', sceneState = {}, density = 0.4, tone, seed, live = false, strokeWidth, style, title }) {
  return (
    <AnimatedQuickDrawGlyph
      toolId={toolId}
      variantIndex={Math.abs(hash(seed || toolId)) % 3}
      size={size}
      tone={tone || 'currentColor'}
      className={className}
      animated={!live}
      delay={0}
      strokeWidth={strokeWidth}
      emphasis={density * 0.18}
      label={title}
      style={style}
    />
  );
}

function hash(value) {
  let result = 2166136261;
  const str = String(value || '');
  for (let index = 0; index < str.length; index += 1) {
    result ^= str.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export default QuickDrawPreviewGlyph;
