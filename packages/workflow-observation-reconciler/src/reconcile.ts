import { createHash } from 'node:crypto';

import { compileWorkflowDefinition } from '@createsomething/workflow-compiler';
import {
  calculateWorkflowProposalHash,
  type WorkflowDefinitionProposal,
} from '@create-something/workflow-evidence-extractor';

import type {
  ReconcileWorkflowObservationInput,
  WorkflowObservation,
  WorkflowObservationReconciliation,
} from './types.js';

export const WORKFLOW_OBSERVATION_RECONCILER_VERSION = 'workflow-observation-reconciler-v0.1';

function hashReport(content: string): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function extractObservation(
  id: string,
  pattern: string,
  confidence: number,
  content: string,
): WorkflowObservation {
  const match = new RegExp(pattern, 'm').exec(content);
  if (!match || match[1] === undefined) {
    throw new Error(`Observation metric ${id} did not match the report`);
  }

  const value = Number.parseInt(match[1], 10);
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Observation metric ${id} did not produce a safe integer`);
  }

  const captureOffset = match.index + match[0].lastIndexOf(match[1]);
  const line = content.slice(0, captureOffset).split('\n').length;
  const excerpt = content.split('\n')[line - 1]?.trim() ?? '';

  return {
    id,
    value,
    confidence,
    sourcePointer: `line:${line}`,
    excerpt,
  };
}

export function reconcileWorkflowObservationReport(
  input: ReconcileWorkflowObservationInput,
): WorkflowObservationReconciliation {
  const baselineHash = compileWorkflowDefinition(input.baseline).definitionHash;
  const reportHash = hashReport(input.report.content);
  const observations = Object.entries(input.policy.metrics)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, metric]) =>
      extractObservation(id, metric.pattern, metric.confidence, input.report.content),
    );
  const observationIds = new Set(observations.map(({ id }) => id));
  const observationById = new Map(observations.map((observation) => [observation.id, observation]));
  const findings = (entries: typeof input.policy.alignments) =>
    entries
      .map((entry) => {
        const missingEvidence = entry.evidenceIds.filter((id) => !observationIds.has(id));
        if (missingEvidence.length > 0) {
          throw new Error(
            `Finding ${entry.id} references missing observations: ${missingEvidence.join(', ')}`,
          );
        }
        return structuredClone(entry);
      })
      .sort((left, right) => left.id.localeCompare(right.id));

  const evaluationEvidence = input.policy.evaluationProposals
    .flatMap((entry) => {
      const finding = input.policy.discrepancies.find(({ id }) => id === entry.findingId);
      if (!finding) {
        throw new Error(`Evaluation proposal references missing discrepancy ${entry.findingId}`);
      }
      return finding.evidenceIds.map((observationId) => {
        const observation = observationById.get(observationId);
        if (!observation) {
          throw new Error(`Evaluation proposal references missing observation ${observationId}`);
        }
        return {
          id: `evidence:observed:${entry.evaluation.id}:${observationId}`,
          claimType: 'evaluation' as const,
          targetPath: `/evaluations/${entry.evaluation.id}`,
          rawValue: observation.value,
          normalizedValue: entry.evaluation,
          confidence: Math.min(entry.confidence, observation.confidence),
          sourceId: input.report.id,
          sourceHash: reportHash,
          sourcePointer: observation.sourcePointer,
        };
      });
    })
    .sort((left, right) => left.id.localeCompare(right.id));
  const conflictEvidence = input.policy.conflicts.flatMap((entry) =>
    entry.evidenceIds.map((observationId) => {
      const observation = observationById.get(observationId);
      if (!observation) {
        throw new Error(`Conflict ${entry.id} references missing observation ${observationId}`);
      }
      return {
        id: `evidence:observed:conflict:${entry.id}:${observationId}`,
        claimType: 'evaluation' as const,
        targetPath: entry.targetPath,
        rawValue: observation.value,
        normalizedValue: entry.claimValue,
        confidence: observation.confidence,
        sourceId: input.report.id,
        sourceHash: reportHash,
        sourcePointer: observation.sourcePointer,
      };
    }),
  );
  const evidence = [...evaluationEvidence, ...conflictEvidence].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const evidenceIdsFor = (evaluationId: string) =>
    evaluationEvidence
      .filter(({ targetPath }) => targetPath === `/evaluations/${evaluationId}`)
      .map(({ id }) => id);
  const operations = input.policy.evaluationProposals
    .map((entry) => ({
      id: `operation:add-evaluation:${entry.evaluation.id}`,
      op: 'add' as const,
      path: '/evaluations/-' as const,
      proposedValue: structuredClone(entry.evaluation),
      confidence: entry.confidence,
      rationale: `Address observed discrepancy ${entry.findingId} with an approval-gated evaluation.`,
      provenanceIds: evidenceIdsFor(entry.evaluation.id),
      approvalRequired: true as const,
      status: 'proposed' as const,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const conflicts = input.policy.conflicts
    .map((entry) => {
      const provenanceIds = conflictEvidence
        .filter(({ targetPath }) => targetPath === entry.targetPath)
        .map(({ id }) => id);
      return {
        id: entry.id,
        targetPath: entry.targetPath,
        baselineValue: entry.baselineValue,
        claims: [{ value: entry.claimValue, provenanceIds }],
        resolution: 'operator_required' as const,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  const proposalBody: Omit<WorkflowDefinitionProposal, 'proposalHash'> = {
    schemaVersion: 'workflow_definition_proposal.v0.1',
    extractorVersion: WORKFLOW_OBSERVATION_RECONCILER_VERSION,
    workflowId: input.baseline.workflowId,
    baselineHash,
    sources: [
      {
        id: input.report.id,
        kind: 'observation_report',
        path: input.report.path,
        hash: reportHash,
      },
    ],
    evidence,
    operations,
    conflicts,
  };

  return {
    schemaVersion: 'workflow_observation_reconciliation.v0.1',
    reconcilerVersion: WORKFLOW_OBSERVATION_RECONCILER_VERSION,
    workflowId: input.baseline.workflowId,
    baselineHash,
    report: {
      id: input.report.id,
      path: input.report.path,
      hash: reportHash,
    },
    observations,
    alignments: findings(input.policy.alignments),
    discrepancies: findings(input.policy.discrepancies),
    limitations: findings(input.policy.limitations),
    proposal: {
      ...proposalBody,
      proposalHash: calculateWorkflowProposalHash(proposalBody),
    },
  };
}
