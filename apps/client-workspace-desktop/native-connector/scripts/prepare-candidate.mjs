import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { get } from 'node:http';
import { createServer } from 'node:net';
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
  env: {
    ...process.env,
    CLIENT_WORKSPACE_RELEASE_MODE: 'production',
    CLIENT_WORKSPACE_CONNECTOR_RELEASE: '1'
  }
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

// The adapter-node build can pass inside the monorepo while a copied release
// fails to resolve an external dependency. Boot this exact candidate alone.
const probePort = await new Promise((resolvePort, reject) => {
  const server = createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close(() => resolvePort(address.port));
  });
});
const probeRoot = mkdtempSync(join(outputRoot, 'probe-'));
const capability = randomBytes(32).toString('hex');
const runtime = spawn(join(candidateRoot, 'resources', 'runtime', 'bun'), [
  join(candidateRoot, 'resources', 'server', 'scripts', 'dual-origin-server.mjs')
], {
  cwd: join(candidateRoot, 'resources', 'server'),
  stdio: 'ignore',
  env: {
    HOST: '127.0.0.1', PORT: String(probePort), NODE_ENV: 'production',
    CLIENT_WORKSPACE_DESKTOP: '1', CLIENT_WORKSPACE_REMOTE: '1',
    CLIENT_WORKSPACE_MANAGED_CONNECTOR: '1',
    CLIENT_WORKSPACE_LOOPBACK_ORIGIN: `http://127.0.0.1:${probePort}`,
    CLIENT_WORKSPACE_REMOTE_ORIGIN: 'https://synthetic.example.com',
    CLIENT_WORKSPACE_CAPABILITY_TOKEN: capability,
    CLIENT_WORKSPACE_ACCESS_TEAM_DOMAIN: 'https://synthetic.cloudflareaccess.com',
    CLIENT_WORKSPACE_ACCESS_AUD: 'a'.repeat(64),
    CLIENT_WORKSPACE_ACCESS_EMAIL: 'operator@example.com',
    CLIENT_WORKSPACE_STATE_ROOT: join(probeRoot, 'state'),
    CLIENT_WORKSPACE_MANAGED_ROOT: join(probeRoot, 'workspaces'),
    CLIENT_WORKSPACE_TRUST_KEYRING_FILE: join(candidateRoot, 'resources', 'trust', 'client-workspace-trust-keyring.json'),
    CLIENT_WORKSPACE_CODEX_COMMAND: '/usr/bin/false',
    HOME: probeRoot, PATH: '/usr/bin:/bin:/usr/sbin:/sbin'
  }
});
const probe = (host, path) => new Promise((resolveProbe, reject) => {
  const request = get({ hostname: '127.0.0.1', port: probePort, path, headers: { Host: host }, timeout: 1000 }, response => {
    response.resume();
    response.on('end', () => resolveProbe(response.statusCode));
  });
  request.on('error', reject);
  request.on('timeout', () => request.destroy(new Error('probe_timeout')));
});
try {
  const deadline = Date.now() + 5000;
  let ready = false;
  while (Date.now() < deadline) {
    if (runtime.exitCode !== null) throw new Error('Standalone candidate runtime exited during boot.');
    try {
      if (await probe('synthetic.example.com', '/') === 403) {
        ready = true;
        break;
      }
    } catch { /* The listener has not started yet. */ }
    await new Promise(resolveWait => setTimeout(resolveWait, 100));
  }
  if (!ready || await probe(`127.0.0.1:${probePort}`, `/?cap=${capability}`) !== 200) {
    throw new Error('Standalone candidate origin did not pass remote denial and local bootstrap.');
  }
} finally {
  if (runtime.exitCode === null && runtime.signalCode === null) {
    runtime.kill('SIGTERM');
    const shutdownDeadline = Date.now() + 2000;
    while (runtime.exitCode === null && runtime.signalCode === null && Date.now() < shutdownDeadline) {
      await new Promise(resolveWait => setTimeout(resolveWait, 50));
    }
    if (runtime.exitCode === null && runtime.signalCode === null) runtime.kill('SIGKILL');
  }
  rmSync(probeRoot, { recursive: true, force: true });
}
console.log(`Prepared unsigned connector candidate at ${candidateRoot}`);
