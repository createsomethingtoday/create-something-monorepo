import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileWorkflowDefinition } from '../../workflow-compiler/dist/index.js';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageRoot, '../..');
const baselinePath = join(repoRoot, 'packages/workflow-compiler/fixtures/marketplace/workflow.json');
const reportPath = join(
  repoRoot,
  'specs/webflow-marketplace/delivery/template-review-hub/balanced-50-multimodal-calibration-2026-05-27.md',
);
const policyPath = join(packageRoot, 'fixtures/marketplace/reconciliation-policy.json');
const extractorCli = join(repoRoot, 'packages/workflow-evidence-extractor/dist/cli.js');
const stableOutput = resolve(
  process.env.WORKFLOW_OBSERVATION_ACCEPTANCE_OUT ??
    join(tmpdir(), 'cre-1193-workflow-observation-reconciler-acceptance'),
);

function runCli(script, args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: packageRoot,
    encoding: 'utf8',
  });
  assert.equal(result.status, expectedStatus, result.stderr || result.stdout);
  return result;
}

function reconcile(outDir) {
  return runCli('dist/cli.js', [
    'reconcile',
    '--baseline',
    baselinePath,
    '--report',
    reportPath,
    '--policy',
    policyPath,
    '--out',
    outDir,
  ]);
}

function apply(proposalPath, approvalPath, outDir, expectedStatus = 0) {
  return runCli(
    extractorCli,
    [
      'apply',
      '--baseline',
      baselinePath,
      '--proposal',
      proposalPath,
      '--approval',
      approvalPath,
      '--out',
      outDir,
    ],
    expectedStatus,
  );
}

async function filesUnder(root, prefix = '') {
  const entries = await readdir(join(root, prefix), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(root, relative)));
    else files.push(relative);
  }
  return files.sort((left, right) => left.localeCompare(right));
}

async function assertDirectoriesEqual(first, second) {
  const files = await filesUnder(first);
  assert.deepEqual(files, await filesUnder(second));
  for (const file of files) {
    assert.equal(
      await readFile(join(first, file), 'utf8'),
      await readFile(join(second, file), 'utf8'),
      `${file} was not deterministic`,
    );
  }
}

const baselineBefore = await readFile(baselinePath, 'utf8');
const reportBefore = await readFile(reportPath, 'utf8');
const scratch = await mkdtemp(join(tmpdir(), 'workflow-observation-acceptance-'));
const firstDir = join(scratch, 'first');
const secondDir = join(scratch, 'second');
const firstApplicationDir = join(scratch, 'first-application');
const secondApplicationDir = join(scratch, 'second-application');

try {
  reconcile(firstDir);
  reconcile(secondDir);
  await assertDirectoriesEqual(firstDir, secondDir);

  const reconciliation = JSON.parse(await readFile(join(firstDir, 'reconciliation.json'), 'utf8'));
  const proposal = reconciliation.proposal;
  assert.equal(reconciliation.observations.length, 9);
  assert.equal(reconciliation.alignments.length, 2);
  assert.equal(reconciliation.discrepancies.length, 2);
  assert.equal(reconciliation.limitations.length, 1);
  assert.equal(proposal.operations.length, 2);
  assert.equal(proposal.conflicts.length, 1);

  const template = JSON.parse(
    await readFile(join(firstDir, 'proposal/approval-template.json'), 'utf8'),
  );
  const blankApprovalPath = join(scratch, 'blank-approval.json');
  await writeFile(blankApprovalPath, `${JSON.stringify(template.approvalManifest, null, 2)}\n`);
  const blocked = apply(
    join(firstDir, 'proposal/proposal.json'),
    blankApprovalPath,
    join(scratch, 'blocked'),
    2,
  );
  const blockedOutput = JSON.parse(blocked.stderr);
  assert.deepEqual(blockedOutput.diagnostics.map(({ code }) => code), [
    'UNREVIEWED_OPERATIONS',
    'UNACKNOWLEDGED_CONFLICTS',
  ]);

  const approval = {
    schemaVersion: 'workflow_proposal_approval.v0.1',
    baselineHash: proposal.baselineHash,
    proposalHash: proposal.proposalHash,
    approvedOperationIds: proposal.operations.map(({ id }) => id),
    rejectedOperationIds: [],
    acknowledgedConflictIds: proposal.conflicts.map(({ id }) => id),
    operator: 'cre-1193-acceptance-operator',
    approvedAt: '2026-07-10T00:00:00.000Z',
  };
  const firstApprovalPath = join(scratch, 'first-approval.json');
  const secondApprovalPath = join(scratch, 'second-approval.json');
  const approvalContent = `${JSON.stringify(approval, null, 2)}\n`;
  await writeFile(firstApprovalPath, approvalContent);
  await writeFile(secondApprovalPath, approvalContent);
  apply(join(firstDir, 'proposal/proposal.json'), firstApprovalPath, firstApplicationDir);
  apply(join(secondDir, 'proposal/proposal.json'), secondApprovalPath, secondApplicationDir);
  await assertDirectoriesEqual(firstApplicationDir, secondApplicationDir);

  const application = JSON.parse(
    await readFile(join(firstApplicationDir, 'application.json'), 'utf8'),
  );
  const compiled = compileWorkflowDefinition(application.definition);
  assert.deepEqual(application.compilerProof, {
    definitionHash: compiled.definitionHash,
    compilerVersion: compiled.compilerVersion,
  });
  assert.equal(application.appliedOperationIds.length, 2);
  assert.equal(await readFile(baselinePath, 'utf8'), baselineBefore);
  assert.equal(await readFile(reportPath, 'utf8'), reportBefore);

  const summary = {
    schemaVersion: 'workflow_observation_acceptance_summary.v0.1',
    ok: true,
    deterministic: true,
    baselineUnchanged: true,
    reportUnchanged: true,
    observationCount: reconciliation.observations.length,
    alignmentCount: reconciliation.alignments.length,
    discrepancyCount: reconciliation.discrepancies.length,
    limitationCount: reconciliation.limitations.length,
    operationCount: proposal.operations.length,
    conflictCount: proposal.conflicts.length,
    blankApprovalDiagnostics: blockedOutput.diagnostics.map(({ code }) => code),
    proposalHash: proposal.proposalHash,
    compilerProof: application.compilerProof,
  };

  await rm(stableOutput, { recursive: true, force: true });
  await cp(firstDir, join(stableOutput, 'reconciliation'), { recursive: true });
  await cp(firstApplicationDir, join(stableOutput, 'application'), { recursive: true });
  await writeFile(join(stableOutput, 'acceptance-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ ...summary, outputDir: stableOutput }, null, 2)}\n`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
