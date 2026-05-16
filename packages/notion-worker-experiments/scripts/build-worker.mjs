import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, '..');
const outputPath = resolve(packageRoot, 'dist/index.js');
const require = createRequire(import.meta.url);
const workersEntry = require.resolve('@notionhq/workers');
const workersPackagePath = resolve(dirname(workersEntry), '../package.json');
const workersPackage = JSON.parse(await readFile(workersPackagePath, 'utf8'));

await build({
  bundle: true,
  entryPoints: [resolve(packageRoot, 'src/index.ts')],
  format: 'esm',
  logLevel: 'info',
  outfile: outputPath,
  platform: 'node',
  sourcemap: true,
  target: 'node22'
});

const bundledSource = await readFile(outputPath, 'utf8');
const sdkVersionRequire = 'const packageJson = require2("../package.json");';
const patchedSource = bundledSource.replace(
  sdkVersionRequire,
  `const packageJson = { version: ${JSON.stringify(workersPackage.version)} };`
);

if (patchedSource === bundledSource) {
  throw new Error('Expected @notionhq/workers SDK version require snippet was not found.');
}

await writeFile(outputPath, patchedSource);
