import { compileWorkflowDefinition, type WorkflowDefinition } from '@createsomething/workflow-compiler';
import {
  calculateWorkflowProposalHash,
  type WorkflowDefinitionProposal,
} from '@create-something/workflow-evidence-extractor';

import type {
  WorkflowHistoricalContextBundle,
  WorkflowHistoricalContextPolicy,
  WorkflowHistoricalContextReconciliation,
} from './types.js';

export interface ReconcileWorkflowHistoricalContextInput {
  baseline: WorkflowDefinition;
  bundle: WorkflowHistoricalContextBundle;
  policy: WorkflowHistoricalContextPolicy;
}

export function reconcileWorkflowHistoricalContext(
  input: ReconcileWorkflowHistoricalContextInput,
): WorkflowHistoricalContextReconciliation {
  const compiled = compileWorkflowDefinition(input.baseline);
  const discrepancyCases = input.bundle.cases.filter((entry) =>
    input.policy.discrepancyLabels.includes(entry.alignmentLabel),
  );
  const findings = discrepancyCases.map((entry) => {
    const rule = input.policy.rules.find((candidate) => {
      if (candidate.selectionStrata && !candidate.selectionStrata.includes(entry.selectionStratum)) {
        return false;
      }
      if (
        candidate.rejectionCategories &&
        (!entry.rejectionCategory || !candidate.rejectionCategories.includes(entry.rejectionCategory))
      ) {
        return false;
      }
      if (candidate.alignmentLabels && !candidate.alignmentLabels.includes(entry.alignmentLabel)) {
        return false;
      }
      if (candidate.requiresReviewFeedback && !entry.hasReviewFeedback) return false;
      return true;
    });
    if (!rule) throw new Error(`No historical-context rule matched ${entry.caseId}`);
    return {
      caseId: entry.caseId,
      ruleId: rule.id,
      classification: rule.classification,
      status: rule.status,
      confidence: rule.confidence,
      controlledEvidence: {
        selectionStratum: entry.selectionStratum,
        observedOutcome: entry.observedOutcome,
        ...(entry.rejectionCategory ? { rejectionCategory: entry.rejectionCategory } : {}),
        improvementAreas: [...entry.improvementAreas],
        hasReviewFeedback: entry.hasReviewFeedback,
        hasRejectionFeedback: entry.hasRejectionFeedback,
        hasDecisionDate: entry.hasDecisionDate,
      },
      sourcePointers: structuredClone(entry.sourcePointers),
    };
  });
  const contextSupportedCount = findings.filter(({ status }) => status === 'context_supported').length;
  const ambiguousCount = findings.filter(({ status }) => status === 'ambiguous').length;
  const proposalFor = (status: 'context_supported' | 'ambiguous') =>
    status === 'context_supported'
      ? input.policy.evaluationProposals.contextSupported
      : input.policy.evaluationProposals.ambiguity;
  const evidence = findings
    .map((finding) => {
      const configured = proposalFor(finding.status);
      return {
        id: `evidence:historical-context:${finding.caseId}`,
        claimType: 'evaluation' as const,
        targetPath: `/evaluations/${configured.evaluation.id}`,
        rawValue: {
          classification: finding.classification,
          controlledEvidence: finding.controlledEvidence,
        },
        normalizedValue: configured.evaluation,
        confidence: Math.min(finding.confidence, configured.confidence),
        sourceId: input.bundle.bundleId,
        sourceHash: input.bundle.source.hash,
        sourcePointer: `${finding.sourcePointers.outcome}|${finding.sourcePointers.alignment}`,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
  const operationFor = (configured: typeof input.policy.evaluationProposals.contextSupported) => ({
    id: `operation:add-evaluation:${configured.evaluation.id}`,
    op: 'add' as const,
    path: '/evaluations/-' as const,
    proposedValue: structuredClone(configured.evaluation),
    confidence: configured.confidence,
    rationale: `Add a governed evaluation backed by sanitized historical-context evidence.`,
    provenanceIds: evidence
      .filter(({ targetPath }) => targetPath === `/evaluations/${configured.evaluation.id}`)
      .map(({ id }) => id),
    approvalRequired: true as const,
    status: 'proposed' as const,
  });
  const baselineEvaluationIds = new Set(input.baseline.evaluations.map(({ id }) => id));
  const operations = [
    input.policy.evaluationProposals.contextSupported,
    input.policy.evaluationProposals.ambiguity,
  ]
    .filter(({ evaluation }) => !baselineEvaluationIds.has(evaluation.id))
    .map(operationFor)
    .sort((left, right) => left.id.localeCompare(right.id));
  const ambiguityEvidenceIds = evidence
    .filter(
      ({ targetPath }) =>
        targetPath === `/evaluations/${input.policy.evaluationProposals.ambiguity.evaluation.id}`,
    )
    .map(({ id }) => id);
  const conflicts =
    ambiguityEvidenceIds.length === 0
      ? []
      : [
          {
            id: input.policy.ambiguityConflict.id,
            targetPath: input.policy.ambiguityConflict.targetPath,
            baselineValue: 'not_defined',
            claims: [
              {
                value: 'operator_resolution_required',
                provenanceIds: ambiguityEvidenceIds,
              },
            ],
            resolution: 'operator_required' as const,
          },
        ];
  const proposalBody: Omit<WorkflowDefinitionProposal, 'proposalHash'> = {
    schemaVersion: 'workflow_definition_proposal.v0.1',
    extractorVersion: 'workflow-historical-context-reconciler-v0.1',
    workflowId: input.baseline.workflowId,
    baselineHash: compiled.definitionHash,
    sources: [
      {
        id: input.bundle.bundleId,
        kind: 'historical_context',
        path: input.bundle.source.path,
        hash: input.bundle.source.hash,
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
    schemaVersion: 'workflow_historical_context_reconciliation.v0.1',
    workflowId: input.baseline.workflowId,
    baselineHash: compiled.definitionHash,
    bundle: structuredClone(input.bundle),
    findings,
    coverage: {
      discrepancyCount: findings.length,
      contextSupportedCount,
      ambiguousCount,
      contextCoverageRate: findings.length === 0 ? 0 : contextSupportedCount / findings.length,
    },
    proposal,
  };
}
