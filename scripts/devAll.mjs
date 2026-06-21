import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const commands = [
  { name: 'api', command: 'node', args: ['server/src/index.js'] },
  { name: 'web', command: 'node', args: ['./node_modules/vite/bin/vite.js', '--host', '0.0.0.0'] },
];

let shuttingDown = false;

console.log('[dev:all] starting API and Vite...');

const children = commands.map(({ name, command, args }) => {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
    stdio: 'inherit',
    windowsHide: false,
  });

  console.log(`[dev:all] ${name} pid ${child.pid}`);

  child.on('error', (error) => {
    console.error(`[dev:all] ${name} failed: ${error.message}`);
    if (!shuttingDown) shutdown(1);
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.log(`[dev:all] ${name} exited with ${signal || code}`);
    shutdown(code || 0);
  });

  return child;
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

function shutdown(code) {
  shuttingDown = true;
  for (const child of children) {
    if (child.killed || !child.pid) continue;
    if (isWindows) {
      spawn('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else {
      child.kill('SIGTERM');
    }
  }
  setTimeout(() => process.exit(code), 150);
}
