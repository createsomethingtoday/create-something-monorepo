#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

const scratch = await mkdtemp(join(tmpdir(), 'workflow-compiler-consumer-'));
const artifacts = join(scratch, 'artifacts');
const consumer = join(scratch, 'consumer');
const output = join(scratch, 'compiled-release');

try {
  await mkdir(artifacts, { recursive: true });
  const packed = run(
    'npm',
    ['pack', '--ignore-scripts', '--json', '--pack-destination', artifacts],
    { cwd: packageRoot }
  );
  const packReport = JSON.parse(packed.stdout);
  const tarball = join(artifacts, packReport[0].filename);
  run('npm', [
    'install',
    '--prefix',
    consumer,
    '--ignore-scripts',
    '--no-package-lock',
    '--no-save',
    tarball
  ]);

  const installedRoot = join(consumer, 'node_modules', '@create-something', 'workflow-compiler');
  const workflowPath = join(installedRoot, 'fixtures', 'release-promotion', 'workflow.json');
  const casesPath = join(installedRoot, 'fixtures', 'release-promotion', 'cases.json');
  run(join(consumer, 'node_modules', '.bin', 'workflow-compiler'), [
    'compile',
    '--workflow',
    workflowPath,
    '--cases',
    casesPath,
    '--out',
    output
  ]);

  const consumerCheck = join(consumer, 'consumer-check.mjs');
  await writeFile(
    consumerCheck,
    `import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  compileWorkflowDefinition,
  createMcpToolCallPlan,
  verifyWorkflowArtifactBundle
} from '@create-something/workflow-compiler';

const workflow = JSON.parse(await readFile(${JSON.stringify(workflowPath)}, 'utf8'));
const cases = JSON.parse(await readFile(${JSON.stringify(casesPath)}, 'utf8'));
const bundle = compileWorkflowDefinition(workflow);
const plan = createMcpToolCallPlan(bundle, cases.cases[0]);
assert.equal(plan.disposition, 'pass');
assert.equal(plan.invocation?.tool.name, 'release_verify');
const receipt = await verifyWorkflowArtifactBundle(${JSON.stringify(output)});
assert.equal(receipt.status, 'integrity_verified');
assert.equal(receipt.fileCount, 18);
process.stdout.write(JSON.stringify({ artifacts: receipt.fileCount, adapterDisposition: plan.disposition }));
`,
    'utf8'
  );
  const proof = JSON.parse(run(process.execPath, [consumerCheck], { cwd: consumer }).stdout);

  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      node: process.version,
      package: packReport[0].name,
      version: packReport[0].version,
      files: packReport[0].files.length,
      artifacts: proof.artifacts,
      adapterDisposition: proof.adapterDisposition
    })}\n`
  );
} finally {
  await rm(scratch, { recursive: true, force: true });
}
