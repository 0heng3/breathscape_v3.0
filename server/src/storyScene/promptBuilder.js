const MOOD_LINES = {
  happy: 'bright sunlight, cheerful colors, playful but calm garden details',
  sad: 'gentle rain, soft blue light, safe shelter, tender quiet atmosphere',
  angry: 'windy garden, strong shapes, warm guiding light, safe emotional release',
  scared: 'cozy lamp light, protective plants, soft night, no scary elements',
  calm: 'misty morning, balanced composition, soft green and warm cream tones',
};

const STYLE_LINES = {
  storybook_3d: 'warm 3D storybook illustration, soft rounded forms, child-safe whimsical garden',
  clay_watercolor: 'soft clay-like 3D shapes mixed with watercolor paper texture',
  warm_garden: 'gentle sunlit garden scene, soft flowers, grass, clouds, cozy storybook lighting',
};

export function buildStoryScenePrompt({ recognition = {}, mood = {}, stylePreset = 'storybook_3d' }) {
  const elements = Array.isArray(recognition.elements) && recognition.elements.length
    ? recognition.elements
    : ['child sketch shapes'];
  const moodId = mood.mood || mood.id || 'calm';
  const style = STYLE_LINES[stylePreset] || STYLE_LINES.storybook_3d;
  const moodLine = MOOD_LINES[moodId] || MOOD_LINES.calm;

  return [
    'Create one complete, coherent story scene based on a child\'s simple black line drawing.',
    'Preserve the sketch composition, main shape positions, and childlike simplicity while improving it into a polished scene.',
    `Recognized elements: ${elements.join(', ')}.`,
    `Style: ${style}.`,
    `Mood: ${moodLine}.`,
    'Composition requirements: show the full scene without cropped main objects, keep the horizon and ground plane readable, and use a balanced wide picture-book layout.',
    'Leave clean open areas in the sky and on the ground where animated overlays can later be added, such as drifting clouds, sparkles, flower sway, falling petals, or soft light beams.',
    'Use clear foreground, midground, and background layers with soft depth, gentle light, and a natural 2.5D / 3D picture-book feeling.',
    'Avoid clutter, extreme close-ups, isolated stickers, harsh perspective, messy backgrounds, or objects touching the canvas edge.',
    'No text, no watermark, no logo, no realistic child face, no scary elements, no violence.',
  ].join(' ');
}

export function getNegativePrompt() {
  return [
    'photorealistic child',
    'human face',
    'scary',
    'horror',
    'violent',
    'text',
    'watermark',
    'logo',
    'extra limbs',
    'cluttered',
    'cropped subject',
    'cut off objects',
    'extreme close-up',
    'sticker sheet',
    'isolated object on blank background',
    'messy composition',
    'over-detailed',
    'harsh shadows',
  ].join(', ');
}
