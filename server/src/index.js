import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { generateStoryScene } from './providers/index.js';
import { ensureGeneratedDir, getProjectRoot } from './storyScene/fileUtils.js';
import { createJob, getJob, updateJob } from './storyScene/jobStore.js';
import { buildStoryScenePrompt } from './storyScene/promptBuilder.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const projectRoot = getProjectRoot();
const upload = multer({ dest: path.join(projectRoot, '.tmp', 'story-scene-uploads') });
const app = express();
const port = Number(process.env.STORY_SCENE_API_PORT || 3008);

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/generated', express.static(path.join(projectRoot, 'public', 'generated')));

app.get('/api/story-scene/health', (req, res) => {
  res.json({
    ok: true,
    providers: ['mock', 'newapi', 'yunwu', 'openai', 'replicate', 'comfyui'],
    defaultProvider: process.env.STORY_SCENE_PROVIDER || 'mock',
  });
});

app.post(
  '/api/story-scene/generate',
  upload.fields([
    { name: 'drawing_png', maxCount: 1 },
    { name: 'control_scribble_png', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const recognition = parseJsonField(req.body.recognition_json, { elements: [] });
      const mood = parseJsonField(req.body.mood_json, { mood: 'calm' });
      const stylePreset = req.body.style_preset || 'storybook_3d';
      const provider = req.body.provider || process.env.STORY_SCENE_PROVIDER || 'mock';
      const jobId = `story-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      const prompt = buildStoryScenePrompt({ recognition, mood, stylePreset });
      const job = createJob({
        jobId,
        provider,
        prompt,
        recognizedElements: recognition.elements || [],
      });
      res.status(202).json(job);

      runJob({
        jobId,
        provider,
        prompt,
        recognition,
        files: {
          drawing: req.files?.drawing_png?.[0],
          controlScribble: req.files?.control_scribble_png?.[0],
        },
      });
    } catch (error) {
      res.status(400).send(error.message || 'Invalid story scene request.');
    }
  },
);

app.get('/api/story-scene/jobs/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) {
    res.status(404).send('Story scene job not found.');
    return;
  }
  res.json(job);
});

await ensureGeneratedDir();
app.listen(port, () => {
  console.log(`Story scene API listening on http://127.0.0.1:${port}`);
});

async function runJob({ jobId, provider, prompt, recognition, files }) {
  try {
    updateJob(jobId, { status: 'running', progress: 0.24 });
    const result = await generateStoryScene({ provider, jobId, prompt, recognition, files });
    updateJob(jobId, {
      status: result.imageUrl ? 'done' : 'running',
      progress: result.imageUrl ? 1 : 0.72,
      imageUrl: result.imageUrl,
      seed: result.seed,
      raw: result.raw,
    });
    if (!result.imageUrl) {
      updateJob(jobId, {
        status: 'error',
        error: result.raw?.note || 'Provider did not return an image URL yet.',
      });
    }
  } catch (error) {
    console.error(`[story-scene] ${provider} job ${jobId} failed:`, error);
    updateJob(jobId, {
      status: 'error',
      progress: 1,
      error: error.message || 'Story scene generation failed.',
    });
  }
}

function parseJsonField(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
