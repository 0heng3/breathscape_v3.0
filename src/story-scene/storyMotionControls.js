export const DEFAULT_STORY_MOTION_CONTROLS = {
  windStrength: 0.32,
  windDirection: 0.25,
  windGust: 0.18,
  cloudAmount: 0.48,
  rainAmount: 0.02,
  sunWarmth: 0.52,
  sparkleDensity: 0.42,
  flowerBloom: 0.5,
  calmLevel: 0.68,
  cameraPush: 0.08,
  cameraBreath: 0.34,
};

export const STORY_DEBUG_ACTIONS = [
  {
    id: 'blow',
    label: '吹气',
    duration: 6200,
  },
  {
    id: 'raise',
    label: '举手',
    duration: 4800,
  },
  {
    id: 'smile',
    label: '微笑',
    duration: 5200,
  },
  {
    id: 'rain',
    label: '细雨',
    duration: 6800,
  },
  {
    id: 'calm',
    label: '安静',
    duration: 5600,
  },
  {
    id: 'closer',
    label: '靠近',
    duration: 4200,
  },
];

export function buildStorySceneProfile(stageJob) {
  const recognized = Array.isArray(stageJob?.recognizedElements)
    ? stageJob.recognizedElements.map((item) => String(item).toLowerCase())
    : [];
  const hasAny = (...keywords) => recognized.some((item) => keywords.some((keyword) => item.includes(keyword)));
  const hasRecognizedHints = recognized.length > 0 && !hasAny('child sketch shapes');
  const hasGrass = hasAny('grass', 'reed', 'moss', 'plant', 'garden');
  const hasFlowers = hasAny('flower', 'bud', 'sprout', 'blossom');
  const hasTrees = hasAny('tree', 'forest', 'leaf');
  const hasWater = hasAny('water', 'river', 'lake', 'puddle', 'pond', 'rain', 'sea', 'ocean');
  const outdoor = !hasRecognizedHints
    || hasGrass
    || hasFlowers
    || hasTrees
    || hasWater
    || hasAny('sun', 'cloud', 'rainbow', 'mountain', 'house', 'wind');

  return {
    outdoor,
    clouds: outdoor,
    rain: outdoor,
    grass: outdoor && (!hasRecognizedHints || hasGrass || hasFlowers),
    flowers: outdoor && (!hasRecognizedHints || hasFlowers),
    trees: outdoor && hasTrees,
    leaves: outdoor && hasTrees,
    petals: outdoor && (!hasRecognizedHints || hasFlowers),
    ripples: hasWater,
    sparkles: true,
  };
}

export function normalizeStoryMotionControls(controls = DEFAULT_STORY_MOTION_CONTROLS) {
  return {
    windStrength: clamp(Number(controls.windStrength ?? DEFAULT_STORY_MOTION_CONTROLS.windStrength), 0, 1),
    windDirection: clamp(Number(controls.windDirection ?? DEFAULT_STORY_MOTION_CONTROLS.windDirection), -1, 1),
    windGust: clamp(Number(controls.windGust ?? DEFAULT_STORY_MOTION_CONTROLS.windGust), 0, 1),
    cloudAmount: clamp(Number(controls.cloudAmount ?? DEFAULT_STORY_MOTION_CONTROLS.cloudAmount), 0, 1),
    rainAmount: clamp(Number(controls.rainAmount ?? DEFAULT_STORY_MOTION_CONTROLS.rainAmount), 0, 1),
    sunWarmth: clamp(Number(controls.sunWarmth ?? DEFAULT_STORY_MOTION_CONTROLS.sunWarmth), 0, 1),
    sparkleDensity: clamp(Number(controls.sparkleDensity ?? DEFAULT_STORY_MOTION_CONTROLS.sparkleDensity), 0, 1),
    flowerBloom: clamp(Number(controls.flowerBloom ?? DEFAULT_STORY_MOTION_CONTROLS.flowerBloom), 0, 1),
    calmLevel: clamp(Number(controls.calmLevel ?? DEFAULT_STORY_MOTION_CONTROLS.calmLevel), 0, 1),
    cameraPush: clamp(Number(controls.cameraPush ?? DEFAULT_STORY_MOTION_CONTROLS.cameraPush), 0, 1),
    cameraBreath: clamp(Number(controls.cameraBreath ?? DEFAULT_STORY_MOTION_CONTROLS.cameraBreath), 0, 1),
  };
}

export function smoothStoryMotionControls(current, target, amount) {
  const normalizedCurrent = normalizeStoryMotionControls(current);
  const normalizedTarget = normalizeStoryMotionControls(target);
  return Object.fromEntries(
    Object.keys(normalizedTarget).map((key) => [
      key,
      lerp(normalizedCurrent[key], normalizedTarget[key], amount),
    ]),
  );
}

function lerp(current, target, amount) {
  return current + (target - current) * amount;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
