import { Check, Lightbulb } from 'lucide-react';
import React from 'react';
import SoftButton from './SoftButton';
import { getToolElement } from '../data/toolElementMap';
import { getSceneClues } from '../utils/sceneState';

function FeedbackPanel({ feedback, sceneState, activeTool, toolTip, canFinish, onFinish, onSuggest }) {
  const tool = getToolElement(activeTool.id);
  const clues = getSceneClues(sceneState);
  const sceneLine = getToolSceneLine(activeTool.id);

  return (
    <aside className="feedback-panel">
      <div className="feedback-panel__current">
        <span>当前</span>
        <strong>{tool.label || activeTool.label}</strong>
      </div>
      <p className="feedback-panel__text">现在画出来的都会变成{tool.label || activeTool.label}。</p>
      <p className="feedback-panel__tool-tip">{toolTip || tool.feedbackText || feedback}</p>
      <p className="feedback-panel__scene-line">{sceneLine}</p>
      <div className="scene-clues" aria-label="当前场景状态">
        <span className="scene-clue-block__title">当前场景状态</span>
        {clues.slice(0, 4).map((clue) => (
          <span key={clue}>{clue}</span>
        ))}
      </div>
      <p className="feedback-panel__next">下一步可以换一个元素，或继续给这里加一点同样的形状。</p>
      <SoftButton variant="secondary" onClick={onSuggest}>
        <Lightbulb size={20} />
        给小灯一点光
      </SoftButton>
      <SoftButton variant="secondary" onClick={onFinish} disabled={!canFinish}>
        <Check size={20} />
        进入安放模式
      </SoftButton>
    </aside>
  );
}

function getToolSceneLine(toolId) {
  const lines = {
    seed: '土地里会多出种子点，角落会亮一点。',
    grass: '地面会长出一小片绿色，风来时会轻轻摆动。',
    sunlight: '花园会变亮，雾层会变薄。',
    sun: '花园会变亮，雾层会变薄。',
    dew: '雨水会从天空落下，土地会喝到水。',
    soilLine: '地面会多出柔和的土壤纹理。',
    flower: '花会打开一点，花园多一处颜色。',
    firstFlower: '花会打开一点，花园多一处颜色。',
    cloud: '云会回到天空，慢慢移动。',
    windLine: '风线会带动草、云和彩带。',
    rainDrop: '雨会让土地变湿，水面有波纹。',
    rain: '雨会让土地变湿，水面有波纹。',
    waterLine: '水面会流动，溪线会更清楚。',
    star: '星空会更亮，星星会轻轻闪。',
    lantern: '局部暖光会扩大一点。',
    mushroom: '蘑菇会从地面冒出来。',
    bridge: '小桥和路径会更连贯。',
  };
  return lines[toolId] || '场景会接住这一笔，并把它整理成当前元素。';
}

export default FeedbackPanel;
