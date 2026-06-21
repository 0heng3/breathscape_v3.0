import { dataUrlToBlob, exportSketchDataUrls } from './sketchExport';

const POLL_INTERVAL_MS = 1200;
const POLL_MAX_NETWORK_ERRORS = 6;
const DIRECT_API_ORIGIN = 'http://127.0.0.1:3008';

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

  const response = await fetchStoryApi('/api/story-scene/generate', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `生成请求失败：HTTP ${response.status}`);
  }
  const job = await response.json();
  return {
    ...job,
    drawingPng: exports.drawingPng,
    controlScribblePng: exports.controlScribblePng,
  };
}

export async function pollStorySceneJob(jobId, onUpdate) {
  let networkErrors = 0;
  while (true) {
    let response;
    try {
      response = await fetchStoryApi(`/api/story-scene/jobs/${encodeURIComponent(jobId)}`);
    } catch (error) {
      networkErrors += 1;
      if (networkErrors > POLL_MAX_NETWORK_ERRORS) {
        throw new Error(`任务查询网络中断：${error.message || 'fetch failed'}。生成可能仍在后端继续，请稍后刷新。`);
      }
      onUpdate?.({
        status: 'running',
        transientError: `任务查询暂时失败，正在重试 ${networkErrors}/${POLL_MAX_NETWORK_ERRORS}`,
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
          transientError: `任务查询暂时失败，正在重试 ${networkErrors}/${POLL_MAX_NETWORK_ERRORS}`,
        });
        await delay(POLL_INTERVAL_MS * 1.5);
        continue;
      }
      throw new Error(errorText || `任务查询失败：HTTP ${response.status}`);
    }

    networkErrors = 0;
    const job = await response.json();
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

  throw new Error(`无法连接到故事场景后端：${lastError?.message || 'fetch failed'}`);
}

function getApiCandidates(path) {
  if (typeof window === 'undefined') return [path];
  const directUrl = `${DIRECT_API_ORIGIN}${path}`;
  const currentOrigin = window.location.origin;
  if (currentOrigin === DIRECT_API_ORIGIN) return [path];
  return [path, directUrl];
}

function shouldFallbackToDirectApi(status) {
  return status === 404 || status === 405 || status === 502 || status === 503 || status === 504;
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
