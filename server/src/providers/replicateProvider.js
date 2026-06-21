import { readUploadBuffer } from '../storyScene/fileUtils.js';

export async function generateWithReplicateProvider({ prompt, negativePrompt, files }) {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  const modelVersion = process.env.REPLICATE_CONTROLNET_VERSION;
  if (!apiToken) throw new Error('REPLICATE_API_TOKEN is not configured.');
  if (!modelVersion) throw new Error('REPLICATE_CONTROLNET_VERSION is not configured.');

  const controlBuffer = await readUploadBuffer(files.controlScribble || files.drawing);
  if (!controlBuffer) throw new Error('Missing drawing image for Replicate ControlNet.');

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiToken}`,
      'Content-Type': 'application/json',
      Prefer: 'wait',
    },
    body: JSON.stringify({
      version: modelVersion,
      input: {
        image: `data:image/png;base64,${controlBuffer.toString('base64')}`,
        prompt,
        negative_prompt: negativePrompt,
        num_inference_steps: Number(process.env.REPLICATE_STEPS || 24),
        guidance_scale: Number(process.env.REPLICATE_GUIDANCE || 7),
        controlnet_conditioning_scale: Number(process.env.REPLICATE_CONTROL_STRENGTH || 0.9),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Replicate request failed: ${response.status} ${await response.text()}`);
  }
  const payload = await response.json();
  const output = Array.isArray(payload.output) ? payload.output[0] : payload.output;
  if (!output) throw new Error('Replicate response did not include an output image.');
  return {
    imageUrl: output,
    seed: payload.seed || null,
    raw: { provider: 'replicate', predictionId: payload.id, status: payload.status },
  };
}
