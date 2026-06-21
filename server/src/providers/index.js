import { getNegativePrompt } from '../storyScene/promptBuilder.js';
import { generateWithComfyUIProvider } from './comfyuiProvider.js';
import { generateWithMockProvider } from './mockProvider.js';
import { generateWithOpenAICompatibleProvider } from './openaiCompatibleImageProvider.js';
import { generateWithOpenAIProvider } from './openaiImageProvider.js';
import { generateWithReplicateProvider } from './replicateProvider.js';

export async function generateStoryScene({ provider, jobId, prompt, recognition, files }) {
  const negativePrompt = getNegativePrompt();
  if (provider === 'openai') {
    return generateWithOpenAIProvider({ jobId, prompt, files });
  }
  if (provider === 'newapi') {
    return generateWithOpenAICompatibleProvider({ jobId, prompt, files, providerName: 'newapi' });
  }
  if (provider === 'yunwu') {
    return generateWithOpenAICompatibleProvider({ jobId, prompt, files, providerName: 'yunwu' });
  }
  if (provider === 'replicate') {
    return generateWithReplicateProvider({ jobId, prompt, negativePrompt, files });
  }
  if (provider === 'comfyui') {
    return generateWithComfyUIProvider({ jobId, prompt, negativePrompt, files });
  }
  return generateWithMockProvider({ jobId, prompt, recognition, files });
}
