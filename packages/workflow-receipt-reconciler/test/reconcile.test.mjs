import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  applyApprovedWorkflowProposal,
  WorkflowProposalApprovalError,
} from '@create-something/workflow-evidence-extractor';
import {
  extractEmbeddedWorkflowReceiptCorpus,
  reconcileWorkflowReceiptCorpus,
} from '../dist/index.js';

const repoRoot = new URL('../../../', import.meta.url);
const reportUrl = new URL(
  'specs/webflow-marketplace/delivery/template-review-hub/balanced-50-multimodal-calibration-2026-05-27.md',
  repoRoot,
);
const baselineUrl = new URL('packages/workflow-compiler/fixtures/marketplace/workflow.json', repoRoot);
const policyUrl = new URL(
  'packages/workflow-receipt-reconciler/fixtures/marketplace/reconciliation-policy.json',
  repoRoot,
);

test('replays case-level discrepancies and blocks an insufficient reviewer-concentrated corpus', async () => {
  const baseline = JSON.parse(await readFile(baselineUrl, 'utf8'));
  const reportContent = await readFile(reportUrl, 'utf8');
  const policy = JSON.parse(await readFile(policyUrl, 'utf8'));
  const baselineBefore = JSON.stringify(baseline);
  const corpus = extractEmbeddedWorkflowReceiptCorpus({
    id: 'balanced-50-calibration',
    path: reportUrl.pathname,
    content: reportContent,
  });

  const reconciliation = reconcileWorkflowReceiptCorpus({ baseline, corpus, policy });

  assert.equal(JSON.stringify(baseline), baselineBefore);
  assert.deepEqual(
    reconciliation.replays.map((replay) => ({
      receiptId: replay.receiptId,
      actionId: replay.actionId,
      classification: replay.classification,
      status: replay.status,
      sourcePointer: replay.provenance.sourcePointer,
    })),
    [
      {
        receiptId: 'embedded-case:introx',
        actionId: 'approve_template',
        classification: 'approved_with_substantive_objective_findings',
        status: 'discrepancy',
        sourcePointer: 'lines:139-153',
      },
      {
        receiptId: 'embedded-case:automatia',
        actionId: 'request_changes',
        classification: 'unexplained_human_rejection',
        status: 'discrepancy',
        sourcePointer: 'lines:154-165',
      },
    ],
  );
  assert.deepEqual(reconciliation.samplingGate, {
    status: 'blocked',
    caseCount: 2,
    reviewerCount: 1,
    maximumReviewer: 'Natalia Ledford',
    maximumReviewerShare: 1,
    reasons: [
      'case_count 2 below minimum 8',
      'reviewer_count 1 below minimum 4',
      'maximum_reviewer_share 1 exceeded 0.35',
    ],
  });
});

test('keeps the case-level evaluation behind explicit operation and conflict review', async () => {
  const baseline = JSON.parse(await readFile(baselineUrl, 'utf8'));
  const reportContent = await readFile(reportUrl, 'utf8');
  const policy = JSON.parse(await readFile(policyUrl, 'utf8'));
  const corpus = extractEmbeddedWorkflowReceiptCorpus({
    id: 'balanced-50-calibration',
    path: reportUrl.pathname,
    content: reportContent,
  });
  const { proposal } = reconcileWorkflowReceiptCorpus({ baseline, corpus, policy });

  assert.deepEqual(proposal.operations.map(({ id }) => id), [
    'operation:add-evaluation:case-level-outcome-replay',
  ]);
  assert.deepEqual(proposal.conflicts.map(({ id }) => id), [
    'conflict:receipt-corpus-insufficient-cases',
    'conflict:receipt-corpus-insufficient-reviewers',
    'conflict:receipt-corpus-reviewer-concentration',
  ]);
  assert.ok(proposal.evidence.every(({ sourcePointer }) => /^lines:\d+-\d+$/.test(sourcePointer)));
  assert.throws(
    () =>
      applyApprovedWorkflowProposal(baseline, proposal, {
        schemaVersion: 'workflow_proposal_approval.v0.1',
        baselineHash: proposal.baselineHash,
        proposalHash: proposal.proposalHash,
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

  const application = applyApprovedWorkflowProposal(baseline, proposal, {
    schemaVersion: 'workflow_proposal_approval.v0.1',
    baselineHash: proposal.baselineHash,
    proposalHash: proposal.proposalHash,
    approvedOperationIds: proposal.operations.map(({ id }) => id),
    rejectedOperationIds: [],
    acknowledgedConflictIds: proposal.conflicts.map(({ id }) => id),
    operator: 'marketplace-review-lead',
    approvedAt: '2026-07-10T12:00:00.000Z',
  });
  assert.equal(application.definition.evaluations.length, baseline.evaluations.length + 1);
  assert.match(application.compilerProof.definitionHash, /^sha256:[a-f0-9]{64}$/);
});

test('passes only a sufficiently large reviewer-balanced receipt corpus across supported outcome paths', async () => {
  const baseline = JSON.parse(await readFile(baselineUrl, 'utf8'));
  const policy = JSON.parse(await readFile(policyUrl, 'utf8'));
  const patterns = [
    ['approved', 'sandbox_minor_signals_on_approved_case'],
    ['approved', 'sandbox_consistent_with_approved_clean_evidence'],
    ['rejected', 'sandbox_did_not_explain_human_rejection'],
    ['changes_requested', 'sandbox_did_not_explain_iterative_review'],
  ];
  const corpus = {
    schemaVersion: 'workflow_receipt_corpus.v0.1',
    corpusId: 'balanced-eight',
    source: { id: 'balanced-eight', path: '/fixture', hash: `sha256:${'a'.repeat(64)}` },
    receipts: Array.from({ length: 8 }, (_, index) => {
      const [outcome, alignmentLabel] = patterns[index % patterns.length];
      return {
        id: `receipt:${index + 1}`,
        templateName: `Template ${index + 1}`,
        selectionStratum: 'fixture',
        expectedReviewStatus: outcome,
        expectedQualityRating: 'fixture',
        reviewer: `Reviewer ${index % 4}`,
        evidenceStatus: 'usable',
        findingCount: 0,
        substantiveFindingCount: 0,
        findingRuleIds: [],
        alignmentLabel,
        sourcePointer: `status-alignment.jsonl:line:${index + 1}`,
      };
    }),
  };

  const reconciliation = reconcileWorkflowReceiptCorpus({ baseline, corpus, policy });
  assert.equal(reconciliation.replays.length, 8);
  assert.equal(reconciliation.samplingGate.status, 'pass');
  assert.deepEqual(reconciliation.samplingGate.reasons, []);
  assert.deepEqual(reconciliation.proposal.conflicts, []);
});
