import { getSecretValue } from '../config/secrets.js';
import { readUploadBuffer, writeGeneratedPng } from '../storyScene/fileUtils.js';

export async function generateWithOpenAICompatibleProvider({ jobId, prompt, files, providerName }) {
  const prefix = providerName.toUpperCase();
  const apiKey = getSecretValue(`${prefix}_API_KEY`);
  const baseUrl = normalizeBaseUrl(getSecretValue(`${prefix}_BASE_URL`));
  if (!apiKey) {
    throw new Error(`${prefix}_API_KEY is not configured.`);
  }
  if (!baseUrl) {
    throw new Error(`${prefix}_BASE_URL is not configured.`);
  }

  const controlBuffer = await readUploadBuffer(files.controlScribble || files.drawing);
  if (!controlBuffer) {
    throw new Error(`Missing drawing image for ${providerName}.`);
  }

  const response = await fetchWithRetry(`${baseUrl}/v1/images/edits`, () => ({
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: createImageEditFormData({
      prefix,
      prompt,
      controlBuffer,
    }),
  }), {
    providerName,
    timeoutMs: Number(process.env[`${prefix}_REQUEST_TIMEOUT_MS`] || process.env.OPENAI_COMPAT_REQUEST_TIMEOUT_MS || 180000),
    retries: Number(process.env[`${prefix}_REQUEST_RETRIES`] || process.env.OPENAI_COMPAT_REQUEST_RETRIES || 4),
  });

  if (!response.ok) {
    throw new Error(formatProviderError(providerName, response.status, await response.text()));
  }

  const payload = await response.json();
  const first = payload.data?.[0];
  const base64 = first?.b64_json || first?.image_base64;
  if (base64) {
    const imageUrl = await writeGeneratedPng(jobId, Buffer.from(base64, 'base64'));
    return {
      imageUrl,
      seed: null,
      raw: { provider: providerName, revisedPrompt: first?.revised_prompt },
    };
  }
  if (first?.url) {
    return {
      imageUrl: first.url,
      seed: null,
      raw: { provider: providerName, remoteUrl: first.url },
    };
  }
  throw new Error(`${providerName} response did not include an image.`);
}

function normalizeBaseUrl(value) {
  return value ? value.replace(/\/+$/, '') : '';
}

function createImageEditFormData({ prefix, prompt, controlBuffer }) {
  const formData = new FormData();
  formData.append('model', process.env[`${prefix}_IMAGE_MODEL`] || process.env.OPENAI_COMPAT_IMAGE_MODEL || 'gpt-image-1');
  formData.append('prompt', prompt);
  formData.append('image', new Blob([controlBuffer], { type: 'image/png' }), 'control_scribble.png');
  formData.append('n', '1');
  formData.append('size', process.env[`${prefix}_IMAGE_SIZE`] || process.env.OPENAI_COMPAT_IMAGE_SIZE || '1024x1024');
  formData.append('output_format', 'png');
  return formData;
}

async function fetchWithRetry(url, createOptions, { providerName, timeoutMs, retries }) {
  let lastError = null;
  let lastStatus = null;
  let lastBody = '';
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...createOptions(),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (response.ok || !isRetryableStatus(response.status) || attempt >= retries) {
        return response;
      }
      lastStatus = response.status;
      lastBody = await response.text();
      await delay(backoffMs(attempt));
      continue;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt >= retries) break;
      await delay(backoffMs(attempt));
    }
  }
  if (lastStatus) {
    throw new Error(formatProviderError(providerName, lastStatus, lastBody));
  }
  const message = lastError?.name === 'AbortError'
    ? `${providerName} request timed out after ${Math.round(timeoutMs / 1000)}s.`
    : `${providerName} network request failed after ${retries + 1} attempts: ${lastError?.message || 'unknown error'}`;
  throw new Error(message);
}

function isRetryableStatus(status) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status === 500
    || status === 502 || status === 503 || status === 504 || status === 522 || status === 524;
}

function backoffMs(attempt) {
  return 1500 * (attempt + 1);
}

function formatProviderError(providerName, status, body) {
  const jsonMessage = parseJsonErrorMessage(body);
  if (jsonMessage) {
    return `${providerName} image request failed: ${status} ${jsonMessage}`;
  }
  const text = stripHtml(body || '').replace(/\s+/g, ' ').trim();
  if (status === 522) {
    return `${providerName} image request failed: 522 Cloudflare connection timed out. The NewAPI gateway is reachable, but its origin server did not finish the image request. Please retry in a few minutes or switch provider.`;
  }
  if (status === 524) {
    return `${providerName} image request failed: 524 Cloudflare timed out waiting for the image result. Please retry or use a smaller request.`;
  }
  const detail = text ? ` ${text.slice(0, 420)}` : '';
  return `${providerName} image request failed: ${status}.${detail}`;
}

function parseJsonErrorMessage(value) {
  try {
    const payload = JSON.parse(value);
    return payload?.error?.message || payload?.message || '';
  } catch {
    return '';
  }
}

function stripHtml(value) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
