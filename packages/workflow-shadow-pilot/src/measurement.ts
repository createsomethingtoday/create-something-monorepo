import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  WorkflowPilotArtifactManifest,
  WorkflowPilotCompiledRuntimeSummary,
  WorkflowPilotCorpusSummary,
  WorkflowPilotMeasurementReceipt,
  WorkflowPilotReconciliationSummary,
} from './types.js';

export function createWorkflowPilotMeasurementReceipt(input: {
  startedAt: string;
  artifactManifest: WorkflowPilotArtifactManifest;
  compiledRuntime: WorkflowPilotCompiledRuntimeSummary;
  corpusSummary: WorkflowPilotCorpusSummary;
  reconciliationSummary: WorkflowPilotReconciliationSummary;
  finishedAt?: string;
}): WorkflowPilotMeasurementReceipt {
  const finishedAt = input.finishedAt ?? new Date().toISOString();
  return {
    schemaVersion: 'workflow_shadow_measurement_receipt.v0.1',
    startedAt: input.startedAt,
    finishedAt,
    elapsedMilliseconds: Math.max(0, Date.parse(finishedAt) - Date.parse(input.startedAt)),
    deterministicArtifactCount:
      input.artifactManifest.files.length + input.compiledRuntime.artifactCount,
    caseCount: input.corpusSummary.caseCount,
    samplingGateStatus: input.reconciliationSummary.samplingGateStatus,
    contextSupportedCount: input.reconciliationSummary.contextSupportedCount,
    ambiguousCount: input.reconciliationSummary.ambiguousCount,
    mutationsPerformed: 0,
    remainingManualWork: [
      'authenticate and retain live adapter reads under an approved data policy',
      'define approval execution and rollback ownership before any live mutation',
      'integrate the sanitized shadow view into Atlas behind an explicit write boundary',
    ],
    excludedFromDeterministicManifest: true,
  };
}

export async function writeWorkflowPilotMeasurementReceipt(
  outputDir: string,
  receipt: WorkflowPilotMeasurementReceipt,
): Promise<void> {
  await writeFile(
    path.join(outputDir, 'measurement-receipt.json'),
    `${JSON.stringify(receipt, null, 2)}\n`,
    'utf8',
  );
}
