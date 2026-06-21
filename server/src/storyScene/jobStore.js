const jobs = new Map();

export function createJob(initial) {
  const now = new Date().toISOString();
  const job = {
    jobId: initial.jobId,
    status: 'queued',
    provider: initial.provider,
    createdAt: now,
    updatedAt: now,
    progress: 0,
    prompt: initial.prompt,
    recognizedElements: initial.recognizedElements || [],
  };
  jobs.set(job.jobId, job);
  return job;
}

export function updateJob(jobId, patch) {
  const current = jobs.get(jobId);
  if (!current) return null;
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  jobs.set(jobId, next);
  return next;
}

export function getJob(jobId) {
  return jobs.get(jobId) || null;
}
