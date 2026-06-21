import { promises as fs } from 'node:fs';
import path from 'node:path';

export function getProjectRoot() {
  return path.resolve(process.cwd());
}

export function getPublicGeneratedDir() {
  return path.join(getProjectRoot(), 'public', 'generated', 'story-scene');
}

export async function ensureGeneratedDir() {
  await fs.mkdir(getPublicGeneratedDir(), { recursive: true });
}

export async function writeGeneratedPng(jobId, buffer) {
  if (process.env.VERCEL) {
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }
  return writeGeneratedAsset(jobId, buffer, 'png');
}

export async function writeGeneratedAsset(jobId, buffer, extension = 'png') {
  await ensureGeneratedDir();
  const safeExtension = extension.replace(/[^a-z0-9]/gi, '') || 'png';
  const filename = `${jobId}.${safeExtension}`;
  const absolutePath = path.join(getPublicGeneratedDir(), filename);
  await fs.writeFile(absolutePath, buffer);
  return `/generated/story-scene/${filename}`;
}

export async function readUploadBuffer(file) {
  if (file?.buffer) return file.buffer;
  if (!file?.path) return null;
  return fs.readFile(file.path);
}
