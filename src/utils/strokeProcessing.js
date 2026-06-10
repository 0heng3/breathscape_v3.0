import { simplifyPointsRDP } from './rdp';

export function strokeToQuickDrawStroke(stroke) {
  const points = normalizeInputPoints(stroke);
  return {
    x: points.map((point) => point.x),
    y: points.map((point) => point.y),
    t: points.map((point) => point.t),
  };
}

export function strokeToQuickDrawDrawing(stroke) {
  return [strokeToQuickDrawStroke(stroke)];
}

export function extractStrokeFeatures(stroke) {
  const points = normalizeInputPoints(stroke);
  const boundingBox = getBoundingBox(points);
  const pointCount = points.length;
  const strokeCount = 1;
  const duration = Math.max(1, Number.isFinite(stroke?.duration) ? stroke.duration : getDuration(points));
  const length = getStrokeLength(points);
  const speedAvg = clamp(length / duration / 1.18, 0, 1);
  const speedMax = clamp(getMaxSegmentSpeed(points) / 1.4, 0, 1);
  const density = clamp(pointCount / Math.max((boundingBox.width * boundingBox.height) / 220, 1), 0, 1);
  const vector = getVector(points);
  const closedness = getClosedness(points, boundingBox);
  const directionMain = getDirectionMain(points, boundingBox, vector, closedness);
  const curvatureAvg = getCurvatureAvg(points);
  const centerX = boundingBox.x + boundingBox.width / 2;
  const centerY = boundingBox.y + boundingBox.height / 2;

  return {
    pointCount,
    strokeCount,
    duration,
    length,
    speedAvg,
    speedMax,
    curvatureAvg,
    directionMain,
    density,
    boundingBox,
    centerX,
    centerY,
    vectorX: vector.x,
    vectorY: vector.y,
    rawVectorX: vector.rawX,
    rawVectorY: vector.rawY,
    closedness,
    zone: centerY < 185 ? 'sky' : centerY > 380 ? 'ground' : 'middle',
  };
}

export function normalizeQuickDrawDrawing(drawing, size = 256) {
  const normalized = [];
  const bounds = getDrawingBounds(drawing);
  const scale = bounds.width === 0 && bounds.height === 0 ? 1 : (size - 1) / Math.max(bounds.width, bounds.height || 1);
  const offsetX = -bounds.minX;
  const offsetY = -bounds.minY;

  drawing.forEach((stroke) => {
    normalized.push({
      x: stroke.x.map((value) => (value + offsetX) * scale),
      y: stroke.y.map((value) => (value + offsetY) * scale),
      t: stroke.t.slice(),
    });
  });

  return {
    drawing: normalized,
    boundingBox: {
      x: 0,
      y: 0,
      width: bounds.width * scale,
      height: bounds.height * scale,
    },
    scale,
  };
}

export function resampleQuickDrawDrawing(drawing, spacing = 1) {
  return {
    drawing: drawing.map((stroke) => resampleStroke(stroke, spacing)),
  };
}

export function simplifyQuickDrawDrawing(drawing, epsilon = 2) {
  return {
    drawing: drawing.map((stroke) => simplifyStroke(stroke, epsilon)),
  };
}

export function jitterQuickDrawDrawing(drawing, amount = 0.65, seed = 'quickdraw') {
  return {
    drawing: drawing.map((stroke, strokeIndex) => {
      const rand = seededRandom(`${seed}:${strokeIndex}`);
      return {
        x: stroke.x.map((value, index) => {
          if (index === 0 || index === stroke.x.length - 1) return value;
          const edgeFade = index / Math.max(1, stroke.x.length - 1);
          const jitter = (rand() - 0.5) * amount * (0.55 + edgeFade * 0.25);
          return value + jitter;
        }),
        y: stroke.y.map((value, index) => {
          if (index === 0 || index === stroke.y.length - 1) return value;
          const edgeFade = index / Math.max(1, stroke.y.length - 1);
          const jitter = (rand() - 0.5) * amount * (0.55 + edgeFade * 0.25);
          return value + jitter;
        }),
        t: stroke.t.slice(),
      };
    }),
  };
}

export function buildQuickDrawStrokeRecord(stroke, options = {}) {
  const points = normalizeInputPoints(stroke);
  const rawDrawing = strokeToQuickDrawDrawing({ ...stroke, points });
  const features = extractStrokeFeatures({ ...stroke, points });
  const normalized = normalizeQuickDrawDrawing(rawDrawing, options.size || 256);
  const resampled = resampleQuickDrawDrawing(normalized.drawing, options.spacing || 1);
  const simplified = simplifyQuickDrawDrawing(resampled.drawing, options.epsilon || 2);
  const jittered = jitterQuickDrawDrawing(simplified.drawing, options.jitter ?? 0.68, stroke.id || `${stroke.tool || 'stroke'}:${points.length}`);

  return {
    ...stroke,
    points,
    rawDrawing,
    normalizedDrawing: normalized.drawing,
    resampledDrawing: resampled.drawing,
    simplifiedDrawing: simplified.drawing,
    drawing: jittered.drawing,
    boundingBox: features.boundingBox,
    normalizedBoundingBox: normalized.boundingBox,
    pointCount: features.pointCount,
    strokeCount: features.strokeCount,
    duration: features.duration,
    length: features.length,
    speed: features.speedAvg,
    speedAvg: features.speedAvg,
    speedMax: features.speedMax,
    density: features.density,
    densityLocal: features.density,
    direction: features.directionMain,
    directionMain: features.directionMain,
    curvatureAvg: features.curvatureAvg,
    vectorX: features.vectorX,
    vectorY: features.vectorY,
    rawVectorX: features.rawVectorX,
    rawVectorY: features.rawVectorY,
    closedness: features.closedness,
    centerX: features.centerX,
    centerY: features.centerY,
    zone: features.zone,
    quickdraw: {
      rawDrawing,
      normalizedDrawing: normalized.drawing,
      resampledDrawing: resampled.drawing,
      simplifiedDrawing: simplified.drawing,
      drawing: jittered.drawing,
      features,
    },
  };
}

function simplifyStroke(stroke, epsilon) {
  if (!stroke.x.length) {
    return { x: [], y: [], t: [] };
  }

  const points = stroke.x.map((x, index) => ({
    x,
    y: stroke.y[index],
    t: stroke.t[index] ?? stroke.t[0] ?? 0,
  }));
  const simplified = simplifyPointsRDP(points, epsilon);

  return {
    x: simplified.map((point) => point.x),
    y: simplified.map((point) => point.y),
    t: simplified.map((point) => point.t),
  };
}

function resampleStroke(stroke, spacing) {
  if (stroke.x.length <= 1) return { x: stroke.x.slice(), y: stroke.y.slice(), t: stroke.t.slice() };

  const resampled = [{ x: stroke.x[0], y: stroke.y[0], t: stroke.t[0] ?? 0 }];
  for (let index = 1; index < stroke.x.length; index += 1) {
    const previous = {
      x: stroke.x[index - 1],
      y: stroke.y[index - 1],
      t: stroke.t[index - 1] ?? stroke.t[0] ?? 0,
    };
    const current = {
      x: stroke.x[index],
      y: stroke.y[index],
      t: stroke.t[index] ?? previous.t,
    };
    const distance = Math.hypot(current.x - previous.x, current.y - previous.y);
    const steps = Math.max(1, Math.ceil(distance / spacing));

    for (let step = 1; step <= steps; step += 1) {
      const ratio = step / steps;
      const point = interpolatePoint(previous, current, ratio);
      const last = resampled[resampled.length - 1];
      if (!last || last.x !== point.x || last.y !== point.y || last.t !== point.t) {
        resampled.push(point);
      }
    }
  }

  return {
    x: resampled.map((point) => point.x),
    y: resampled.map((point) => point.y),
    t: resampled.map((point) => point.t),
  };
}

function getDrawingBounds(drawing) {
  const points = drawing.flatMap((stroke) => stroke.x.map((x, index) => ({ x, y: stroke.y[index] })));
  if (!points.length) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1 };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function getBoundingBox(points) {
  if (!points.length) return { x: 0, y: 0, width: 1, height: 1 };
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function normalizeInputPoints(stroke) {
  if (Array.isArray(stroke?.points) && stroke.points.length) {
    return stroke.points.map((point) => ({
      x: Number(point.x) || 0,
      y: Number(point.y) || 0,
      t: Number.isFinite(point.t) ? point.t : 0,
      pressure: Number.isFinite(point.pressure) ? point.pressure : undefined,
    }));
  }

  if (Array.isArray(stroke?.x) && Array.isArray(stroke?.y)) {
    return stroke.x.map((x, index) => ({
      x: Number(x) || 0,
      y: Number(stroke.y[index]) || 0,
      t: Number(stroke.t?.[index]) || 0,
    }));
  }

  return [];
}

function getStrokeLength(points) {
  return points.slice(1).reduce((sum, point, index) => {
    const previous = points[index];
    return sum + Math.hypot(point.x - previous.x, point.y - previous.y);
  }, 0);
}

function getDuration(points) {
  if (points.length <= 1) return 1;
  return Math.max(1, (points[points.length - 1].t || 0) - (points[0].t || 0));
}

function getMaxSegmentSpeed(points) {
  let max = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const deltaTime = Math.max(1, current.t - previous.t);
    max = Math.max(max, Math.hypot(current.x - previous.x, current.y - previous.y) / deltaTime);
  }
  return max;
}

function getVector(points) {
  if (points.length < 2) {
    return { x: 1, y: 0, rawX: 0, rawY: 0 };
  }
  const first = points[0];
  const last = points[points.length - 1];
  const rawX = last.x - first.x;
  const rawY = last.y - first.y;
  const length = Math.hypot(rawX, rawY) || 1;
  return {
    x: rawX / length,
    y: rawY / length,
    rawX,
    rawY,
  };
}

function getClosedness(points, bounds) {
  if (points.length < 4) return 0;
  const first = points[0];
  const last = points[points.length - 1];
  const span = Math.max(bounds.width, bounds.height, 1);
  return clamp(1 - Math.hypot(last.x - first.x, last.y - first.y) / span, 0, 1);
}

function getDirectionMain(points, bounds, vector, closedness) {
  if (closedness > 0.7) return 'loop';
  if (bounds.width > bounds.height * 1.45) {
    return vector.x >= 0 ? 'right' : 'left';
  }
  if (bounds.height > bounds.width * 1.45) {
    return vector.y >= 0 ? 'down' : 'up';
  }
  if (Math.abs(vector.x) > Math.abs(vector.y) * 1.35) {
    return vector.x >= 0 ? 'right' : 'left';
  }
  if (Math.abs(vector.y) > Math.abs(vector.x) * 1.35) {
    return vector.y >= 0 ? 'down' : 'up';
  }
  return 'mixed';
}

function getCurvatureAvg(points) {
  if (points.length < 3) return 0;
  let total = 0;
  let samples = 0;
  for (let index = 2; index < points.length; index += 1) {
    const a = points[index - 2];
    const b = points[index - 1];
    const c = points[index];
    const ab = Math.atan2(b.y - a.y, b.x - a.x);
    const bc = Math.atan2(c.y - b.y, c.x - b.x);
    const delta = Math.abs(normalizeAngle(bc - ab));
    total += delta;
    samples += 1;
  }
  return samples ? clamp(total / samples / Math.PI, 0, 1) : 0;
}

function interpolatePoint(a, b, ratio) {
  return {
    x: a.x + (b.x - a.x) * ratio,
    y: a.y + (b.y - a.y) * ratio,
    t: a.t + (b.t - a.t) * ratio,
  };
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

function normalizeAngle(angle) {
  let next = angle;
  while (next <= -Math.PI) next += Math.PI * 2;
  while (next > Math.PI) next -= Math.PI * 2;
  return next;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
