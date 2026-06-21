export const FIG_SPRITE_COUNTS = {
  cloud: 16,
  grass: 25,
  flower: 20,
};

export const FIG_SPRITE_POOLS = {
  cloud: createSpriteList('cloud', FIG_SPRITE_COUNTS.cloud),
  grass: createSpriteList('grass', FIG_SPRITE_COUNTS.grass),
  flower: createSpriteList('flower', FIG_SPRITE_COUNTS.flower),
};

export function getFigSpriteForTool(tool, seed = 0) {
  const family = getFigFamilyForTool(tool);
  const pool = FIG_SPRITE_POOLS[family] || FIG_SPRITE_POOLS.grass;
  const index = Math.abs(hashValue(`${tool}-${seed}`)) % pool.length;
  return {
    family,
    src: pool[index],
    index: index + 1,
  };
}

export function getFigFamilyForTool(tool) {
  if (['flower', 'firstFlower', 'bud', 'quietFlower', 'mushroom'].includes(tool)) return 'flower';
  if (['cloud', 'wind', 'windLine', 'softWind', 'ribbon', 'floatingLeaf', 'rainbow'].includes(tool)) return 'cloud';
  return 'grass';
}

export function getFigSpriteSize(tool, intensity = 0.5) {
  const amount = Math.min(1, Math.max(0, Number(intensity) || 0.5));
  if (['cloud', 'wind', 'windLine', 'softWind', 'ribbon', 'floatingLeaf', 'rainbow'].includes(tool)) {
    return { width: 142 + amount * 42, height: 72 + amount * 24 };
  }
  if (['flower', 'firstFlower', 'bud', 'quietFlower', 'mushroom'].includes(tool)) {
    return { width: 92 + amount * 34, height: 96 + amount * 34 };
  }
  if (['seed', 'moss', 'sprout'].includes(tool)) {
    return { width: 86 + amount * 26, height: 58 + amount * 22 };
  }
  return { width: 112 + amount * 36, height: 74 + amount * 24 };
}

export function createSpriteList(prefix, count) {
  return Array.from({ length: count }, (_, index) => `/fig/sprites/${prefix}-${index + 1}.png`);
}

function hashValue(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
