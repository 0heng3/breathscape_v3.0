import { Sparkles } from 'lucide-react';
import React from 'react';
import GardenStage from '../components/GardenStage';
import MoodCard from '../components/MoodCard';
import SoftButton from '../components/SoftButton';
import { getMood, moods } from '../data/moods';
import { getTool } from '../data/tools';
import { createInitialSceneState } from '../utils/sceneState';

function MoodPage({ selectedMood, selectedToolId, gardenDay, onSelectMood, onContinue }) {
  const gardenMood = getMood(selectedMood);
  const sceneEntries = createSceneEntries(gardenDay);

  return (
    <section className="screen mood-page page-enter">
      <GardenStage mood={gardenMood} gardenDay={gardenDay} sceneState={createInitialSceneState(selectedMood, gardenDay.day)} quiet />
      <div className="mood-overlay">
        <div className="section-heading">
          <p className="eyebrow">{gardenDay.name}</p>
          <h2>今天更像哪个小场景？</h2>
          <p>这些只是进入花园的小入口，不会给你贴标签。</p>
        </div>
        <div className="mood-grid" aria-label="今日小场景">
          {sceneEntries.map((entry) => (
            <MoodCard
              entry={entry}
              selected={selectedToolId === entry.tool.id}
              onSelect={() => onSelectMood(entry.mood.id, entry.tool.id)}
              key={`${entry.mood.id}-${entry.tool.id}`}
            />
          ))}
        </div>
        <div className="page-bottom-row">
          <p>选一个小场景，先放进今天的花园里。</p>
          <SoftButton onClick={onContinue} disabled={!selectedMood}>
            <Sparkles size={22} />
            让花园醒来
          </SoftButton>
        </div>
      </div>
    </section>
  );
}

function createSceneEntries(gardenDay) {
  const usedMoods = new Set();
  return gardenDay.tools.map((toolId, index) => {
    const mood = findMoodForTool(gardenDay, toolId, usedMoods) || moods[index % moods.length];
    usedMoods.add(mood.id);
    const tool = getTool(toolId);
    return {
      mood,
      tool,
      title: tool.label,
      childText: createToolEntryText(tool, gardenDay.name),
      visual: `tool-entry tool-entry-${tool.id}`,
    };
  });
}

function findMoodForTool(gardenDay, toolId, usedMoods) {
  const exact = moods.find((mood) => !usedMoods.has(mood.id) && gardenDay.recommendedByMood?.[mood.id]?.[0] === toolId);
  if (exact) return exact;
  return moods.find((mood) => !usedMoods.has(mood.id) && (gardenDay.recommendedByMood?.[mood.id] || []).includes(toolId));
}

function createToolEntryText(tool, dayName) {
  const text = {
    seed: '先放下一颗小种子。',
    grass: '让这里长出一点绿色。',
    sunlight: '给土地一点晨光。',
    dew: '让叶子亮一下。',
    soilLine: '把土地画得更松软。',
    firstFlower: '打开第一朵小花。',
    waterLine: '让小溪动起来。',
    ripple: '让水面扩出小圆。',
    leafBoat: '放一只慢慢走的叶舟。',
    bridge: '把小桥接完整一点。',
    rainDrop: '给花园一点雨滴。',
    reed: '让岸边长出芦苇。',
    windLine: '让草坡跟着风动。',
    windBell: '挂起会轻响的风铃。',
    ribbon: '让彩带慢慢飘。',
    cloud: '让云团慢慢经过。',
    floatingLeaf: '让叶片顺风走。',
    stone: '把小路接上一点。',
    moss: '让石边变得柔和。',
    breathLight: '让小光慢慢亮。',
    smallTree: '让路边站起小树。',
    shadow: '留下一片柔影。',
    signpost: '给小路一个方向。',
    mushroom: '让蘑菇冒出来。',
    sprout: '让嫩芽长高一点。',
    puddle: '让水洼亮一下。',
    snailTrail: '留下一条银色小路。',
    bud: '让花苞出现。',
    lantern: '挂起一盏暖灯。',
    firefly: '让小光飞起来。',
    moon: '让月亮升起来。',
    windowLight: '点亮远处窗光。',
    quietFlower: '打开夜里的花。',
    softWind: '让灯光轻轻摆。',
    star: '点亮一颗星星。',
    memorySeed: '点亮一周小物件。',
    constellationLine: '把星光连起来。',
    moonbeam: '让月光照进温室。',
    rainbow: '给温室一层淡彩。',
  }[tool.id];
  return text || `放进${dayName}里。`;
}

export default MoodPage;
