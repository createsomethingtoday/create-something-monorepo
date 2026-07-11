import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { compileWorkflowDefinition } from '../../workflow-compiler/dist/index.js';
import {
  applyApprovedWorkflowProposal,
  extractWorkflowDefinitionProposal,
  loadWorkflowEvidenceSource,
} from '../dist/index.js';

const repoRoot = new URL('../../../', import.meta.url);

async function marketplaceProposal() {
  const baseline = JSON.parse(
    await readFile(
      new URL('packages/workflow-compiler/fixtures/marketplace/workflow.json', repoRoot),
      'utf8',
    ),
  );
  const policy = JSON.parse(
    await readFile(
      new URL(
        'packages/workflow-evidence-extractor/fixtures/marketplace/extraction-policy.json',
        repoRoot,
      ),
      'utf8',
    ),
  );
  const descriptors = [
    ['marketplace-agent-contract', 'agent_contract', 'agent_contract.yaml'],
    ['marketplace-mcp-contract', 'mcp_contract', 'mcp_contract.yaml'],
    ['marketplace-rule-catalog', 'rule_catalog', 'rule-catalog.phase1.json'],
  ];
  const sources = await Promise.all(
    descriptors.map(([id, kind, file]) =>
      loadWorkflowEvidenceSource({
        id,
        kind,
        path: new URL(
          `specs/webflow-marketplace/delivery/template-review-hub/${file}`,
          repoRoot,
        ).pathname,
      }),
    ),
  );
  return { baseline, proposal: extractWorkflowDefinitionProposal({ baseline, sources, policy }) };
}

test('fails closed until every operation and conflict is explicitly reviewed', async () => {
  const { baseline, proposal } = await marketplaceProposal();

  assert.throws(
    () =>
      applyApprovedWorkflowProposal(baseline, proposal, {
        schemaVersion: 'workflow_proposal_approval.v0.1',
        baselineHash: proposal.baselineHash,
        proposalHash: proposal.proposalHash,
        approvedOperationIds: [],
        rejectedOperationIds: [],
        acknowledgedConflictIds: [],
        operator: 'fixture-operator',
        approvedAt: '2026-07-10T00:00:00.000Z',
      }),
    (error) => {
      assert.equal(error.name, 'WorkflowProposalApprovalError');
      assert.deepEqual(error.diagnostics.map((diagnostic) => diagnostic.code), [
        'UNREVIEWED_OPERATIONS',
        'UNACKNOWLEDGED_CONFLICTS',
      ]);
      return true;
    },
  );
});

test('applies only hash-bound approved additions and produces compiler proof', async () => {
  const { baseline, proposal } = await marketplaceProposal();
  const before = JSON.stringify(baseline);
  const rejectedOperationIds = ['operation:add-evaluation:wf.template.code.no_legacy_ix2'];
  const approvedOperationIds = proposal.operations
    .map((operation) => operation.id)
    .filter((id) => !rejectedOperationIds.includes(id));

  const result = applyApprovedWorkflowProposal(baseline, proposal, {
    schemaVersion: 'workflow_proposal_approval.v0.1',
    baselineHash: proposal.baselineHash,
    proposalHash: proposal.proposalHash,
    approvedOperationIds,
    rejectedOperationIds,
    acknowledgedConflictIds: proposal.conflicts.map((conflict) => conflict.id),
    operator: 'fixture-operator',
    approvedAt: '2026-07-10T00:00:00.000Z',
  });

  assert.equal(JSON.stringify(baseline), before);
  assert.equal(result.definition.systems.length, baseline.systems.length + 3);
  assert.equal(result.definition.evaluations.length, baseline.evaluations.length + 2);
  assert.equal(
    result.definition.evaluations.some(
      (evaluation) => evaluation.id === 'wf.template.code.no_legacy_ix2',
    ),
    false,
  );
  assert.equal(
    result.definition.actions.find((action) => action.id === 'approve_template').autonomy,
    'approval_required',
  );
  assert.equal(
    result.definition.actions.find((action) => action.id === 'publish_template').autonomy,
    'manual_only',
  );
  assert.deepEqual(result.appliedOperationIds, approvedOperationIds.sort());
  assert.deepEqual(result.rejectedOperationIds, rejectedOperationIds);

  const compiled = compileWorkflowDefinition(result.definition);
  assert.deepEqual(result.compilerProof, {
    definitionHash: compiled.definitionHash,
    compilerVersion: compiled.compilerVersion,
  });
});

test('rejects proposal content tampering even when the declared hash is unchanged', async () => {
  const { baseline, proposal } = await marketplaceProposal();
  proposal.operations[0].proposedValue.title = 'Tampered title';

  assert.throws(
    () =>
      applyApprovedWorkflowProposal(baseline, proposal, {
        schemaVersion: 'workflow_proposal_approval.v0.1',
        baselineHash: proposal.baselineHash,
        proposalHash: proposal.proposalHash,
        approvedOperationIds: proposal.operations.map((operation) => operation.id),
        rejectedOperationIds: [],
        acknowledgedConflictIds: proposal.conflicts.map((conflict) => conflict.id),
        operator: 'fixture-operator',
        approvedAt: '2026-07-10T00:00:00.000Z',
      }),
    (error) => {
      assert.equal(error.name, 'WorkflowProposalApprovalError');
      assert.equal(error.diagnostics[0].code, 'PROPOSAL_HASH_MISMATCH');
      return true;
    },
  );
});
