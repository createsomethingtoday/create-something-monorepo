import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { productionApiBase } from './production-config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = process.env.COMPANION_OUTDIR
  ? resolve(process.env.COMPANION_OUTDIR)
  : resolve(root, 'dist');
const production = process.env.COMPANION_BUILD_MODE === 'production';
const apiBaseUrl = (
  process.env.COMPANION_API_BASE ??
  (production ? productionApiBase : 'http://127.0.0.1:8789')
).replace(/\/$/, '');
if (production && !apiBaseUrl.startsWith('https://')) {
  throw new Error('Production browser companion builds require an HTTPS API base.');
}
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await build({
  entryPoints: {
    background: resolve(root, 'src/background.ts'),
    content: resolve(root, 'src/content.ts'),
    sidepanel: resolve(root, 'src/sidepanel.ts')
  },
  outdir: dist,
  bundle: true,
  format: 'esm',
  target: 'chrome120',
  sourcemap: production ? false : true,
  minify: false,
  minifySyntax: production,
  define: {
    __COMPANION_API_BASE__: JSON.stringify(apiBaseUrl),
    __COMPANION_LOCAL_PAIRING__: production ? 'false' : 'true'
  }
});
await cp(resolve(root, 'public'), dist, { recursive: true });
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
if (production) {
  const apiOrigin = `${new URL(apiBaseUrl).origin}/*`;
  manifest.host_permissions = [apiOrigin];
  manifest.externally_connectable = {
    matches: ['https://*.webflow-ext.com/*']
  };
}
await writeFile(resolve(dist, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
