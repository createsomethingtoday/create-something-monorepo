import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const [url, outputPath, expectedImage] = process.argv.slice(2);
if (!url || !outputPath || !/^https:\/\/private-validation-preview\.[a-z0-9-]+\.workers\.dev$/.test(url)) {
  throw new Error('Supply the exact deployed preview workers.dev URL and evidence path');
}
if (!/^sha256:[a-f0-9]{64}$/.test(expectedImage ?? '')) throw new Error('Supply the expected immutable image digest as the third argument');
const key = execFileSync('infisical', ['secrets', 'get', 'CLOUDFLARE_WORKERS_API_TOKEN', '--env=prod', '--plain', '--projectId=e1532079-2f2b-46b5-8972-cf7a025eb803'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 }).trim();
const providerResponse = await fetch('https://api.cloudflare.com/client/v4/accounts/9645bd52e640b8a4f40a3a55ff1dd75a/containers/applications/a03a0de4-bc04-4f6b-a183-32287814648f', { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
const provider = await providerResponse.json();
assert.equal(providerResponse.status, 200);
assert.equal(provider.result?.configuration?.image?.split('@')[1], expectedImage, 'Provider rollout must match the intended image before spending runs');
const token = (await readFile(path.join(here, '.operator/token'), 'utf8')).trim();
const report = { schema: 'private-cloudflare-acceptance/v1', url, startedAt: new Date().toISOString(),
  expectedImage, providerImage: provider.result.configuration.image, checks: [], observed: [], cloudflareBillingVerified: false, customerPackagesAccepted: false };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
report.sourceSha256 = Object.fromEntries(await Promise.all(['worker.mjs', 'policy.mjs', 'probe.mjs', 'wrangler.jsonc', 'Dockerfile'].map(async f =>
  [f, sha(await readFile(path.join(here, f)))])));
const save = () => writeFile(outputPath, JSON.stringify(report, null, 2) + '\n');
async function call(route, { body, authenticated = true } = {}) {
  const response = await fetch(url + route, {
    method: body ? 'POST' : 'GET', headers: { ...(authenticated ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', signal: AbortSignal.timeout(15000),
  });
  return { status: response.status, body: await response.json() };
}
function check(name, actual, expected) {
  const passed = actual === expected;
  report.checks.push({ name, actual, expected, passed });
  if (!passed && !name.startsWith('probe exit')) assert.equal(actual, expected, name);
}
try {
  check('anonymous denied', (await call('/status', { authenticated: false })).status, 401);
  check('unknown caller authority denied', (await call('/run', { body: { id: 'run-invalid', mode: 'normal', tenant: 'other' } })).status, 400);
  const modes = ['normal', 'abandon', 'cleanup-fault', 'normal'];
  for (let i = 0; i < modes.length; i++) {
    const body = { id: `run-acceptance-${i}`, mode: modes[i] };
    const started = await call('/run', { body });
    // A rerun reads the original durable job; it never creates another charged attempt.
    check(`admit ${i}`, [200, 202].includes(started.status), true);
    check(`duplicate ${i}`, (await call('/run', { body })).body.duplicate, true);
    check(`conflicting duplicate ${i}`, (await call('/run', { body: { ...body, mode: modes[i] === 'normal' ? 'abandon' : 'normal' } })).status, 409);
    let state;
    const deadline = Date.now() + 110000;
    do {
      state = (await call('/status')).body;
      if (!state.active) break;
      await new Promise(resolve => setTimeout(resolve, 2000));
    } while (Date.now() < deadline);
    report.observed.push(state.runs[body.id]);
    await save();
    check(`cleanup ${i}`, state.runs[body.id]?.status, 'cleaned');
    check(`no active reservation ${i}`, state.active, null);
    if (modes[i] !== 'normal') check(`independent reaper ${i}`, state.runs[body.id].cleanupReason, 'deadline-reaper');
    if (modes[i] === 'normal') check(`probe exit ${i}`, state.runs[body.id].execution?.exitCode, 0);
  }
  check('non-renewing experiment budget', (await call('/run', { body: { id: 'run-fifth', mode: 'normal' } })).status, 429);
  report.controlChecksPassed = report.checks.every(check => check.passed);
  if (!report.controlChecksPassed) process.exitCode = 1;
  // Preserve raw provider observations. Timeouts/DNS responses are not silently labeled isolation passes.
  report.networkQualification = 'requires-review-of-recorded-probes';
} catch (error) { report.controlChecksPassed = false; report.error = error.message; process.exitCode = 1; }
finally { report.endedAt = new Date().toISOString(); await save(); }
