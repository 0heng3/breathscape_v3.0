import { dataUrlToBlob, exportSketchDataUrls } from './sketchExport';

const POLL_INTERVAL_MS = 1200;
const POLL_MAX_NETWORK_ERRORS = 6;
const DIRECT_API_ORIGIN = 'http://127.0.0.1:3008';
const clientGeneratedJobs = new Map();

export async function submitStorySceneJob({
  sketch,
  recognizedElements,
  mood = 'calm',
  stylePreset = 'storybook_3d',
  provider = 'mock',
}) {
  const exports = exportSketchDataUrls(sketch);
  const formData = new FormData();
  formData.append('drawing_png', dataUrlToBlob(exports.drawingPng), 'drawing.png');
  formData.append('control_scribble_png', dataUrlToBlob(exports.controlScribblePng), 'control_scribble.png');
  formData.append('strokes_json', JSON.stringify(sketch));
  formData.append('recognition_json', JSON.stringify({ elements: recognizedElements }));
  formData.append('mood_json', JSON.stringify({ mood }));
  formData.append('style_preset', stylePreset);
  formData.append('provider', provider);

  try {
    const response = await fetchStoryApi('/api/story-scene/generate', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Story scene request failed: HTTP ${response.status}`);
    }

    const job = await readJsonResponse(response);
    return {
      ...job,
      drawingPng: exports.drawingPng,
      controlScribblePng: exports.controlScribblePng,
    };
  } catch (error) {
    if (canUseClientMockProvider(provider)) {
      return createClientMockJob({
        exports,
        recognizedElements,
        mood,
        stylePreset,
        provider,
        error,
      });
    }
    throw error;
  }
}

export async function pollStorySceneJob(jobId, onUpdate) {
  const clientJob = clientGeneratedJobs.get(jobId);
  if (clientJob) {
    onUpdate?.({ ...clientJob, status: 'running', progress: 0.74 });
    await delay(260);
    onUpdate?.(clientJob);
    return clientJob;
  }

  let networkErrors = 0;
  while (true) {
    let response;
    try {
      response = await fetchStoryApi(`/api/story-scene/jobs/${encodeURIComponent(jobId)}`);
    } catch (error) {
      networkErrors += 1;
      if (networkErrors > POLL_MAX_NETWORK_ERRORS) {
        throw new Error(`Story scene job polling lost connection: ${error.message || 'fetch failed'}.`);
      }
      onUpdate?.({
        status: 'running',
        transientError: `Job polling failed temporarily, retrying ${networkErrors}/${POLL_MAX_NETWORK_ERRORS}`,
      });
      await delay(POLL_INTERVAL_MS * 1.5);
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      networkErrors += 1;
      if (networkErrors <= POLL_MAX_NETWORK_ERRORS && response.status >= 500) {
        onUpdate?.({
          status: 'running',
          transientError: `Job polling failed temporarily, retrying ${networkErrors}/${POLL_MAX_NETWORK_ERRORS}`,
        });
        await delay(POLL_INTERVAL_MS * 1.5);
        continue;
      }
      throw new Error(errorText || `Story scene job polling failed: HTTP ${response.status}`);
    }

    networkErrors = 0;
    const job = await readJsonResponse(response);
    onUpdate?.(job);
    if (job.status === 'done' || job.status === 'error' || job.status === 'blocked') {
      return job;
    }
    await delay(POLL_INTERVAL_MS);
  }
}

async function fetchStoryApi(path, options = {}) {
  const urls = getApiCandidates(path);
  let lastError = null;

  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    try {
      const response = await fetch(url, options);
      if (response.ok || index === urls.length - 1 || !shouldFallbackToDirectApi(response.status)) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (index === urls.length - 1) {
        break;
      }
    }
  }

  throw new Error(`Cannot connect to the story scene API: ${lastError?.message || 'fetch failed'}`);
}

function getApiCandidates(path) {
  if (typeof window === 'undefined') return [path];
  const currentOrigin = window.location.origin;
  if (currentOrigin === DIRECT_API_ORIGIN) return [path];
  if (isLocalBrowserOrigin()) return [path, `${DIRECT_API_ORIGIN}${path}`];
  return [path];
}

function shouldFallbackToDirectApi(status) {
  return status === 404 || status === 405 || status === 502 || status === 503 || status === 504;
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    const appShell = text?.trim().startsWith('<');
    throw new Error(appShell ? 'Story scene API returned the app shell instead of JSON.' : 'Story scene API returned invalid JSON.');
  }
}

function isLocalBrowserOrigin() {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
}

function canUseClientMockProvider(provider) {
  return String(provider || '').toLowerCase() === 'mock';
}

function createClientMockJob({ exports, recognizedElements, mood, stylePreset, provider, error }) {
  const jobId = `story-client-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const prompt = buildClientPrompt({ recognizedElements, mood, stylePreset });
  const imageUrl = createClientMockImageUrl({ prompt, recognizedElements, mood });
  const job = {
    jobId,
    provider,
    prompt,
    recognizedElements: recognizedElements || [],
    status: 'done',
    progress: 1,
    imageUrl,
    seed: hashString(`${prompt}-${jobId}`),
    raw: {
      provider: 'client-mock',
      note: error?.message || 'Generated in browser because no hosted story-scene API was available.',
    },
    drawingPng: exports.drawingPng,
    controlScribblePng: exports.controlScribblePng,
  };
  clientGeneratedJobs.set(jobId, job);
  return job;
}

function buildClientPrompt({ recognizedElements, mood, stylePreset }) {
  const elements = Array.isArray(recognizedElements) && recognizedElements.length
    ? recognizedElements.join(', ')
    : 'child sketch shapes';
  return `Browser mock ${stylePreset || 'storybook_3d'} story garden with ${elements}, mood ${mood || 'calm'}.`;
}

function createClientMockImageUrl({ prompt, recognizedElements, mood }) {
  const svg = createClientMockSvg({ prompt, elements: recognizedElements, mood });
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createClientMockSvg({ prompt, elements, mood }) {
  const palette = getClientMockPalette(mood);
  const title = escapeXml(Array.isArray(elements) && elements.length ? elements.join(' / ') : 'story garden');
  const promptText = escapeXml(prompt.slice(0, 150));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768" viewBox="0 0 1024 768">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${palette.skyTop}"/>
      <stop offset="0.58" stop-color="${palette.skyMid}"/>
      <stop offset="1" stop-color="${palette.groundLight}"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.24" cy="0.18" r="0.28">
      <stop offset="0" stop-color="#fff6bd"/>
      <stop offset="1" stop-color="#fff6bd" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="1.2"/></filter>
  </defs>
  <rect width="1024" height="768" fill="url(#sky)"/>
  <rect width="1024" height="768" fill="url(#sun)"/>
  <path d="M0 476 C170 395 300 430 455 390 C620 350 766 386 1024 324 L1024 768 L0 768 Z" fill="${palette.hill}"/>
  <path d="M0 558 C205 490 348 536 514 488 C704 432 823 500 1024 454 L1024 768 L0 768 Z" fill="${palette.grass}"/>
  <ellipse cx="512" cy="668" rx="420" ry="84" fill="${palette.shadow}" opacity="0.45"/>
  ${createClientFlowers(palette)}
  ${createClientClouds()}
  <g opacity="0.88">
    <rect x="90" y="70" width="844" height="94" rx="28" fill="#fffaf0" opacity="0.72"/>
    <text x="126" y="114" fill="#4e493e" font-family="Arial, sans-serif" font-size="30" font-weight="700">${title}</text>
    <text x="126" y="145" fill="#6c6455" font-family="Arial, sans-serif" font-size="18">${promptText}</text>
  </g>
</svg>`;
}

function createClientFlowers(palette) {
  const items = [];
  for (let index = 0; index < 28; index += 1) {
    const x = 92 + ((index * 83) % 850);
    const y = 520 + ((index * 37) % 150);
    const scale = 0.75 + (index % 5) * 0.11;
    const color = palette.flowers[index % palette.flowers.length];
    items.push(`<g transform="translate(${x} ${y}) scale(${scale})">
      <path d="M0 72 C-8 38 8 34 0 0" fill="none" stroke="${palette.stem}" stroke-width="7" stroke-linecap="round"/>
      <circle cx="-13" cy="20" r="15" fill="${color}"/>
      <circle cx="13" cy="20" r="15" fill="${color}"/>
      <circle cx="0" cy="6" r="15" fill="${color}"/>
      <circle cx="0" cy="23" r="11" fill="#f8d36d"/>
    </g>`);
  }
  return items.join('');
}

function createClientClouds() {
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

function getClientMockPalette(mood) {
  const palettes = {
    calm: {
      skyTop: '#f8dca2',
      skyMid: '#cfe9e4',
      groundLight: '#e9d7b4',
      hill: '#9fc99c',
      grass: '#78aa76',
      shadow: '#6c9563',
      stem: '#4f8c63',
      flowers: ['#f2a7b5', '#f3c45d', '#d786a1', '#fff0a7', '#b7d88f'],
    },
    happy: {
      skyTop: '#ffe39a',
      skyMid: '#bdebd7',
      groundLight: '#f1d9a8',
      hill: '#add37a',
      grass: '#76b966',
      shadow: '#65965d',
      stem: '#4b985b',
      flowers: ['#ff866f', '#f8b44e', '#f47fac', '#8fc5ef', '#ffe36e'],
    },
    sad: {
      skyTop: '#c9d7ec',
      skyMid: '#d9e2e8',
      groundLight: '#d6d4c9',
      hill: '#8fb49b',
      grass: '#6f9878',
      shadow: '#5f8070',
      stem: '#4f8662',
      flowers: ['#b6c8ed', '#d9b9df', '#9fbce8', '#f0d1dd', '#e8cf82'],
    },
  };
  return palettes[mood] || palettes.calm;
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
