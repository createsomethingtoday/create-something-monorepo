import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { WorkflowDefinition } from '@create-something/workflow-compiler';
import {
  reconcileWorkflowHistoricalContext,
  type WorkflowHistoricalContextBundle,
  type WorkflowHistoricalContextPolicy,
} from '@create-something/workflow-historical-context-reconciler';
import {
  reconcileWorkflowReceiptCorpus,
  type WorkflowReceiptCorpus,
  type WorkflowReceiptReconciliationPolicy,
} from '@create-something/workflow-receipt-reconciler';

import type { WorkflowPilotReconciliationSummary } from './types.js';

export class WorkflowPilotAmbiguityError extends Error {
  readonly code = 'AMBIGUITY_RESOLUTION_ATTEMPTED' as const;
  readonly expectedAmbiguousCount: number;
  readonly actualAmbiguousCount: number;

  constructor(expectedAmbiguousCount: number, actualAmbiguousCount: number) {
    super(
      `Workflow shadow pilot must preserve ${expectedAmbiguousCount} ambiguous case(s); observed ${actualAmbiguousCount}`,
    );
    this.name = 'WorkflowPilotAmbiguityError';
    this.expectedAmbiguousCount = expectedAmbiguousCount;
    this.actualAmbiguousCount = actualAmbiguousCount;
  }
}

export function assertWorkflowPilotAmbiguityPreserved(input: {
  expectedAmbiguousCount: number;
  actualAmbiguousCount: number;
  proposalApplied: boolean;
}): void {
  if (
    input.proposalApplied ||
    input.actualAmbiguousCount < input.expectedAmbiguousCount
  ) {
    throw new WorkflowPilotAmbiguityError(
      input.expectedAmbiguousCount,
      input.actualAmbiguousCount,
    );
  }
}

async function readJson<T>(repoRoot: string, relativePath: string): Promise<T> {
  return JSON.parse(await readFile(path.join(repoRoot, relativePath), 'utf8')) as T;
}

export async function createWorkflowPilotReconciliationSummary(input: {
  repoRoot: string;
  receiptCorpus: WorkflowReceiptCorpus;
  historicalContext: WorkflowHistoricalContextBundle;
}): Promise<WorkflowPilotReconciliationSummary> {
  const [baseline, receiptPolicy, historicalPolicy] = await Promise.all([
    readJson<WorkflowDefinition>(
      input.repoRoot,
      'packages/workflow-compiler/fixtures/marketplace/workflow.json',
    ),
    readJson<WorkflowReceiptReconciliationPolicy>(
      input.repoRoot,
      'packages/workflow-receipt-reconciler/fixtures/marketplace/reconciliation-policy.json',
    ),
    readJson<WorkflowHistoricalContextPolicy>(
      input.repoRoot,
      'packages/workflow-historical-context-reconciler/fixtures/marketplace/context-policy.json',
    ),
  ]);

  const receipt = reconcileWorkflowReceiptCorpus({
    baseline,
    corpus: input.receiptCorpus,
    policy: receiptPolicy,
  });
  const historical = reconcileWorkflowHistoricalContext({
    baseline,
    bundle: input.historicalContext,
    policy: historicalPolicy,
  });

  return {
    schemaVersion: 'workflow_shadow_reconciliation_summary.v0.1',
    samplingGateStatus: receipt.samplingGate.status,
    samplingFailureCount: receipt.samplingGate.reasons.length,
    discrepancyCount: historical.coverage.discrepancyCount,
    contextSupportedCount: historical.coverage.contextSupportedCount,
    ambiguousCount: historical.coverage.ambiguousCount,
    contextCoverageRate: historical.coverage.contextCoverageRate,
    receiptProposalSha256: receipt.proposal.proposalHash,
    historicalContextProposalSha256: historical.proposal.proposalHash,
    proposalApplied: false,
    cases: historical.findings
      .map((finding) => ({
        caseFingerprint: `sha256:${createHash('sha256').update(finding.caseId).digest('hex')}`,
        ruleId: finding.ruleId,
        classification: finding.classification,
        status: finding.status,
        controlledEvidence: structuredClone(finding.controlledEvidence),
        sourcePointers: structuredClone(finding.sourcePointers),
        missingEvidence:
          finding.status === 'ambiguous'
            ? [
                'decision_time_snapshot',
                'historical_decision_receipt',
                'override_or_exception_record',
              ]
            : [],
      }))
      .sort((left, right) => left.caseFingerprint.localeCompare(right.caseFingerprint)),
  };
}
