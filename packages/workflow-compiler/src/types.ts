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

export interface WorkflowEvidenceMatcher {
  kind: 'contains_case_insensitive';
  values: string[];
}

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

export interface WorkflowAction {
  id: string;
  title: string;
  kind: ActionKind;
  authority: string;
  autonomy: AutonomyClass;
  systemsTouched: string[];
  requiredEvidence: string[];
  requiredEvidenceValues?: Record<string, WorkflowEvidenceValue>;
  requiredEvidenceMatchers?: Record<string, WorkflowEvidenceMatcher>;
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

export interface WorkflowDefinition {
  schemaVersion: WorkflowDefinitionSchemaVersion;
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
  actions: WorkflowAction[];
  transitions: WorkflowTransition[];
  agents: WorkflowAgent[];
  evaluations: WorkflowEvaluation[];
}

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

export interface CompiledDecision {
  actionId: string;
  title: string;
  kind: ActionKind;
  authority: string;
  autonomy: AutonomyClass;
  systemsTouched: string[];
  requiredEvidence: string[];
  requiredEvidenceValues?: Record<string, WorkflowEvidenceValue>;
  requiredEvidenceMatchers?: Record<string, WorkflowEvidenceMatcher>;
  approvalOwner?: string;
  receiptFields: string[];
  recovery: WorkflowAction['recovery'];
}

export interface DecisionInventoryArtifact extends CompiledArtifactHeader {
  schemaVersion: DecisionInventorySchemaVersion;
  decisions: CompiledDecision[];
}

export interface CompiledToolContract {
  actionId: string;
  name: string;
  targetSystemId: string;
  authority: string;
  autonomy: AutonomyClass;
  requiredEvidence: string[];
  receiptFields: string[];
  parameters?: WorkflowToolParameter[];
}

export interface ToolContractsArtifact extends CompiledArtifactHeader {
  schemaVersion: 'tool_contracts.v0.1';
  tools: CompiledToolContract[];
}

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

export interface CompiledApprovalSurface {
  actionId: string;
  title: string;
  mode: Exclude<AutonomyClass, 'auto_allow'>;
  owner: string;
  requiredEvidence: string[];
  recovery: WorkflowAction['recovery'];
}

export interface ApprovalSurfacesArtifact extends CompiledArtifactHeader {
  schemaVersion: 'approval_surfaces.v0.1';
  actions: CompiledApprovalSurface[];
}

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

export interface GovernedInteractionBundle extends CompiledArtifactHeader {
  schemaVersion: GovernedInteractionBundleSchemaVersion;
  language: 'create-something/control';
  runtimeVersion: '0.1.0';
  entrySurfaceId: string;
  capabilities: GovernedInteractionCapability[];
  surfaces: GovernedInteractionSurface[];
  actions: CompiledDecision[];
}

export interface CompiledWorkflowBundle {
  schemaVersion: CompiledWorkflowBundleSchemaVersion;
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
  decisionInventory: DecisionInventoryArtifact;
  toolContracts: ToolContractsArtifact;
  agentContracts: AgentContractsArtifact;
  approvalSurfaces: ApprovalSurfacesArtifact;
  evaluationManifest: EvaluationManifestArtifact;
  governedInteraction: GovernedInteractionBundle;
}

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

export interface WorkflowReplayResult {
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
  authority: string;
  owner: string;
  evidenceReferences: string[];
  missingEvidence: string[];
  evidenceMismatches: WorkflowEvidenceMismatch[];
  evidenceMatcherMismatches: WorkflowEvidenceMatcherMismatch[];
  recovery: WorkflowAction['recovery'];
  receipt: WorkflowReplayReceipt;
}

export type WorkflowAdapterDisposition = 'pass' | 'wait' | 'stop';

export type WorkflowAdapterReasonCode =
  | 'TOOL_CALL_READY'
  | 'APPROVAL_REQUIRED'
  | 'AUTHENTICATED_APPROVAL_REQUIRED'
  | 'GOVERNANCE_BLOCKED'
  | 'MISSING_TOOL_CONTRACT'
  | 'MISSING_TOOL_PARAMETER_CONTRACT'
  | 'INVALID_TOOL_ARGUMENTS'
  | 'INCOMPATIBLE_TOOL_NAME';

export interface WorkflowAdapterDiagnostic {
  code: 'MISSING_TOOL_ARGUMENT' | 'INVALID_TOOL_ARGUMENT_TYPE';
  path: string;
  message: string;
}

export interface WorkflowAdapterPlan {
  schemaVersion: 'workflow_adapter_plan.v0.1';
  adapter: 'mcp' | 'openai.responses';
  workflowId: string;
  workflowVersion: string;
  definitionHash: string;
  caseId: string;
  actionId: string;
  disposition: WorkflowAdapterDisposition;
  reasonCode: WorkflowAdapterReasonCode;
  governanceOutcome: ReplayOutcome;
  governanceReasonCode: WorkflowReplayResult['reasonCode'];
  canInvoke: boolean;
  authority: string;
  owner: string;
  recovery: WorkflowAction['recovery'];
  receipt: WorkflowReplayReceipt;
  diagnostics: WorkflowAdapterDiagnostic[];
}

export interface McpToolCallPlan extends WorkflowAdapterPlan {
  adapter: 'mcp';
  invocation?: {
    operation: 'tools/call';
    targetSystemId: string;
    tool: {
      name: string;
      arguments: Record<string, string | number | boolean>;
    };
  };
}

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

export interface OpenAIResponsesRequestPlan extends WorkflowAdapterPlan {
  adapter: 'openai.responses';
  expectedArguments?: Record<string, string | number | boolean>;
  request?: OpenAIResponsesRequest;
}

export interface WorkflowReplayReport extends CompiledArtifactHeader {
  schemaVersion: 'workflow_replay_report.v0.1';
  cases: WorkflowReplayResult[];
  counts: Record<ReplayOutcome, number>;
  allExpectationsMatched: boolean;
}

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
