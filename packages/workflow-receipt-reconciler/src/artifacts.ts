import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { writeWorkflowProposalArtifacts } from '@create-something/workflow-evidence-extractor';

import type { WorkflowReceiptReconciliation } from './types.js';

export async function writeWorkflowReceiptReconciliationArtifacts(
  reconciliation: WorkflowReceiptReconciliation,
  outDir: string,
): Promise<void> {
  await mkdir(outDir, { recursive: true });
  const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(join(outDir, 'corpus.json'), json(reconciliation.corpus), 'utf8');
  await writeFile(join(outDir, 'reconciliation.json'), json(reconciliation), 'utf8');
  await writeWorkflowProposalArtifacts(reconciliation.proposal, join(outDir, 'proposal'));
}
