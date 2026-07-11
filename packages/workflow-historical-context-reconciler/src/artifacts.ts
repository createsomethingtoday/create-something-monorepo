import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { writeWorkflowProposalArtifacts } from '@create-something/workflow-evidence-extractor';

import type { WorkflowHistoricalContextReconciliation } from './types.js';

export async function writeWorkflowHistoricalContextArtifacts(
  reconciliation: WorkflowHistoricalContextReconciliation,
  outDir: string,
): Promise<void> {
  await mkdir(outDir, { recursive: true });
  const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(join(outDir, 'context-bundle.json'), json(reconciliation.bundle), 'utf8');
  await writeFile(join(outDir, 'reconciliation.json'), json(reconciliation), 'utf8');
  await writeWorkflowProposalArtifacts(reconciliation.proposal, join(outDir, 'proposal'));
}
