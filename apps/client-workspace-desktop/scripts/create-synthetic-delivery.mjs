import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClientWorkspacePackage } from '@create-something/delivery-schema/client-workspace-package';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(appRoot, '../..');
const outputRoot = join(repoRoot, 'output', 'client-workspace-desktop');
const releaseRoot = join(
  repoRoot,
  'config',
  'delivery',
  'build-releases',
  'example-non-production'
);
const privateKeyPath =
  process.env.CLIENT_WORKSPACE_SIGNING_PRIVATE_KEY_FILE ??
  join(outputRoot, 'trust', 'local-signing-private.pem');
if (!readFileSync(privateKeyPath))
  throw new Error('Run prepare:runtime before creating the fixture.');

const files = {};
const walk = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else files[`release/${relative(releaseRoot, path)}`] = readFileSync(path);
  }
};
walk(releaseRoot);
files['workspace/index.html'] = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="styles.css"><title>Northstar</title></head>
<body><nav>Northstar / Client delivery</nav><main class="hero"><p class="eyebrow">Verified local workspace</p><h1>Make the delivered system yours.</h1><p>Use your Codex. Keep every action visible.</p><button>Review the evidence</button></main></body></html>\n`;
files['workspace/styles.css'] =
  `:root{font-family:Arial,sans-serif;color:#111318;background:#f4f1ea}body{margin:0}nav{padding:24px;border-bottom:1px solid #c8c4bb}.hero{min-height:70vh;display:grid;align-content:center;gap:18px;padding:8vw}.eyebrow{color:#e54800;font:700 12px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.1em}h1{max-width:800px;margin:0;font-size:clamp(48px,9vw,110px);line-height:.9;letter-spacing:-.06em}p{max-width:540px;font-size:20px;line-height:1.5}button{width:max-content;padding:14px 20px;background:#111318;color:white;border:0}\n`;

const packageJson = createClientWorkspacePackage({
  manifest: {
    packageId: 'northstar-client-delivery-v1',
    createdAt: '2026-07-27T18:20:00.000Z',
    issuer: 'CREATE SOMETHING',
    keyId: 'local-verifier',
    releaseManifestPath: 'release/build-release.json',
    workspace: {
      id: 'northstar-delivery',
      label: 'Northstar delivery',
      sourcePrefix: 'workspace',
      editableRoots: ['.'],
      preview: { kind: 'static', root: '.', entry: 'index.html' }
    }
  },
  files,
  privateKey: readFileSync(privateKeyPath)
});
mkdirSync(join(outputRoot, 'fixtures'), { recursive: true });
const validPath = join(outputRoot, 'fixtures', 'northstar.csworkspace');
writeFileSync(validPath, packageJson);
const tampered = JSON.parse(packageJson);
const entry = tampered.files.find((file) => file.path === 'workspace/index.html');
entry.contentBase64 = Buffer.from('<h1>Tampered package</h1>').toString('base64');
const tamperedPath = join(outputRoot, 'fixtures', 'northstar-tampered.csworkspace');
writeFileSync(tamperedPath, `${JSON.stringify(tampered)}\n`);
console.log(`Valid fixture: ${validPath}`);
console.log(`Tampered fixture: ${tamperedPath}`);
