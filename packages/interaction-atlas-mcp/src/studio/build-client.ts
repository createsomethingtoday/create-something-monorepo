import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const studioDistDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(studioDistDir, '../..');
const outdir = path.join(packageRoot, 'dist/studio/client');

await mkdir(outdir, { recursive: true });

await build({
  assetNames: 'assets/[name]',
  bundle: true,
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  entryNames: 'app',
  entryPoints: [path.join(packageRoot, 'src/studio/client/App.tsx')],
  format: 'esm',
  jsx: 'automatic',
  logLevel: 'info',
  metafile: false,
  minify: true,
  outdir,
  platform: 'browser',
  sourcemap: true
});
