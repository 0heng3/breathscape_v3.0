import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const inputDir = path.join(rootDir, 'quickdraw_selected');
const outputDir = path.join(rootDir, 'public', 'quickdraw-assets');
const maxPerCategory = Number(process.argv.find((arg) => arg.startsWith('--max='))?.slice(6)) || 20;

await fs.promises.mkdir(outputDir, { recursive: true });

const files = (await fs.promises.readdir(inputDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ndjson'))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b));

const meta = {
  source: 'quickdraw_selected',
  generatedAt: new Date().toISOString(),
  maxPerCategory,
  categories: {},
};

for (const fileName of files) {
  const category = path.basename(fileName, '.ndjson');
  const safeCategory = slug(category);
  const categoryDir = path.join(outputDir, safeCategory);
  await fs.promises.mkdir(categoryDir, { recursive: true });

  const inputPath = path.join(inputDir, fileName);
  const stream = fs.createReadStream(inputPath, { encoding: 'utf8' });
  const reader = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let count = 0;

  for await (const line of reader) {
    if (count >= maxPerCategory) break;
    if (!line.trim()) continue;

    let sample;
    try {
      sample = JSON.parse(line);
    } catch {
      continue;
    }

    if (sample.recognized !== true || !Array.isArray(sample.drawing)) continue;

    count += 1;
    const index = String(count).padStart(3, '0');
    const svgName = `${safeCategory}_${index}.svg`;
    const svgPath = path.join(categoryDir, svgName);
    const svg = drawingToSvg(sample.drawing, category);
    await fs.promises.writeFile(svgPath, svg, 'utf8');
  }

  meta.categories[category] = {
    directory: `/quickdraw-assets/${safeCategory}`,
    files: Array.from({ length: count }, (_, index) => {
      const fileIndex = String(index + 1).padStart(3, '0');
      return `/quickdraw-assets/${safeCategory}/${safeCategory}_${fileIndex}.svg`;
    }),
  };
}

await fs.promises.writeFile(path.join(outputDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
console.log(`Generated QuickDraw SVG assets for ${Object.keys(meta.categories).length} categories.`);

function drawingToSvg(drawing, title) {
  const paths = drawing
    .map((stroke) => strokeToPath(stroke))
    .filter(Boolean)
    .map((d) => `  <path d="${d}" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('\n');

  return `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(title)}">\n${paths}\n</svg>\n`;
}

function strokeToPath(stroke) {
  const [xs, ys] = stroke;
  if (!Array.isArray(xs) || !Array.isArray(ys) || !xs.length) return '';
  const points = xs.map((x, index) => ({
    x: clampCoordinate(x),
    y: clampCoordinate(ys[index] || 0),
  }));
  const [first, ...rest] = points;
  return [
    `M ${fmt(first.x)} ${fmt(first.y)}`,
    ...rest.map((point) => `L ${fmt(point.x)} ${fmt(point.y)}`),
  ].join(' ');
}

function slug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function fmt(value) {
  return Number(value).toFixed(1).replace(/\.0$/, '');
}

function clampCoordinate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(255, Math.max(0, number));
}

function escapeXml(value) {
  return String(value).replace(/[<>&"]/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
  })[char]);
}
