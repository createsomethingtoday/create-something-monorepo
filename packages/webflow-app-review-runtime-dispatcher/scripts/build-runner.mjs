import { execFile } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(packageDir, '../..');
const runnerDir = path.join(repoRoot, 'packages/webflow-app-review-preflight/runner');
const generatedDir = path.join(packageDir, 'src/generated');

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
    'dist-sandbox'
  ],
  { cwd: runnerDir }
);
await mkdir(generatedDir, { recursive: true });
await copyFile(
  path.join(runnerDir, 'dist-sandbox/cli.js'),
  path.join(generatedDir, 'runtime-runner.txt')
);
