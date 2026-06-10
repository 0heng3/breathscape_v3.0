import { buildQuickDrawStrokeRecord } from './strokeProcessing';

export function analyzeStroke(stroke) {
  return buildQuickDrawStrokeRecord(stroke);
}

export function isValidStroke(stroke) {
  return (stroke?.duration || 0) > 60 || (stroke?.length || 0) > 8 || (stroke?.points?.length || 0) >= 3;
}
