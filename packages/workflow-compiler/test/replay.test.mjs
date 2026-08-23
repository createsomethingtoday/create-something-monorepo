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
      canExecute: entry.canExecute
    })),
    [
      {
        caseId: 'approval-waits-for-reviewer',
        outcome: 'approval_required',
        reason: 'APPROVAL_REQUIRED',
        stateAfter: 'ready_for_review',
        canExecute: false
      },
      {
        caseId: 'complete-validation-passes',
        outcome: 'pass',
        reason: 'ACTION_ALLOWED',
        stateAfter: 'ready_for_review',
        canExecute: true
      },
      {
        caseId: 'creator-message-policy-block',
        outcome: 'blocked',
        reason: 'POLICY_BLOCKED',
        stateAfter: 'ready_for_review',
        canExecute: false
      },
      {
        caseId: 'missing-validation-evidence-blocks',
        outcome: 'blocked',
        reason: 'INSUFFICIENT_EVIDENCE',
        stateAfter: 'submitted',
        canExecute: false
      },
      {
        caseId: 'unknown-action-blocks',
        outcome: 'blocked',
        reason: 'UNKNOWN_ACTION',
        stateAfter: 'submitted',
        canExecute: false
      }
    ]
  );

  const insufficient = report.cases.find(
    (entry) => entry.caseId === 'missing-validation-evidence-blocks'
  );
  assert.deepEqual(insufficient.missingEvidence, ['published_url', 'validation_result']);
  assert.equal(insufficient.receipt.receiptFields.outcome, 'blocked');

  const unknown = report.cases.find((entry) => entry.caseId === 'unknown-action-blocks');
  assert.equal(unknown.owner, 'marketplace-review-lead');
  assert.match(unknown.recovery.path, /workflow definition/i);
});

test('versions replay reports when constrained evidence adds mismatch detail', async () => {
  const definition = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const manifest = JSON.parse(await readFile(casesUrl, 'utf8'));
  const legacyReport = replayWorkflow(compileWorkflowDefinition(definition), manifest).report;

  assert.equal(legacyReport.schemaVersion, 'workflow_replay_report.v0.1');
  assert.equal(Object.hasOwn(legacyReport.cases[0], 'evidenceMismatches'), false);
  assert.equal(Object.hasOwn(legacyReport.cases[0], 'evidenceMatcherMismatches'), false);

  const constrainedDefinition = structuredClone(definition);
  constrainedDefinition.schemaVersion = 'workflow_definition.v0.2';
  constrainedDefinition.actions.find(
    (action) => action.id === 'validate_submission'
  ).requiredEvidenceValues = { validation_result: 'pass' };
  const constrainedManifest = structuredClone(manifest);
  const mismatchCase = constrainedManifest.cases.find(
    (replayCase) => replayCase.caseId === 'complete-validation-passes'
  );
  mismatchCase.evidence.validation_result = 'failed';
  mismatchCase.expectedOutcome = 'blocked';
  mismatchCase.expectedState = mismatchCase.initialState;

  const constrainedReport = replayWorkflow(
    compileWorkflowDefinition(constrainedDefinition),
    constrainedManifest
  ).report;
  const mismatch = constrainedReport.cases.find(
    (replayCase) => replayCase.caseId === 'complete-validation-passes'
  );

  assert.equal(constrainedReport.schemaVersion, 'workflow_replay_report.v0.2');
  assert.equal(mismatch.reasonCode, 'EVIDENCE_VALUE_MISMATCH');
  assert.deepEqual(mismatch.evidenceMismatches, [
    { field: 'validation_result', expected: 'pass', actual: 'failed' }
  ]);
  assert.deepEqual(mismatch.evidenceMatcherMismatches, []);
});

test('replay rejects evidence constraints in a malformed v0.1 bundle before case evaluation', async () => {
  const definition = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const manifest = JSON.parse(await readFile(casesUrl, 'utf8'));
  const bundle = structuredClone(compileWorkflowDefinition(definition));
  const matchingCase = manifest.cases.find(
    (replayCase) => replayCase.caseId === 'complete-validation-passes',
  );
  assert.ok(matchingCase);
  const decisionIndex = bundle.decisionInventory.decisions.findIndex(
    (decision) => decision.actionId === matchingCase.actionId,
  );
  assert.notEqual(decisionIndex, -1);
  bundle.decisionInventory.decisions[decisionIndex].requiredEvidenceValues = {
    validation_result: matchingCase.evidence.validation_result,
  };

  assert.throws(
    () =>
      replayWorkflow(bundle, {
        schemaVersion: manifest.schemaVersion,
        workflowId: manifest.workflowId,
        cases: [matchingCase],
      }),
    (error) => {
      assert.equal(error.name, 'ReplayInputValidationError');
      assert.deepEqual(error.diagnostics, [
        {
          code: 'INVALID_VALUE',
          path: `$.decisionInventory.decisions[${decisionIndex}].requiredEvidenceValues`,
          message:
            'Compiled workflow bundle v0.1 cannot contain evidence constraints; recompile a workflow_definition.v0.2 bundle.',
        },
      ]);
      return true;
    },
  );
});

test('replay rejects cross-version nested artifacts before evaluating a v0.2 bundle', async () => {
  const definition = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const manifest = JSON.parse(await readFile(casesUrl, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.2';
  const validationAction = definition.actions.find(
    (action) => action.id === 'validate_submission',
  );
  assert.ok(validationAction);
  validationAction.requiredEvidenceValues = { validation_result: 'pass' };

  const bundle = structuredClone(compileWorkflowDefinition(definition));
  bundle.decisionInventory.schemaVersion = 'decision_inventory.v0.1';
  bundle.governedInteraction.schemaVersion = 'governed_interaction_bundle.v0.1';
  bundle.approvalSurfaces.schemaVersion = 'approval_surfaces.v0.1';
  bundle.toolContracts.schemaVersion = 'tool_contracts.v0.1';
  const mismatchedCase = manifest.cases.find(
    (replayCase) => replayCase.caseId === 'complete-validation-passes',
  );
  assert.ok(mismatchedCase);
  mismatchedCase.evidence.validation_result = 'failed';

  assert.throws(
    () =>
      replayWorkflow(bundle, {
        schemaVersion: manifest.schemaVersion,
        workflowId: manifest.workflowId,
        cases: [mismatchedCase],
      }),
    (error) => {
      assert.equal(error.name, 'ReplayInputValidationError');
      assert.deepEqual(
        error.diagnostics.map(({ code, path }) => ({ code, path })),
        [
          { code: 'INVALID_VALUE', path: '$.decisionInventory.schemaVersion' },
          { code: 'INVALID_VALUE', path: '$.governedInteraction.schemaVersion' },
          { code: 'INVALID_VALUE', path: '$.approvalSurfaces.schemaVersion' },
          { code: 'INVALID_VALUE', path: '$.toolContracts.schemaVersion' },
        ],
      );
      return true;
    },
  );
});

test('replay rejects a v0.2 bundle with divergent nested evidence constraints', async () => {
  const definition = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const manifest = JSON.parse(await readFile(casesUrl, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.2';
  const requestChanges = definition.actions.find((action) => action.id === 'request_changes');
  assert.ok(requestChanges);
  requestChanges.requiredEvidenceValues = { version_id: 'version-fixture-001' };

  const bundle = JSON.parse(JSON.stringify(compileWorkflowDefinition(definition)));
  const decisionIndex = bundle.decisionInventory.decisions.findIndex(
    (decision) => decision.actionId === 'request_changes',
  );
  const interactionIndex = bundle.governedInteraction.actions.findIndex(
    (action) => action.actionId === 'request_changes',
  );
  const approvalIndex = bundle.approvalSurfaces.actions.findIndex(
    (action) => action.actionId === 'request_changes',
  );
  const toolIndex = bundle.toolContracts.tools.findIndex(
    (tool) => tool.actionId === 'request_changes',
  );
  assert.notEqual(decisionIndex, -1);
  assert.notEqual(interactionIndex, -1);
  assert.notEqual(approvalIndex, -1);
  assert.notEqual(toolIndex, -1);
  delete bundle.decisionInventory.decisions[decisionIndex].requiredEvidenceValues;

  const approvalCase = manifest.cases.find(
    (replayCase) => replayCase.caseId === 'approval-waits-for-reviewer',
  );
  assert.ok(approvalCase);
  assert.throws(
    () =>
      replayWorkflow(bundle, {
        schemaVersion: manifest.schemaVersion,
        workflowId: manifest.workflowId,
        cases: [approvalCase],
      }),
    (error) => {
      assert.equal(error.name, 'ReplayInputValidationError');
      assert.deepEqual(
        error.diagnostics.map(({ code, path }) => ({ code, path })),
        [
          {
            code: 'INVALID_VALUE',
            path: `$.governedInteraction.actions[${interactionIndex}].requiredEvidenceValues`,
          },
          {
            code: 'INVALID_VALUE',
            path: `$.approvalSurfaces.actions[${approvalIndex}].requiredEvidenceValues`,
          },
          {
            code: 'INVALID_VALUE',
            path: `$.toolContracts.tools[${toolIndex}].requiredEvidenceValues`,
          },
        ],
      );
      return true;
    },
  );
});

test('serializes missing constrained evidence as an explicit null mismatch actual', async () => {
  const definition = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const manifest = JSON.parse(await readFile(casesUrl, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.2';
  const action = definition.actions.find((entry) => entry.id === 'validate_submission');
  action.requiredEvidenceValues = { published_url: 'https://fixture-template.webflow.io' };
  action.requiredEvidenceMatchers = {
    validation_result: { kind: 'contains_case_insensitive', values: ['pass'] }
  };

  const report = replayWorkflow(compileWorkflowDefinition(definition), manifest).report;
  const missing = report.cases.find(
    (replayCase) => replayCase.caseId === 'missing-validation-evidence-blocks'
  );
  const serialized = JSON.parse(JSON.stringify(missing));

  assert.equal(missing.reasonCode, 'INSUFFICIENT_EVIDENCE');
  assert.deepEqual(serialized.evidenceMismatches, [
    {
      field: 'published_url',
      expected: 'https://fixture-template.webflow.io',
      actual: null
    }
  ]);
  assert.deepEqual(serialized.evidenceMatcherMismatches, [
    {
      field: 'validation_result',
      matcher: { kind: 'contains_case_insensitive', values: ['pass'] },
      actual: null
    }
  ]);
});

test('replay blocks unknown and unauthorized actors before action execution', async () => {
  const definition = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const fixture = JSON.parse(await readFile(casesUrl, 'utf8'));
  const bundle = compileWorkflowDefinition(definition);
  const baselineCase = fixture.cases.find((entry) => entry.caseId === 'complete-validation-passes');

  for (const [actorId, reasonCode] of [
    ['invented-actor', 'UNKNOWN_ACTOR'],
    ['marketplace-reviewer', 'ACTOR_NOT_AUTHORIZED']
  ]) {
    const replayCase = {
      ...baselineCase,
      caseId: `actor-boundary-${actorId}`,
      actorId,
      expectedOutcome: 'blocked',
      expectedState: baselineCase.initialState
    };
    const { report } = replayWorkflow(bundle, {
      schemaVersion: fixture.schemaVersion,
      workflowId: fixture.workflowId,
      cases: [replayCase]
    });

    assert.equal(report.cases[0].observedOutcome, 'blocked');
    assert.equal(report.cases[0].reasonCode, reasonCode);
    assert.equal(report.cases[0].canExecute, false);
    assert.equal(report.cases[0].stateAfter, baselineCase.initialState);
    assert.equal(report.cases[0].actorId, actorId);
    assert.equal(report.cases[0].receipt.actorId, actorId);
  }
});
