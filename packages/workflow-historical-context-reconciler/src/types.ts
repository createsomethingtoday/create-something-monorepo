export interface SanitizedHistoricalContextCase {
  id: string;
  caseId: string;
  selectionStratum: string;
  observedOutcome: string;
  alignmentLabel: string;
  rejectionCategory?: string;
  improvementAreas: string[];
  hasReviewFeedback: boolean;
  hasRejectionFeedback: boolean;
  hasDecisionDate: boolean;
  sourcePointers: {
    outcome: string;
    alignment: string;
  };
}

export interface WorkflowHistoricalContextBundle {
  schemaVersion: 'workflow_historical_context_bundle.v0.1';
  bundleId: string;
  source: {
    path: string;
    hash: string;
    files: Array<{ path: string; hash: string }>;
  };
  cases: SanitizedHistoricalContextCase[];
}

export interface WorkflowHistoricalContextRule {
  id: string;
  selectionStrata?: string[];
  rejectionCategories?: string[];
  alignmentLabels?: string[];
  requiresReviewFeedback?: boolean;
  classification: string;
  status: 'context_supported' | 'ambiguous';
  confidence: number;
}

export interface WorkflowHistoricalContextPolicy {
  schemaVersion: 'workflow_historical_context_policy.v0.1';
  discrepancyLabels: string[];
  rules: WorkflowHistoricalContextRule[];
  evaluationProposals: {
    contextSupported: { confidence: number; evaluation: WorkflowEvaluation };
    ambiguity: { confidence: number; evaluation: WorkflowEvaluation };
  };
  ambiguityConflict: {
    id: string;
    targetPath: string;
  };
}

export interface WorkflowHistoricalContextFinding {
  caseId: string;
  ruleId: string;
  classification: string;
  status: 'context_supported' | 'ambiguous';
  confidence: number;
  controlledEvidence: {
    selectionStratum: string;
    observedOutcome: string;
    rejectionCategory?: string;
    improvementAreas: string[];
    hasReviewFeedback: boolean;
    hasRejectionFeedback: boolean;
    hasDecisionDate: boolean;
  };
  sourcePointers: SanitizedHistoricalContextCase['sourcePointers'];
}

export interface WorkflowHistoricalContextReconciliation {
  schemaVersion: 'workflow_historical_context_reconciliation.v0.1';
  workflowId: string;
  baselineHash: string;
  bundle: WorkflowHistoricalContextBundle;
  findings: WorkflowHistoricalContextFinding[];
  coverage: {
    discrepancyCount: number;
    contextSupportedCount: number;
    ambiguousCount: number;
    contextCoverageRate: number;
  };
  proposal: WorkflowDefinitionProposal;
}
import type { WorkflowEvaluation } from '@createsomething/workflow-compiler';
import type { WorkflowDefinitionProposal } from '@create-something/workflow-evidence-extractor';
