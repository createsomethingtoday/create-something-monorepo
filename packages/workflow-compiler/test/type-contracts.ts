import type {
  CompiledDecisionV0_2,
  CompiledWorkflowBundle,
  CompiledWorkflowBundleV0_1,
  DecisionInventoryArtifactV0_2,
  GovernedInteractionBundleV0_2,
  WorkflowDefinitionV0_1,
  WorkflowDefinitionV0_2
} from '../src/index.js';

const legacyDefinition: WorkflowDefinitionV0_1 = {
  schemaVersion: 'workflow_definition.v0.1',
  workflowId: 'legacy-workflow',
  version: '1.0.0',
  title: 'Legacy workflow',
  businessObjective: 'Prove schema-discriminated action contracts.',
  owners: { workflow: 'operator', policy: 'operator', technical: 'operator' },
  systems: [],
  objects: [],
  events: [],
  actors: [],
  states: [],
  actions: [
    {
      id: 'legacy-action',
      title: 'Legacy action',
      kind: 'read',
      authority: 'operator',
      autonomy: 'auto_allow',
      systemsTouched: [],
      requiredEvidence: [],
      approval: { required: false },
      receipt: { requiredFields: [] },
      recovery: { mode: 'manual_fallback', owner: 'operator', path: 'Stop.' }
    }
  ],
  transitions: [],
  agents: [],
  evaluations: []
};

const invalidLegacyAction: WorkflowDefinitionV0_1['actions'][number] = {
  ...legacyDefinition.actions[0],
  // @ts-expect-error Evidence constraints are only valid for workflow_definition.v0.2.
  requiredEvidenceValues: { status: 'passed' }
};

const constrainedDefinition: WorkflowDefinitionV0_2 = {
  ...legacyDefinition,
  schemaVersion: 'workflow_definition.v0.2',
  actions: [
    {
      ...legacyDefinition.actions[0],
      requiredEvidenceValues: { status: 'passed' },
      requiredEvidenceMatchers: {
        summary: { kind: 'contains_case_insensitive', values: ['approved'] }
      }
    }
  ]
};

void legacyDefinition;
void invalidLegacyAction;
void constrainedDefinition;

declare const constrainedDecision: CompiledDecisionV0_2;
declare const constrainedInventory: DecisionInventoryArtifactV0_2;
declare const constrainedInteraction: GovernedInteractionBundleV0_2;
declare const legacyBundle: CompiledWorkflowBundleV0_1;

// @ts-expect-error A v0.1 bundle cannot contain a v0.2 decision inventory.
const invalidLegacyInventoryBundle: CompiledWorkflowBundle = {
  ...legacyBundle,
  decisionInventory: constrainedInventory
};

// @ts-expect-error A v0.1 bundle cannot contain a v0.2 governed interaction.
const invalidLegacyInteractionBundle: CompiledWorkflowBundle = {
  ...legacyBundle,
  governedInteraction: constrainedInteraction
};

const constrainedBundle: CompiledWorkflowBundle = {
  ...legacyBundle,
  schemaVersion: 'compiled_workflow_bundle.v0.2',
  decisionInventory: constrainedInventory,
  governedInteraction: constrainedInteraction
};

void constrainedDecision;
void invalidLegacyInventoryBundle;
void invalidLegacyInteractionBundle;
void constrainedBundle;
