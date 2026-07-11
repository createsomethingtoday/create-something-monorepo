import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { writeWorkflowProposalArtifacts } from '@create-something/workflow-evidence-extractor';

import type { WorkflowObservationReconciliation } from './types.js';

export async function writeWorkflowObservationReconciliationArtifacts(
  reconciliation: WorkflowObservationReconciliation,
  outDir: string,
): Promise<void> {
  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, 'reconciliation.json'),
    `${JSON.stringify(reconciliation, null, 2)}\n`,
    'utf8',
  );
  await writeWorkflowProposalArtifacts(reconciliation.proposal, join(outDir, 'proposal'));
}
