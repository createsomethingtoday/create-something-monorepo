import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { compileWorkflowDefinition, parseWorkflowReplayManifest } from '../dist/index.js';

test('closed workflow records reject misspelled policy fields at the public boundary', async () => {
  const original = JSON.parse(
    await readFile(new URL('../fixtures/release-promotion/workflow.json', import.meta.url))
  );
  const paths = [
    [],
    ['owners'],
    ...[
      'systems',
      'objects',
      'events',
      'actors',
      'states',
      'actions',
      'transitions',
      'agents',
      'evaluations'
    ].map((k) => [k, 0]),
    ['actions', 0, 'approval'],
    ['actions', 0, 'receipt'],
    ['actions', 0, 'recovery'],
    ['actions', 0, 'tool'],
    ['actions', 0, 'tool', 'parameters', 0]
  ];
  for (const path of paths) {
    const workflow = structuredClone(original);
    let record = workflow;
    for (const key of path) record = record[key];
    record.requiredApprovals = ['operator'];
    const diagnosticPath =
      '$' +
      path.map((k) => (typeof k === 'number' ? '[' + k + ']' : '.' + k)).join('') +
      '.requiredApprovals';
    assert.throws(
      () => compileWorkflowDefinition(workflow),
      (error) =>
        error.diagnostics.some((d) => d.code === 'INVALID_VALUE' && d.path === diagnosticPath),
      diagnosticPath
    );
  }
});

test('replay envelopes and cases are closed while evidence remains extensible', async () => {
  const original = JSON.parse(
    await readFile(new URL('../fixtures/release-promotion/cases.json', import.meta.url))
  );
  for (const path of [[], ['cases', 0]]) {
    const manifest = structuredClone(original);
    let record = manifest;
    for (const key of path) record = record[key];
    record.approval = ['operator'];
    assert.throws(
      () => parseWorkflowReplayManifest(manifest),
      (error) =>
        error.diagnostics.some((d) => d.code === 'INVALID_VALUE' && d.path.endsWith('.approval'))
    );
  }
  original.cases[0].evidence.extension_receipt = 'source-owned-receipt';
  assert.equal(
    parseWorkflowReplayManifest(original).cases[0].evidence.extension_receipt,
    'source-owned-receipt'
  );
});

test('CLI rejects an ignored transition approval before publishing artifacts', async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'workflow-closed-input-'));
  try {
    const workflow = JSON.parse(
      await readFile(new URL('../fixtures/release-promotion/workflow.json', import.meta.url))
    );
    workflow.transitions[0].requiredApprovals = ['operator'];
    const file = join(scratch, 'workflow.json');
    await writeFile(file, JSON.stringify(workflow));
    const result = spawnSync(process.execPath, ['dist/cli.js', 'validate', '--workflow', file], {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8'
    });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /\$\.transitions\[0\]\.requiredApprovals/);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
