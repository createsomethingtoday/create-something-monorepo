import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { compileWorkflowDefinition, WORKFLOW_COMPILER_VERSION } from '../dist/index.js';

const workflowFixture = new URL('../fixtures/marketplace/workflow.json', import.meta.url);

test('compiles a governed workflow map through the public interface', () => {
  const definition = {
    schemaVersion: 'workflow_definition.v0.1',
    workflowId: 'webflow.marketplace.template-review',
    version: '0.1.0',
    title: 'Webflow Marketplace template review',
    businessObjective: 'Reduce objective review work without removing reviewer ownership.',
    owners: {
      workflow: 'marketplace-review-lead',
      policy: 'senior-systems-architect',
      technical: 'senior-systems-architect',
    },
    systems: [
      {
        id: 'airtable-marketplace',
        title: 'Airtable Marketplace Assets',
        tier: 'database',
        owningSurface: 'Airtable Assets and Asset Versions',
        sourceOfTruth: true,
      },
    ],
    objects: [],
    events: [],
    actors: [{ id: 'marketplace-reviewer', title: 'Marketplace reviewer' }],
    states: [
      { id: 'submitted', title: 'Submitted' },
      { id: 'approved', title: 'Approved', terminal: true },
    ],
    actions: [
      {
        id: 'approve-template',
        title: 'Approve template',
        kind: 'decision',
        authority: 'marketplace-reviewer',
        autonomy: 'approval_required',
        systemsTouched: ['airtable-marketplace'],
        requiredEvidence: ['reviewer_id', 'version_id', 'review_summary'],
        approval: { required: true, owner: 'marketplace-reviewer' },
        receipt: {
          requiredFields: ['workflow_id', 'action_id', 'correlation_id', 'outcome'],
        },
        recovery: {
          mode: 'manual_fallback',
          owner: 'marketplace-reviewer',
          path: 'Keep the version in review and resolve the decision in Airtable.',
        },
      },
    ],
    transitions: [
      {
        id: 'submitted-to-approved',
        from: 'submitted',
        to: 'approved',
        actionId: 'approve-template',
      },
    ],
    agents: [],
    evaluations: [],
  };

  const compiled = compileWorkflowDefinition(definition);

  assert.equal(compiled.schemaVersion, 'compiled_workflow_bundle.v0.1');
  assert.equal(compiled.compilerVersion, WORKFLOW_COMPILER_VERSION);
  assert.equal(compiled.workflowId, definition.workflowId);
  assert.equal(compiled.workflowVersion, definition.version);
  assert.deepEqual(compiled.workflowMap.nodes, [
    { id: 'action:approve-template', kind: 'action', title: 'Approve template' },
    { id: 'actor:marketplace-reviewer', kind: 'actor', title: 'Marketplace reviewer' },
    { id: 'state:approved', kind: 'state', title: 'Approved' },
    { id: 'state:submitted', kind: 'state', title: 'Submitted' },
  ]);
  assert.deepEqual(compiled.workflowMap.edges, [
    {
      id: 'authority:marketplace-reviewer:approve-template',
      kind: 'authorizes',
      from: 'actor:marketplace-reviewer',
      to: 'action:approve-template',
    },
    {
      id: 'transition:submitted-to-approved:action',
      kind: 'transitions',
      from: 'state:submitted',
      to: 'action:approve-template',
    },
    {
      id: 'transition:submitted-to-approved:state',
      kind: 'transitions',
      from: 'action:approve-template',
      to: 'state:approved',
    },
  ]);
});

test('rejects a consequential action without evidence, receipt, and recovery contracts', () => {
  const invalidDefinition = {
    schemaVersion: 'workflow_definition.v0.1',
    workflowId: 'webflow.marketplace.template-review',
    version: '0.1.0',
    title: 'Webflow Marketplace template review',
    businessObjective: 'Keep review decisions governed.',
    owners: {
      workflow: 'marketplace-review-lead',
      policy: 'senior-systems-architect',
      technical: 'senior-systems-architect',
    },
    systems: [],
    objects: [],
    events: [],
    actors: [{ id: 'marketplace-reviewer', title: 'Marketplace reviewer' }],
    states: [{ id: 'submitted', title: 'Submitted' }],
    actions: [
      {
        id: 'approve-template',
        title: 'Approve template',
        kind: 'decision',
        authority: 'marketplace-reviewer',
        autonomy: 'approval_required',
        systemsTouched: [],
        requiredEvidence: [],
        approval: { required: false },
        receipt: { requiredFields: [] },
        recovery: { mode: 'manual_fallback', owner: '', path: '' },
      },
    ],
    transitions: [],
    agents: [],
    evaluations: [],
  };

  assert.throws(
    () => compileWorkflowDefinition(invalidDefinition),
    (error) => {
      assert.equal(error.name, 'WorkflowCompilationError');
      assert.deepEqual(
        error.diagnostics.map((diagnostic) => diagnostic.code),
        [
          'CONSEQUENTIAL_ACTION_MISSING_SYSTEM',
          'CONSEQUENTIAL_ACTION_MISSING_EVIDENCE',
          'APPROVAL_CONTRACT_REQUIRED',
          'RECEIPT_FIELDS_REQUIRED',
          'RECOVERY_OWNER_REQUIRED',
          'RECOVERY_PATH_REQUIRED',
        ],
      );
      return true;
    },
  );
});

test('rejects a tool parameter that is not governed as required evidence', async () => {
  const definition = JSON.parse(await readFile(workflowFixture, 'utf8'));
  definition.actions[0].tool.parameters.push({
    name: 'ambient_override',
    type: 'string',
    description: 'An undeclared ambient override.',
  });

  assert.throws(
    () => compileWorkflowDefinition(definition),
    (error) => {
      assert.equal(error.name, 'WorkflowCompilationError');
      assert.deepEqual(error.diagnostics, [
        {
          code: 'TOOL_PARAMETER_MISSING_EVIDENCE_CONTRACT',
          path: 'actions[0].tool.parameters[4].name',
          message:
            'Tool parameter ambient_override must be backed by required evidence for action validate_submission.',
        },
      ]);
      return true;
    },
  );
});
