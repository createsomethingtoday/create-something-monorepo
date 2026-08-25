import { compileWorkflowDefinition, type WorkflowDefinition } from '@createsomething/workflow-compiler';
import {
  calculateWorkflowProposalHash,
  type WorkflowDefinitionProposal,
} from '@create-something/workflow-evidence-extractor';

import type {
  WorkflowReceiptCorpus,
  WorkflowReceiptReconciliation,
  WorkflowReceiptReconciliationPolicy,
} from './types.js';

export interface ReconcileWorkflowReceiptCorpusInput {
  baseline: WorkflowDefinition;
  corpus: WorkflowReceiptCorpus;
  policy: WorkflowReceiptReconciliationPolicy;
}

export function reconcileWorkflowReceiptCorpus(
  input: ReconcileWorkflowReceiptCorpusInput,
): WorkflowReceiptReconciliation {
  const compiled = compileWorkflowDefinition(input.baseline);
  const actionIds = new Set(input.baseline.actions.map(({ id }) => id));
  const replays = input.corpus.receipts.map((receipt) => {
    const outcome = input.policy.outcomeMappings[receipt.expectedReviewStatus];
    if (!outcome) {
      throw new Error(`No outcome mapping for ${receipt.expectedReviewStatus}`);
    }
    if (!actionIds.has(outcome.actionId)) {
      throw new Error(`Outcome mapping references unknown action ${outcome.actionId}`);
    }
    const classification = input.policy.classificationMappings[receipt.alignmentLabel];
    if (!classification) {
      throw new Error(`No classification mapping for ${receipt.alignmentLabel}`);
    }
    return {
      receiptId: receipt.id,
      actionId: outcome.actionId,
      observedOutcome: receipt.expectedReviewStatus,
      expectedGovernanceOutcome: outcome.expectedGovernanceOutcome,
      classification: classification.classification,
      objectiveEvidenceExplainsOutcome: classification.objectiveEvidenceExplainsOutcome,
      status: classification.status,
      provenance: {
        sourceId: input.corpus.source.id,
        sourceHash: input.corpus.source.hash,
        sourcePointer: receipt.sourcePointer,
      },
    };
  });

  const reviewerCounts = new Map<string, number>();
  for (const receipt of input.corpus.receipts) {
    reviewerCounts.set(receipt.reviewer, (reviewerCounts.get(receipt.reviewer) ?? 0) + 1);
  }
  const reviewerRanking = [...reviewerCounts.entries()].sort(
    ([leftName, leftCount], [rightName, rightCount]) =>
      rightCount - leftCount || leftName.localeCompare(rightName),
  );
  const maximumReviewer = reviewerRanking[0]?.[0] ?? '';
  const maximumReviewerCount = reviewerRanking[0]?.[1] ?? 0;
  const caseCount = input.corpus.receipts.length;
  const maximumReviewerShare = caseCount === 0 ? 0 : maximumReviewerCount / caseCount;
  const reasons: string[] = [];
  if (caseCount < input.policy.sampling.minimumCaseCount) {
    reasons.push(`case_count ${caseCount} below minimum ${input.policy.sampling.minimumCaseCount}`);
  }
  if (reviewerCounts.size < input.policy.sampling.minimumReviewerCount) {
    reasons.push(
      `reviewer_count ${reviewerCounts.size} below minimum ${input.policy.sampling.minimumReviewerCount}`,
    );
  }
  if (maximumReviewerShare > input.policy.sampling.maximumReviewerShare) {
    reasons.push(
      `maximum_reviewer_share ${maximumReviewerShare} exceeded ${input.policy.sampling.maximumReviewerShare}`,
    );
  }
  const samplingGate = {
    status: reasons.length === 0 ? ('pass' as const) : ('blocked' as const),
    caseCount,
    reviewerCount: reviewerCounts.size,
    maximumReviewer,
    maximumReviewerShare,
    reasons,
  };

  const evaluation = input.policy.evaluationProposal.evaluation;
  const evidence = replays
    .map((replay) => ({
      id: `evidence:receipt:${replay.receiptId}`,
      claimType: 'evaluation' as const,
      targetPath: `/evaluations/${evaluation.id}`,
      rawValue: {
        observedOutcome: replay.observedOutcome,
        classification: replay.classification,
        objectiveEvidenceExplainsOutcome: replay.objectiveEvidenceExplainsOutcome,
      },
      normalizedValue: evaluation,
      confidence: input.policy.evaluationProposal.confidence,
      sourceId: replay.provenance.sourceId,
      sourceHash: replay.provenance.sourceHash,
      sourcePointer: replay.provenance.sourcePointer,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const provenanceIds = evidence.map(({ id }) => id);
  const operations = input.baseline.evaluations.some(({ id }) => id === evaluation.id)
    ? []
    : [
        {
          id: `operation:add-evaluation:${evaluation.id}`,
          op: 'add' as const,
          path: '/evaluations/-' as const,
          proposedValue: structuredClone(evaluation),
          confidence: input.policy.evaluationProposal.confidence,
          rationale: 'Require case-level receipt provenance when replaying historical outcome discrepancies.',
          provenanceIds,
          approvalRequired: true as const,
          status: 'proposed' as const,
        },
      ];
  const conflict = (
    target: { id: string; targetPath: string },
    baselineValue: unknown,
    value: unknown,
  ) => ({
    id: target.id,
    targetPath: target.targetPath,
    baselineValue,
    claims: [{ value, provenanceIds }],
    resolution: 'operator_required' as const,
  });
  const conflicts = [
    ...(caseCount < input.policy.sampling.minimumCaseCount
      ? [
          conflict(
            input.policy.samplingConflictTargets.insufficientCases,
            input.policy.sampling.minimumCaseCount,
            caseCount,
          ),
        ]
      : []),
    ...(reviewerCounts.size < input.policy.sampling.minimumReviewerCount
      ? [
          conflict(
            input.policy.samplingConflictTargets.insufficientReviewers,
            input.policy.sampling.minimumReviewerCount,
            reviewerCounts.size,
          ),
        ]
      : []),
    ...(maximumReviewerShare > input.policy.sampling.maximumReviewerShare
      ? [
          conflict(
            input.policy.samplingConflictTargets.reviewerConcentration,
            input.policy.sampling.maximumReviewerShare,
            { reviewer: maximumReviewer, share: maximumReviewerShare },
          ),
        ]
      : []),
  ].sort((left, right) => left.id.localeCompare(right.id));
  const proposalBody: Omit<WorkflowDefinitionProposal, 'proposalHash'> = {
    schemaVersion: 'workflow_definition_proposal.v0.1',
    extractorVersion: 'workflow-receipt-reconciler-v0.1',
    workflowId: input.baseline.workflowId,
    baselineHash: compiled.definitionHash,
    sources: [
      {
        id: input.corpus.corpusId,
        kind: 'receipt_corpus',
        path: input.corpus.source.path,
        hash: input.corpus.source.hash,
      },
    ],
    evidence,
    operations,
    conflicts,
  };
  const proposal = {
    ...proposalBody,
    proposalHash: calculateWorkflowProposalHash(proposalBody),
  };

  return {
    schemaVersion: 'workflow_receipt_reconciliation.v0.1',
    workflowId: input.baseline.workflowId,
    baselineHash: compiled.definitionHash,
    corpus: structuredClone(input.corpus),
    replays,
    samplingGate,
    proposal,
  };
}
