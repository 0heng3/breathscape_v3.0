import React from 'react';
import { getMood } from '../data/moods';
import { getGardenDay } from '../data/gardenDays';
import { createInitialSceneState } from '../utils/sceneState';
import { formatDate } from '../utils/storyGenerator';
import GardenStage from './GardenStage';

function DiaryEntryCard({ entry, onOpen }) {
  const mood = getMood(entry.mood);
  const gardenDay = getGardenDay(entry.day || 1);
  const sceneState = entry.sceneState || { ...createInitialSceneState(entry.mood), toolCounts: entry.elements };

  return (
    <button className="diary-entry diary-entry-button" type="button" onClick={onOpen} aria-label={`打开${entry.title}`}>
      <div className="diary-entry__thumb">
        <GardenStage
          mood={mood}
          gardenDay={gardenDay}
          sceneState={sceneState}
          elementHistory={entry.elementHistory || []}
          calm
          diary
        />
      </div>
      <div>
        <p className="eyebrow">
          {formatDate(entry.date)} · {entry.moodLabel || mood.title}
        </p>
        <h3>{entry.title}</h3>
        <p>{entry.story}</p>
      </div>
    </button>
  );
}

export default DiaryEntryCard;
