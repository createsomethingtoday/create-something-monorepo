import type {
  ApprovalSurfacesArtifactV0_2,
  CompiledDecisionV0_2,
  CompiledWorkflowBundle,
  CompiledWorkflowBundleV0_1,
  ClientWorkspaceGovernedInteractionInspectionV0_1,
  DecisionInventoryArtifactV0_2,
  GovernedInteractionBundleV0_2,
  GovernedInteractionCompatibilityDecisionV0_1,
  GovernedInteractionHostContract,
  WorkflowAdapterPlan,
  WorkflowAdapterPlanV0_1,
  WorkflowAdapterPlanV0_2,
  WorkflowDefinitionV0_1,
  WorkflowDefinitionV0_2,
  WorkflowOperatorConsoleDataV0_1,
  WorkflowReplayReportV0_2
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
declare const constrainedApprovalSurfaces: ApprovalSurfacesArtifactV0_2;
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

// @ts-expect-error A v0.1 bundle cannot contain a v0.2 approval-surface artifact.
const invalidLegacyApprovalSurfacesBundle: CompiledWorkflowBundle = {
  ...legacyBundle,
  approvalSurfaces: constrainedApprovalSurfaces
};

const constrainedBundle: CompiledWorkflowBundle = {
  ...legacyBundle,
  schemaVersion: 'compiled_workflow_bundle.v0.2',
  decisionInventory: constrainedInventory,
  governedInteraction: constrainedInteraction,
  approvalSurfaces: constrainedApprovalSurfaces
};

void constrainedDecision;
void invalidLegacyInventoryBundle;
void invalidLegacyInteractionBundle;
void invalidLegacyApprovalSurfacesBundle;
void constrainedBundle;

declare const constrainedAdapterPlan: WorkflowAdapterPlanV0_2;

// @ts-expect-error A v0.1 adapter plan cannot carry a v0.2 replay reason code.
const invalidLegacyAdapterPlan: WorkflowAdapterPlanV0_1 = {
  ...constrainedAdapterPlan,
  schemaVersion: 'workflow_adapter_plan.v0.1'
};

const constrainedAdapterPlanAsPublic: WorkflowAdapterPlan = constrainedAdapterPlan;

void invalidLegacyAdapterPlan;
void constrainedAdapterPlanAsPublic;

const interactionHost: GovernedInteractionHostContract = {
  hostId: 'test-host',
  language: 'create-something/control',
  schemaVersions: ['governed_interaction_bundle.v0.1'],
  runtimeVersions: ['0.1.0'],
  capabilities: [],
  operations: []
};

const hostWithoutSchemaVersions: GovernedInteractionHostContract = {
  hostId: 'incomplete-host',
  language: 'create-something/control',
  runtimeVersions: ['0.1.0'],
  capabilities: [],
  operations: []
};

void interactionHost;
void hostWithoutSchemaVersions;

const legacyCompatibilityDecision: GovernedInteractionCompatibilityDecisionV0_1 = {
  schemaVersion: 'governed_interaction_compatibility.v0.1',
  compatible: true,
  hostId: 'legacy-host',
  language: 'create-something/control',
  runtimeVersion: '0.1.0',
  requiredCapabilities: [],
  requiredOperations: [],
  errors: []
};

const invalidLegacyCompatibilityDecision: GovernedInteractionCompatibilityDecisionV0_1 = {
  ...legacyCompatibilityDecision,
  errors: [
    {
      // @ts-expect-error Schema-support errors require compatibility decision v0.2.
      code: 'UNSUPPORTED_SCHEMA_VERSION',
      value: 'governed_interaction_bundle.v0.2'
    }
  ]
};

void legacyCompatibilityDecision;
void invalidLegacyCompatibilityDecision;

const legacyClientWorkspaceInspection: ClientWorkspaceGovernedInteractionInspectionV0_1 = {
  schemaVersion: 'client_workspace_governed_interaction_inspection.v0.1',
  bundle: legacyBundle.governedInteraction,
  compatibility: legacyCompatibilityDecision,
  authority: 'signed_delivery_read_only'
};

const invalidLegacyClientWorkspaceBundle: ClientWorkspaceGovernedInteractionInspectionV0_1 = {
  ...legacyClientWorkspaceInspection,
  // @ts-expect-error A v0.1 Client Workspace envelope cannot contain a v0.2 interaction bundle.
  bundle: constrainedInteraction
};

const invalidLegacyClientWorkspaceInspection: ClientWorkspaceGovernedInteractionInspectionV0_1 = {
  ...legacyClientWorkspaceInspection,
  compatibility: {
    ...legacyCompatibilityDecision,
    // @ts-expect-error A v0.1 Client Workspace envelope cannot contain a v0.2 compatibility receipt.
    schemaVersion: 'governed_interaction_compatibility.v0.2'
  }
};

void legacyClientWorkspaceInspection;
void invalidLegacyClientWorkspaceBundle;
void invalidLegacyClientWorkspaceInspection;

declare const legacyConsoleData: WorkflowOperatorConsoleDataV0_1;
declare const constrainedReplayReport: WorkflowReplayReportV0_2;

const invalidLegacyConsoleInventory: WorkflowOperatorConsoleDataV0_1 = {
  ...legacyConsoleData,
  // @ts-expect-error A v0.1 console cannot embed a v0.2 decision inventory.
  decisionInventory: constrainedInventory
};

const invalidLegacyConsoleReplay: WorkflowOperatorConsoleDataV0_1 = {
  ...legacyConsoleData,
  // @ts-expect-error A v0.1 console cannot embed a v0.2 replay report.
  replayReport: constrainedReplayReport
};

void invalidLegacyConsoleInventory;
void invalidLegacyConsoleReplay;
