const DEFAULT_WIDTH = 960;
const DEFAULT_HEIGHT = 640;

export function createEmptyStorySketch() {
  return {
    strokes: [],
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  };
}

export function drawStrokePath(ctx, stroke, options = {}) {
  const points = stroke?.points || [];
  if (!points.length) return;
  const color = options.color || stroke.color || '#25221f';
  const width = options.width || stroke.size || 7;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
  }
  if (points.length > 1) {
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  }
  ctx.stroke();
  ctx.restore();
}

export function renderSketchToCanvas(sketch, options = {}) {
  const canvas = document.createElement('canvas');
  const width = options.width || sketch.width || DEFAULT_WIDTH;
  const height = options.height || sketch.height || DEFAULT_HEIGHT;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (options.background !== 'transparent') {
    ctx.fillStyle = options.background || '#fffaf0';
    ctx.fillRect(0, 0, width, height);
  }
  const scaleX = width / (sketch.width || width);
  const scaleY = height / (sketch.height || height);
  ctx.save();
  ctx.scale(scaleX, scaleY);
  for (const stroke of sketch.strokes || []) {
    drawStrokePath(ctx, stroke, {
      color: options.ink || stroke.color,
      width: options.strokeWidth || stroke.size,
      alpha: options.alpha,
    });
  }
  ctx.restore();
  return canvas;
}

export function exportSketchDataUrls(sketch) {
  const drawingCanvas = renderSketchToCanvas(sketch, {
    background: '#fffaf0',
    ink: '#27231f',
    strokeWidth: 7,
  });
  const controlCanvas = renderSketchToCanvas(sketch, {
    background: '#ffffff',
    ink: '#000000',
    strokeWidth: 10,
  });
  return {
    drawingPng: drawingCanvas.toDataURL('image/png'),
    controlScribblePng: controlCanvas.toDataURL('image/png'),
  };
}

export function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);base64/)?.[1] || 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

export function estimateRecognizedElements(strokes) {
  if (!strokes?.length) return [];
  const features = strokes.map((stroke) => getStrokeFeatures(stroke)).filter(Boolean);
  const elements = new Set();
  const totalLength = features.reduce((sum, item) => sum + item.length, 0);
  const averageY = features.reduce((sum, item) => sum + item.centerY, 0) / features.length;
  const loopCount = features.filter((item) => item.closedness < 0.18 && item.width > 28 && item.height > 28).length;
  const verticalCount = features.filter((item) => item.height > item.width * 1.45 && item.height > 38).length;
  const horizontalCount = features.filter((item) => item.width > item.height * 1.8 && item.width > 80).length;
  if (loopCount >= 1) elements.add('flower');
  if (verticalCount >= 2 || averageY > 320) elements.add('grass');
  if (horizontalCount >= 1 && averageY < 300) elements.add('cloud');
  if (totalLength > 900 && features.length > 4) elements.add('garden path');
  if (!elements.size) elements.add('child sketch shapes');
  return Array.from(elements);
}

function getStrokeFeatures(stroke) {
  const points = stroke?.points || [];
  if (points.length < 2) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
  }
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  const closedness = Math.hypot(points[0].x - points.at(-1).x, points[0].y - points.at(-1).y) / Math.max(1, length);
  return {
    width,
    height,
    length,
    closedness,
    centerY: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}
