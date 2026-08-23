import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { compileWorkflowDefinition, createMcpToolCallPlan } from '../dist/index.js';

const fixtureUrl = new URL('../fixtures/marketplace/workflow.json', import.meta.url);

test('compiles one marketplace definition into a complete governed runtime bundle', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  const compiled = compileWorkflowDefinition(definition);

  assert.match(compiled.definitionHash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(compiled.runtimeTargets.systems.length, 7);
  assert.equal(compiled.objectSchemas.objects.length, 3);
  assert.equal(compiled.eventSchemas.events.length, 5);
  assert.equal(compiled.decisionInventory.decisions.length, 7);
  assert.equal(compiled.toolContracts.tools.length, 3);
  assert.equal(compiled.agentContracts.agents.length, 1);
  assert.equal(compiled.approvalSurfaces.actions.length, 4);
  assert.equal(compiled.evaluationManifest.evaluations.length, 3);
  assert.deepEqual(compiled.governedInteraction, {
    schemaVersion: 'governed_interaction_bundle.v0.1',
    language: 'create-something/control',
    runtimeVersion: '0.1.0',
    workflowId: definition.workflowId,
    workflowVersion: definition.version,
    definitionHash: compiled.definitionHash,
    entrySurfaceId: 'operator-console',
    capabilities: ['interaction.select', 'receipt.inspect', 'replay.inspect', 'workflow.inspect'],
    surfaces: [
      {
        id: 'operator-console',
        title: definition.title,
        kind: 'workflow_overview',
        operations: [{ kind: 'select_replay_case' }]
      }
    ],
    actions: compiled.decisionInventory.decisions
  });

  const headers = [
    compiled.runtimeTargets,
    compiled.objectSchemas,
    compiled.eventSchemas,
    compiled.decisionInventory,
    compiled.toolContracts,
    compiled.agentContracts,
    compiled.approvalSurfaces,
    compiled.evaluationManifest
  ];
  for (const artifact of headers) {
    assert.equal(artifact.workflowId, definition.workflowId);
    assert.equal(artifact.workflowVersion, definition.version);
    assert.equal(artifact.definitionHash, compiled.definitionHash);
  }

  const approval = compiled.decisionInventory.decisions.find(
    (decision) => decision.actionId === 'approve_template'
  );
  assert.deepEqual(
    {
      authority: approval.authority,
      autonomy: approval.autonomy,
      approvalOwner: approval.approvalOwner,
      requiredEvidence: approval.requiredEvidence,
      receiptFields: approval.receiptFields,
      recoveryOwner: approval.recovery.owner
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
        'workflow_id'
      ],
      recoveryOwner: 'marketplace-reviewer'
    }
  );
});

test('versions approval surfaces when controlled actions carry evidence constraints', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.2';
  const requestChanges = definition.actions.find((action) => action.id === 'request_changes');
  assert.ok(requestChanges);
  requestChanges.requiredEvidenceValues = { version_id: 'version-fixture-001' };
  requestChanges.requiredEvidenceMatchers = {
    review_feedback: { kind: 'contains_case_insensitive', values: ['changes'] },
  };

  const compiled = compileWorkflowDefinition(definition);
  const approvalSurface = compiled.approvalSurfaces.actions.find(
    (action) => action.actionId === 'request_changes',
  );

  assert.equal(compiled.approvalSurfaces.schemaVersion, 'approval_surfaces.v0.2');
  assert.deepEqual(approvalSurface?.requiredEvidenceValues, {
    version_id: 'version-fixture-001',
  });
  assert.deepEqual(approvalSurface?.requiredEvidenceMatchers, {
    review_feedback: { kind: 'contains_case_insensitive', values: ['changes'] },
  });
});

test('keeps marketplace write contracts aligned with the production review MCP', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  const compiled = compileWorkflowDefinition(definition);

  const contracts = Object.fromEntries(
    compiled.toolContracts.tools.map((contract) => [contract.name, contract])
  );

  assert.deepEqual(contracts.template_review_request_changes.parameters, [
    {
      name: 'review_feedback',
      type: 'string',
      description: 'Reviewer-authored change request.'
    },
    {
      name: 'version_id',
      type: 'string',
      description: 'Marketplace asset version identifier.'
    }
  ]);
  assert.deepEqual(contracts.template_review_approve_version.parameters, [
    {
      name: 'version_id',
      type: 'string',
      description: 'Marketplace asset version identifier.'
    }
  ]);
  assert.equal(
    contracts.template_review_run_published_site_validation.actionId,
    'run_published_validation'
  );
  assert.deepEqual(contracts.template_review_run_published_site_validation.parameters, [
    {
      name: 'published_url',
      type: 'string',
      description: 'Published template URL to validate.'
    }
  ]);

  const validationPlan = createMcpToolCallPlan(compiled, {
    caseId: 'published-validation-can-run',
    title: 'Published validation runs before a result exists',
    initialState: 'submitted',
    actionId: 'run_published_validation',
    actorId: 'workflow-runtime',
    evidence: { published_url: 'https://fixture-template.webflow.io' },
    approvals: [],
    expectedOutcome: 'pass',
    expectedState: 'submitted'
  });
  assert.equal(validationPlan.disposition, 'pass');
  assert.equal(validationPlan.canInvoke, true);
  assert.deepEqual(validationPlan.invocation, {
    operation: 'tools/call',
    targetSystemId: 'template-review-mcp',
    tool: {
      name: 'template_review_run_published_site_validation',
      arguments: { published_url: 'https://fixture-template.webflow.io' }
    }
  });
});

test('fails closed when a transition references an unknown action', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  definition.transitions[0].actionId = 'missing-action';

  assert.throws(
    () => compileWorkflowDefinition(definition),
    (error) => {
      assert.equal(error.name, 'WorkflowCompilationError');
      assert.deepEqual(
        error.diagnostics.map((diagnostic) => diagnostic.code),
        ['UNKNOWN_TRANSITION_ACTION']
      );
      return true;
    }
  );
});
