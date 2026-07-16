import { execFile } from 'node:child_process';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(packageDir, '../..');
const runnerDir = path.join(repoRoot, 'packages/webflow-app-review-preflight/runner');
const contextDir = path.join(packageDir, 'context');
const serverOutDir = path.join(packageDir, '.build-server');
const runnerOutDir = path.join(runnerDir, 'dist-sandbox');

await rm(contextDir, { recursive: true, force: true });
await rm(serverOutDir, { recursive: true, force: true });
await mkdir(contextDir, { recursive: true });

await execFileAsync(
  'pnpm',
  [
    'exec',
    'tsup',
    'src/entry.ts',
    '--format',
    'esm',
    '--platform',
    'node',
    '--clean',
    '--out-dir',
    serverOutDir
  ],
  { cwd: packageDir }
);
await execFileAsync(
  'pnpm',
  [
    'exec',
    'tsup',
    'src/cli.ts',
    '--format',
    'esm',
    '--platform',
    'node',
    '--external',
    'playwright',
    '--clean',
    '--out-dir',
    runnerOutDir
  ],
  { cwd: runnerDir }
);

await copyFile(path.join(serverOutDir, 'entry.js'), path.join(contextDir, 'server.mjs'));
await copyFile(path.join(runnerOutDir, 'cli.js'), path.join(contextDir, 'runner.mjs'));
await rm(serverOutDir, { recursive: true, force: true });
