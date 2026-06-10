import { getQuickDrawGrammar } from '../data/quickdrawElementGrammar';

const QUICKDRAW_INK = {
  wind: '#5F6F8A',
  rain: '#617691',
  water: '#6A7D95',
  plant: '#5C7C68',
  bloom: '#8A6B5B',
  light: '#8A7E63',
  sky: '#6D6684',
  stone: '#8C7057',
  default: '#62718B',
};

export function getQuickDrawInkColor(toolId, sceneState = {}, emphasis = 0) {
  const grammar = getQuickDrawGrammar(toolId);
  const base = QUICKDRAW_INK[grammar.inkFamily] || QUICKDRAW_INK.default;
  const brightness = clamp(Number(sceneState.brightness ?? 0.72), 0.55, 0.96);
  const lift = clamp((brightness - 0.55) / 0.41 + emphasis * 0.08, 0, 1);
  return mixHex(base, '#f5efe6', lift * 0.2);
}

export function buildQuickDrawStyleToken({ toolId, stroke = {}, sceneState = {}, day = 1, index = 0, live = false }) {
  const grammar = getQuickDrawGrammar(toolId);
  const features = stroke.quickdraw?.features || stroke.features || stroke;
  const density = clamp(Number(features.density ?? features.densityLocal ?? 0.35), 0, 1);
  const speed = clamp(Number(features.speedAvg ?? features.speed ?? 0.35), 0, 1);
  const closedness = clamp(Number(features.closedness ?? 0), 0, 1);
  const intensity = clamp(0.35 + density * 0.34 + speed * 0.2 + (live ? 0.1 : 0), 0.24, 1);
  const renderWidth = clamp(3.1 + intensity * 2.2, 3, 6);
  const opacity = clamp((live ? 0.44 : 0.7) + intensity * 0.18 - density * 0.14, 0.22, 0.95);
  const jitter = clamp(0.48 + density * 0.48 + speed * 0.2, 0.38, 1.12);
  const renderColor = getQuickDrawInkColor(toolId, sceneState, intensity);
  const texture = density > 0.72 ? chooseDenseTexture(grammar.glyph) : 'ink';

  return {
    toolId,
    day,
    index,
    live,
    elementType: grammar.elementType,
    glyph: grammar.glyph,
    inkFamily: grammar.inkFamily,
    referenceCategories: grammar.referenceCategories,
    rawDrawing: stroke.rawDrawing || stroke.quickdraw?.rawDrawing || stroke.drawing || [],
    drawing: stroke.quickdraw?.drawing || stroke.drawing || [],
    normalizedDrawing: stroke.normalizedDrawing || stroke.quickdraw?.normalizedDrawing || [],
    simplifiedDrawing: stroke.simplifiedDrawing || stroke.quickdraw?.simplifiedDrawing || [],
    features,
    renderColor,
    renderWidth,
    opacity,
    jitter,
    texture,
    seed: `${toolId}:${day}:${index}:${Math.round((stroke.centerX || 0) + (stroke.centerY || 0))}`,
    sceneEffect: buildSceneEffect(toolId, grammar, features, sceneState, live, intensity, closedness),
  };
}

export function applyQuickDrawSceneEffect(sceneState, token) {
  const effect = token?.sceneEffect || {};
  const next = { ...sceneState };

  if (Number.isFinite(effect.windEnergy)) next.windEnergy = clamp((next.windEnergy || 0) + effect.windEnergy, 0, 1);
  if (Number.isFinite(effect.windSwayStrength)) next.windSwayStrength = clamp((next.windSwayStrength || 0) + effect.windSwayStrength, 0, 0.98);
  if (Number.isFinite(effect.windSwaySpeed)) next.windSwaySpeed = clamp((next.windSwaySpeed || 0) * 0.78 + effect.windSwaySpeed * 0.22, 0, 1);
  if (Number.isFinite(effect.windDirectionX)) next.windDirectionX = clamp(effect.windDirectionX, -1, 1);
  if (Number.isFinite(effect.windDirectionY)) next.windDirectionY = clamp(effect.windDirectionY, -1, 1);
  if (Number.isFinite(effect.rainDensity)) next.rainDensity = clamp((next.rainDensity || 0) + effect.rainDensity, 0, 1);
  if (Number.isFinite(effect.soilWetness)) next.soilWetness = clamp((next.soilWetness || 0) + effect.soilWetness, 0, 1);
  if (Number.isFinite(effect.waterFlow)) next.waterFlow = clamp((next.waterFlow || 0) + effect.waterFlow, 0, 1);
  if (Number.isFinite(effect.grassCoverage)) next.grassCoverage = clamp((next.grassCoverage || 0) + effect.grassCoverage, 0, 1);
  if (Number.isFinite(effect.flowerBloom)) next.flowerBloom = clamp((next.flowerBloom || 0) + effect.flowerBloom, 0, 1);
  if (Number.isFinite(effect.sunlightWarmth)) next.sunlightWarmth = clamp((next.sunlightWarmth || 0) + effect.sunlightWarmth, 0, 1);
  if (Number.isFinite(effect.nightSparkle)) next.nightSparkle = clamp((next.nightSparkle || 0) + effect.nightSparkle, 0, 1);
  if (Number.isFinite(effect.memoryConnection)) next.memoryConnection = clamp((next.memoryConnection || 0) + effect.memoryConnection, 0, 1);
  if (Number.isFinite(effect.pathCompletion)) next.pathCompletion = clamp((next.pathCompletion || 0) + effect.pathCompletion, 0, 1);
  if (Number.isFinite(effect.brightness)) next.brightness = clamp((next.brightness || 0.72) + effect.brightness, 0.56, 0.98);
  if (Number.isFinite(effect.saturation)) next.saturation = clamp((next.saturation || 0.78) + effect.saturation, 0.66, 0.96);
  if (Number.isFinite(effect.calmLevel)) next.calmLevel = clamp((next.calmLevel || 0.2) + effect.calmLevel, 0, 1);
  if (Number.isFinite(effect.animationSpeed)) next.animationSpeed = clamp((next.animationSpeed || 1) + effect.animationSpeed, 0.58, 1.3);
  if (Number.isFinite(effect.fogOpacity)) next.fogOpacity = clamp((next.fogOpacity || 0) + effect.fogOpacity, 0, 0.55);
  if (Number.isFinite(effect.visualClutter)) next.visualClutter = clamp((next.visualClutter || 0) + effect.visualClutter, 0, 1);

  if (token?.texture === 'mist' && next.visualClutter > 0.55) {
    next.fogOpacity = clamp((next.fogOpacity || 0) + 0.08, 0, 0.55);
  }

  next.lastTool = token?.toolId || next.lastTool;
  return next;
}

export function getQuickDrawGlyphSpec(toolId, options = {}) {
  const grammar = getQuickDrawGrammar(toolId);
  const size = options.size || 256;
  const pad = options.pad ?? size * 0.12;
  const seed = options.seed || toolId;
  const random = seededRandom(seed);
  const tone = options.tone || 'currentColor';
  const strokeWidth = clamp(options.strokeWidth || (size / 72), 2.4, 6);
  const density = clamp(options.density ?? 0.5, 0, 1);
  const variation = 1 + (random() - 0.5) * 0.16 + density * 0.06;
  const view = { left: pad, top: pad, right: size - pad, bottom: size - pad };
  const midX = size / 2;
  const midY = size / 2;
  const shapes = [];
  const pushPath = (d, extra = {}) => shapes.push({ type: 'path', d, stroke: tone, strokeWidth, fill: 'none', ...extra });
  const pushLine = (x1, y1, x2, y2, extra = {}) => shapes.push({ type: 'line', x1, y1, x2, y2, stroke: tone, strokeWidth, fill: 'none', ...extra });
  const pushCircle = (cx, cy, r, extra = {}) => shapes.push({ type: 'circle', cx, cy, r, stroke: tone, strokeWidth, fill: 'none', ...extra });
  const pushEllipse = (cx, cy, rx, ry, extra = {}) => shapes.push({ type: 'ellipse', cx, cy, rx, ry, stroke: tone, strokeWidth, fill: 'none', ...extra });

  switch (grammar.glyph) {
    case 'squiggle': {
      const y1 = midY - 14 * variation;
      const y2 = midY + 16 * variation;
      const y3 = midY - 10 * variation;
      const y4 = midY + 12 * variation;
      pushPath(`M ${view.left + 2} ${y1.toFixed(1)} C ${midX - 76} ${(y1 - 24).toFixed(1)} ${midX - 40} ${(y2 + 16).toFixed(1)} ${midX - 2} ${y2.toFixed(1)} S ${midX + 68} ${(y3 - 20).toFixed(1)} ${view.right - 2} ${y3.toFixed(1)}`);
      pushPath(`M ${view.left + 22} ${y4.toFixed(1)} C ${midX - 34} ${(y4 - 12).toFixed(1)} ${midX + 24} ${(y4 + 10).toFixed(1)} ${view.right - 24} ${(y4 - 2).toFixed(1)}`);
      break;
    }
    case 'line': {
      const wobble = (random() - 0.5) * 12;
      pushPath(`M ${view.left} ${midY + wobble} C ${midX - 44} ${(midY - 12 + wobble / 2).toFixed(1)} ${midX + 44} ${(midY + 10 - wobble / 2).toFixed(1)} ${view.right} ${midY - wobble * 0.3}`);
      pushLine(view.left + 14, midY + 10, view.right - 16, midY - 8);
      break;
    }
    case 'hurricane': {
      pushPath(spiralPath(midX, midY, Math.min(size, size) * 0.28, 2.6, 1.1));
      pushPath(`M ${midX - 18} ${midY - 36} C ${midX + 34} ${midY - 48} ${midX + 44} ${midY + 38} ${midX - 6} ${midY + 44}`);
      break;
    }
    case 'tornado': {
      pushPath(`M ${midX - 58} ${view.top + 12} C ${midX - 12} ${view.top + 20} ${midX + 12} ${view.top + 20} ${midX + 56} ${view.top + 12}`);
      pushPath(`M ${midX - 46} ${view.top + 40} C ${midX - 16} ${view.top + 48} ${midX + 16} ${view.top + 48} ${midX + 46} ${view.top + 40}`);
      pushPath(`M ${midX - 32} ${view.top + 70} C ${midX - 12} ${view.top + 78} ${midX + 12} ${view.top + 78} ${midX + 32} ${view.top + 70}`);
      pushPath(`M ${midX - 18} ${view.top + 104} C ${midX - 8} ${view.top + 128} ${midX + 8} ${view.top + 128} ${midX + 18} ${view.top + 104}`);
      break;
    }
    case 'windmill': {
      pushCircle(midX, midY, size * 0.08);
      [[0, -56, 0, -12], [38, -38, 11, -11], [56, 0, 12, 0], [38, 38, 11, 11], [0, 56, 0, 12], [-38, 38, -11, 11], [-56, 0, -12, 0], [-38, -38, -11, -11]].forEach(([x1, y1, x2, y2]) => pushLine(midX + x1 * 0.56, midY + y1 * 0.56, midX + x2 * 2.1, midY + y2 * 2.1));
      break;
    }
    case 'rain': {
      for (let i = 0; i < 4; i += 1) {
        const x = view.left + 28 + i * 42 + (random() - 0.5) * 10;
        const top = view.top + 18 + (i % 2) * 12;
        pushLine(x, top, x - 2, view.bottom - 18 - i * 4);
        pushPath(`M ${x.toFixed(1)} ${(top + 6).toFixed(1)} C ${(x + 6).toFixed(1)} ${(top + 14).toFixed(1)} ${(x + 4).toFixed(1)} ${(top + 24).toFixed(1)} ${(x - 4).toFixed(1)} ${(top + 20).toFixed(1)}`);
      }
      break;
    }
    case 'grass': {
      const base = view.bottom - 10;
      for (let i = 0; i < 5; i += 1) {
        const x = view.left + 28 + i * 34 + (random() - 0.5) * 6;
        const h = 32 + i * 7 + (random() - 0.5) * 10;
        pushPath(`M ${x.toFixed(1)} ${base.toFixed(1)} C ${(x - 6).toFixed(1)} ${(base - h * 0.65).toFixed(1)} ${(x + 8).toFixed(1)} ${(base - h).toFixed(1)} ${(x + 4).toFixed(1)} ${(base - h - 2).toFixed(1)}`);
      }
      break;
    }
    case 'flower': {
      pushLine(midX, view.bottom - 16, midX, midY + 34);
      pushCircle(midX, midY - 2, size * 0.08);
      petalRing(midX, midY - 2, size * 0.11, shapes, tone, strokeWidth);
      break;
    }
    case 'sun': {
      pushCircle(midX, midY, size * 0.12);
      rays(midX, midY, size * 0.16, shapes, tone, strokeWidth);
      break;
    }
    case 'cloud': {
      pushPath(cloudPath(view.left + 8, midY + 14, size * 0.76));
      break;
    }
    case 'river':
    case 'ocean': {
      pushPath(`M ${view.left + 6} ${midY - 12} C ${midX - 42} ${midY - 34} ${midX - 18} ${midY + 18} ${midX + 6} ${midY - 4} S ${midX + 60} ${midY - 18} ${view.right - 6} ${midY - 2}`);
      pushPath(`M ${view.left + 18} ${midY + 22} C ${midX - 36} ${midY + 2} ${midX - 4} ${midY + 44} ${midX + 20} ${midY + 20} S ${midX + 76} ${midY + 8} ${view.right - 14} ${midY + 24}`);
      if (grammar.glyph === 'ocean') {
        pushPath(`M ${view.left + 28} ${midY + 46} C ${midX - 20} ${midY + 28} ${midX + 16} ${midY + 62} ${view.right - 32} ${midY + 44}`);
      }
      break;
    }
    case 'pond':
    case 'circle': {
      pushCircle(midX, midY, size * 0.15);
      pushCircle(midX, midY, size * 0.08, { opacity: 0.72 });
      break;
    }
    case 'leaf': {
      pushPath(`M ${midX} ${view.top + 22} C ${view.right - 18} ${midY - 16} ${view.right - 18} ${midY + 42} ${midX} ${view.bottom - 20} C ${view.left + 18} ${midY + 42} ${view.left + 18} ${midY - 16} ${midX} ${view.top + 22}`);
      pushLine(midX, view.top + 26, midX, view.bottom - 24);
      break;
    }
    case 'bridge': {
      pushLine(view.left + 18, view.bottom - 36, view.right - 18, view.bottom - 36);
      pushPath(`M ${view.left + 22} ${view.bottom - 36} C ${midX - 28} ${view.top + 24} ${midX + 28} ${view.top + 24} ${view.right - 22} ${view.bottom - 36}`);
      pushLine(view.left + 28, view.bottom - 36, view.left + 28, view.bottom - 12);
      pushLine(view.right - 28, view.bottom - 36, view.right - 28, view.bottom - 12);
      break;
    }
    case 'stone': {
      pushEllipse(midX - 18, midY + 2, size * 0.1, size * 0.08, { transform: rotateJitter(-12, midX - 18, midY + 2) });
      pushEllipse(midX + 20, midY - 8, size * 0.08, size * 0.06, { transform: rotateJitter(10, midX + 20, midY - 8) });
      pushEllipse(midX, midY + 16, size * 0.06, size * 0.05, { transform: rotateJitter(-6, midX, midY + 16) });
      break;
    }
    case 'mushroom': {
      pushPath(`M ${view.left + 40} ${midY} C ${view.left + 54} ${view.top + 20} ${view.right - 54} ${view.top + 20} ${view.right - 40} ${midY}`);
      pushLine(midX, midY, midX, view.bottom - 26);
      pushPath(`M ${midX - 28} ${midY - 2} C ${midX - 18} ${midY + 18} ${midX + 18} ${midY + 18} ${midX + 28} ${midY - 2}`);
      break;
    }
    case 'snail': {
      pushPath(`M ${view.left + 56} ${midY + 10} C ${view.left + 48} ${midY - 14} ${midX - 12} ${midY - 20} ${midX + 6} ${midY - 6} C ${midX + 24} ${midY + 8} ${midX + 16} ${midY + 32} ${midX - 4} ${midY + 30}`);
      pushPath(`M ${midX - 4} ${midY + 30} C ${midX + 6} ${midY + 36} ${midX + 22} ${midY + 38} ${midX + 40} ${midY + 34}`);
      break;
    }
    case 'lantern':
    case 'light bulb': {
      pushPath(`M ${midX - 20} ${midY - 28} C ${midX - 28} ${midY + 12} ${midX - 18} ${midY + 42} ${midX} ${midY + 52} C ${midX + 18} ${midY + 42} ${midX + 28} ${midY + 12} ${midX + 20} ${midY - 28}`);
      pushLine(midX, view.top + 24, midX, midY - 28);
      pushLine(midX - 14, view.top + 24, midX + 14, view.top + 24);
      break;
    }
    case 'star': {
      pushPath(starPath(midX, midY, size * 0.14));
      break;
    }
    case 'moon': {
      pushPath(`M ${midX + 20} ${view.top + 38} C ${midX - 10} ${view.top + 18} ${midX - 44} ${midY + 18} ${midX - 4} ${view.bottom - 42} C ${midX + 10} ${view.bottom - 20} ${midX + 32} ${view.bottom - 26} ${midX + 42} ${midY + 2} C ${midX + 28} ${midY - 8} ${midX + 28} ${view.top + 44} ${midX + 20} ${view.top + 38}`);
      break;
    }
    case 'rainbow': {
      pushPath(arcPath(midX, view.bottom - 8, size * 0.18, 0.0, 0.9));
      pushPath(arcPath(midX, view.bottom - 16, size * 0.14, 0.0, 0.9));
      pushPath(arcPath(midX, view.bottom - 24, size * 0.1, 0.0, 0.9));
      break;
    }
    default: {
      pushPath(`M ${view.left + 10} ${midY} C ${midX - 18} ${midY - 16} ${midX + 18} ${midY + 12} ${view.right - 10} ${midY - 2}`);
      break;
    }
  }

  return {
    viewBox: `0 0 ${size} ${size}`,
    shapes,
  };
}

function buildSceneEffect(toolId, grammar, features, sceneState, live, intensity, closedness) {
  const effect = { visualClutter: densityClutter(features, live) };
  const speed = clamp(Number(features.speedAvg ?? 0.35), 0, 1);
  const density = clamp(Number(features.density ?? 0.35), 0, 1);
  const vectorX = Number(features.vectorX ?? 1);
  const vectorY = Number(features.vectorY ?? 0);

  switch (grammar.inkFamily) {
    case 'wind':
      effect.windEnergy = 0.11 + intensity * 0.12;
      effect.windSwayStrength = 0.08 + speed * 0.1;
      effect.windSwaySpeed = 0.12 + speed * 0.1;
      effect.windDirectionX = Math.abs(vectorX) < 0.12 ? 1 : clamp(vectorX, -1, 1);
      effect.windDirectionY = clamp(vectorY, -1, 1);
      effect.animationSpeed = 0.02 + speed * 0.03;
      effect.cloudMotion = 0.04;
      break;
    case 'rain':
      effect.rainDensity = 0.14 + intensity * 0.12;
      effect.soilWetness = 0.1 + density * 0.08;
      effect.waterFlow = 0.08 + speed * 0.06;
      effect.brightness = 0.02;
      effect.fogOpacity = -0.05;
      break;
    case 'water':
      effect.waterFlow = 0.12 + intensity * 0.08;
      effect.soilWetness = 0.04 + density * 0.03;
      effect.brightness = 0.015;
      break;
    case 'plant':
      effect.grassCoverage = 0.1 + intensity * 0.06;
      effect.calmLevel = 0.03;
      if (toolId === 'memorySeed') effect.memoryConnection = 0.16;
      break;
    case 'flower':
      effect.flowerBloom = 0.11 + closedness * 0.05;
      effect.brightness = 0.03;
      effect.saturation = 0.03;
      break;
    case 'light':
      effect.brightness = 0.08 + intensity * 0.05;
      effect.sunlightWarmth = 0.1 + intensity * 0.04;
      effect.nightSparkle = toolId === 'firefly' || toolId === 'star' ? 0.14 : 0.06;
      effect.fogOpacity = -0.07;
      break;
    case 'sky':
      effect.nightSparkle = 0.11 + intensity * 0.08;
      effect.memoryConnection = toolId === 'constellationLine' ? 0.16 : 0.08;
      effect.brightness = 0.04;
      if (toolId === 'rainbow') effect.saturation = 0.05;
      if (toolId === 'cloud') effect.windEnergy = 0.05;
      break;
    case 'stone':
      effect.pathCompletion = 0.12 + intensity * 0.06;
      effect.calmLevel = 0.04;
      break;
    default:
      effect.visualClutter = densityClutter(features, live) * 0.8;
      break;
  }

  if (grammar.glyph === 'cloud') {
    effect.visualClutter += 0.06;
    effect.fogOpacity = (effect.fogOpacity || 0) + 0.06;
    effect.windEnergy = (effect.windEnergy || 0) + 0.04;
  }

  if (grammar.glyph === 'rainbow') {
    effect.brightness = (effect.brightness || 0) + 0.05;
    effect.saturation = (effect.saturation || 0) + 0.06;
  }

  if (density > 0.7) {
    effect.visualClutter += 0.14;
    effect.fogOpacity = (effect.fogOpacity || 0) + 0.04;
  }

  return effect;
}

function densityClutter(features, live) {
  const density = clamp(Number(features.density ?? 0.35), 0, 1);
  const speed = clamp(Number(features.speedAvg ?? 0.35), 0, 1);
  return clamp(0.02 + density * 0.06 + speed * 0.02 + (live ? 0.02 : 0), 0, 0.18);
}

function chooseDenseTexture(glyph) {
  if (glyph === 'rain' || glyph === 'river' || glyph === 'ocean' || glyph === 'pond') return 'mist';
  if (glyph === 'leaf' || glyph === 'grass' || glyph === 'tree') return 'leaf';
  if (glyph === 'star' || glyph === 'sun') return 'glow';
  return 'dust';
}

function mixHex(a, b, weight) {
  const ratio = clamp(weight, 0, 1);
  const colorA = hexToRgb(a);
  const colorB = hexToRgb(b);
  const mixed = {
    r: Math.round(colorA.r + (colorB.r - colorA.r) * ratio),
    g: Math.round(colorA.g + (colorB.g - colorA.g) * ratio),
    b: Math.round(colorA.b + (colorB.b - colorA.b) * ratio),
  };
  return rgbToHex(mixed);
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((part) => part + part).join('')
    : clean.padEnd(6, '0');
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function seededRandom(seed) {
  let value = hashSeed(seed);
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function hashSeed(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function spiralPath(cx, cy, radius, turns, wobble = 1) {
  const points = [];
  const segments = 22;
  for (let index = 0; index <= segments; index += 1) {
    const ratio = index / segments;
    const angle = ratio * Math.PI * 2 * turns;
    const currentRadius = radius * ratio * wobble;
    points.push({
      x: cx + Math.cos(angle) * currentRadius,
      y: cy + Math.sin(angle) * currentRadius,
    });
  }
  return pathFromPoints(points);
}

function cloudPath(left, centerY, width) {
  const start = left;
  const right = left + width;
  return `M ${start} ${centerY + 16} C ${start + 12} ${centerY - 6} ${start + 24} ${centerY - 20} ${start + 42} ${centerY - 8} C ${start + 56} ${centerY - 32} ${start + 82} ${centerY - 26} ${start + 92} ${centerY - 2} C ${start + 114} ${centerY - 10} ${start + 132} ${centerY + 8} ${start + 126} ${centerY + 26} C ${right - 32} ${centerY + 38} ${right - 14} ${centerY + 22} ${right} ${centerY + 10}`;
}

function starPath(cx, cy, radius) {
  const points = [];
  for (let index = 0; index < 5; index += 1) {
    const outerAngle = -Math.PI / 2 + index * (Math.PI * 2) / 5;
    const innerAngle = outerAngle + Math.PI / 5;
    points.push({ x: cx + Math.cos(outerAngle) * radius, y: cy + Math.sin(outerAngle) * radius });
    points.push({ x: cx + Math.cos(innerAngle) * radius * 0.45, y: cy + Math.sin(innerAngle) * radius * 0.45 });
  }
  return pathFromPoints(points, true);
}

function rays(cx, cy, radius, shapes, tone, strokeWidth) {
  const pushLine = (x1, y1, x2, y2) => shapes.push({ type: 'line', x1, y1, x2, y2, stroke: tone, strokeWidth, fill: 'none' });
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8;
    pushLine(cx + Math.cos(angle) * (radius * 0.7), cy + Math.sin(angle) * (radius * 0.7), cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  }
}

function petalRing(cx, cy, radius, shapes, tone, strokeWidth) {
  const pushPath = (d) => shapes.push({ type: 'path', d, stroke: tone, strokeWidth, fill: 'none' });
  for (let index = 0; index < 5; index += 1) {
    const angle = -Math.PI / 2 + index * (Math.PI * 2) / 5;
    const tipX = cx + Math.cos(angle) * radius;
    const tipY = cy + Math.sin(angle) * radius;
    const controlX1 = cx + Math.cos(angle - 0.28) * radius * 0.52;
    const controlY1 = cy + Math.sin(angle - 0.28) * radius * 0.52;
    const controlX2 = cx + Math.cos(angle + 0.28) * radius * 0.52;
    const controlY2 = cy + Math.sin(angle + 0.28) * radius * 0.52;
    pushPath(`M ${cx} ${cy} C ${controlX1.toFixed(1)} ${controlY1.toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)} ${controlX2.toFixed(1)} ${controlY2.toFixed(1)} C ${controlX1.toFixed(1)} ${controlY1.toFixed(1)} ${cx} ${cy} ${cx} ${cy}`);
  }
}

function pathFromPoints(points, close = false) {
  if (!points.length) return '';
  const [first, ...rest] = points;
  const segments = [`M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`];
  rest.forEach((point, index) => {
    const previous = points[index];
    const ctrlX = ((previous.x + point.x) / 2).toFixed(1);
    const ctrlY = ((previous.y + point.y) / 2).toFixed(1);
    segments.push(`Q ${previous.x.toFixed(1)} ${previous.y.toFixed(1)} ${ctrlX} ${ctrlY}`);
  });
  if (close) segments.push('Z');
  return segments.join(' ');
}

function rotateJitter(angle, cx, cy) {
  return `rotate(${angle} ${cx.toFixed(1)} ${cy.toFixed(1)})`;
}

function arcPath(cx, cy, radius, startRatio, endRatio) {
  const startAngle = Math.PI * (1 + startRatio);
  const endAngle = Math.PI * (1 + endRatio);
  const startX = cx + Math.cos(startAngle) * radius;
  const startY = cy + Math.sin(startAngle) * radius;
  const endX = cx + Math.cos(endAngle) * radius;
  const endY = cy + Math.sin(endAngle) * radius;
  return `M ${startX.toFixed(1)} ${startY.toFixed(1)} A ${radius.toFixed(1)} ${radius.toFixed(1)} 0 0 1 ${endX.toFixed(1)} ${endY.toFixed(1)}`;
}
