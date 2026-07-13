import type { WorkflowDefinition, WorkflowEvaluation } from '@create-something/workflow-compiler';
import type { WorkflowDefinitionProposal } from '@create-something/workflow-evidence-extractor';

export interface WorkflowObservationReport {
  id: string;
  path: string;
  content: string;
}

export interface WorkflowObservationMetricPolicy {
  pattern: string;
  confidence: number;
}

export interface WorkflowObservationReconciliationPolicy {
  schemaVersion: 'workflow_observation_policy.v0.1';
  metrics: Record<string, WorkflowObservationMetricPolicy>;
  alignments: WorkflowObservationFindingPolicy[];
  discrepancies: WorkflowObservationFindingPolicy[];
  limitations: WorkflowObservationFindingPolicy[];
  evaluationProposals: WorkflowObservationEvaluationProposalPolicy[];
  conflicts: WorkflowObservationConflictPolicy[];
}

export interface WorkflowObservationFindingPolicy {
  id: string;
  statement: string;
  evidenceIds: string[];
  confidence: number;
}

export interface WorkflowObservationEvaluationProposalPolicy {
  findingId: string;
  confidence: number;
  evaluation: WorkflowEvaluation;
}

export interface WorkflowObservationConflictPolicy {
  id: string;
  targetPath: string;
  baselineValue: unknown;
  claimValue: unknown;
  evidenceIds: string[];
}

export interface WorkflowObservation {
  id: string;
  value: number;
  confidence: number;
  sourcePointer: string;
  excerpt: string;
}

export interface WorkflowObservationFinding {
  id: string;
  statement: string;
  evidenceIds: string[];
  confidence: number;
}

export interface WorkflowObservationReconciliation {
  schemaVersion: 'workflow_observation_reconciliation.v0.1';
  reconcilerVersion: string;
  workflowId: string;
  baselineHash: string;
  report: {
    id: string;
    path: string;
    hash: string;
  };
  observations: WorkflowObservation[];
  alignments: WorkflowObservationFinding[];
  discrepancies: WorkflowObservationFinding[];
  limitations: WorkflowObservationFinding[];
  proposal: WorkflowDefinitionProposal;
}

export interface ReconcileWorkflowObservationInput {
  baseline: WorkflowDefinition;
  report: WorkflowObservationReport;
  policy: WorkflowObservationReconciliationPolicy;
}
