import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const connectorRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const desktopRoot = resolve(connectorRoot, '..');
const repoRoot = resolve(desktopRoot, '../..');
if (!process.env.CLIENT_WORKSPACE_TRUST_KEYRING_FILE || !process.env.CLIENT_WORKSPACE_CLOUDFLARED_PATH) {
  throw new Error('Candidate preparation requires a reviewed public trust keyring and pinned cloudflared path.');
}

execFileSync('pnpm', ['--filter', '@create-something/client-workspace-desktop', 'prepare:runtime'], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: { ...process.env, CLIENT_WORKSPACE_RELEASE_MODE: 'production' }
});
execFileSync('cargo', ['build', '--locked', '--release', '--manifest-path', join(connectorRoot, 'Cargo.toml')], {
  cwd: repoRoot,
  stdio: 'inherit'
});

const outputRoot = join(repoRoot, 'output', 'client-workspace-connector');
mkdirSync(outputRoot, { recursive: true });
const candidateRoot = mkdtempSync(join(outputRoot, 'candidate-'));
cpSync(join(desktopRoot, 'src-tauri', 'resources'), join(candidateRoot, 'resources'), { recursive: true });
const binary = join(candidateRoot, 'client-workspace-connector');
cpSync(join(connectorRoot, 'target', 'release', 'client-workspace-connector'), binary);
chmodSync(binary, 0o755);

const files = [];
function inventory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) inventory(path);
    else if (entry.isFile()) {
      files.push({
        path: relative(candidateRoot, path),
        size: statSync(path).size,
        sha256: createHash('sha256').update(readFileSync(path)).digest('hex')
      });
    } else {
      throw new Error('Candidate contains an unsupported filesystem entry.');
    }
  }
}
inventory(candidateRoot);
writeFileSync(join(candidateRoot, 'candidate-manifest.json'), `${JSON.stringify({
  schema: 'create-something/client-workspace-connector-candidate@1',
  signed: false,
  files
}, null, 2)}\n`, { mode: 0o644 });
console.log(`Prepared unsigned connector candidate at ${candidateRoot}`);
