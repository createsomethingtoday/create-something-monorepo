import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  applyApprovedWorkflowProposal,
  WorkflowProposalApprovalError,
} from '@create-something/workflow-evidence-extractor';
import { reconcileWorkflowHistoricalContext } from '../dist/index.js';

const repoRoot = new URL('../../../', import.meta.url);
const baselineUrl = new URL('packages/workflow-compiler/fixtures/marketplace/workflow.json', repoRoot);
const policyUrl = new URL(
  'packages/workflow-historical-context-reconciler/fixtures/marketplace/context-policy.json',
  repoRoot,
);

test('measures controlled historical-context coverage while preserving ambiguity', async () => {
  const baseline = JSON.parse(await readFile(baselineUrl, 'utf8'));
  const policy = JSON.parse(await readFile(policyUrl, 'utf8'));
  const makeCase = (caseId, overrides) => ({
    id: `historical-context:${caseId}`,
    caseId,
    selectionStratum: 'rejected_low_quality',
    observedOutcome: 'rejected',
    alignmentLabel: 'sandbox_did_not_explain_human_rejection',
    improvementAreas: [],
    hasReviewFeedback: false,
    hasRejectionFeedback: true,
    hasDecisionDate: true,
    sourcePointers: {
      outcome: `outcomes.private.jsonl:line:${caseId}`,
      alignment: `status-alignment.jsonl:line:${caseId}`,
    },
    ...overrides,
  });
  const bundle = {
    schemaVersion: 'workflow_historical_context_bundle.v0.1',
    bundleId: 'fixture',
    source: { path: '/fixture', hash: `sha256:${'a'.repeat(64)}`, files: [] },
    cases: [
      makeCase('1', { rejectionCategory: 'UI/UX Concerns' }),
      makeCase('2', { selectionStratum: 'policy_or_duplicate', rejectionCategory: 'Duplicate submission' }),
      makeCase('3', {
        selectionStratum: 'iterative_review',
        observedOutcome: 'changes_requested',
        alignmentLabel: 'sandbox_did_not_explain_iterative_review',
        hasReviewFeedback: true,
      }),
      makeCase('4', {
        selectionStratum: 'approved_good',
        observedOutcome: 'approved',
        alignmentLabel: 'sandbox_found_substantive_signal_on_approved_case',
      }),
    ],
  };

  const result = reconcileWorkflowHistoricalContext({ baseline, bundle, policy });
  assert.deepEqual(result.coverage, {
    discrepancyCount: 4,
    contextSupportedCount: 3,
    ambiguousCount: 1,
    contextCoverageRate: 0.75,
  });
  assert.deepEqual(result.findings.map(({ caseId, classification, status }) => ({ caseId, classification, status })), [
    { caseId: '1', classification: 'manual_quality_context', status: 'context_supported' },
    { caseId: '2', classification: 'policy_or_duplicate_context', status: 'context_supported' },
    { caseId: '3', classification: 'iterative_feedback_context', status: 'context_supported' },
    { caseId: '4', classification: 'historical_snapshot_or_override_ambiguity', status: 'ambiguous' },
  ]);
  assert.deepEqual(result.proposal.operations.map(({ id }) => id), [
    'operation:add-evaluation:historical-ambiguity-escalation',
    'operation:add-evaluation:historical-context-evidence-required',
  ]);
  assert.deepEqual(result.proposal.conflicts.map(({ id }) => id), [
    'conflict:historical-snapshot-or-override',
  ]);
  assert.throws(
    () =>
      applyApprovedWorkflowProposal(baseline, result.proposal, {
        schemaVersion: 'workflow_proposal_approval.v0.1',
        baselineHash: result.proposal.baselineHash,
        proposalHash: result.proposal.proposalHash,
        approvedOperationIds: [],
        rejectedOperationIds: [],
        acknowledgedConflictIds: [],
        operator: '',
        approvedAt: '',
      }),
    (error) =>
      error instanceof WorkflowProposalApprovalError &&
      error.diagnostics.some(({ code }) => code === 'UNREVIEWED_OPERATIONS') &&
      error.diagnostics.some(({ code }) => code === 'UNACKNOWLEDGED_CONFLICTS'),
  );
  const application = applyApprovedWorkflowProposal(baseline, result.proposal, {
    schemaVersion: 'workflow_proposal_approval.v0.1',
    baselineHash: result.proposal.baselineHash,
    proposalHash: result.proposal.proposalHash,
    approvedOperationIds: result.proposal.operations.map(({ id }) => id),
    rejectedOperationIds: [],
    acknowledgedConflictIds: result.proposal.conflicts.map(({ id }) => id),
    operator: 'marketplace-review-lead',
    approvedAt: '2026-07-10T12:00:00.000Z',
  });
  assert.equal(application.definition.evaluations.length, baseline.evaluations.length + 2);
});
