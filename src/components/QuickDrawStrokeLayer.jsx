import React from 'react';
import AnimatedQuickDrawGlyph from './AnimatedQuickDrawGlyph';
import QuickDrawPreviewGlyph from './QuickDrawPreviewGlyph';
import { buildQuickDrawStyleToken } from '../utils/quickdrawStyle';

function QuickDrawStrokeLayer({ items = [], sceneState = {}, className = '' }) {
  if (!items.length) return null;
  const visibleItems = items.slice(-2);

  return (
    <div className={`quickdraw-stroke-layer ${className}`.trim()} aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 24 }}>
      {visibleItems.map((item, index) => {
        const token = item.quickdrawToken || buildQuickDrawStyleToken({
          toolId: item.tool,
          stroke: item,
          sceneState,
          day: item.day || 1,
          index,
          live: Boolean(item.live),
        });
        const stamps = getStampPlacements(item);
        const box = item.quickdrawBoundingBox || item.boundingBox || item.quickdraw?.features?.boundingBox || null;
        const x = clampPercent(item.centerX ?? item.x, item.canvasWidth, 8, 92);
        const rawY = clampPercent(item.centerY ?? item.y, item.canvasHeight, 10, 88);
        const grounded = isGroundTool(item.tool);
        const y = grounded ? Math.max(rawY, 66) : rawY;
        const longestEdge = box ? Math.max(box.width || 0, box.height || 0) : 0;
        const size = clamp(54 + (token.features?.density || item.density || item.speed || 0.28) * 82 + longestEdge * 0.1, 50, 176);
        const rotate = item.direction === 'left' ? -8 : item.direction === 'right' ? 8 : item.direction === 'up' ? -4 : item.direction === 'down' ? 4 : (index % 5 - 2) * 3;
        const blur = token.texture === 'mist' ? '0.35px' : token.texture === 'glow' ? '0.18px' : '0';
        const opacity = Math.min(token.opacity ?? (item.live ? 0.36 : 0.24), item.live ? 0.34 : 0.3);
        const jitter = token.jitter || 0.5;
        const svgOpacity = item.live ? 0.96 : 0.88;

        return (
          <div
            key={item.id || `${item.tool}-${index}`}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: `${size}px`,
              height: `${size}px`,
              transform: `translate(-50%, -50%) rotate(${rotate}deg) scale(${1 + jitter * 0.02})`,
              opacity,
              filter: blur !== '0' ? `blur(${blur})` : 'none',
              mixBlendMode: token.texture === 'glow' ? 'screen' : 'normal',
            }}
          >
            {stamps.length ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {stamps.map((stamp, stampIndex) => {
                  const stampSize = clamp(stamp.size || size * 0.58, 24, 180);
                  const stampTone = stamp.tone || token.renderColor;
                  const variantIndex = stamp.assetVariantIndex ?? stamp.variantIndex ?? index % 3;
                  const stampOpacity = Math.min(1, Math.max(0.72, stamp.opacity ?? 1));
                  return (
                    <div
                      key={`${item.id || item.tool}-${index}-${stampIndex}`}
                      style={{
                        position: 'absolute',
                        left: `${stamp.x || 50}%`,
                        top: `${stamp.y || 50}%`,
                        width: `${stampSize}px`,
                        height: `${stampSize}px`,
                        transform: `translate(-50%, -50%) rotate(${stamp.rotation || 0}deg) scale(${stamp.scale || 1})`,
                        transformOrigin: 'center center',
                        opacity: stampOpacity,
                        filter: stampIndex === 0 && token.texture === 'glow' ? 'drop-shadow(0 0 10px rgba(255,255,255,0.16))' : 'none',
                      }}
                    >
                      <AnimatedQuickDrawGlyph
                        toolId={item.tool}
                        variantIndex={variantIndex}
                        size={stampSize}
                        tone={stampTone}
                        animated={!item.live}
                        delay={stamp.appearDelay || stampIndex * 42}
                        strokeWidth={Math.max(3.2, token.renderWidth)}
                        emphasis={stampIndex * 0.04}
                        label={item.tool}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <QuickDrawPreviewGlyph
                toolId={item.tool}
                sceneState={sceneState}
                density={token.features?.density || item.density || 0.38}
                size={size}
                seed={token.seed}
                tone={token.renderColor}
                strokeWidth={token.renderWidth}
                live={Boolean(item.live)}
                style={{
                  width: '100%',
                  height: '100%',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function getStampPlacements(item) {
  if (Array.isArray(item?.stamps) && item.stamps.length) return item.stamps;
  if (Array.isArray(item?.quickdraw?.placements) && item.quickdraw.placements.length) return item.quickdraw.placements;
  return [];
}

function clampPercent(value, size, min, max) {
  const percent = Number.isFinite(value) && Number.isFinite(size) && size > 0 ? (value / size) * 100 : 50;
  return Math.min(max, Math.max(min, percent));
}

function isGroundTool(tool) {
  return ['grass', 'flower', 'seed', 'moss', 'stone', 'mushroom', 'sprout', 'bud', 'firstFlower', 'reed', 'quietFlower', 'bridge', 'soilLine', 'signpost', 'smallTree'].includes(tool);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default QuickDrawStrokeLayer;
