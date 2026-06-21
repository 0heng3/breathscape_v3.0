import { Pencil, RotateCcw, Volume2 } from 'lucide-react';
import React, { useState } from 'react';
import DrawingCanvas from '../components/DrawingCanvas';
import ElementToolBar from '../components/ElementToolBar';
import FeedbackPanel from '../components/FeedbackPanel';
import GardenStage from '../components/GardenStage';

function CanvasPage({
  mood,
  gardenDay,
  sceneState,
  activeTool,
  selectedToolId,
  feedback,
  strokes,
  elementHistory,
  liveResponses,
  recognitionProcess,
  clearTraceSignal,
  onSelectTool,
  onStroke,
  onStrokeMove,
  onFinish,
  onSuggest,
}) {
  const [interactionMode, setInteractionMode] = useState('draw');
  const drawingLabel = selectedToolId ? (activeTool.label || activeTool.name) : '自由画';
  const flowSteps = getCanvasFlowSteps(recognitionProcess, strokes.length, selectedToolId);

  return (
    <section className="screen canvas-page page-enter">
      <ElementToolBar activeToolId={selectedToolId} onSelectTool={onSelectTool} toolOrder={gardenDay.tools} />
      <div className="canvas-stage">
        <GardenStage
          mood={mood}
          gardenDay={gardenDay}
          sceneState={sceneState}
          elementHistory={elementHistory}
          liveResponses={liveResponses}
          interactionMode={interactionMode}
          handDrawOnly
        >
          <div className="canvas-mode-switch" role="group" aria-label="画布模式">
            <button
              type="button"
              className={interactionMode === 'draw' ? 'active' : ''}
              onClick={() => setInteractionMode('draw')}
              aria-pressed={interactionMode === 'draw'}
            >
              <Pencil size={16} />
              <span>绘画</span>
            </button>
            <button
              type="button"
              className={interactionMode === 'view' ? 'active' : ''}
              onClick={() => setInteractionMode('view')}
              aria-pressed={interactionMode === 'view'}
            >
              <RotateCcw size={16} />
              <span>旋转</span>
            </button>
          </div>
          <div className="garden-flow-panel" aria-label="花园流程">
            {flowSteps.map((step) => (
              <span className={step.active ? 'active' : ''} key={step.label}>{step.label}</span>
            ))}
          </div>
          <DrawingCanvas
            activeTool={activeTool}
            activeLabel={drawingLabel}
            active={interactionMode === 'draw'}
            onStroke={onStroke}
            onStrokeMove={onStrokeMove}
            clearTraceSignal={clearTraceSignal}
          />
          <div className="canvas-caption">
            <Volume2 size={18} />
            <span>{interactionMode === 'draw' ? '绘画模式：画完停一下，元素会落到笔触位置。' : '旋转模式：拖动画布调整角度。'}</span>
          </div>
        </GardenStage>
      </div>
      <div className="feedback-dock">
        <FeedbackPanel
          feedback={feedback}
          sceneState={sceneState}
          activeTool={activeTool}
          selectedToolId={selectedToolId}
          recognitionProcess={recognitionProcess}
          canFinish={strokes.length > 0}
          onFinish={onFinish}
          onSuggest={onSuggest}
        />
      </div>
    </section>
  );
}

function getCanvasFlowSteps(process = {}, strokeCount = 0, selectedToolId = null) {
  const phase = process.phase || 'idle';
  return [
    { label: '选择元素', active: Boolean(selectedToolId) || strokeCount > 0 || phase !== 'idle' },
    { label: '开始绘画', active: ['drawing', 'collecting', 'classifying', 'resolved'].includes(phase) || strokeCount > 0 },
    { label: '识别画面', active: ['classifying', 'resolved'].includes(phase) },
    { label: '引导改画', active: phase === 'resolved' || strokeCount > 0 },
    { label: '情绪日记', active: strokeCount > 0 },
  ];
}

export default CanvasPage;
