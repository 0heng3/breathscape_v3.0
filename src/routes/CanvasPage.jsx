import { Volume2 } from 'lucide-react';
import React from 'react';
import DrawingCanvas from '../components/DrawingCanvas';
import ElementToolBar from '../components/ElementToolBar';
import FeedbackPanel from '../components/FeedbackPanel';
import GardenStage from '../components/GardenStage';
import { getTool } from '../data/tools';
import { getToolElement } from '../data/toolElementMap';

function CanvasPage({
  mood,
  gardenDay,
  sceneState,
  activeTool,
  feedback,
  strokes,
  elementHistory,
  liveResponses,
  onSelectTool,
  onStroke,
  onStrokeMove,
  onFinish,
  onSuggest,
}) {
  const toolMeta = getToolElement(activeTool.id);

  return (
    <section className="screen canvas-page page-enter">
      <div className="garden-workbar">
        <p>{feedback}</p>
      </div>
      <ElementToolBar activeToolId={activeTool.id} onSelectTool={onSelectTool} toolOrder={gardenDay.tools} />
      <div className="canvas-stage">
        <GardenStage mood={mood} gardenDay={gardenDay} sceneState={sceneState} elementHistory={elementHistory} liveResponses={liveResponses}>
          <DrawingCanvas activeTool={activeTool} onStroke={onStroke} onStrokeMove={onStrokeMove} />
          <div className="canvas-caption">
            <Volume2 size={18} />
            <span>{toolMeta.feedbackText || activeTool.prompt}</span>
          </div>
        </GardenStage>
      </div>
      <div className="feedback-dock">
        <FeedbackPanel
          feedback={feedback}
          sceneState={sceneState}
          activeTool={activeTool}
          toolTip={toolMeta.feedbackText}
          canFinish={strokes.length > 0}
          onFinish={onFinish}
          onSuggest={onSuggest}
        />
      </div>
    </section>
  );
}

export default CanvasPage;
