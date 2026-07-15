import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '../..');
const workerDir = resolve(repo, 'packages/webflow-app-review-preflight/worker');
const dist = resolve(root, 'dist');
const extensionId = 'eiogakldgljpbbmplgckjkoglfgabblm';
const extensionOrigin = `chrome-extension://${extensionId}`;
const workerPort = Number(process.env.COMPANION_WORKER_PORT ?? 8789);
const fixturePort = Number(process.env.COMPANION_FIXTURE_PORT ?? 4175);
const outputDir = resolve(process.env.COMPANION_EVIDENCE_OUTPUT ?? resolve(repo, '.codex/app-review-companion/evidence/browser'));
const persistDir = await mkdtemp(join(tmpdir(), 'companion-d1-'));
const profileDir = await mkdtemp(join(tmpdir(), 'companion-chrome-'));
const pnpmCli = resolve(dirname(process.execPath), '../lib/node_modules/corepack/dist/pnpm.js');
await mkdir(outputDir, { recursive: true });

const build = spawnSync(
  process.execPath,
  [pnpmCli, '--filter', '@create-something/webflow-app-review-companion', 'build'],
  {
    cwd: repo,
    encoding: 'utf8',
    env: {
      ...process.env,
      COMPANION_API_BASE: `http://127.0.0.1:${workerPort}`,
      COMPANION_BUILD_MODE: 'development'
    }
  }
);
if (build.status !== 0) throw new Error(`Companion build failed: ${build.error ?? ''}\n${build.stdout ?? ''}\n${build.stderr ?? ''}`);

const fixture = createServer((request, response) => {
  response.setHeader('cache-control', 'no-store');
  if (request.url === '/designer-app.js') {
    response.setHeader('content-type', 'text/javascript');
    response.end('window.designerFixtureReady = true;');
    return;
  }
  if (request.url === '/runtime.js') {
    response.setHeader('content-type', 'text/javascript');
    response.end('const n=document.createElement("div");n.id="consent-runtime";n.textContent="Runtime active";document.body.append(n);');
    return;
  }
  response.setHeader('content-type', 'text/html; charset=utf-8');
  if (request.url === '/published') {
    response.end('<!doctype html><title>Published test site</title><main><h1>Published site</h1><button id="cleanup">Remove runtime</button></main><script src="/runtime.js"></script><script>cleanup.onclick=()=>document.querySelector("#consent-runtime")?.remove()</script>');
    return;
  }
  response.end('<!doctype html><title>Designer fixture</title><main><h1>Webflow Designer test site</h1><div id="app-panel">App ready</div><button id="publish">Publish</button></main><script src="/designer-app.js"></script>');
});

await new Promise((resolveReady) => fixture.listen(fixturePort, '127.0.0.1', resolveReady));

const migrate = spawnSync(
  process.execPath,
  [pnpmCli, 'exec', 'wrangler', 'd1', 'migrations', 'apply', 'webflow-app-review-preflight', '--local', '--persist-to', persistDir, '--config', 'wrangler.jsonc'],
  { cwd: workerDir, encoding: 'utf8' }
);
if (migrate.status !== 0) throw new Error(`D1 migration failed: ${migrate.error ?? ''}\n${migrate.stdout ?? ''}\n${migrate.stderr ?? ''}`);

const worker = spawn(
  process.execPath,
  [
    pnpmCli, 'exec', 'wrangler', 'dev', '--config', 'wrangler.jsonc', '--port', String(workerPort),
    '--persist-to', persistDir,
    '--var', 'PREFLIGHT_DEV_TOKEN:test-token',
    '--var', 'PREFLIGHT_REVIEWER_DEV_TOKEN:reviewer-test-token',
    '--var', 'REVIEWER_USER_IDS:local-webflow-reviewer',
    '--var', `ALLOWED_ORIGINS:${extensionOrigin},http://localhost:${fixturePort}`
  ],
  { cwd: workerDir, stdio: ['ignore', 'pipe', 'pipe'] }
);
let workerLog = '';
worker.stdout.on('data', (chunk) => { workerLog += chunk; });
worker.stderr.on('data', (chunk) => { workerLog += chunk; });

async function waitForWorker() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      if ((await fetch(`http://127.0.0.1:${workerPort}/health`)).ok) return;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`Worker did not start:\n${workerLog}`);
}

async function api(path, init = {}) {
  const response = await fetch(`http://127.0.0.1:${workerPort}${path}`, {
    ...init,
    headers: {
      authorization: 'Bearer test-token',
      origin: extensionOrigin,
      ...init.headers
    }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(body)}`);
  return body;
}

async function extensionDigest() {
  const hash = createHash('sha256');
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else {
        hash.update(relative(dist, path));
        hash.update(await readFile(path));
      }
    }
  }
  await visit(dist);
  return hash.digest('hex');
}

let context;
try {
  await waitForWorker();
  const zip = new JSZip();
  zip.file('webflow.json', JSON.stringify({ name: 'Companion fixture', apiVersion: '2', publicDir: 'dist' }));
  zip.file('dist/index.js', 'document.createElement("script"); const runtime="http://localhost:4175/runtime.js";');
  const bundle = await zip.generateAsync({ type: 'uint8array' });
  const form = new FormData();
  form.set('bundle', new File([bundle], 'companion-fixture.zip', { type: 'application/zip' }));
  const created = await api('/v1/reviews', { method: 'POST', body: form });
  const review = created.review;

  context = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    channel: 'chromium',
    args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`]
  });
  await context.waitForEvent('serviceworker', { timeout: 15_000 }).catch(() => null);
  const fixturePage = await context.newPage();
  const designerUrl = `http://localhost:${fixturePort}/designer`;
  const publishedUrl = `http://localhost:${fixturePort}/published`;
  await fixturePage.goto(designerUrl);
  const pairing = await api(`/v1/reviews/${review.id}/companion-pairings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reviewVersionId: review.latestVersion.id })
  });
  const pairingResult = await fixturePage.evaluate(
    ({ targetExtensionId, code }) => new Promise((resolvePairing, rejectPairing) => {
      if (!globalThis.chrome?.runtime?.sendMessage) {
        rejectPairing(new Error('External Chrome messaging is unavailable.'));
        return;
      }
      chrome.runtime.sendMessage(
        targetExtensionId,
        { type: 'COMPANION_PAIR', code },
        (response) => {
          if (chrome.runtime.lastError) {
            rejectPairing(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolvePairing(response);
        }
      );
    }),
    { targetExtensionId: extensionId, code: pairing.pairing.code }
  );
  if (!pairingResult?.ok) throw new Error(pairingResult?.error ?? 'External pairing failed.');
  const panel = await context.newPage();
  await panel.goto(`${extensionOrigin}/sidepanel.html`);
  await panel.getByText('Complete runtime validation').waitFor();

  const missions = ['configure', 'publish', 'production_runtime', 'uninstall_cleanup'];
  for (const mission of missions) {
    const targetUrl = mission === 'production_runtime' || mission === 'uninstall_cleanup' ? publishedUrl : designerUrl;
    await fixturePage.goto(targetUrl);
    if (mission === 'uninstall_cleanup') await fixturePage.locator('#cleanup').click();
    const tabs = await panel.evaluate(() => chrome.tabs.query({}));
    const target = tabs.find((tab) => tab.url === targetUrl);
    if (!target?.id) throw new Error(`Fixture tab unavailable for ${mission}.`);
    const started = await panel.evaluate(
      ({ missionId, tabId }) => chrome.runtime.sendMessage({ type: 'COMPANION_START_MISSION', mission: missionId, targetTabId: tabId }),
      { missionId: mission, tabId: target.id }
    );
    if (!started.ok) throw new Error(started.error);
    await fixturePage.waitForTimeout(150);
    const screenshot = await fixturePage.screenshot({ type: 'png' });
    const localHarnessScreenshot = `data:image/png;base64,${screenshot.toString('base64')}`;
    const completed = await panel.evaluate(
      (capture) => chrome.runtime.sendMessage({ type: 'COMPANION_COMPLETE_MISSION', localHarnessScreenshot: capture }),
      localHarnessScreenshot
    );
    if (!completed.ok) throw new Error(completed.error);
    await panel.reload();
  }

  await panel.getByText('Validation complete').waitFor();
  await panel.screenshot({ path: join(outputDir, 'validated.png'), fullPage: true });
  const state = await panel.evaluate(() => chrome.runtime.sendMessage({ type: 'COMPANION_GET_STATE' }));
  if (state.state.run.status !== 'validated') throw new Error('Complete mission set did not validate.');
  if (JSON.stringify(state.state.run.missions.map((mission) => mission.id)) !== JSON.stringify(missions)) {
    throw new Error('Runtime-first policy did not expose the exact four scored missions.');
  }

  const blocked = await api(`/v1/reviews/${review.id}/companion-runs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reviewVersionId: review.latestVersion.id })
  });
  const finalized = await api(`/v1/companion-runs/${blocked.run.id}/complete`, { method: 'POST' });
  if (finalized.run.status !== 'blocked') throw new Error('Incomplete run did not fail closed.');

  await writeFile(join(outputDir, 'receipt.json'), `${JSON.stringify({
    reviewId: review.id,
    reviewVersionId: review.latestVersion.id,
    bundleSha256: review.latestVersion.result.artifact.sha256,
    run: state.state.run,
    blockedRun: finalized.run,
    extensionId,
    extensionSha256: await extensionDigest()
  }, null, 2)}\n`);
  console.log(JSON.stringify({ status: 'passed', runId: state.state.run.id, outputDir }, null, 2));
} finally {
  await context?.close();
  worker.kill('SIGTERM');
  fixture.close();
}
