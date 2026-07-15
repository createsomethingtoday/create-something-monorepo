import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { productionApiBase } from './production-config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const production = process.env.PREFLIGHT_BUILD_MODE === 'production';
const apiBase = (
  process.env.PREFLIGHT_API_BASE ?? (production ? productionApiBase : '')
).replace(/\/$/, '');

if (production && !apiBase.startsWith('https://')) {
  throw new Error('Production Designer Extension builds require an HTTPS PREFLIGHT_API_BASE.');
}

await build({
  entryPoints: [resolve(root, 'src/main.tsx')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  outfile: resolve(root, 'public/bundle.js'),
  define: {
    __PREFLIGHT_API_BASE__: JSON.stringify(apiBase)
  }
});
