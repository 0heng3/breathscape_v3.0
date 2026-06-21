import { readUploadBuffer, writeGeneratedPng } from '../storyScene/fileUtils.js';

const OPENAI_IMAGE_EDIT_URL = 'https://api.openai.com/v1/images/edits';

export async function generateWithOpenAIProvider({ jobId, prompt, files }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const controlBuffer = await readUploadBuffer(files.controlScribble || files.drawing);
  if (!controlBuffer) {
    throw new Error('Missing drawing image for OpenAI image edit.');
  }

  const formData = new FormData();
  formData.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1');
  formData.append('prompt', prompt);
  formData.append('image', new Blob([controlBuffer], { type: 'image/png' }), 'control_scribble.png');
  formData.append('n', '1');
  formData.append('size', process.env.OPENAI_IMAGE_SIZE || '1024x1024');
  formData.append('output_format', 'png');
  formData.append('moderation', 'auto');

  const response = await fetch(OPENAI_IMAGE_EDIT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OpenAI image request failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  const first = payload.data?.[0];
  const base64 = first?.b64_json || first?.image_base64;
  if (base64) {
    const imageUrl = await writeGeneratedPng(jobId, Buffer.from(base64, 'base64'));
    return {
      imageUrl,
      seed: null,
      raw: { provider: 'openai', revisedPrompt: first?.revised_prompt },
    };
  }
  if (first?.url) {
    return {
      imageUrl: first.url,
      seed: null,
      raw: { provider: 'openai', remoteUrl: first.url },
    };
  }
  throw new Error('OpenAI response did not include an image.');
}
