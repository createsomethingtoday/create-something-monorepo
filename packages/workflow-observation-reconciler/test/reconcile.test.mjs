import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  applyApprovedWorkflowProposal,
  WorkflowProposalApprovalError,
} from '@create-something/workflow-evidence-extractor';
import { reconcileWorkflowObservationReport } from '../dist/index.js';

const repoRoot = new URL('../../../', import.meta.url);
const reportUrl = new URL(
  'specs/webflow-marketplace/delivery/template-review-hub/balanced-50-multimodal-calibration-2026-05-27.md',
  repoRoot,
);
const baselineUrl = new URL(
  'packages/workflow-compiler/fixtures/marketplace/workflow.json',
  repoRoot,
);
const policyUrl = new URL(
  'packages/workflow-observation-reconciler/fixtures/marketplace/reconciliation-policy.json',
  repoRoot,
);

test('extracts exact historical observations with line provenance without mutating inputs', async () => {
  const baseline = JSON.parse(await readFile(baselineUrl, 'utf8'));
  const content = await readFile(reportUrl, 'utf8');
  const policy = JSON.parse(await readFile(policyUrl, 'utf8'));
  const baselineBefore = JSON.stringify(baseline);

  const reconciliation = reconcileWorkflowObservationReport({
    baseline,
    report: { id: 'balanced-50-calibration', path: reportUrl.pathname, content },
    policy,
  });

  assert.equal(JSON.stringify(baseline), baselineBefore);
  assert.equal(reconciliation.report.path, reportUrl.pathname);
  assert.match(reconciliation.report.hash, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(
    Object.fromEntries(reconciliation.observations.map((observation) => [observation.id, observation.value])),
    {
      approved_minor_signal_count: 13,
      approved_substantive_signal_count: 1,
      automatia_substantive_finding_count: 0,
      introx_substantive_finding_count: 2,
      max_reviewer_share_percent: 36,
      selected_count: 50,
      unexplained_iterative_count: 10,
      unexplained_rejected_or_policy_count: 17,
      usable_evidence_count: 49,
    },
  );
  assert.ok(
    reconciliation.observations.every(
      (observation) => /^line:\d+$/.test(observation.sourcePointer) && observation.excerpt.length > 0,
    ),
  );
});

test('classifies documented-versus-observed findings from explicit policy', async () => {
  const baseline = JSON.parse(await readFile(baselineUrl, 'utf8'));
  const content = await readFile(reportUrl, 'utf8');
  const policy = JSON.parse(await readFile(policyUrl, 'utf8'));

  const reconciliation = reconcileWorkflowObservationReport({
    baseline,
    report: { id: 'balanced-50-calibration', path: reportUrl.pathname, content },
    policy,
  });

  assert.deepEqual(
    reconciliation.alignments.map(({ id }) => id),
    ['human-owned-final-decision-supported', 'objective-evidence-collector-stable'],
  );
  assert.deepEqual(
    reconciliation.discrepancies.map(({ id }) => id),
    ['appeal-equity-comparison-missing', 'decision-surface-classification-missing'],
  );
  assert.deepEqual(
    reconciliation.limitations.map(({ id }) => id),
    ['reviewer-concentration-above-target'],
  );
  assert.ok(
    [...reconciliation.alignments, ...reconciliation.discrepancies, ...reconciliation.limitations]
      .every((finding) => finding.evidenceIds.length > 0),
  );
});

test('proposes bounded evaluations but requires complete operator approval before compiling', async () => {
  const baseline = JSON.parse(await readFile(baselineUrl, 'utf8'));
  const content = await readFile(reportUrl, 'utf8');
  const policy = JSON.parse(await readFile(policyUrl, 'utf8'));
  const baselineBefore = JSON.stringify(baseline);

  const { proposal } = reconcileWorkflowObservationReport({
    baseline,
    report: { id: 'balanced-50-calibration', path: reportUrl.pathname, content },
    policy,
  });

  assert.deepEqual(
    proposal.operations.map(({ id }) => id),
    [
      'operation:add-evaluation:appeal-equity-comparison',
      'operation:add-evaluation:decision-surface-classification',
    ],
  );
  assert.deepEqual(
    proposal.conflicts.map(({ id }) => id),
    ['conflict:observed-subjective-threshold-generalization'],
  );
  assert.ok(proposal.conflicts.every(({ claims }) => claims.every(({ provenanceIds }) => provenanceIds.length > 0)));
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

  const applied = applyApprovedWorkflowProposal(baseline, proposal, {
    schemaVersion: 'workflow_proposal_approval.v0.1',
    baselineHash: proposal.baselineHash,
    proposalHash: proposal.proposalHash,
    approvedOperationIds: proposal.operations.map(({ id }) => id),
    rejectedOperationIds: [],
    acknowledgedConflictIds: proposal.conflicts.map(({ id }) => id),
    operator: 'marketplace-review-lead',
    approvedAt: '2026-07-10T12:00:00.000Z',
  });

  assert.equal(applied.definition.evaluations.length, baseline.evaluations.length + 2);
  assert.match(applied.compilerProof.definitionHash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(baseline), baselineBefore);
});
