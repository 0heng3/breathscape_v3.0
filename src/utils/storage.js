import { emptyElements } from '../data/tools';
import { normalizeDiaryEntry } from './storyGenerator';

const storageKey = 'breathscape_diary_entries_v3';
const legacyStorageKey = 'breathscape_diary_entries';

export function loadDiaries() {
  try {
    const current = localStorage.getItem(storageKey);
    if (current) return JSON.parse(current).map(normalizeEntry);

    const legacy = localStorage.getItem(legacyStorageKey);
    if (legacy) {
      const parsed = JSON.parse(legacy).map(normalizeEntry);
      saveDiaries(parsed);
      return parsed;
    }
  } catch {
    return [];
  }
  return [];
}

export function saveDiaries(diaries) {
  localStorage.setItem(storageKey, JSON.stringify(diaries));
}

function normalizeEntry(entry) {
  if (!entry) return entry;
  return normalizeDiaryEntry({
    ...entry,
    elements: {
      ...emptyElements,
      ...(entry.elements || entry.counts || {}),
    },
    elementHistory: entry.elementHistory || [],
    strokes: entry.strokes || [],
  });
}
