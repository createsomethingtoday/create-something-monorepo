import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileWorkflowDefinition } from '../../workflow-compiler/dist/index.js';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageRoot, '../..');
const baselinePath = join(
  repoRoot,
  'packages/workflow-compiler/fixtures/marketplace/workflow.json',
);
const policyPath = join(packageRoot, 'fixtures/marketplace/extraction-policy.json');
const agentContractPath = join(
  repoRoot,
  'specs/webflow-marketplace/delivery/template-review-hub/agent_contract.yaml',
);
const mcpContractPath = join(
  repoRoot,
  'specs/webflow-marketplace/delivery/template-review-hub/mcp_contract.yaml',
);
const ruleCatalogPath = join(
  repoRoot,
  'specs/webflow-marketplace/delivery/template-review-hub/rule-catalog.phase1.json',
);
const stableOutput = resolve(
  process.env.WORKFLOW_EVIDENCE_ACCEPTANCE_OUT ??
    join(tmpdir(), 'cre-1192-workflow-evidence-extractor-acceptance'),
);

function run(args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, ['dist/cli.js', ...args], {
    cwd: packageRoot,
    encoding: 'utf8',
  });
  assert.equal(result.status, expectedStatus, result.stderr || result.stdout);
  return result;
}

function propose(outDir) {
  return run([
    'propose',
    '--baseline',
    baselinePath,
    '--agent-contract',
    agentContractPath,
    '--mcp-contract',
    mcpContractPath,
    '--rule-catalog',
    ruleCatalogPath,
    '--policy',
    policyPath,
    '--out',
    outDir,
  ]);
}

function apply(proposalPath, approvalPath, outDir, expectedStatus = 0) {
  return run(
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
  const firstFiles = await filesUnder(first);
  const secondFiles = await filesUnder(second);
  assert.deepEqual(firstFiles, secondFiles);
  for (const file of firstFiles) {
    assert.equal(
      await readFile(join(first, file), 'utf8'),
      await readFile(join(second, file), 'utf8'),
      `${file} was not deterministic`,
    );
  }
}

const baselineBefore = await readFile(baselinePath, 'utf8');
const scratch = await mkdtemp(join(tmpdir(), 'workflow-evidence-acceptance-'));
const firstProposalDir = join(scratch, 'first-proposal');
const secondProposalDir = join(scratch, 'second-proposal');
const firstApplicationDir = join(scratch, 'first-application');
const secondApplicationDir = join(scratch, 'second-application');

try {
  propose(firstProposalDir);
  propose(secondProposalDir);
  await assertDirectoriesEqual(firstProposalDir, secondProposalDir);

  const proposal = JSON.parse(await readFile(join(firstProposalDir, 'proposal.json'), 'utf8'));
  assert.equal(proposal.sources.length, 3);
  assert.equal(proposal.operations.length, 6);
  assert.equal(proposal.conflicts.length, 2);
  assert.ok(proposal.sources.every((source) => /^sha256:[a-f0-9]{64}$/.test(source.hash)));
  assert.ok(
    proposal.operations.every(
      (operation) => operation.approvalRequired && operation.provenanceIds.length > 0,
    ),
  );

  const template = JSON.parse(
    await readFile(join(firstProposalDir, 'approval-template.json'), 'utf8'),
  );
  const blankApprovalPath = join(scratch, 'blank-approval.json');
  await writeFile(blankApprovalPath, `${JSON.stringify(template.approvalManifest, null, 2)}\n`);
  const blocked = apply(
    join(firstProposalDir, 'proposal.json'),
    blankApprovalPath,
    join(scratch, 'blocked-application'),
    2,
  );
  const blockedOutput = JSON.parse(blocked.stderr);
  assert.deepEqual(blockedOutput.diagnostics.map((diagnostic) => diagnostic.code), [
    'UNREVIEWED_OPERATIONS',
    'UNACKNOWLEDGED_CONFLICTS',
  ]);

  const rejectedOperationIds = ['operation:add-evaluation:wf.template.code.no_legacy_ix2'];
  const approval = {
    schemaVersion: 'workflow_proposal_approval.v0.1',
    baselineHash: proposal.baselineHash,
    proposalHash: proposal.proposalHash,
    approvedOperationIds: proposal.operations
      .map((operation) => operation.id)
      .filter((id) => !rejectedOperationIds.includes(id)),
    rejectedOperationIds,
    acknowledgedConflictIds: proposal.conflicts.map((conflict) => conflict.id),
    operator: 'cre-1192-acceptance-operator',
    approvedAt: '2026-07-10T00:00:00.000Z',
  };
  const firstApprovalPath = join(scratch, 'first-approval.json');
  const secondApprovalPath = join(scratch, 'second-approval.json');
  const approvalContent = `${JSON.stringify(approval, null, 2)}\n`;
  await writeFile(firstApprovalPath, approvalContent);
  await writeFile(secondApprovalPath, approvalContent);

  apply(join(firstProposalDir, 'proposal.json'), firstApprovalPath, firstApplicationDir);
  apply(join(secondProposalDir, 'proposal.json'), secondApprovalPath, secondApplicationDir);
  await assertDirectoriesEqual(firstApplicationDir, secondApplicationDir);

  const application = JSON.parse(
    await readFile(join(firstApplicationDir, 'application.json'), 'utf8'),
  );
  const compiled = compileWorkflowDefinition(application.definition);
  assert.deepEqual(application.compilerProof, {
    definitionHash: compiled.definitionHash,
    compilerVersion: compiled.compilerVersion,
  });
  assert.equal(application.appliedOperationIds.length, 5);
  assert.deepEqual(application.rejectedOperationIds, rejectedOperationIds);
  assert.equal(await readFile(baselinePath, 'utf8'), baselineBefore);

  const summary = {
    schemaVersion: 'workflow_evidence_acceptance_summary.v0.1',
    ok: true,
    deterministic: true,
    baselineUnchanged: true,
    sourceCount: proposal.sources.length,
    evidenceCount: proposal.evidence.length,
    operationCount: proposal.operations.length,
    conflictCount: proposal.conflicts.length,
    approvedOperationCount: application.appliedOperationIds.length,
    rejectedOperationCount: application.rejectedOperationIds.length,
    blankApprovalDiagnostics: blockedOutput.diagnostics.map((diagnostic) => diagnostic.code),
    proposalHash: proposal.proposalHash,
    baselineHash: proposal.baselineHash,
    compilerProof: application.compilerProof,
  };

  await rm(stableOutput, { recursive: true, force: true });
  await cp(firstProposalDir, join(stableOutput, 'proposal'), { recursive: true });
  await cp(firstApplicationDir, join(stableOutput, 'application'), { recursive: true });
  await writeFile(
    join(stableOutput, 'acceptance-summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({ ...summary, outputDir: stableOutput }, null, 2)}\n`,
  );
} finally {
  await rm(scratch, { recursive: true, force: true });
}
