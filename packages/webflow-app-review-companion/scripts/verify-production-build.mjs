import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { productionApiBase } from './production-config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const background = await readFile(resolve(root, 'dist/background.js'), 'utf8');
const manifest = JSON.parse(
  await readFile(resolve(root, 'dist/manifest.json'), 'utf8')
);
const productionOrigin = `${new URL(productionApiBase).origin}/*`;

if (!background.includes(productionApiBase)) {
  throw new Error(
    `Browser companion is missing the production API base: ${productionApiBase}`
  );
}
if (
  !Array.isArray(manifest.host_permissions) ||
  manifest.host_permissions.length !== 1 ||
  manifest.host_permissions[0] !== productionOrigin
) {
  throw new Error(
    `Browser companion host permissions must contain only ${productionOrigin}`
  );
}
