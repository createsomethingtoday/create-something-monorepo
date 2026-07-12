import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  renderWorkflowPilotOperatorConsole,
  type WorkflowPilotOperatorConsoleData,
} from './operator-console.js';

import type {
  WorkflowPilotArtifactManifest,
  WorkflowPilotCompiledRuntimeSummary,
  WorkflowPilotCorpusSummary,
  WorkflowPilotDiscoveryPack,
  WorkflowPilotPrivacySummary,
  WorkflowPilotReconciliationSummary,
  WorkflowPilotScorecard,
} from './types.js';

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(content: string): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

export async function writeWorkflowShadowPilotArtifacts(
  outputDir: string,
  artifacts: {
    discoveryPack: WorkflowPilotDiscoveryPack;
    corpusSummary: WorkflowPilotCorpusSummary;
    reconciliationSummary: WorkflowPilotReconciliationSummary;
    privacySummary: WorkflowPilotPrivacySummary;
    compiledRuntime: WorkflowPilotCompiledRuntimeSummary;
    scorecard: WorkflowPilotScorecard;
    operatorConsole: WorkflowPilotOperatorConsoleData;
  },
): Promise<WorkflowPilotArtifactManifest> {
  await mkdir(outputDir, { recursive: true });
  await mkdir(path.join(outputDir, 'operator-console'), { recursive: true });
  const entries = [
    { path: 'compiled-runtime-summary.json', value: artifacts.compiledRuntime },
    { path: 'corpus-summary.json', value: artifacts.corpusSummary },
    { path: 'discovery-pack.json', value: artifacts.discoveryPack },
    { path: 'privacy-summary.json', value: artifacts.privacySummary },
    { path: 'reconciliation-summary.json', value: artifacts.reconciliationSummary },
    { path: 'shadow-scorecard.json', value: artifacts.scorecard },
    { path: 'operator-console/data.json', value: artifacts.operatorConsole },
  ];
  const files = [];
  for (const entry of entries) {
    const content = json(entry.value);
    await writeFile(path.join(outputDir, entry.path), content, 'utf8');
    files.push({ path: entry.path, sha256: sha256(content) });
  }

  const operatorHtml = renderWorkflowPilotOperatorConsole();
  const operatorPath = 'operator-console/index.html';
  await writeFile(path.join(outputDir, operatorPath), operatorHtml, 'utf8');
  files.push({ path: operatorPath, sha256: sha256(operatorHtml) });

  const manifest: WorkflowPilotArtifactManifest = {
    schemaVersion: 'workflow_shadow_artifact_manifest.v0.1',
    files,
  };
  await writeFile(path.join(outputDir, 'shadow-manifest.json'), json(manifest), 'utf8');
  return manifest;
}
