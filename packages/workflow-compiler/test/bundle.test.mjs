import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { compileWorkflowDefinition } from '../dist/index.js';

const fixtureUrl = new URL('../fixtures/marketplace/workflow.json', import.meta.url);

test('compiles one marketplace definition into a complete governed runtime bundle', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  const compiled = compileWorkflowDefinition(definition);

  assert.match(compiled.definitionHash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(compiled.runtimeTargets.systems.length, 7);
  assert.equal(compiled.objectSchemas.objects.length, 3);
  assert.equal(compiled.eventSchemas.events.length, 5);
  assert.equal(compiled.decisionInventory.decisions.length, 6);
  assert.equal(compiled.toolContracts.tools.length, 3);
  assert.equal(compiled.agentContracts.agents.length, 1);
  assert.equal(compiled.approvalSurfaces.actions.length, 4);
  assert.equal(compiled.evaluationManifest.evaluations.length, 3);

  const headers = [
    compiled.runtimeTargets,
    compiled.objectSchemas,
    compiled.eventSchemas,
    compiled.decisionInventory,
    compiled.toolContracts,
    compiled.agentContracts,
    compiled.approvalSurfaces,
    compiled.evaluationManifest,
  ];
  for (const artifact of headers) {
    assert.equal(artifact.workflowId, definition.workflowId);
    assert.equal(artifact.workflowVersion, definition.version);
    assert.equal(artifact.definitionHash, compiled.definitionHash);
  }

  const approval = compiled.decisionInventory.decisions.find(
    (decision) => decision.actionId === 'approve_template',
  );
  assert.deepEqual(
    {
      authority: approval.authority,
      autonomy: approval.autonomy,
      approvalOwner: approval.approvalOwner,
      requiredEvidence: approval.requiredEvidence,
      receiptFields: approval.receiptFields,
      recoveryOwner: approval.recovery.owner,
    },
    {
      authority: 'marketplace-reviewer',
      autonomy: 'approval_required',
      approvalOwner: 'marketplace-reviewer',
      requiredEvidence: ['review_summary', 'reviewer_id', 'validation_result', 'version_id'],
      receiptFields: [
        'action_id',
        'correlation_id',
        'evidence_refs',
        'outcome',
        'reviewer_id',
        'workflow_id',
      ],
      recoveryOwner: 'marketplace-reviewer',
    },
  );
});

test('fails closed when a transition references an unknown action', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  definition.transitions[0].actionId = 'missing-action';

  assert.throws(
    () => compileWorkflowDefinition(definition),
    (error) => {
      assert.equal(error.name, 'WorkflowCompilationError');
      assert.deepEqual(error.diagnostics.map((diagnostic) => diagnostic.code), [
        'UNKNOWN_TRANSITION_ACTION',
      ]);
      return true;
    },
  );
});

test('rejects invalid public workflow definitions with structured diagnostics', async () => {
  const unsupportedSchema = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  unsupportedSchema.schemaVersion = 'workflow_definition.v9';
  unsupportedSchema.states.push({ ...unsupportedSchema.states[0] });
  unsupportedSchema.transitions.push({
    id: 'duplicate-submitted-validation-route',
    from: 'submitted',
    to: 'published',
    actionId: 'validate_submission',
  });
  unsupportedSchema.actions[0].recovery = {
    mode: 'unsupported',
    owner: 7,
    path: null,
  };

  assert.throws(
    () => compileWorkflowDefinition(unsupportedSchema),
    (error) => {
      assert.equal(error.name, 'WorkflowCompilationError');
      assert.deepEqual(
        error.diagnostics.map((diagnostic) => diagnostic.code),
        [
          'UNSUPPORTED_WORKFLOW_SCHEMA_VERSION',
          'INVALID_WORKFLOW_DEFINITION',
          'INVALID_WORKFLOW_DEFINITION',
          'INVALID_WORKFLOW_DEFINITION',
          'DUPLICATE_STATE_ID',
          'AMBIGUOUS_TRANSITION_ROUTE',
        ],
      );
      assert.deepEqual(
        error.diagnostics.map((diagnostic) => diagnostic.path),
        [
          'schemaVersion',
          'actions[0].recovery.mode',
          'actions[0].recovery.owner',
          'actions[0].recovery.path',
          'states[6].id',
          'transitions[5]',
        ],
      );
      return true;
    },
  );
});
