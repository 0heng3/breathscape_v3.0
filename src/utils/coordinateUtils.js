export function getCanvasPoint(event, canvasEl) {
  const rect = canvasEl.getBoundingClientRect();
  const scaleX = rect.width ? canvasEl.width / rect.width : 1;
  const scaleY = rect.height ? canvasEl.height / rect.height : 1;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
    pressure: event.pressure ?? 0.5,
    t: performance.now(),
  };
}

export function getStagePoint(event, stageEl) {
  const rect = stageEl.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    pressure: event.pressure ?? 0.5,
    t: performance.now(),
  };
}

export function getLocalStageRect(stageEl) {
  const rect = stageEl?.getBoundingClientRect?.();
  return {
    left: 0,
    top: 0,
    width: Math.max(1, rect?.width || 1),
    height: Math.max(1, rect?.height || 1),
  };
}

export function clampPointToRect(point, rect, padding = 0) {
  const width = Math.max(1, rect?.width || 1);
  const height = Math.max(1, rect?.height || 1);
  return {
    ...point,
    x: clamp(point.x, padding, Math.max(padding, width - padding)),
    y: clamp(point.y, padding, Math.max(padding, height - padding)),
  };
}

export function clampPlacementToStage(placement, stageRect) {
  const size = Number(placement.size || 56);
  const pad = Math.max(12, size * 0.46);
  const rect = {
    width: Number(stageRect?.width || placement.stageWidth || 720),
    height: Number(stageRect?.height || placement.stageHeight || 540),
  };
  return {
    ...placement,
    x: clamp(Number(placement.x || 0), pad, Math.max(pad, rect.width - pad)),
    y: clamp(Number(placement.y || 0), pad, Math.max(pad, rect.height - pad)),
    stageWidth: rect.width,
    stageHeight: rect.height,
    coordinateMode: 'local-px',
  };
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
