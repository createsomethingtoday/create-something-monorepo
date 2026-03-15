import { mkdir, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dist = resolve(root, 'dist');

await mkdir(dist, { recursive: true });

// Vite doesn't copy the extension manifest automatically. For "Load unpacked", point Chrome at `dist/`.
await copyFile(resolve(root, 'manifest.json'), resolve(dist, 'manifest.json'));
