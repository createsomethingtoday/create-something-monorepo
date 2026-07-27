import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClientWorkspacePackageV2 } from '@create-something/delivery-schema/client-workspace-package';

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
const revokedPrivateKeyPath = join(outputRoot, 'trust', 'local-revoked-private.pem');

const files = {};
const walk = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else files[`release/${relative(releaseRoot, path)}`] = readFileSync(path);
  }
};
walk(releaseRoot);
files['workspace/site/index.html'] = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="styles.css"><title>Northstar</title></head>
<body><nav>Northstar / Client delivery</nav><main class="hero"><p class="eyebrow">Verified local workspace</p><h1>Make the delivered system yours.</h1><p>Use your Codex. Keep every action visible.</p><button>Review the evidence</button></main></body></html>\n`;
files['workspace/site/styles.css'] =
  `:root{font-family:Arial,sans-serif;color:#111318;background:#f4f1ea}body{margin:0}nav{padding:24px;border-bottom:1px solid #c8c4bb}.hero{min-height:70vh;display:grid;align-content:center;gap:18px;padding:8vw}.eyebrow{color:#e54800;font:700 12px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.1em}h1{max-width:800px;margin:0;font-size:clamp(48px,9vw,110px);line-height:.9;letter-spacing:-.06em}p{max-width:540px;font-size:20px;line-height:1.5}button{width:max-content;padding:14px 20px;background:#111318;color:white;border:0}\n`;
files['workspace/delivery-policy.txt'] =
  'Protected delivery policy. Codex must not modify this sibling of the editable site root.\n';

const manifest = (overrides = {}) => ({
  packageId: 'northstar-client-delivery-v1',
  createdAt: '2026-07-27T18:20:00.000Z',
  expiresAt: '2027-07-27T18:20:00.000Z',
  issuer: 'CREATE SOMETHING',
  keyId: 'local-verifier',
  releaseVersion: '1.0.0',
  minimumAppVersion: '0.2.0',
  releaseManifestPath: 'release/build-release.json',
  workspace: {
    id: 'northstar-delivery',
    label: 'Northstar delivery',
    sourcePrefix: 'workspace',
    editableRoots: ['site'],
    preview: { kind: 'static', root: 'site', entry: 'index.html' }
  },
  ...overrides
});

const makePackage = ({
  overrides,
  workspaceFiles = {},
  privateKey = readFileSync(privateKeyPath)
} = {}) =>
  createClientWorkspacePackageV2({
    manifest: manifest(overrides),
    files: { ...files, ...workspaceFiles },
    privateKey
  });

const packageJson = makePackage();
mkdirSync(join(outputRoot, 'fixtures'), { recursive: true });
const validPath = join(outputRoot, 'fixtures', 'northstar.csworkspace');
writeFileSync(validPath, packageJson);
const tampered = JSON.parse(packageJson);
const entry = tampered.files.find((file) => file.path === 'workspace/site/index.html');
entry.contentBase64 = Buffer.from('<h1>Tampered package</h1>').toString('base64');
const tamperedPath = join(outputRoot, 'fixtures', 'northstar-tampered.csworkspace');
writeFileSync(tamperedPath, `${JSON.stringify(tampered)}\n`);

const fixtures = {
  'northstar-update.csworkspace': makePackage({
    overrides: { packageId: 'northstar-client-delivery-v2', releaseVersion: '2.0.0' },
    workspaceFiles: {
      'workspace/site/styles.css': `${files['workspace/site/styles.css'].trim()}\n.hero{border-top:4px solid #e54800}\n`,
      'workspace/site/release-proof.txt': 'Version two verified update.\n'
    }
  }),
  'northstar-conflict.csworkspace': makePackage({
    overrides: { packageId: 'northstar-client-delivery-v3', releaseVersion: '3.0.0' },
    workspaceFiles: {
      'workspace/site/index.html': '<!doctype html><h1>Upstream conflict</h1>\n'
    }
  }),
  'northstar-expired.csworkspace': makePackage({
    overrides: {
      packageId: 'northstar-client-delivery-expired',
      expiresAt: '2026-07-26T18:20:00.000Z'
    }
  }),
  'northstar-minimum-version.csworkspace': makePackage({
    overrides: {
      packageId: 'northstar-client-delivery-minimum-version',
      minimumAppVersion: '9.0.0'
    }
  }),
  'northstar-wrong-issuer.csworkspace': makePackage({
    overrides: { packageId: 'northstar-client-delivery-wrong-issuer', issuer: 'UNTRUSTED' }
  }),
  'northstar-revoked.csworkspace': makePackage({
    overrides: { packageId: 'northstar-client-delivery-revoked', keyId: 'local-revoked' },
    privateKey: readFileSync(revokedPrivateKeyPath)
  })
};
for (const [name, content] of Object.entries(fixtures)) {
  writeFileSync(join(outputRoot, 'fixtures', name), content);
}

console.log(`Valid fixture: ${validPath}`);
console.log(`Tampered fixture: ${tamperedPath}`);
for (const name of Object.keys(fixtures))
  console.log(`Fixture: ${join(outputRoot, 'fixtures', name)}`);
