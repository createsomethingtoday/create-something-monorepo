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
const PACKAGE_JSON_REQUIRE_PATTERN =
  /const\s+([A-Za-z_$][\w$]*)\s*=\s*[A-Za-z_$][\w$]*\((["'])\.\.\/package\.json\2\);/;

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
const patchMatch = bundledSource.match(PACKAGE_JSON_REQUIRE_PATTERN);
if (!patchMatch) {
  throw new Error('Expected @notionhq/workers package.json require snippet was not found.');
}

const [, packageJsonBinding] = patchMatch;
const patchedSource = bundledSource.replace(
  PACKAGE_JSON_REQUIRE_PATTERN,
  `const ${packageJsonBinding} = { version: ${JSON.stringify(workersPackage.version)} };`
);

await writeFile(outputPath, patchedSource);
