import { promises as fs } from 'node:fs';
import { readUploadBuffer } from '../storyScene/fileUtils.js';

export async function generateWithComfyUIProvider({ prompt, negativePrompt, files }) {
  const endpoint = process.env.COMFYUI_ENDPOINT || 'http://127.0.0.1:8188';
  const workflowPath = process.env.COMFYUI_WORKFLOW_PATH;
  if (!workflowPath) {
    throw new Error('COMFYUI_WORKFLOW_PATH is not configured.');
  }

  const controlBuffer = await readUploadBuffer(files.controlScribble || files.drawing);
  if (!controlBuffer) throw new Error('Missing drawing image for ComfyUI.');

  const uploadForm = new FormData();
  uploadForm.append('image', new Blob([controlBuffer], { type: 'image/png' }), 'control_scribble.png');
  uploadForm.append('overwrite', 'true');
  const uploadResponse = await fetch(`${endpoint}/upload/image`, {
    method: 'POST',
    body: uploadForm,
  });
  if (!uploadResponse.ok) {
    throw new Error(`ComfyUI upload failed: ${uploadResponse.status} ${await uploadResponse.text()}`);
  }
  const uploaded = await uploadResponse.json();
  const workflow = JSON.parse(await fs.readFile(workflowPath, 'utf8'));
  const promptGraph = injectWorkflowInputs(workflow, {
    prompt,
    negativePrompt,
    imageName: uploaded.name || 'control_scribble.png',
  });

  const promptResponse = await fetch(`${endpoint}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: promptGraph }),
  });
  if (!promptResponse.ok) {
    throw new Error(`ComfyUI prompt failed: ${promptResponse.status} ${await promptResponse.text()}`);
  }
  const promptPayload = await promptResponse.json();
  return {
    imageUrl: '',
    seed: null,
    raw: {
      provider: 'comfyui',
      promptId: promptPayload.prompt_id,
      note: 'ComfyUI provider submitted the workflow. Add history polling/output download after the workflow JSON is finalized.',
    },
  };
}

function injectWorkflowInputs(workflow, { prompt, negativePrompt, imageName }) {
  const next = structuredClone(workflow);
  for (const node of Object.values(next)) {
    if (!node?.inputs) continue;
    if (typeof node.inputs.text === 'string' && node.inputs.text.includes('{{PROMPT}}')) {
      node.inputs.text = prompt;
    }
    if (typeof node.inputs.text === 'string' && node.inputs.text.includes('{{NEGATIVE_PROMPT}}')) {
      node.inputs.text = negativePrompt;
    }
    if (typeof node.inputs.image === 'string' && node.inputs.image.includes('{{CONTROL_IMAGE}}')) {
      node.inputs.image = imageName;
    }
  }
  return next;
}
