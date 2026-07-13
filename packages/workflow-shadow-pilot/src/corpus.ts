import { loadSanitizedHistoricalContextBundle } from '@create-something/workflow-historical-context-reconciler';
import { loadWorkflowReceiptCorpusFromDirectory } from '@create-something/workflow-receipt-reconciler';

import type { WorkflowHistoricalContextBundle } from '@create-something/workflow-historical-context-reconciler';
import type { WorkflowReceiptCorpus } from '@create-something/workflow-receipt-reconciler';

import type { WorkflowPilotCorpusSummary } from './types.js';

export interface LoadedWorkflowPilotCorpus {
  receiptCorpus: WorkflowReceiptCorpus;
  historicalContext: WorkflowHistoricalContextBundle;
  summary: WorkflowPilotCorpusSummary;
}

export async function loadWorkflowPilotCorpus(
  corpusDir: string,
): Promise<LoadedWorkflowPilotCorpus> {
  const [receiptCorpus, historicalContext] = await Promise.all([
    loadWorkflowReceiptCorpusFromDirectory(corpusDir),
    loadSanitizedHistoricalContextBundle(corpusDir),
  ]);

  const receiptCaseIds = receiptCorpus.receipts
    .map((receipt) => receipt.id.replace(/^receipt:/, ''))
    .sort();
  const contextCaseIds = historicalContext.cases.map((entry) => entry.caseId).sort();
  if (JSON.stringify(receiptCaseIds) !== JSON.stringify(contextCaseIds)) {
    throw new Error('Receipt and historical-context case IDs do not join');
  }

  const reviewerCounts = new Map<string, number>();
  const strataCounts = new Map<string, number>();
  for (const receipt of receiptCorpus.receipts) {
    reviewerCounts.set(receipt.reviewer, (reviewerCounts.get(receipt.reviewer) ?? 0) + 1);
    strataCounts.set(
      receipt.selectionStratum,
      (strataCounts.get(receipt.selectionStratum) ?? 0) + 1,
    );
  }

  const caseCount = receiptCorpus.receipts.length;
  const maximumReviewerCount = Math.max(0, ...reviewerCounts.values());

  return {
    receiptCorpus,
    historicalContext,
    summary: {
      schemaVersion: 'workflow_shadow_corpus_summary.v0.1',
      caseCount,
      reviewerCount: reviewerCounts.size,
      maximumReviewerShare: caseCount === 0 ? 0 : maximumReviewerCount / caseCount,
      strataCounts: Object.fromEntries(
        [...strataCounts.entries()].sort(([left], [right]) => left.localeCompare(right)),
      ),
      receiptCorpusSha256: receiptCorpus.source.hash,
      historicalContextSha256: historicalContext.source.hash,
    },
  };
}
