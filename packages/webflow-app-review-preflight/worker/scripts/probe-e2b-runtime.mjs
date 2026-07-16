import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const valueAfter = (flag) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const templateReceiptPath = valueAfter('--template-receipt');
const outputPath = valueAfter('--receipt');
if (!templateReceiptPath || !outputPath) {
  throw new Error('--template-receipt and --receipt are required.');
}
if (!process.env.E2B_API_KEY) throw new Error('E2B_API_KEY is required.');

const templateReceipt = JSON.parse(await readFile(templateReceiptPath, 'utf8'));
const templateRef = templateReceipt.immutableTemplateRef;
if (
  typeof templateRef !== 'string' ||
  !templateRef.endsWith(`:${templateReceipt.buildId}`)
) {
  throw new Error('The template receipt does not contain an immutable build reference.');
}

const bundle = await build({
  entryPoints: [path.join(packageDir, 'scripts/probe-worker.ts')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  write: false
});
const script = bundle.outputFiles[0]?.text;
if (!script) throw new Error('Failed to bundle the production E2B adapter.');

const observationJobId = randomUUID();
const capability = `probe-${randomUUID()}-${randomUUID()}`;
const mf = new Miniflare({
  modules: true,
  script,
  compatibilityDate: '2026-07-14',
  compatibilityFlags: ['nodejs_compat'],
  bindings: {
    E2B_API_KEY: process.env.E2B_API_KEY,
    E2B_RUNTIME_TEMPLATE_ID: templateRef,
    PROBE_OBSERVATION_JOB_ID: observationJobId,
    PROBE_CAPABILITY: capability
  }
});

let sandboxId;
let launchAccepted = false;
let readBackStatus;
let deleteStatus;
let terminatedStatus;
try {
  const launch = await mf.dispatchFetch('http://probe.internal/');
  if (!launch.ok) throw new Error(`workerd launch probe failed with ${launch.status}`);
  const body = await launch.json();
  if (typeof body.sandboxId !== 'string') {
    throw new Error('workerd launch probe did not return a sandbox identifier.');
  }
  sandboxId = body.sandboxId;
  launchAccepted = true;

  const readBack = await fetch(`https://api.e2b.app/sandboxes/${encodeURIComponent(sandboxId)}`, {
    headers: { 'x-api-key': process.env.E2B_API_KEY }
  });
  readBackStatus = readBack.status;
  if (!readBack.ok) throw new Error(`E2B sandbox read-back failed with ${readBack.status}`);

  const deletion = await fetch(`https://api.e2b.app/sandboxes/${encodeURIComponent(sandboxId)}`, {
    method: 'DELETE',
    headers: { 'x-api-key': process.env.E2B_API_KEY }
  });
  deleteStatus = deletion.status;
  if (!deletion.ok) throw new Error(`E2B sandbox termination failed with ${deletion.status}`);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const readAfterDelete = await fetch(
      `https://api.e2b.app/sandboxes/${encodeURIComponent(sandboxId)}`,
      { headers: { 'x-api-key': process.env.E2B_API_KEY } }
    );
    terminatedStatus = readAfterDelete.status;
    if (readAfterDelete.status === 404) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (terminatedStatus !== 404) {
    throw new Error(`E2B sandbox remained readable with ${terminatedStatus}`);
  }

  const receipt = {
    schema: 'app-review-runtime-workers-probe.v1',
    probedAt: new Date().toISOString(),
    workerRuntime: 'Miniflare 4 / workerd',
    adapter: 'worker/src/e2b-runtime-launcher.ts',
    immutableTemplateRef: templateRef,
    templateId: templateReceipt.templateId,
    buildId: templateReceipt.buildId,
    observationJobId,
    sandboxId,
    launchAccepted,
    readBackStatus,
    deleteStatus,
    terminatedStatus
  };
  const absoluteOutput = path.resolve(outputPath);
  await mkdir(path.dirname(absoluteOutput), { recursive: true });
  await writeFile(absoluteOutput, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
} finally {
  await mf.dispose();
  if (sandboxId && terminatedStatus !== 404) {
    await fetch(`https://api.e2b.app/sandboxes/${encodeURIComponent(sandboxId)}`, {
      method: 'DELETE',
      headers: { 'x-api-key': process.env.E2B_API_KEY }
    }).catch(() => undefined);
  }
}
