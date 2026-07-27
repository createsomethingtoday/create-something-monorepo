import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSync } from 'esbuild';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(appRoot, '../..');
const resourcesRoot = join(appRoot, 'src-tauri', 'resources');
const serverRoot = join(resourcesRoot, 'server');
const interactionRoot = join(resourcesRoot, 'interactions', 'marketplace');

execFileSync('pnpm', ['--filter', '@create-something/interaction-atlas-mcp', 'build'], {
  cwd: repoRoot,
  stdio: 'inherit',
});

rmSync(resourcesRoot, { recursive: true, force: true });
mkdirSync(join(resourcesRoot, 'runtime'), { recursive: true });
mkdirSync(join(serverRoot, 'client'), { recursive: true });
mkdirSync(interactionRoot, { recursive: true });

buildSync({
  entryPoints: [
    join(repoRoot, 'packages', 'interaction-atlas-mcp', 'dist', 'studio', 'cli.js'),
  ],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2022',
  sourcemap: false,
  legalComments: 'none',
  outfile: join(serverRoot, 'cli.js'),
});

const clientRoot = join(
  repoRoot,
  'packages',
  'interaction-atlas-mcp',
  'dist',
  'studio',
  'client',
);
for (const filename of ['app.js', 'app.css']) {
  cpSync(join(clientRoot, filename), join(serverRoot, 'client', filename));
}

execFileSync(
  process.execPath,
  [
    join(repoRoot, 'packages', 'workflow-compiler', 'dist', 'cli.js'),
    'compile',
    '--workflow',
    join(repoRoot, 'packages', 'workflow-compiler', 'fixtures', 'marketplace', 'workflow.json'),
    '--cases',
    join(repoRoot, 'packages', 'workflow-compiler', 'fixtures', 'marketplace', 'cases.json'),
    '--out',
    interactionRoot,
  ],
  { cwd: repoRoot, stdio: 'inherit' },
);

const bunPath =
  process.env.ATLAS_STUDIO_BUN_PATH ??
  (process.env.HOME ? join(process.env.HOME, '.bun', 'bin', 'bun') : '');
if (!bunPath || !existsSync(bunPath)) {
  throw new Error('Atlas runtime preparation requires Bun. Set ATLAS_STUDIO_BUN_PATH.');
}
const bundledBun = join(resourcesRoot, 'runtime', 'bun');
cpSync(bunPath, bundledBun);
chmodSync(bundledBun, 0o755);

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function listFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(path));
    else files.push(path);
  }
  return files;
}

const files = listFiles(resourcesRoot)
  .filter((path) => !path.endsWith(`${sep}runtime-build.json`))
  .map((path) => {
    const content = readFileSync(path);
    return {
      path: relative(resourcesRoot, path).split(sep).join('/'),
      sha256: sha256(content),
      bytes: statSync(path).size,
    };
  })
  .sort((left, right) => left.path.localeCompare(right.path));

writeFileSync(
  join(resourcesRoot, 'runtime-build.json'),
  `${JSON.stringify(
    {
      schema: 'create-something/atlas-studio-runtime@1',
      platform: process.platform,
      architecture: process.arch,
      language: 'create-something/control',
      runtimeVersion: '0.1.0',
      serverEntry: 'server/cli.js',
      interactionEntry: 'interactions/marketplace/governed-interaction.json',
      files,
    },
    null,
    2,
  )}\n`,
);

console.log(`Prepared self-contained Atlas Studio runtime (${files.length} files).`);
