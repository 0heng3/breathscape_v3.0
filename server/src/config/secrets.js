import { readFileSync } from 'node:fs';

const DEFAULT_SECRETS_PATH = 'D:\\yuxin\\code\\secrets_local.py';

let cachedSecrets = null;

export function getSecretValue(name) {
  if (process.env[name]) return process.env[name];
  const secrets = loadPythonStyleSecrets(process.env.SECRETS_LOCAL_PATH || DEFAULT_SECRETS_PATH);
  return secrets[name] || '';
}

function loadPythonStyleSecrets(filePath) {
  if (cachedSecrets) return cachedSecrets;
  cachedSecrets = {};
  try {
    const content = readFileSync(filePath, 'utf8');
    const pattern = /^([A-Z0-9_]+)\s*=\s*(['"])(.*?)\2\s*$/gm;
    let match = pattern.exec(content);
    while (match) {
      cachedSecrets[match[1]] = match[3];
      match = pattern.exec(content);
    }
  } catch {
    cachedSecrets = {};
  }
  return cachedSecrets;
}
