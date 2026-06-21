import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { drawStrokePath } from '../story-scene/sketchExport';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 640;

function getCanvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    t: performance.now(),
    pressure: event.pressure || 0.5,
  };
}

const StorySketchCanvas = forwardRef(function StorySketchCanvas({
  brushSize = 8,
  mode = 'draw',
  onChange,
}, ref) {
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const activeStrokeRef = useRef(null);
  const [revision, setRevision] = useState(0);

  useImperativeHandle(ref, () => ({
    clear() {
      strokesRef.current = [];
      activeStrokeRef.current = null;
      redraw();
      notifyChange();
    },
    undo() {
      strokesRef.current = strokesRef.current.slice(0, -1);
      redraw();
      notifyChange();
    },
    getSketch() {
      return {
        strokes: strokesRef.current.map((stroke) => ({
          ...stroke,
          points: stroke.points.map((point) => ({ ...point })),
        })),
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      };
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = CANVAS_WIDTH * ratio;
      canvas.height = CANVAS_HEIGHT * ratio;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      redraw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  function notifyChange() {
    const sketch = {
      strokes: strokesRef.current,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    };
    setRevision((value) => value + 1);
    onChange?.(sketch);
  }

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = 'rgba(96, 82, 61, 0.16)';
    ctx.lineWidth = 1;
    for (let x = 80; x < CANVAS_WIDTH; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 80; y < CANVAS_HEIGHT; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
    ctx.restore();
    for (const stroke of strokesRef.current) {
      drawStrokePath(ctx, stroke);
    }
    if (activeStrokeRef.current) {
      drawStrokePath(ctx, activeStrokeRef.current);
    }
  }

  function start(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    const point = getCanvasPoint(event, canvasRef.current);
    activeStrokeRef.current = {
      id: crypto.randomUUID(),
      points: [point],
      color: mode === 'erase' ? '#fffaf0' : '#25221f',
      size: mode === 'erase' ? Math.max(22, brushSize * 2.4) : brushSize,
      mode,
    };
    try {
      canvasRef.current.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture is best-effort for synthetic browser events.
    }
    redraw();
  }

  function move(event) {
    if (!activeStrokeRef.current) return;
    event.preventDefault();
    const point = getCanvasPoint(event, canvasRef.current);
    const previous = activeStrokeRef.current.points.at(-1);
    if (Math.hypot(point.x - previous.x, point.y - previous.y) < 1.4) return;
    activeStrokeRef.current.points.push(point);
    redraw();
  }

  function end(event) {
    if (!activeStrokeRef.current) return;
    try {
      canvasRef.current.releasePointerCapture?.(event.pointerId);
    } catch {
      // Matching capture can be absent after cancelled pointer streams.
    }
    if (activeStrokeRef.current.points.length > 1) {
      strokesRef.current = [...strokesRef.current, activeStrokeRef.current];
    }
    activeStrokeRef.current = null;
    redraw();
    notifyChange();
  }

  return (
    <div className="story-sketch-canvas-shell" data-revision={revision}>
      <canvas
        ref={canvasRef}
        className="story-sketch-canvas"
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
        onContextMenu={(event) => event.preventDefault()}
        aria-label="空白故事绘画画布"
      />
    </div>
  );
});

export default StorySketchCanvas;
