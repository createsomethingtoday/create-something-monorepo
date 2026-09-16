#!/usr/bin/env node
// Render a saved Draw project with the existing Motion Studio Remotion runtime.
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw new Error('Usage: node scripts/render-animation.mjs <project.draw.json> <output.mp4>');
const project = JSON.parse(await readFile(input, 'utf8'));
if (project.version !== 'draw.animation.v1') throw new Error('Expected a Draw animation project.');
const temp = await mkdtemp(resolve(tmpdir(), 'draw-render-')),
  props = resolve(temp, 'props.json');
await writeFile(props, JSON.stringify({ project }));
const studio = resolve(dirname(fileURLToPath(import.meta.url)), '../../motion-studio');
try {
  await new Promise((resolveDone, reject) => {
    const child = spawn(
      'pnpm',
      [
        'exec',
        'remotion',
        'render',
        'scripts/draw-animation.tsx',
        'DrawAnimation',
        resolve(output),
        '--props',
        props,
        '--concurrency',
        '2'
      ],
      { cwd: studio, stdio: 'inherit' }
    );
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolveDone() : reject(new Error(`Remotion exited ${code}`))
    );
  });
} finally {
  await rm(temp, { recursive: true, force: true });
}
