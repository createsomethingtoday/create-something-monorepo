import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  compileWorkflowDefinition,
  createNotionCustomAgentBlueprint,
  evaluateNotionCustomAgentInstallation,
  evaluateNotionCustomAgentOperationalReceipts
} from '../dist/index.js';

const workflowUrl = new URL('../fixtures/notion-custom-agent/workflow.json', import.meta.url);

function readOnlyBlueprintInput() {
  return {
    schemaVersion: 'notion_custom_agent_blueprint_input.v0.1',
    blueprintId: 'agency-ops-evidence-triage.v0.1',
    agentId: 'agency-ops-evidence-triage',
    instructions: {
      sourceRef: 'policy://agency-ops/evidence-triage/v0.1',
      sha256: 'sha256:instruction-fixture-v0.1'
    },
    resourceAccess: [
      {
        resourceRef: 'notion-data-source://sanitized-agency-ops-evidence',
        kind: 'notion_data_source',
        level: 'can_view',
        purpose: 'Read sanitized evidence records for a manual review.'
      }
    ],
    triggers: [
      {
        triggerId: 'manual-review',
        kind: 'manual',
        intent: 'Run only when an operator explicitly requests evidence triage.'
      }
    ],
    toolBindings: [
      {
        actionId: 'inspect_evidence_readiness',
        key: 'inspectEvidenceReadiness',
        runtime: 'notion_worker',
        contractRef: 'notion-worker://agency-ops/inspectEvidenceReadiness@v0.1'
      }
    ]
  };
}

test('compiles a read-only Custom Agent blueprint that waits for installation readback', async () => {
  const workflow = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const compiled = compileWorkflowDefinition(workflow);

  const blueprint = createNotionCustomAgentBlueprint(compiled, {
    schemaVersion: 'notion_custom_agent_blueprint_input.v0.1',
    blueprintId: 'agency-ops-evidence-triage.v0.1',
    agentId: 'agency-ops-evidence-triage',
    instructions: {
      sourceRef: 'policy://agency-ops/evidence-triage/v0.1',
      sha256: 'sha256:instruction-fixture-v0.1'
    },
    resourceAccess: [
      {
        resourceRef: 'notion-data-source://sanitized-agency-ops-evidence',
        kind: 'notion_data_source',
        level: 'can_view',
        purpose: 'Read sanitized evidence records for a manual review.'
      }
    ],
    triggers: [
      {
        triggerId: 'manual-review',
        kind: 'manual',
        intent: 'Run only when an operator explicitly requests evidence triage.'
      }
    ],
    toolBindings: [
      {
        actionId: 'inspect_evidence_readiness',
        key: 'inspectEvidenceReadiness',
        runtime: 'notion_worker',
        contractRef: 'notion-worker://agency-ops/inspectEvidenceReadiness@v0.1'
      }
    ]
  });

  assert.deepEqual(blueprint, {
    schemaVersion: 'notion_agent_blueprint.v0.1',
    workflowId: 'agency-ops.evidence-triage',
    workflowVersion: '0.1.0',
    definitionHash: compiled.definitionHash,
    blueprintId: 'agency-ops-evidence-triage.v0.1',
    host: 'notion_custom_agent',
    agent: {
      id: 'agency-ops-evidence-triage',
      title: 'Agency Ops evidence triage',
      purpose: 'Summarize evidence gaps without changing Notion or an external system.',
      instructions: {
        sourceRef: 'policy://agency-ops/evidence-triage/v0.1',
        sha256: 'sha256:instruction-fixture-v0.1'
      },
      escalationOwner: 'agency-ops-lead'
    },
    resourceAccess: [
      {
        resourceRef: 'notion-data-source://sanitized-agency-ops-evidence',
        kind: 'notion_data_source',
        level: 'can_view',
        purpose: 'Read sanitized evidence records for a manual review.'
      }
    ],
    triggers: [
      {
        triggerId: 'manual-review',
        kind: 'manual',
        intent: 'Run only when an operator explicitly requests evidence triage.'
      }
    ],
    toolBindings: [
      {
        actionId: 'inspect_evidence_readiness',
        key: 'inspectEvidenceReadiness',
        runtime: 'notion_worker',
        contractRef: 'notion-worker://agency-ops/inspectEvidenceReadiness@v0.1',
        targetSystemId: 'notion-worker',
        kind: 'read',
        authority: 'agency-ops-operator',
        autonomy: 'auto_allow',
        parameters: [
          {
            name: 'include_drafts',
            type: 'boolean',
            description: 'Whether draft evidence is included in the read-only summary.'
          },
          {
            name: 'lookback_days',
            type: 'number',
            description: 'Number of days of evidence to inspect.'
          },
          {
            name: 'workflow_reference',
            type: 'string',
            description: 'Sanitized workflow record reference to inspect.'
          }
        ],
        requiredEvidence: ['include_drafts', 'lookback_days', 'workflow_reference'],
        receiptFields: ['action_id', 'correlation_id', 'outcome', 'workflow_id'],
        recovery: {
          mode: 'manual_fallback',
          owner: 'agency-ops-lead',
          path: 'Pause the agent, retain the inspection result, and ask an operator to review the selected record.'
        },
        readOnlyHint: true
      }
    ],
    installation: {
      disposition: 'wait',
      reasonCode: 'CONFIGURATION_RECEIPT_REQUIRED',
      requiredReceipts: ['configuration', 'activation', 'run', 'tool']
    }
  });
});

test('rejects mutating Notion resource access without a governed write or publish action', async () => {
  const workflow = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const compiled = compileWorkflowDefinition(workflow);
  const input = readOnlyBlueprintInput();
  input.resourceAccess[0].level = 'can_edit';

  assert.throws(
    () => createNotionCustomAgentBlueprint(compiled, input),
    (error) => error?.code === 'MUTATING_RESOURCE_ACCESS_REQUIRES_WRITE_ACTION'
  );
});

test('freezes and provenance-checks compiled blueprints before either evaluator trusts them', async () => {
  const workflow = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const compiled = compileWorkflowDefinition(workflow);
  const blueprint = createNotionCustomAgentBlueprint(compiled, readOnlyBlueprintInput());

  assert.throws(() => {
    blueprint.toolBindings[0].kind = 'write';
  }, TypeError);

  const detachedBlueprint = structuredClone(blueprint);
  detachedBlueprint.toolBindings[0].kind = 'write';

  assert.throws(
    () => evaluateNotionCustomAgentInstallation(detachedBlueprint),
    (error) => error?.code === 'UNVERIFIED_NOTION_CUSTOM_AGENT_BLUEPRINT'
  );
  assert.throws(
    () => evaluateNotionCustomAgentOperationalReceipts(detachedBlueprint),
    (error) => error?.code === 'UNVERIFIED_NOTION_CUSTOM_AGENT_BLUEPRINT'
  );
});

test('stops an unconfirmed approval-required decision tool receipt', async () => {
  const workflow = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const action = workflow.actions.find((candidate) => candidate.id === 'inspect_evidence_readiness');
  action.kind = 'decision';
  action.autonomy = 'approval_required';
  action.approval = { required: true, owner: 'agency-ops-lead' };
  const compiled = compileWorkflowDefinition(workflow);
  const blueprint = createNotionCustomAgentBlueprint(compiled, readOnlyBlueprintInput());

  assert.deepEqual(
    evaluateNotionCustomAgentOperationalReceipts(blueprint, {
      schemaVersion: 'notion_custom_agent_operational_receipts.v0.1',
      blueprintId: 'agency-ops-evidence-triage.v0.1',
      activationReceipt: {
        triggerId: 'manual-review',
        runRef: 'notion-run://approval-required-decision',
        activationRef: 'notion-activation://approval-required-decision'
      },
      runReceipt: {
        runRef: 'notion-run://approval-required-decision'
      },
      toolReceipts: [
        {
          actionId: 'inspect_evidence_readiness',
          runRef: 'notion-run://approval-required-decision',
          toolInvocationRef: 'notion-worker-run://approval-required-decision',
          confirmationState: 'not_confirmed'
        }
      ],
      mutationReceipts: []
    }),
    {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: 'agency-ops-evidence-triage.v0.1',
      disposition: 'stop',
      reasonCode: 'CONSEQUENTIAL_TOOL_AUTONOMY_VIOLATION',
      missingActionIds: ['inspect_evidence_readiness']
    }
  );

  assert.deepEqual(
    evaluateNotionCustomAgentOperationalReceipts(blueprint, {
      schemaVersion: 'notion_custom_agent_operational_receipts.v0.1',
      blueprintId: 'agency-ops-evidence-triage.v0.1',
      activationReceipt: {
        triggerId: 'manual-review',
        runRef: 'notion-run://approval-required-decision-confirmed',
        activationRef: 'notion-activation://approval-required-decision-confirmed'
      },
      runReceipt: {
        runRef: 'notion-run://approval-required-decision-confirmed'
      },
      toolReceipts: [
        {
          actionId: 'inspect_evidence_readiness',
          runRef: 'notion-run://approval-required-decision-confirmed',
          toolInvocationRef: 'notion-worker-run://approval-required-decision-confirmed',
          confirmationState: 'confirmed'
        }
      ],
      mutationReceipts: []
    }),
    {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: 'agency-ops-evidence-triage.v0.1',
      disposition: 'pass',
      reasonCode: 'OPERATIONAL_RECEIPTS_MATCHED'
    }
  );
});

test('stops a blocked decision before it accepts any operational receipt', async () => {
  const workflow = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const action = workflow.actions.find((candidate) => candidate.id === 'inspect_evidence_readiness');
  action.kind = 'decision';
  action.autonomy = 'blocked';
  const compiled = compileWorkflowDefinition(workflow);
  const blueprint = createNotionCustomAgentBlueprint(compiled, readOnlyBlueprintInput());

  assert.deepEqual(
    evaluateNotionCustomAgentOperationalReceipts(blueprint, {
      schemaVersion: 'notion_custom_agent_operational_receipts.v0.1',
      blueprintId: 'agency-ops-evidence-triage.v0.1',
      activationReceipt: {
        triggerId: 'manual-review',
        runRef: 'notion-run://blocked-decision',
        activationRef: 'notion-activation://blocked-decision'
      },
      runReceipt: {
        runRef: 'notion-run://blocked-decision'
      },
      toolReceipts: [],
      mutationReceipts: []
    }),
    {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: 'agency-ops-evidence-triage.v0.1',
      disposition: 'stop',
      reasonCode: 'CONSEQUENTIAL_TOOL_AUTONOMY_VIOLATION',
      missingActionIds: ['inspect_evidence_readiness']
    }
  );
});

test('stops a mutation receipt attributed to a read-only binding', async () => {
  const workflow = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const compiled = compileWorkflowDefinition(workflow);
  const blueprint = createNotionCustomAgentBlueprint(compiled, readOnlyBlueprintInput());

  assert.deepEqual(
    evaluateNotionCustomAgentOperationalReceipts(blueprint, {
      schemaVersion: 'notion_custom_agent_operational_receipts.v0.1',
      blueprintId: 'agency-ops-evidence-triage.v0.1',
      activationReceipt: {
        triggerId: 'manual-review',
        runRef: 'notion-run://read-binding-mutation',
        activationRef: 'notion-activation://read-binding-mutation'
      },
      runReceipt: {
        runRef: 'notion-run://read-binding-mutation'
      },
      toolReceipts: [
        {
          actionId: 'inspect_evidence_readiness',
          runRef: 'notion-run://read-binding-mutation',
          toolInvocationRef: 'notion-worker-run://read-binding-mutation',
          confirmationState: 'not_required'
        }
      ],
      mutationReceipts: [
        {
          actionId: 'inspect_evidence_readiness',
          runRef: 'notion-run://read-binding-mutation',
          mutationRef: 'notion-mutation://read-binding-mutation'
        }
      ]
    }),
    {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: 'agency-ops-evidence-triage.v0.1',
      disposition: 'stop',
      reasonCode: 'NON_MUTATING_ACTION_MUTATION_RECEIPT',
      unexpectedMutationActionIds: ['inspect_evidence_readiness']
    }
  );
});

test('passes a supplied configuration receipt only when it matches the read-only blueprint', async () => {
  const workflow = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const compiled = compileWorkflowDefinition(workflow);
  const blueprint = createNotionCustomAgentBlueprint(compiled, {
    schemaVersion: 'notion_custom_agent_blueprint_input.v0.1',
    blueprintId: 'agency-ops-evidence-triage.v0.1',
    agentId: 'agency-ops-evidence-triage',
    instructions: {
      sourceRef: 'policy://agency-ops/evidence-triage/v0.1',
      sha256: 'sha256:instruction-fixture-v0.1'
    },
    resourceAccess: [
      {
        resourceRef: 'notion-data-source://sanitized-agency-ops-evidence',
        kind: 'notion_data_source',
        level: 'can_view',
        purpose: 'Read sanitized evidence records for a manual review.'
      }
    ],
    triggers: [
      {
        triggerId: 'manual-review',
        kind: 'manual',
        intent: 'Run only when an operator explicitly requests evidence triage.'
      }
    ],
    toolBindings: [
      {
        actionId: 'inspect_evidence_readiness',
        key: 'inspectEvidenceReadiness',
        runtime: 'notion_worker',
        contractRef: 'notion-worker://agency-ops/inspectEvidenceReadiness@v0.1'
      }
    ]
  });

  assert.deepEqual(
    evaluateNotionCustomAgentInstallation(blueprint, {
      schemaVersion: 'notion_custom_agent_configuration_receipt.v0.1',
      blueprintId: 'agency-ops-evidence-triage.v0.1',
      agentRef: 'notion-agent://agency-ops-evidence-triage-fixture',
      workflowDefinitionHash: compiled.definitionHash,
      instructionsSha256: 'sha256:instruction-fixture-v0.1',
      resourceAccess: [
        {
          resourceRef: 'notion-data-source://sanitized-agency-ops-evidence',
          kind: 'notion_data_source',
          level: 'can_view'
        }
      ],
      triggers: [{ triggerId: 'manual-review', kind: 'manual' }],
      toolBindings: [
        {
          actionId: 'inspect_evidence_readiness',
          key: 'inspectEvidenceReadiness',
          runtime: 'notion_worker',
          contractRef: 'notion-worker://agency-ops/inspectEvidenceReadiness@v0.1'
        }
      ]
    }),
    {
      schemaVersion: 'notion_custom_agent_installation_evaluation.v0.1',
      blueprintId: 'agency-ops-evidence-triage.v0.1',
      agentRef: 'notion-agent://agency-ops-evidence-triage-fixture',
      disposition: 'pass',
      reasonCode: 'CONFIGURATION_RECEIPT_MATCHED',
      requiredOperationalReceipts: ['activation', 'run', 'tool']
    }
  );
});

test('stops when a configuration receipt binds a different Worker contract', async () => {
  const workflow = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const compiled = compileWorkflowDefinition(workflow);
  const blueprint = createNotionCustomAgentBlueprint(compiled, {
    schemaVersion: 'notion_custom_agent_blueprint_input.v0.1',
    blueprintId: 'agency-ops-evidence-triage.v0.1',
    agentId: 'agency-ops-evidence-triage',
    instructions: {
      sourceRef: 'policy://agency-ops/evidence-triage/v0.1',
      sha256: 'sha256:instruction-fixture-v0.1'
    },
    resourceAccess: [
      {
        resourceRef: 'notion-data-source://sanitized-agency-ops-evidence',
        kind: 'notion_data_source',
        level: 'can_view',
        purpose: 'Read sanitized evidence records for a manual review.'
      }
    ],
    triggers: [
      {
        triggerId: 'manual-review',
        kind: 'manual',
        intent: 'Run only when an operator explicitly requests evidence triage.'
      }
    ],
    toolBindings: [
      {
        actionId: 'inspect_evidence_readiness',
        key: 'inspectEvidenceReadiness',
        runtime: 'notion_worker',
        contractRef: 'notion-worker://agency-ops/inspectEvidenceReadiness@v0.1'
      }
    ]
  });

  assert.deepEqual(
    evaluateNotionCustomAgentInstallation(blueprint, {
      schemaVersion: 'notion_custom_agent_configuration_receipt.v0.1',
      blueprintId: 'agency-ops-evidence-triage.v0.1',
      agentRef: 'notion-agent://agency-ops-evidence-triage-fixture',
      workflowDefinitionHash: compiled.definitionHash,
      instructionsSha256: 'sha256:instruction-fixture-v0.1',
      resourceAccess: [
        {
          resourceRef: 'notion-data-source://sanitized-agency-ops-evidence',
          kind: 'notion_data_source',
          level: 'can_view'
        }
      ],
      triggers: [{ triggerId: 'manual-review', kind: 'manual' }],
      toolBindings: [
        {
          actionId: 'inspect_evidence_readiness',
          key: 'inspectEvidenceReadiness',
          runtime: 'notion_worker',
          contractRef: 'notion-worker://agency-ops/inspectEvidenceReadiness@v0.2'
        }
      ]
    }),
    {
      schemaVersion: 'notion_custom_agent_installation_evaluation.v0.1',
      blueprintId: 'agency-ops-evidence-triage.v0.1',
      agentRef: 'notion-agent://agency-ops-evidence-triage-fixture',
      disposition: 'stop',
      reasonCode: 'CONFIGURATION_RECEIPT_MISMATCH',
      mismatchFields: ['toolBindings'],
      requiredOperationalReceipts: ['activation', 'run', 'tool']
    }
  );
});

test('stops a write binding without confirmation and mutation proof', async () => {
  const workflow = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const compiled = compileWorkflowDefinition(workflow);
  const blueprint = createNotionCustomAgentBlueprint(compiled, {
    schemaVersion: 'notion_custom_agent_blueprint_input.v0.1',
    blueprintId: 'agency-ops-review-suggestion.v0.1',
    agentId: 'agency-ops-evidence-triage',
    instructions: {
      sourceRef: 'policy://agency-ops/review-suggestion/v0.1',
      sha256: 'sha256:review-suggestion-instruction-fixture-v0.1'
    },
    resourceAccess: [
      {
        resourceRef: 'notion-data-source://sanitized-agency-ops-evidence',
        kind: 'notion_data_source',
        level: 'can_edit',
        purpose: 'Create a review-only suggestion after explicit confirmation.'
      }
    ],
    triggers: [
      {
        triggerId: 'manual-review-suggestion',
        kind: 'manual',
        intent: 'Run only after an operator asks to create a review suggestion.'
      }
    ],
    toolBindings: [
      {
        actionId: 'create_review_suggestion',
        key: 'createReviewSuggestion',
        runtime: 'notion_worker',
        contractRef: 'notion-worker://agency-ops/createReviewSuggestion@v0.1'
      }
    ]
  });

  assert.deepEqual(blueprint.installation.requiredReceipts, [
    'configuration',
    'activation',
    'run',
    'tool',
    'mutation'
  ]);

  assert.deepEqual(evaluateNotionCustomAgentInstallation(blueprint), {
    schemaVersion: 'notion_custom_agent_installation_evaluation.v0.1',
    blueprintId: 'agency-ops-review-suggestion.v0.1',
    disposition: 'wait',
    reasonCode: 'CONFIGURATION_RECEIPT_REQUIRED',
    requiredOperationalReceipts: ['activation', 'run', 'tool', 'mutation']
  });

  assert.deepEqual(
    evaluateNotionCustomAgentOperationalReceipts(blueprint, {
      schemaVersion: 'notion_custom_agent_operational_receipts.v0.1',
      blueprintId: 'agency-ops-review-suggestion.v0.1',
      activationReceipt: {
        triggerId: 'manual-review-suggestion',
        runRef: 'notion-run://agency-ops-review-suggestion-fixture',
        activationRef: 'notion-activation://agency-ops-review-suggestion-fixture'
      },
      runReceipt: {
        runRef: 'notion-run://agency-ops-review-suggestion-fixture'
      },
      toolReceipts: [
        {
          actionId: 'create_review_suggestion',
          runRef: 'notion-run://agency-ops-review-suggestion-fixture',
          toolInvocationRef: 'notion-worker-run://review-suggestion-fixture',
          confirmationState: 'not_confirmed'
        }
      ],
      mutationReceipts: []
    }),
    {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: 'agency-ops-review-suggestion.v0.1',
      disposition: 'stop',
      reasonCode: 'WRITE_CONFIRMATION_OR_MUTATION_RECEIPT_REQUIRED',
      missingActionIds: ['create_review_suggestion']
    }
  );

  assert.deepEqual(
    evaluateNotionCustomAgentOperationalReceipts(blueprint, {
      schemaVersion: 'notion_custom_agent_operational_receipts.v0.1',
      blueprintId: 'agency-ops-review-suggestion.v0.1',
      activationReceipt: {
        triggerId: 'manual-review-suggestion',
        runRef: 'notion-run://agency-ops-review-suggestion-current',
        activationRef: 'notion-activation://agency-ops-review-suggestion-fixture'
      },
      runReceipt: {
        runRef: 'notion-run://agency-ops-review-suggestion-current'
      },
      toolReceipts: [
        {
          actionId: 'create_review_suggestion',
          runRef: 'notion-run://agency-ops-review-suggestion-previous',
          toolInvocationRef: 'notion-worker-run://review-suggestion-previous',
          confirmationState: 'confirmed'
        }
      ],
      mutationReceipts: [
        {
          actionId: 'create_review_suggestion',
          runRef: 'notion-run://agency-ops-review-suggestion-previous',
          mutationRef: 'notion-mutation://review-suggestion-previous'
        }
      ]
    }),
    {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: 'agency-ops-review-suggestion.v0.1',
      disposition: 'stop',
      reasonCode: 'WRITE_CONFIRMATION_OR_MUTATION_RECEIPT_REQUIRED',
      missingActionIds: ['create_review_suggestion']
    }
  );

  assert.deepEqual(
    evaluateNotionCustomAgentOperationalReceipts(blueprint, {
      schemaVersion: 'notion_custom_agent_operational_receipts.v0.1',
      blueprintId: 'agency-ops-review-suggestion.v0.1',
      activationReceipt: {
        triggerId: 'manual-review-suggestion',
        runRef: 'notion-run://agency-ops-review-suggestion-current',
        activationRef: 'notion-activation://agency-ops-review-suggestion-fixture'
      },
      runReceipt: {
        runRef: 'notion-run://agency-ops-review-suggestion-current'
      },
      toolReceipts: [
        {
          actionId: 'create_review_suggestion',
          runRef: 'notion-run://agency-ops-review-suggestion-current',
          toolInvocationRef: 'notion-worker-run://review-suggestion-current',
          confirmationState: 'confirmed'
        }
      ],
      mutationReceipts: [
        {
          actionId: 'create_review_suggestion',
          runRef: 'notion-run://agency-ops-review-suggestion-current',
          mutationRef: 'notion-mutation://review-suggestion-current'
        }
      ]
    }),
    {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: 'agency-ops-review-suggestion.v0.1',
      disposition: 'pass',
      reasonCode: 'OPERATIONAL_RECEIPTS_MATCHED'
    }
  );

  assert.deepEqual(
    evaluateNotionCustomAgentOperationalReceipts(blueprint, {
      schemaVersion: 'notion_custom_agent_operational_receipts.v0.1',
      blueprintId: 'agency-ops-review-suggestion.v0.1',
      activationReceipt: {
        triggerId: 'manual-review-suggestion',
        runRef: 'notion-run://agency-ops-review-suggestion-previous',
        activationRef: 'notion-activation://agency-ops-review-suggestion-previous'
      },
      runReceipt: {
        runRef: 'notion-run://agency-ops-review-suggestion-current'
      },
      toolReceipts: [
        {
          actionId: 'create_review_suggestion',
          runRef: 'notion-run://agency-ops-review-suggestion-current',
          toolInvocationRef: 'notion-worker-run://review-suggestion-current',
          confirmationState: 'confirmed'
        }
      ],
      mutationReceipts: [
        {
          actionId: 'create_review_suggestion',
          runRef: 'notion-run://agency-ops-review-suggestion-current',
          mutationRef: 'notion-mutation://review-suggestion-current'
        }
      ]
    }),
    {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: 'agency-ops-review-suggestion.v0.1',
      disposition: 'stop',
      reasonCode: 'OPERATIONAL_RECEIPT_MISMATCH'
    }
  );

  assert.deepEqual(
    evaluateNotionCustomAgentOperationalReceipts(blueprint, {
      schemaVersion: 'notion_custom_agent_operational_receipts.v0.1',
      blueprintId: 'agency-ops-review-suggestion.v0.1',
      activationReceipt: {
        triggerId: 'manual-review-suggestion',
        runRef: 'notion-run://agency-ops-review-suggestion-current',
        activationRef: 'notion-activation://agency-ops-review-suggestion-current'
      },
      runReceipt: {
        runRef: 'notion-run://agency-ops-review-suggestion-current'
      },
      toolReceipts: [
        {
          actionId: 'create_review_suggestion',
          runRef: 'notion-run://agency-ops-review-suggestion-current',
          toolInvocationRef: 'notion-worker-run://review-suggestion-current',
          confirmationState: 'confirmed'
        },
        {
          actionId: 'unapproved_tool',
          runRef: 'notion-run://agency-ops-review-suggestion-current',
          toolInvocationRef: 'notion-worker-run://unapproved-tool-current',
          confirmationState: 'confirmed'
        }
      ],
      mutationReceipts: [
        {
          actionId: 'create_review_suggestion',
          runRef: 'notion-run://agency-ops-review-suggestion-current',
          mutationRef: 'notion-mutation://review-suggestion-current'
        },
        {
          actionId: 'unapproved_mutation',
          runRef: 'notion-run://agency-ops-review-suggestion-current',
          mutationRef: 'notion-mutation://unapproved-mutation-current'
        }
      ]
    }),
    {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: 'agency-ops-review-suggestion.v0.1',
      disposition: 'stop',
      reasonCode: 'UNDECLARED_RECEIPT_ACTION',
      unexpectedActionIds: ['unapproved_mutation', 'unapproved_tool']
    }
  );
});

test('waits for the missing operational receipt of a read-only binding', async () => {
  const workflow = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const compiled = compileWorkflowDefinition(workflow);
  const blueprint = createNotionCustomAgentBlueprint(compiled, {
    schemaVersion: 'notion_custom_agent_blueprint_input.v0.1',
    blueprintId: 'agency-ops-evidence-triage.v0.1',
    agentId: 'agency-ops-evidence-triage',
    instructions: {
      sourceRef: 'policy://agency-ops/evidence-triage/v0.1',
      sha256: 'sha256:instruction-fixture-v0.1'
    },
    resourceAccess: [
      {
        resourceRef: 'notion-data-source://sanitized-agency-ops-evidence',
        kind: 'notion_data_source',
        level: 'can_view',
        purpose: 'Read sanitized evidence records for a manual review.'
      }
    ],
    triggers: [
      {
        triggerId: 'manual-review',
        kind: 'manual',
        intent: 'Run only when an operator explicitly requests evidence triage.'
      }
    ],
    toolBindings: [
      {
        actionId: 'inspect_evidence_readiness',
        key: 'inspectEvidenceReadiness',
        runtime: 'notion_worker',
        contractRef: 'notion-worker://agency-ops/inspectEvidenceReadiness@v0.1'
      }
    ]
  });

  assert.deepEqual(
    evaluateNotionCustomAgentOperationalReceipts(blueprint, {
      schemaVersion: 'notion_custom_agent_operational_receipts.v0.1',
      blueprintId: 'agency-ops-evidence-triage.v0.1',
      activationReceipt: {
        triggerId: 'manual-review',
        runRef: 'notion-run://agency-ops-evidence-triage-fixture',
        activationRef: 'notion-activation://agency-ops-evidence-triage-fixture'
      },
      runReceipt: {
        runRef: 'notion-run://agency-ops-evidence-triage-fixture'
      },
      toolReceipts: [],
      mutationReceipts: []
    }),
    {
      schemaVersion: 'notion_custom_agent_operational_evaluation.v0.1',
      blueprintId: 'agency-ops-evidence-triage.v0.1',
      disposition: 'wait',
      reasonCode: 'OPERATIONAL_RECEIPTS_REQUIRED',
      missingActionIds: ['inspect_evidence_readiness']
    }
  );
});

test('stops a configuration receipt that expands the declared Notion resource scope', async () => {
  const workflow = JSON.parse(await readFile(workflowUrl, 'utf8'));
  const compiled = compileWorkflowDefinition(workflow);
  const blueprint = createNotionCustomAgentBlueprint(compiled, readOnlyBlueprintInput());

  assert.deepEqual(
    evaluateNotionCustomAgentInstallation(blueprint, {
      schemaVersion: 'notion_custom_agent_configuration_receipt.v0.1',
      blueprintId: 'agency-ops-evidence-triage.v0.1',
      agentRef: 'notion-agent://agency-ops-evidence-triage-fixture',
      workflowDefinitionHash: compiled.definitionHash,
      instructionsSha256: 'sha256:instruction-fixture-v0.1',
      resourceAccess: [
        {
          resourceRef: 'notion-data-source://sanitized-agency-ops-evidence',
          kind: 'notion_data_source',
          level: 'can_view'
        },
        {
          resourceRef: 'notion-page://unapproved-client-record',
          kind: 'notion_page',
          level: 'can_view'
        }
      ],
      triggers: [{ triggerId: 'manual-review', kind: 'manual' }],
      toolBindings: [
        {
          actionId: 'inspect_evidence_readiness',
          key: 'inspectEvidenceReadiness',
          runtime: 'notion_worker',
          contractRef: 'notion-worker://agency-ops/inspectEvidenceReadiness@v0.1'
        }
      ]
    }),
    {
      schemaVersion: 'notion_custom_agent_installation_evaluation.v0.1',
      blueprintId: 'agency-ops-evidence-triage.v0.1',
      agentRef: 'notion-agent://agency-ops-evidence-triage-fixture',
      disposition: 'stop',
      reasonCode: 'CONFIGURATION_RECEIPT_MISMATCH',
      mismatchFields: ['resourceAccess'],
      requiredOperationalReceipts: ['activation', 'run', 'tool']
    }
  );
});
