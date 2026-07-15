import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const apiBaseUrl = (process.env.COMPANION_API_BASE ?? 'http://127.0.0.1:8789').replace(/\/$/, '');
const production = process.env.COMPANION_BUILD_MODE === 'production';
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
