import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { productionApiBase } from './production-config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = await readFile(resolve(root, 'public/bundle.js'), 'utf8');

if (!bundle.includes(productionApiBase)) {
  throw new Error(
    `Designer Extension bundle is missing the production API base: ${productionApiBase}`
  );
}
