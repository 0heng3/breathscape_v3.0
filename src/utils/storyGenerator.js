import { getMood } from '../data/moods';
import { getTool, tools } from '../data/tools';

export function uniqueItems(items) {
  return [...new Set(items.filter(Boolean))];
}

export function createStory(mood, history, sceneState) {
  if (!history.length) {
    return '今天的花园很安静。安静也可以被留下来。';
  }

  const first = history[0]?.tool;
  const main = chooseLaterTool(history, first);
  const names = uniqueItems(history.map((item) => item.tool));
  const ending =
    sceneState.calmLevel > 0.6
      ? '后来，花园慢慢安静了一点。'
      : '这些痕迹留在花园里，也可以被慢慢看见。';

  if (names.length === 1) {
    return `今天的小花园一开始像${mood.title}。你给花园带来了${toolName(first)}，又让它多停留了一会儿。${ending}`;
  }

  return `今天的小花园一开始像${mood.title}。你先带来了${toolName(first)}，后来又留下了${toolName(main)}。${ending}`;
}

export function weeklyReview(diaries) {
  if (!diaries.length) {
    return '这一周的小地图还很安静。等你保存花园后，它会慢慢出现颜色。';
  }

  const totals = diaries.reduce((acc, entry) => {
    Object.entries(entry.elements || entry.counts || {}).forEach(([key, value]) => {
      acc[key] = (acc[key] || 0) + value;
    });
    return acc;
  }, {});

  const names = Object.entries(totals)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key]) => getTool(key).name);

  return `这一周，你的花园里出现过${names.join('、') || '一些安静的空白'}。有几天很安静，有几天慢慢热闹起来。这些都是你留下的心情痕迹。`;
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function mostUsedTool(history) {
  const counts = history.reduce((acc, item) => {
    acc[item.tool] = (acc[item.tool] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || history[0]?.tool || 'sun';
}

function chooseLaterTool(history, first) {
  const main = mostUsedTool(history);
  if (main !== first) return main;
  return history.find((item) => item.tool !== first)?.tool || main;
}

export function toolName(toolId) {
  return tools.find((tool) => tool.id === toolId)?.name || '一点光';
}

export function normalizeDiaryEntry(entry) {
  const mood = getMood(entry.mood || entry.moodScene);
  return {
    ...entry,
    mood: mood.id,
    moodLabel: entry.moodLabel || mood.title,
  };
}
