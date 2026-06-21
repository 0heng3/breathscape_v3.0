import { writeGeneratedAsset } from '../storyScene/fileUtils.js';

export async function generateWithMockProvider({ jobId, prompt, recognition }) {
  const elements = Array.isArray(recognition?.elements) ? recognition.elements : [];
  const svg = createMockSvg({ prompt, elements });
  const buffer = Buffer.from(svg);
  const imageUrl = await writeGeneratedAsset(jobId, buffer, 'svg');
  return {
    imageUrl,
    seed: hashString(prompt),
    raw: { provider: 'mock' },
  };
}

function createMockSvg({ prompt, elements }) {
  const title = escapeXml(elements.length ? elements.join(' · ') : 'story garden');
  const promptText = escapeXml(prompt.slice(0, 170));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768" viewBox="0 0 1024 768">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f8dca2"/>
      <stop offset="0.58" stop-color="#cfe9e4"/>
      <stop offset="1" stop-color="#e9d7b4"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.24" cy="0.18" r="0.28">
      <stop offset="0" stop-color="#fff6bd"/>
      <stop offset="1" stop-color="#fff6bd" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft">
      <feGaussianBlur stdDeviation="1.2"/>
    </filter>
  </defs>
  <rect width="1024" height="768" fill="url(#sky)"/>
  <rect width="1024" height="768" fill="url(#sun)"/>
  <path d="M0 476 C170 395 300 430 455 390 C620 350 766 386 1024 324 L1024 768 L0 768 Z" fill="#9fc99c"/>
  <path d="M0 558 C205 490 348 536 514 488 C704 432 823 500 1024 454 L1024 768 L0 768 Z" fill="#78aa76"/>
  <ellipse cx="512" cy="668" rx="420" ry="84" fill="#6c9563" opacity="0.45"/>
  ${createFlowers()}
  ${createClouds()}
  <g opacity="0.88">
    <rect x="90" y="70" width="844" height="94" rx="28" fill="#fffaf0" opacity="0.72"/>
    <text x="126" y="114" fill="#4e493e" font-family="Arial, sans-serif" font-size="30" font-weight="700">${title}</text>
    <text x="126" y="145" fill="#6c6455" font-family="Arial, sans-serif" font-size="18">${promptText}</text>
  </g>
</svg>`;
}

function createFlowers() {
  const items = [];
  for (let index = 0; index < 28; index += 1) {
    const x = 92 + ((index * 83) % 850);
    const y = 520 + ((index * 37) % 150);
    const scale = 0.75 + (index % 5) * 0.11;
    const color = ['#f2a7b5', '#f3c45d', '#d786a1', '#fff0a7', '#b7d88f'][index % 5];
    items.push(`<g transform="translate(${x} ${y}) scale(${scale})">
      <path d="M0 72 C-8 38 8 34 0 0" fill="none" stroke="#4f8c63" stroke-width="7" stroke-linecap="round"/>
      <circle cx="-13" cy="20" r="15" fill="${color}"/>
      <circle cx="13" cy="20" r="15" fill="${color}"/>
      <circle cx="0" cy="6" r="15" fill="${color}"/>
      <circle cx="0" cy="23" r="11" fill="#f8d36d"/>
    </g>`);
  }
  return items.join('');
}

function createClouds() {
  return `
  <g filter="url(#soft)" fill="#fffaf0" opacity="0.72">
    <ellipse cx="720" cy="144" rx="74" ry="26"/>
    <ellipse cx="775" cy="134" rx="52" ry="30"/>
    <ellipse cx="823" cy="151" rx="78" ry="28"/>
    <ellipse cx="246" cy="210" rx="58" ry="22"/>
    <ellipse cx="286" cy="198" rx="46" ry="25"/>
    <ellipse cx="324" cy="214" rx="60" ry="21"/>
  </g>`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}
