import { Sparkles } from 'lucide-react';
import React from 'react';
import BreathOrb from '../components/BreathOrb';
import GardenStage from '../components/GardenStage';
import PoseSettleStage from '../components/PoseSettleStage';
import SoftButton from '../components/SoftButton';

function BreathePage({
  mood,
  gardenDay,
  sceneState,
  elementHistory,
  strokes,
  onGesture,
  onNext,
  isDiaryReplay = false,
  replayTitle,
}) {
  return (
    <section className="screen breathe-page page-enter">
      <PoseSettleStage onGesture={onGesture} cameraDockTargetId="breath-camera-dock">
        <GardenStage mood={mood} gardenDay={gardenDay} sceneState={sceneState} elementHistory={elementHistory} calm />
        <BreathOrb />
      </PoseSettleStage>
      <article className="guide-card calm-card breathe-side-card">
        <div id="breath-camera-dock" className="breathe-camera-slot" />
        <div className="breathe-side-copy">
          <p className="eyebrow">{isDiaryReplay ? '镜头回放' : '花园安放模式'}</p>
          <h2>{isDiaryReplay ? `${replayTitle || '这张日记'}可以再动一动` : '花园会把今天的线条轻轻收好'}</h2>
          <p>跟着小灯吸气，再慢慢呼气。</p>
          <p>打开摄像头后，跟着动作卡做双手靠近、慢慢抬手、单手带风或安静站住，花园会跟着你的姿势变化。</p>
          <div className="calm-progress" aria-label="三次呼吸">
            <span />
            <span />
            <span />
          </div>
          <SoftButton onClick={onNext}>
            <Sparkles size={22} />
            {isDiaryReplay ? '回到日记' : '生成今日花园'}
          </SoftButton>
        </div>
      </article>
    </section>
  );
}

export default BreathePage;
