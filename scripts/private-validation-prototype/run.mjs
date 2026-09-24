import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { POLICY, validateImage, containerArgs, assertIsolation, classify } from './policy.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const sha256 = value => createHash('sha256').update(value).digest('hex');
export const FIXTURES = Object.freeze([
  { name: 'isolation', expectedOutput: 'isolation:passed' },
  { name: 'network', expectedOutput: 'network:blocked' },
  { name: 'scratch', expectedOutput: 'scratch:bounded' },
  { name: 'pids', expectedOutput: 'pids:bounded' },
  { name: 'mcp', expectedOutput: 'mcp-fixture:passed' },
  { name: 'timeout', expect: 'timeout' },
  { name: 'memory', expect: 'oom' },
  { name: 'output', expect: 'output-limit' },
  // Same fixture in a new container: no marker from the first run may persist.
  { name: 'isolation', expectedOutput: 'isolation:passed' },
]);

// Only arguments assembled by this module; never a shell or uploaded command.
export function command(args, { input = '', timeoutMs = 15000, maxBytes = POLICY.outputBytes } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks = [];
    let count = 0, overflow = false, timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
    const collect = chunk => {
      const remaining = Math.max(0, maxBytes - count);
      if (remaining) chunks.push(chunk.subarray(0, remaining));
      count += chunk.length;
      if (count > maxBytes) { overflow = true; child.kill('SIGKILL'); }
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.stdin.on('error', () => {}); // Early exit can close stdin before source is consumed.
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', exitCode => {
      clearTimeout(timer);
      resolve({ exitCode, output: Buffer.concat(chunks).toString('utf8'), overflow, timedOut });
    });
    child.stdin.end(input);
  });
}

async function checked(args, options) {
  const result = await command(args, options);
  if (result.exitCode !== 0 || result.overflow || result.timedOut) {
    throw new Error(`Docker ${args[0]} failed: ${result.output.slice(0, 1000)}`);
  }
  return result.output.trim();
}

async function fixtureRun(image, fixture) {
  const source = await readFile(path.join(here, 'fixtures', `${fixture.name}.mjs`));
  if (source.length > POLICY.fixtureBytes) throw new Error('Fixture exceeds input cap');
  const name = `private-validator-${randomUUID()}`;
  const startedAt = new Date().toISOString();
  let result = { exitCode: null, output: '', timedOut: false, overflow: false };
  let config, state, cleanup = false, error;
  try {
    await checked(containerArgs(image, name));
    config = JSON.parse(await checked(['inspect', name]))[0];
    assertIsolation(config);
    result = await command(['start', '--attach', '--interactive', name], {
      input: source, timeoutMs: POLICY.watchdogSeconds * 1000,
    });
    state = JSON.parse(await checked(['inspect', name]))[0].State;
  } catch (e) { error = e.message; }
  finally {
    // Terminate the container as well as the local Docker client, including overflow/timeout paths.
    await command(['rm', '--force', name]);
    try {
      cleanup = (await checked(['ps', '--all', '--filter', `name=^/${name}$`, '--format', '{{.Names}}'])) === '';
    } catch (e) { error = `Cleanup could not be verified: ${e.message}`; }
  }
  const receipt = {
    fixture: fixture.name, fixtureSha256: sha256(source), container: name,
    startedAt, endedAt: new Date().toISOString(),
    status: error ? 'error' : classify({ ...result, cleanup, oomKilled: state?.OOMKilled }, fixture),
    exitCode: result.exitCode, output: result.output,
    overflow: result.overflow, watchdogExpired: result.timedOut,
    oomKilled: state?.OOMKilled ?? false, cleanupVerified: cleanup,
    observedLimits: config ? {
      memoryBytes: config.HostConfig.Memory, nanoCpus: config.HostConfig.NanoCpus,
      pids: config.HostConfig.PidsLimit, network: config.HostConfig.NetworkMode,
      readonlyRoot: config.HostConfig.ReadonlyRootfs, user: config.Config.User,
    } : null,
    ...(error ? { error } : {}),
  };
  // Avoid retaining adversarial noise while proving that the capture limit fired.
  if (result.overflow) receipt.output = `[capture capped at ${POLICY.outputBytes} bytes]`;
  return receipt;
}

export async function runSuite(image, outputPath, profile = 'node') {
  validateImage(image);
  if (!['node', 'codex'].includes(profile)) throw new Error('Unknown profile');
  const lock = path.join(os.tmpdir(), 'private-validation-prototype.lock');
  await mkdir(lock); // A stale lock needs operator reconciliation; never silently steal it.
  const report = {
    schema: 'private-validation-evidence/v1', policy: POLICY,
    startedAt: new Date().toISOString(), image, profile,
    authority: 'prototype-evidence-only', customerPackagesAccepted: false,
    modelCalls: 0, paidPublicationAllowed: false,
    receipts: [],
  };
  const start = Date.now();
  try {
    report.sourceSha256 = Object.fromEntries(await Promise.all(['run.mjs', 'policy.mjs'].map(async file =>
      [file, sha256(await readFile(path.join(here, file)))])));
    report.dockerVersion = await checked(['version', '--format', '{{.Server.Version}}']);
    const info = JSON.parse(await checked(['image', 'inspect', image]))[0];
    report.imageId = info.Id;
    report.platform = `${info.Os}/${info.Architecture}`;
    if (info.Os !== 'linux') throw new Error('Linux image required');
    // Runtime identity uses the same constrained runner as the actual tests.
    const runtime = { name: 'runtime', expectedOutput: '' };
    const runtimeReceipt = await fixtureRun(image, runtime);
    report.receipts.push(runtimeReceipt);
    let version;
    try { version = JSON.parse(runtimeReceipt.output); } catch {}
    if (runtimeReceipt.exitCode !== 0 || !runtimeReceipt.cleanupVerified
      || runtimeReceipt.watchdogExpired || runtimeReceipt.overflow
      || !version || version.node.split('.')[0] !== String(POLICY.nodeMajor)) {
      throw new Error('Runtime identity probe failed');
    }
    runtimeReceipt.status = 'passed';
    report.runtime = version;
    if (profile === 'codex') report.codexVersionUnderTest = '0.155.1';
    const fixtures = profile === 'codex'
      ? [...FIXTURES, { name: 'codex', expectedOutput: 'codex-plugin-lifecycle:passed' }]
      : FIXTURES;
    for (const fixture of fixtures) {
      if (report.receipts.length >= POLICY.maxRuns || Date.now() - start >= POLICY.suiteSeconds * 1000) {
        throw new Error('Suite budget exhausted');
      }
      const receipt = await fixtureRun(image, fixture);
      report.receipts.push(receipt);
      await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n');
      console.log(`${fixture.name}: ${receipt.status}; cleanup=${receipt.cleanupVerified}`);
      if (!receipt.cleanupVerified) throw new Error('Stop: cleanup failed');
    }
    report.passed = report.receipts.every(r => r.status === 'passed');
  } catch (error) { report.passed = false; report.error = error.message; }
  finally {
    report.endedAt = new Date().toISOString();
    report.elapsedMs = Date.now() - start;
    try { await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n'); }
    finally { await rm(lock, { recursive: true }); }
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [image, outputPath, profile = 'node'] = process.argv.slice(2);
  if (!image || !outputPath || process.argv.length > 5) {
    throw new Error('Usage: node run.mjs IMAGE_DIGEST /absolute/evidence.json [node|codex]');
  }
  const result = await runSuite(image, path.resolve(outputPath), profile);
  if (!result.passed) { console.error(result.error ?? 'Fixture checks failed'); process.exitCode = 1; }
}
