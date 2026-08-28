import type { WorkflowEvaluation } from '@createsomething/workflow-compiler';
import type { WorkflowDefinitionProposal } from '@create-something/workflow-evidence-extractor';

export interface WorkflowReceiptReport {
  id: string;
  path: string;
  content: string;
}

export interface HistoricalWorkflowReceipt {
  id: string;
  templateName: string;
  selectionStratum: string;
  expectedReviewStatus: string;
  expectedQualityRating?: string;
  reviewer: string;
  evidenceStatus: string;
  findingCount: number;
  substantiveFindingCount: number;
  findingRuleIds: string[];
  alignmentLabel: string;
  sourcePointer: string;
}

export interface WorkflowReceiptCorpus {
  schemaVersion: 'workflow_receipt_corpus.v0.1';
  corpusId: string;
  source: {
    id: string;
    path: string;
    hash: string;
    files?: Array<{ path: string; hash: string }>;
  };
  receipts: HistoricalWorkflowReceipt[];
}

export interface WorkflowReceiptReconciliationPolicy {
  schemaVersion: 'workflow_receipt_reconciliation_policy.v0.1';
  sampling: {
    minimumCaseCount: number;
    minimumReviewerCount: number;
    maximumReviewerShare: number;
  };
  outcomeMappings: Record<
    string,
    {
      actionId: string;
      expectedGovernanceOutcome: 'pass' | 'approval_required' | 'blocked';
    }
  >;
  classificationMappings: Record<
    string,
    {
      classification: string;
      objectiveEvidenceExplainsOutcome: boolean;
      status: 'aligned' | 'discrepancy';
    }
  >;
  evaluationProposal: {
    confidence: number;
    evaluation: WorkflowEvaluation;
  };
  samplingConflictTargets: {
    insufficientCases: { id: string; targetPath: string };
    insufficientReviewers: { id: string; targetPath: string };
    reviewerConcentration: { id: string; targetPath: string };
  };
}

export interface WorkflowReceiptReplayResult {
  receiptId: string;
  actionId: string;
  observedOutcome: string;
  expectedGovernanceOutcome: 'pass' | 'approval_required' | 'blocked';
  classification: string;
  objectiveEvidenceExplainsOutcome: boolean;
  status: 'aligned' | 'discrepancy';
  provenance: {
    sourceId: string;
    sourceHash: string;
    sourcePointer: string;
  };
}

export interface WorkflowReceiptSamplingGate {
  status: 'pass' | 'blocked';
  caseCount: number;
  reviewerCount: number;
  maximumReviewer: string;
  maximumReviewerShare: number;
  reasons: string[];
}

export interface WorkflowReceiptReconciliation {
  schemaVersion: 'workflow_receipt_reconciliation.v0.1';
  workflowId: string;
  baselineHash: string;
  corpus: WorkflowReceiptCorpus;
  replays: WorkflowReceiptReplayResult[];
  samplingGate: WorkflowReceiptSamplingGate;
  proposal: WorkflowDefinitionProposal;
}
