import { serializeVariantSvg } from '../utils/svgPathTools';
import { getAssetVariants, getToolElement, getToolbarGlyph, toolIds } from './toolElementMap';

const selectedCategories = new Set([
  'bridge',
  'bush',
  'circle',
  'cloud',
  'flower',
  'garden',
  'grass',
  'hurricane',
  'lantern',
  'leaf',
  'light-bulb',
  'line',
  'moon',
  'mushroom',
  'pond',
  'rain',
  'rainbow',
  'river',
  'snail',
  'squiggle',
  'star',
  'sun',
  'tornado',
  'tree',
  'windmill',
]);

export const quickdrawAssets = Object.fromEntries(
  toolIds.map((toolId) => {
    const tool = getToolElement(toolId);
    const selectedPaths = buildSelectedAssetPaths(tool);
    return [
      toolId,
      {
        ...tool,
        toolbarGlyph: withAssetPath(getToolbarGlyph(toolId), selectedPaths[0]),
        assetVariants: buildAssetVariants(getAssetVariants(toolId), selectedPaths),
        publicAssetBase: `/quickdraw-assets/${toolId}`,
        selectedAssetPaths: selectedPaths,
        source: selectedPaths.length ? 'quickdraw-selected-svg' : 'missing-quickdraw-selected-svg',
      },
    ];
  }),
);

export function getQuickDrawAsset(toolId) {
  return quickdrawAssets[toolId] || quickdrawAssets.seed;
}

export function getQuickDrawAssetVariant(toolId, variantIndex = 0) {
  const asset = getQuickDrawAsset(toolId);
  const variants = asset.assetVariants || [];
  if (!variants.length) return null;
  return variants[((variantIndex % variants.length) + variants.length) % variants.length];
}

export function getQuickDrawAssetUrl(toolId, variantIndex = 0) {
  return `${getQuickDrawAsset(toolId).publicAssetBase}/${(variantIndex % 3) + 1}.svg`;
}

export function serializeQuickDrawAsset(toolId, variantIndex = 0, stroke = '#4f5e74') {
  const variant = getQuickDrawAssetVariant(toolId, variantIndex);
  return variant ? serializeVariantSvg(variant, stroke) : '';
}

function buildSelectedAssetPaths(tool) {
  const categories = tool.categories || [];
  const selected = [];
  categories.slice(0, 3).forEach((category, categoryIndex) => {
    const safe = slug(category);
    if (!selectedCategories.has(safe)) return;
    for (let index = 1; index <= 20; index += 1) {
      const fileIndex = String(index).padStart(3, '0');
      selected.push(`/quickdraw-assets/${safe}/${safe}_${fileIndex}.svg`);
    }
  });
  return [...new Set(selected)].slice(0, 30);
}

function buildAssetVariants(ruleVariants, selectedPaths) {
  if (!selectedPaths.length) return [];
  const fallback = ruleVariants.length ? ruleVariants : [{ viewBox: '0 0 256 256', strokeWidth: 5, paths: [] }];
  return selectedPaths.map((assetPath, index) => withAssetPath(fallback[index % fallback.length], assetPath));
}

function withAssetPath(variant, assetPath) {
  return assetPath ? { ...variant, assetPath } : variant;
}

function slug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
