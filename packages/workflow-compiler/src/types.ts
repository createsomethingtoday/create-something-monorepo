export type ActionKind = 'read' | 'write' | 'decision' | 'publish';

export type AutonomyClass = 'auto_allow' | 'approval_required' | 'manual_only' | 'blocked';

export type SystemTier = 'database' | 'automation' | 'judgment';

export type WorkflowEvidenceValue = string | number | boolean;

export type WorkflowDefinitionSchemaVersion =
  | 'workflow_definition.v0.1'
  | 'workflow_definition.v0.2';

export type GovernedInteractionBundleSchemaVersion =
  | 'governed_interaction_bundle.v0.1'
  | 'governed_interaction_bundle.v0.2';

export type DecisionInventorySchemaVersion =
  | 'decision_inventory.v0.1'
  | 'decision_inventory.v0.2';

export type CompiledWorkflowBundleSchemaVersion =
  | 'compiled_workflow_bundle.v0.1'
  | 'compiled_workflow_bundle.v0.2';

export type WorkflowEvidenceMatcher =
  | {
      kind: 'contains_case_insensitive';
      values: string[];
    }
  | {
      kind: 'equals_one_of';
      values: string[];
    };

export interface WorkflowSystem {
  id: string;
  title: string;
  tier: SystemTier;
  owningSurface: string;
  sourceOfTruth: boolean;
}

export interface WorkflowObject {
  id: string;
  title: string;
  sourceSystemId: string;
  requiredFields: string[];
}

export interface WorkflowEvent {
  id: string;
  title: string;
  objectId: string;
  requiredEvidence: string[];
}

export interface WorkflowActor {
  id: string;
  title: string;
}

export interface WorkflowState {
  id: string;
  title: string;
  terminal?: boolean;
}

interface WorkflowActionBase {
  id: string;
  title: string;
  kind: ActionKind;
  authority: string;
  autonomy: AutonomyClass;
  systemsTouched: string[];
  requiredEvidence: string[];
  approval: {
    required: boolean;
    owner?: string;
  };
  receipt: {
    requiredFields: string[];
  };
  recovery: {
    mode: 'rollback' | 'escalate' | 'manual_fallback';
    owner: string;
    path: string;
  };
  tool?: {
    name: string;
    targetSystemId: string;
    parameters?: WorkflowToolParameter[];
  };
  agentId?: string;
}

export interface WorkflowActionV0_1 extends WorkflowActionBase {
  requiredEvidenceValues?: never;
  requiredEvidenceMatchers?: never;
}

export interface WorkflowActionV0_2 extends WorkflowActionBase {
  requiredEvidenceValues?: Record<string, WorkflowEvidenceValue>;
  requiredEvidenceMatchers?: Record<string, WorkflowEvidenceMatcher>;
}

export type WorkflowAction = WorkflowActionV0_1 | WorkflowActionV0_2;

export type WorkflowToolParameterType = 'string' | 'number' | 'boolean';

export interface WorkflowToolParameter {
  name: string;
  type: WorkflowToolParameterType;
  description: string;
}

export interface WorkflowAgent {
  id: string;
  title: string;
  purpose: string;
  allowedActionIds: string[];
  escalationOwner: string;
}

export interface WorkflowEvaluation {
  id: string;
  title: string;
  actionId: string;
  expectedOutcome: 'pass' | 'approval_required' | 'blocked';
  requiredEvidence: string[];
}

export interface WorkflowTransition {
  id: string;
  from: string;
  to: string;
  actionId: string;
}

interface WorkflowDefinitionBase {
  workflowId: string;
  version: string;
  title: string;
  businessObjective: string;
  owners: {
    workflow: string;
    policy: string;
    technical: string;
  };
  systems: WorkflowSystem[];
  objects: WorkflowObject[];
  events: WorkflowEvent[];
  actors: WorkflowActor[];
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  agents: WorkflowAgent[];
  evaluations: WorkflowEvaluation[];
}

export interface WorkflowDefinitionV0_1 extends WorkflowDefinitionBase {
  schemaVersion: 'workflow_definition.v0.1';
  actions: WorkflowActionV0_1[];
}

export interface WorkflowDefinitionV0_2 extends WorkflowDefinitionBase {
  schemaVersion: 'workflow_definition.v0.2';
  actions: WorkflowActionV0_2[];
}

export type WorkflowDefinition = WorkflowDefinitionV0_1 | WorkflowDefinitionV0_2;

export interface WorkflowMapNode {
  id: string;
  kind: 'actor' | 'state' | 'action';
  title: string;
}

export interface WorkflowMapEdge {
  id: string;
  kind: 'authorizes' | 'transitions';
  from: string;
  to: string;
}

export interface WorkflowMap {
  schemaVersion: 'workflow_map.v0.1';
  workflowId: string;
  workflowVersion: string;
  nodes: WorkflowMapNode[];
  edges: WorkflowMapEdge[];
}

export interface CompiledArtifactHeader {
  workflowId: string;
  workflowVersion: string;
  definitionHash: string;
}

export interface RuntimeTargetsArtifact extends CompiledArtifactHeader {
  schemaVersion: 'runtime_targets.v0.1';
  systems: WorkflowSystem[];
}

export interface ObjectSchemasArtifact extends CompiledArtifactHeader {
  schemaVersion: 'object_schemas.v0.1';
  objects: WorkflowObject[];
}

export interface EventSchemasArtifact extends CompiledArtifactHeader {
  schemaVersion: 'event_schemas.v0.1';
  events: WorkflowEvent[];
}

interface CompiledDecisionBase {
  actionId: string;
  title: string;
  kind: ActionKind;
  authority: string;
  autonomy: AutonomyClass;
  systemsTouched: string[];
  requiredEvidence: string[];
  approvalOwner?: string;
  receiptFields: string[];
  recovery: WorkflowAction['recovery'];
}

export interface CompiledDecisionV0_1 extends CompiledDecisionBase {
  requiredEvidenceValues?: never;
  requiredEvidenceMatchers?: never;
  toolContract?: never;
}

export interface CompiledDecisionV0_2 extends CompiledDecisionBase {
  requiredEvidenceValues?: Record<string, WorkflowEvidenceValue>;
  requiredEvidenceMatchers?: Record<string, WorkflowEvidenceMatcher>;
  toolContract?: CompiledToolContractV0_2;
}

export type CompiledDecision = CompiledDecisionV0_1 | CompiledDecisionV0_2;

interface DecisionInventoryArtifactBase extends CompiledArtifactHeader {}

export interface DecisionInventoryArtifactV0_1 extends DecisionInventoryArtifactBase {
  schemaVersion: 'decision_inventory.v0.1';
  decisions: CompiledDecisionV0_1[];
}

export interface DecisionInventoryArtifactV0_2 extends DecisionInventoryArtifactBase {
  schemaVersion: 'decision_inventory.v0.2';
  decisions: CompiledDecisionV0_2[];
}

export type DecisionInventoryArtifact =
  | DecisionInventoryArtifactV0_1
  | DecisionInventoryArtifactV0_2;

interface CompiledToolContractBase {
  actionId: string;
  name: string;
  targetSystemId: string;
  authority: string;
  autonomy: AutonomyClass;
  requiredEvidence: string[];
  receiptFields: string[];
  parameters?: WorkflowToolParameter[];
}

export interface CompiledToolContractV0_1 extends CompiledToolContractBase {
  requiredEvidenceValues?: never;
  requiredEvidenceMatchers?: never;
}

export interface CompiledToolContractV0_2 extends CompiledToolContractBase {
  requiredEvidenceValues?: Record<string, WorkflowEvidenceValue>;
  requiredEvidenceMatchers?: Record<string, WorkflowEvidenceMatcher>;
}

export type CompiledToolContract = CompiledToolContractV0_1 | CompiledToolContractV0_2;

interface ToolContractsArtifactBase extends CompiledArtifactHeader {}

export interface ToolContractsArtifactV0_1 extends ToolContractsArtifactBase {
  schemaVersion: 'tool_contracts.v0.1';
  tools: CompiledToolContractV0_1[];
}

export interface ToolContractsArtifactV0_2 extends ToolContractsArtifactBase {
  schemaVersion: 'tool_contracts.v0.2';
  tools: CompiledToolContractV0_2[];
}

export type ToolContractsArtifact = ToolContractsArtifactV0_1 | ToolContractsArtifactV0_2;

export interface CompiledAgentContract extends WorkflowAgent {
  actionAutonomy: Array<{
    actionId: string;
    autonomy: AutonomyClass;
  }>;
}

export interface AgentContractsArtifact extends CompiledArtifactHeader {
  schemaVersion: 'agent_contracts.v0.1';
  agents: CompiledAgentContract[];
}

interface CompiledApprovalSurfaceBase {
  actionId: string;
  title: string;
  mode: Exclude<AutonomyClass, 'auto_allow'>;
  owner: string;
  requiredEvidence: string[];
  recovery: WorkflowAction['recovery'];
}

export interface CompiledApprovalSurfaceV0_1 extends CompiledApprovalSurfaceBase {
  requiredEvidenceValues?: never;
  requiredEvidenceMatchers?: never;
}

export interface CompiledApprovalSurfaceV0_2 extends CompiledApprovalSurfaceBase {
  requiredEvidenceValues?: Record<string, WorkflowEvidenceValue>;
  requiredEvidenceMatchers?: Record<string, WorkflowEvidenceMatcher>;
}

export type CompiledApprovalSurface =
  | CompiledApprovalSurfaceV0_1
  | CompiledApprovalSurfaceV0_2;

interface ApprovalSurfacesArtifactBase extends CompiledArtifactHeader {}

export interface ApprovalSurfacesArtifactV0_1 extends ApprovalSurfacesArtifactBase {
  schemaVersion: 'approval_surfaces.v0.1';
  actions: CompiledApprovalSurfaceV0_1[];
}

export interface ApprovalSurfacesArtifactV0_2 extends ApprovalSurfacesArtifactBase {
  schemaVersion: 'approval_surfaces.v0.2';
  actions: CompiledApprovalSurfaceV0_2[];
}

export type ApprovalSurfacesArtifact =
  | ApprovalSurfacesArtifactV0_1
  | ApprovalSurfacesArtifactV0_2;

export interface EvaluationManifestArtifact extends CompiledArtifactHeader {
  schemaVersion: 'evaluation_manifest.v0.1';
  evaluations: WorkflowEvaluation[];
}

export type GovernedInteractionCapability =
  | 'interaction.select'
  | 'receipt.inspect'
  | 'replay.inspect'
  | 'workflow.inspect';

export type GovernedInteractionOperation = {
  kind: 'select_replay_case';
};

export interface GovernedInteractionSurface {
  id: string;
  title: string;
  kind: 'workflow_overview';
  operations: GovernedInteractionOperation[];
}

interface GovernedInteractionBundleBase extends CompiledArtifactHeader {
  language: 'create-something/control';
  runtimeVersion: '0.1.0';
  entrySurfaceId: string;
  capabilities: GovernedInteractionCapability[];
  surfaces: GovernedInteractionSurface[];
}

export type GovernedInteractionDecisionV0_1 = Omit<CompiledDecisionV0_1, 'toolContract'>;

export type GovernedInteractionDecisionV0_2 = Omit<CompiledDecisionV0_2, 'toolContract'>;

export type GovernedInteractionDecision =
  | GovernedInteractionDecisionV0_1
  | GovernedInteractionDecisionV0_2;

export interface GovernedInteractionBundleV0_1 extends GovernedInteractionBundleBase {
  schemaVersion: 'governed_interaction_bundle.v0.1';
  actions: GovernedInteractionDecisionV0_1[];
}

export interface GovernedInteractionBundleV0_2 extends GovernedInteractionBundleBase {
  schemaVersion: 'governed_interaction_bundle.v0.2';
  actions: GovernedInteractionDecisionV0_2[];
}

export type GovernedInteractionBundle =
  | GovernedInteractionBundleV0_1
  | GovernedInteractionBundleV0_2;

interface CompiledWorkflowBundleBase {
  compilerVersion: string;
  workflowId: string;
  workflowVersion: string;
  title: string;
  businessObjective: string;
  owners: WorkflowDefinition['owners'];
  definitionHash: string;
  workflowMap: WorkflowMap;
  runtimeTargets: RuntimeTargetsArtifact;
  objectSchemas: ObjectSchemasArtifact;
  eventSchemas: EventSchemasArtifact;
  agentContracts: AgentContractsArtifact;
  evaluationManifest: EvaluationManifestArtifact;
}

export interface CompiledWorkflowBundleV0_1 extends CompiledWorkflowBundleBase {
  schemaVersion: 'compiled_workflow_bundle.v0.1';
  toolContracts: ToolContractsArtifactV0_1;
  decisionInventory: DecisionInventoryArtifactV0_1;
  governedInteraction: GovernedInteractionBundleV0_1;
  approvalSurfaces: ApprovalSurfacesArtifactV0_1;
}

export interface CompiledWorkflowBundleV0_2 extends CompiledWorkflowBundleBase {
  schemaVersion: 'compiled_workflow_bundle.v0.2';
  toolContracts: ToolContractsArtifactV0_2;
  decisionInventory: DecisionInventoryArtifactV0_2;
  governedInteraction: GovernedInteractionBundleV0_2;
  approvalSurfaces: ApprovalSurfacesArtifactV0_2;
}

export type CompiledWorkflowBundle =
  | CompiledWorkflowBundleV0_1
  | CompiledWorkflowBundleV0_2;

export interface WorkflowCompilationDiagnostic {
  code: string;
  path: string;
  message: string;
}

export type ReplayOutcome = 'pass' | 'approval_required' | 'blocked';

export interface WorkflowReplayCase {
  caseId: string;
  title: string;
  initialState: string;
  actionId: string;
  actorId: string;
  evidence: Record<string, unknown>;
  approvals: string[];
  expectedOutcome: ReplayOutcome;
  expectedState: string;
}

export interface WorkflowReplayManifest {
  schemaVersion: 'workflow_replay_manifest.v0.1';
  workflowId: string;
  cases: WorkflowReplayCase[];
}

export interface WorkflowReplayReceipt {
  schemaVersion: 'workflow_replay_receipt.v0.1';
  workflowId: string;
  workflowVersion: string;
  definitionHash: string;
  caseId: string;
  actionId: string;
  actorId: string;
  correlationId: string;
  outcome: ReplayOutcome;
  receiptFields: Record<string, unknown>;
}

export interface WorkflowEvidenceMismatch {
  field: string;
  expected: WorkflowEvidenceValue;
  actual: unknown;
}

export interface WorkflowEvidenceMatcherMismatch {
  field: string;
  matcher: WorkflowEvidenceMatcher;
  actual: unknown;
}

type WorkflowReplayReasonCodeV0_1 =
  | 'ACTION_ALLOWED'
  | 'APPROVAL_REQUIRED'
  | 'POLICY_BLOCKED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'UNKNOWN_ACTION'
  | 'UNKNOWN_ACTOR'
  | 'ACTOR_NOT_AUTHORIZED'
  | 'INVALID_TRANSITION';

interface WorkflowReplayResultBase {
  caseId: string;
  title: string;
  actionId: string;
  actorId: string;
  stateBefore: string;
  stateAfter: string;
  observedOutcome: ReplayOutcome;
  expectedOutcome: ReplayOutcome;
  expectationMatched: boolean;
  canExecute: boolean;
  authority: string;
  owner: string;
  evidenceReferences: string[];
  missingEvidence: string[];
  recovery: WorkflowAction['recovery'];
  receipt: WorkflowReplayReceipt;
}

export interface WorkflowReplayResultV0_1 extends WorkflowReplayResultBase {
  reasonCode: WorkflowReplayReasonCodeV0_1;
}

export interface WorkflowReplayResultV0_2 extends WorkflowReplayResultBase {
  reasonCode:
    | 'ACTION_ALLOWED'
    | 'APPROVAL_REQUIRED'
    | 'POLICY_BLOCKED'
    | 'INSUFFICIENT_EVIDENCE'
    | 'EVIDENCE_VALUE_MISMATCH'
    | 'EVIDENCE_MATCHER_MISMATCH'
    | 'UNKNOWN_ACTION'
    | 'UNKNOWN_ACTOR'
    | 'ACTOR_NOT_AUTHORIZED'
    | 'INVALID_TRANSITION';
  evidenceMismatches: WorkflowEvidenceMismatch[];
  evidenceMatcherMismatches: WorkflowEvidenceMatcherMismatch[];
}

export type WorkflowReplayResult = WorkflowReplayResultV0_1 | WorkflowReplayResultV0_2;

export type WorkflowAdapterDisposition = 'pass' | 'wait' | 'stop';

export type WorkflowAdapterReasonCode =
  | 'TOOL_CALL_READY'
  | 'APPROVAL_REQUIRED'
  | 'AUTHENTICATED_APPROVAL_REQUIRED'
  | 'GOVERNANCE_BLOCKED'
  | 'UNVERIFIED_COMPILED_BUNDLE'
  | 'MISSING_TOOL_CONTRACT'
  | 'MISSING_TOOL_PARAMETER_CONTRACT'
  | 'INVALID_TOOL_ARGUMENTS'
  | 'INCOMPATIBLE_TOOL_NAME';

export interface WorkflowAdapterDiagnostic {
  code: 'MISSING_TOOL_ARGUMENT' | 'INVALID_TOOL_ARGUMENT_TYPE';
  path: string;
  message: string;
}

export type WorkflowAdapterPlanSchemaVersion =
  | 'workflow_adapter_plan.v0.1'
  | 'workflow_adapter_plan.v0.2';

interface WorkflowAdapterPlanBase {
  adapter: 'mcp' | 'openai.responses';
  workflowId: string;
  workflowVersion: string;
  definitionHash: string;
  caseId: string;
  actionId: string;
  disposition: WorkflowAdapterDisposition;
  reasonCode: WorkflowAdapterReasonCode;
  governanceOutcome: ReplayOutcome;
  canInvoke: boolean;
  authority: string;
  owner: string;
  recovery: WorkflowAction['recovery'];
  receipt: WorkflowReplayReceipt;
  diagnostics: WorkflowAdapterDiagnostic[];
}

export interface WorkflowAdapterPlanV0_1 extends WorkflowAdapterPlanBase {
  schemaVersion: 'workflow_adapter_plan.v0.1';
  governanceReasonCode: WorkflowReplayResultV0_1['reasonCode'];
}

export interface WorkflowAdapterPlanV0_2 extends WorkflowAdapterPlanBase {
  schemaVersion: 'workflow_adapter_plan.v0.2';
  governanceReasonCode: WorkflowReplayResultV0_2['reasonCode'];
}

export type WorkflowAdapterPlan = WorkflowAdapterPlanV0_1 | WorkflowAdapterPlanV0_2;

export type McpToolCallPlan = WorkflowAdapterPlan & {
  adapter: 'mcp';
  invocation?: {
    operation: 'tools/call';
    targetSystemId: string;
    tool: {
      name: string;
      arguments: Record<string, string | number | boolean>;
    };
  };
};

export interface OpenAIResponsesFunctionTool {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<
      string,
      {
        type: WorkflowToolParameterType;
        description: string;
        enum: [string | number | boolean];
      }
    >;
    required: string[];
    additionalProperties: false;
  };
  strict: true;
}

export interface OpenAIResponsesRequest {
  model: string;
  instructions: string;
  input: string;
  tools: [OpenAIResponsesFunctionTool];
  tool_choice: { type: 'function'; name: string };
  parallel_tool_calls: false;
  store: false;
}

export type OpenAIResponsesRequestPlan = WorkflowAdapterPlan & {
  adapter: 'openai.responses';
  expectedArguments?: Record<string, string | number | boolean>;
  request?: OpenAIResponsesRequest;
};

export type WorkflowReplayReportSchemaVersion =
  | 'workflow_replay_report.v0.1'
  | 'workflow_replay_report.v0.2';

interface WorkflowReplayReportBase extends CompiledArtifactHeader {
  counts: Record<ReplayOutcome, number>;
  allExpectationsMatched: boolean;
}

export interface WorkflowReplayReportV0_1 extends WorkflowReplayReportBase {
  schemaVersion: 'workflow_replay_report.v0.1';
  cases: WorkflowReplayResultV0_1[];
}

export interface WorkflowReplayReportV0_2 extends WorkflowReplayReportBase {
  schemaVersion: 'workflow_replay_report.v0.2';
  cases: WorkflowReplayResultV0_2[];
}

export type WorkflowReplayReport = WorkflowReplayReportV0_1 | WorkflowReplayReportV0_2;

export interface EvidenceLedgerArtifact extends CompiledArtifactHeader {
  schemaVersion: 'evidence_ledger.v0.1';
  entries: WorkflowReplayReceipt[];
}

export interface WorkflowAcceptanceSummary extends CompiledArtifactHeader {
  schemaVersion: 'workflow_acceptance_summary.v0.1';
  compilerVersion: string;
  caseCount: number;
  counts: Record<ReplayOutcome, number>;
  allExpectationsMatched: boolean;
  governanceComplete: boolean;
  requiredCoverage: {
    pass: boolean;
    approvalRequired: boolean;
    blocked: boolean;
    insufficientEvidence: boolean;
    unknownAction: boolean;
  };
}
