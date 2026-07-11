import type { WorkflowDefinition } from '@create-something/workflow-compiler';

export type WorkflowEvidenceSourceKind =
  | 'agent_contract'
  | 'mcp_contract'
  | 'rule_catalog'
  | 'observation_report'
  | 'receipt_corpus'
  | 'historical_context';

export interface WorkflowEvidenceSource {
  id: string;
  kind: WorkflowEvidenceSourceKind;
  path: string;
  document: unknown;
}

export interface WorkflowEvidenceSourceRecord {
  id: string;
  kind: WorkflowEvidenceSourceKind;
  path: string;
  hash: string;
}

export interface WorkflowEvidenceRecord {
  id: string;
  claimType: 'owner' | 'system' | 'autonomy' | 'evaluation';
  targetPath: string;
  rawValue: unknown;
  normalizedValue: unknown;
  confidence: number;
  sourceId: string;
  sourceHash: string;
  sourcePointer: string;
}

export interface WorkflowProposalOperation {
  id: string;
  op: 'add';
  path: '/systems/-' | '/evaluations/-';
  proposedValue: unknown;
  confidence: number;
  rationale: string;
  provenanceIds: string[];
  approvalRequired: true;
  status: 'proposed';
}

export interface WorkflowProposalConflictClaim {
  value: unknown;
  provenanceIds: string[];
}

export interface WorkflowProposalConflict {
  id: string;
  targetPath: string;
  baselineValue: unknown;
  claims: WorkflowProposalConflictClaim[];
  resolution: 'operator_required';
}

export interface WorkflowExtractionPolicy {
  schemaVersion: 'workflow_extraction_policy.v0.1';
  systemMappings: Record<
    string,
    {
      id: string;
      tier: 'database' | 'automation' | 'judgment';
      sourceOfTruth: boolean;
    }
  >;
  ruleMappings: Record<
    string,
    {
      actionId: string;
      expectedOutcome: 'pass' | 'approval_required' | 'blocked';
    }
  >;
  agentActionMappings: Array<{
    contains: string;
    actionId: string;
  }>;
  mcpToolMappings: Record<string, { actionIds: string[] }>;
}

export interface WorkflowDefinitionProposal {
  schemaVersion: 'workflow_definition_proposal.v0.1';
  extractorVersion: string;
  workflowId: string;
  baselineHash: string;
  proposalHash: string;
  sources: WorkflowEvidenceSourceRecord[];
  evidence: WorkflowEvidenceRecord[];
  operations: WorkflowProposalOperation[];
  conflicts: WorkflowProposalConflict[];
}

export interface ExtractWorkflowDefinitionInput {
  baseline: WorkflowDefinition;
  sources: WorkflowEvidenceSource[];
  policy?: WorkflowExtractionPolicy;
}

export interface WorkflowEvidenceSourceDescriptor {
  id: string;
  kind: WorkflowEvidenceSourceKind;
  path: string;
}

export interface WorkflowProposalApprovalManifest {
  schemaVersion: 'workflow_proposal_approval.v0.1';
  baselineHash: string;
  proposalHash: string;
  approvedOperationIds: string[];
  rejectedOperationIds: string[];
  acknowledgedConflictIds: string[];
  operator: string;
  approvedAt: string;
}

export interface WorkflowProposalApprovalDiagnostic {
  code:
    | 'BASELINE_HASH_MISMATCH'
    | 'PROPOSAL_HASH_MISMATCH'
    | 'UNREVIEWED_OPERATIONS'
    | 'UNKNOWN_OPERATION_DECISION'
    | 'DUPLICATE_OPERATION_DECISION'
    | 'UNACKNOWLEDGED_CONFLICTS';
  message: string;
  ids: string[];
}

export interface WorkflowProposalApplicationResult {
  schemaVersion: 'workflow_proposal_application.v0.1';
  definition: WorkflowDefinition;
  appliedOperationIds: string[];
  rejectedOperationIds: string[];
  acknowledgedConflictIds: string[];
  compilerProof: {
    definitionHash: string;
    compilerVersion: string;
  };
}
