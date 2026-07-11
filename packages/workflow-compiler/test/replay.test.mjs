import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { compileWorkflowDefinition, replayWorkflow } from '../dist/index.js';

const workflowUrl = new URL('../fixtures/marketplace/workflow.json', import.meta.url);
const casesUrl = new URL('../fixtures/marketplace/cases.json', import.meta.url);

test('replays representative history through compiled transitions and fails closed', async () => {
  const definition = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const manifest = JSON.parse(await readFile(casesUrl, 'utf8'));
  const bundle = compileWorkflowDefinition(definition);

  const { report, evidenceLedger } = replayWorkflow(bundle, manifest);

  assert.deepEqual(report.counts, { pass: 1, approval_required: 1, blocked: 3 });
  assert.equal(report.allExpectationsMatched, true);
  assert.equal(report.cases.length, 5);
  assert.equal(evidenceLedger.entries.length, 5);

  assert.deepEqual(
    report.cases.map((entry) => ({
      caseId: entry.caseId,
      outcome: entry.observedOutcome,
      reason: entry.reasonCode,
      stateAfter: entry.stateAfter,
      canExecute: entry.canExecute,
    })),
    [
      {
        caseId: 'approval-waits-for-reviewer',
        outcome: 'approval_required',
        reason: 'APPROVAL_REQUIRED',
        stateAfter: 'ready_for_review',
        canExecute: false,
      },
      {
        caseId: 'complete-validation-passes',
        outcome: 'pass',
        reason: 'ACTION_ALLOWED',
        stateAfter: 'ready_for_review',
        canExecute: true,
      },
      {
        caseId: 'creator-message-policy-block',
        outcome: 'blocked',
        reason: 'POLICY_BLOCKED',
        stateAfter: 'ready_for_review',
        canExecute: false,
      },
      {
        caseId: 'missing-validation-evidence-blocks',
        outcome: 'blocked',
        reason: 'INSUFFICIENT_EVIDENCE',
        stateAfter: 'submitted',
        canExecute: false,
      },
      {
        caseId: 'unknown-action-blocks',
        outcome: 'blocked',
        reason: 'UNKNOWN_ACTION',
        stateAfter: 'submitted',
        canExecute: false,
      },
    ],
  );

  const insufficient = report.cases.find(
    (entry) => entry.caseId === 'missing-validation-evidence-blocks',
  );
  assert.deepEqual(insufficient.missingEvidence, ['published_url', 'validation_result']);
  assert.equal(insufficient.receipt.receiptFields.outcome, 'blocked');

  const unknown = report.cases.find((entry) => entry.caseId === 'unknown-action-blocks');
  assert.equal(unknown.owner, 'marketplace-review-lead');
  assert.match(unknown.recovery.path, /workflow definition/i);
});
