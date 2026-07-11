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
const reportPath = join(repoRoot, 'specs/webflow-marketplace/delivery/template-review-hub/balanced-50-multimodal-calibration-2026-05-27.md');
const policyPath = join(packageRoot, 'fixtures/marketplace/reconciliation-policy.json');
const extractorCli = join(repoRoot, 'packages/workflow-evidence-extractor/dist/cli.js');
const stableOutput = resolve(
  process.env.WORKFLOW_RECEIPT_ACCEPTANCE_OUT ??
    join(tmpdir(), 'cre-1195-workflow-receipt-reconciler-acceptance'),
);

function run(script, args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: packageRoot, encoding: 'utf8' });
  assert.equal(result.status, expectedStatus, result.stderr || result.stdout);
  return result;
}

function reconcile(outDir) {
  return run('dist/cli.js', ['reconcile', '--baseline', baselinePath, '--report', reportPath, '--policy', policyPath, '--out', outDir]);
}

function apply(proposal, approval, outDir, expectedStatus = 0) {
  return run(extractorCli, ['apply', '--baseline', baselinePath, '--proposal', proposal, '--approval', approval, '--out', outDir], expectedStatus);
}

async function filesUnder(root, prefix = '') {
  const entries = await readdir(join(root, prefix), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(root, relative)));
    else files.push(relative);
  }
  return files.sort();
}

async function assertEqualDirectories(first, second) {
  const files = await filesUnder(first);
  assert.deepEqual(files, await filesUnder(second));
  for (const file of files) {
    assert.equal(await readFile(join(first, file), 'utf8'), await readFile(join(second, file), 'utf8'));
  }
}

const baselineBefore = await readFile(baselinePath, 'utf8');
const reportBefore = await readFile(reportPath, 'utf8');
const scratch = await mkdtemp(join(tmpdir(), 'workflow-receipt-acceptance-'));
const first = join(scratch, 'first');
const second = join(scratch, 'second');
const firstApplication = join(scratch, 'first-application');
const secondApplication = join(scratch, 'second-application');

try {
  reconcile(first);
  reconcile(second);
  await assertEqualDirectories(first, second);
  const reconciliation = JSON.parse(await readFile(join(first, 'reconciliation.json'), 'utf8'));
  const proposal = reconciliation.proposal;
  assert.equal(reconciliation.corpus.receipts.length, 2);
  assert.equal(reconciliation.replays.length, 2);
  assert.equal(reconciliation.samplingGate.status, 'blocked');
  assert.equal(proposal.operations.length, 1);
  assert.equal(proposal.conflicts.length, 3);

  const template = JSON.parse(await readFile(join(first, 'proposal/approval-template.json'), 'utf8'));
  const blankApproval = join(scratch, 'blank-approval.json');
  await writeFile(blankApproval, `${JSON.stringify(template.approvalManifest, null, 2)}\n`);
  const blocked = apply(join(first, 'proposal/proposal.json'), blankApproval, join(scratch, 'blocked'), 2);
  const blockedOutput = JSON.parse(blocked.stderr);
  assert.deepEqual(blockedOutput.diagnostics.map(({ code }) => code), ['UNREVIEWED_OPERATIONS', 'UNACKNOWLEDGED_CONFLICTS']);

  const approval = {
    schemaVersion: 'workflow_proposal_approval.v0.1',
    baselineHash: proposal.baselineHash,
    proposalHash: proposal.proposalHash,
    approvedOperationIds: proposal.operations.map(({ id }) => id),
    rejectedOperationIds: [],
    acknowledgedConflictIds: proposal.conflicts.map(({ id }) => id),
    operator: 'cre-1195-acceptance-operator',
    approvedAt: '2026-07-10T00:00:00.000Z',
  };
  const approvalContent = `${JSON.stringify(approval, null, 2)}\n`;
  const firstApproval = join(scratch, 'first-approval.json');
  const secondApproval = join(scratch, 'second-approval.json');
  await writeFile(firstApproval, approvalContent);
  await writeFile(secondApproval, approvalContent);
  apply(join(first, 'proposal/proposal.json'), firstApproval, firstApplication);
  apply(join(second, 'proposal/proposal.json'), secondApproval, secondApplication);
  await assertEqualDirectories(firstApplication, secondApplication);
  const application = JSON.parse(await readFile(join(firstApplication, 'application.json'), 'utf8'));
  const compiled = compileWorkflowDefinition(application.definition);
  assert.deepEqual(application.compilerProof, { definitionHash: compiled.definitionHash, compilerVersion: compiled.compilerVersion });
  assert.equal(await readFile(baselinePath, 'utf8'), baselineBefore);
  assert.equal(await readFile(reportPath, 'utf8'), reportBefore);

  const summary = {
    schemaVersion: 'workflow_receipt_acceptance_summary.v0.1',
    ok: true,
    deterministic: true,
    baselineUnchanged: true,
    reportUnchanged: true,
    receiptCount: 2,
    replayCount: 2,
    discrepancyCount: 2,
    samplingGate: reconciliation.samplingGate,
    operationCount: 1,
    conflictCount: 3,
    blankApprovalDiagnostics: blockedOutput.diagnostics.map(({ code }) => code),
    proposalHash: proposal.proposalHash,
    compilerProof: application.compilerProof,
  };
  await rm(stableOutput, { recursive: true, force: true });
  await cp(first, join(stableOutput, 'reconciliation'), { recursive: true });
  await cp(firstApplication, join(stableOutput, 'application'), { recursive: true });
  await writeFile(join(stableOutput, 'acceptance-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ ...summary, outputDir: stableOutput }, null, 2)}\n`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
