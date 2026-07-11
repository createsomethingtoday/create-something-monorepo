import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dirname } from 'node:path';

import type { CompiledWorkflowBundle } from './types.js';
import { createAcceptanceSummary, type WorkflowReplayArtifacts } from './replay.js';
import { createOperatorConsoleData, OPERATOR_CONSOLE_HTML } from './operator-console.js';

export interface WorkflowArtifactManifest {
  schemaVersion: 'workflow_artifact_manifest.v0.1';
  workflowId: string;
  workflowVersion: string;
  definitionHash: string;
  compilerVersion: string;
  files: Array<{
    path: string;
    hash: string;
  }>;
}

const ARTIFACTS: Array<{
  path: string;
  select: (bundle: CompiledWorkflowBundle) => unknown;
}> = [
  { path: 'agent-contracts.json', select: (bundle) => bundle.agentContracts },
  { path: 'approval-surfaces.json', select: (bundle) => bundle.approvalSurfaces },
  { path: 'compiled-workflow.json', select: (bundle) => bundle },
  { path: 'decision-inventory.json', select: (bundle) => bundle.decisionInventory },
  { path: 'evaluation-manifest.json', select: (bundle) => bundle.evaluationManifest },
  { path: 'event-schemas.json', select: (bundle) => bundle.eventSchemas },
  { path: 'object-schemas.json', select: (bundle) => bundle.objectSchemas },
  { path: 'runtime-targets.json', select: (bundle) => bundle.runtimeTargets },
  { path: 'tool-contracts.json', select: (bundle) => bundle.toolContracts },
  { path: 'workflow-map.json', select: (bundle) => bundle.workflowMap },
];

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function contentHash(content: string): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

export async function writeCompiledWorkflowArtifacts(
  bundle: CompiledWorkflowBundle,
  outDir: string,
  replay?: WorkflowReplayArtifacts,
): Promise<WorkflowArtifactManifest> {
  await mkdir(outDir, { recursive: true });

  const files = [];
  for (const artifact of ARTIFACTS) {
    const content = json(artifact.select(bundle));
    await writeFile(join(outDir, artifact.path), content, 'utf8');
    files.push({ path: artifact.path, hash: contentHash(content) });
  }

  if (replay) {
    const replayArtifacts: Array<{ path: string; content: string }> = [
      {
        path: 'acceptance-summary.json',
        content: json(createAcceptanceSummary(bundle, replay.report)),
      },
      { path: 'evidence-ledger.json', content: json(replay.evidenceLedger) },
      { path: 'replay-report.json', content: json(replay.report) },
      {
        path: 'operator-console/data.json',
        content: json(createOperatorConsoleData(bundle, replay)),
      },
      { path: 'operator-console/index.html', content: OPERATOR_CONSOLE_HTML },
    ];
    for (const artifact of replayArtifacts) {
      const target = join(outDir, artifact.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, artifact.content, 'utf8');
      files.push({ path: artifact.path, hash: contentHash(artifact.content) });
    }
    files.sort((left, right) => left.path.localeCompare(right.path));
  }

  const manifest: WorkflowArtifactManifest = {
    schemaVersion: 'workflow_artifact_manifest.v0.1',
    workflowId: bundle.workflowId,
    workflowVersion: bundle.workflowVersion,
    definitionHash: bundle.definitionHash,
    compilerVersion: bundle.compilerVersion,
    files,
  };
  await writeFile(join(outDir, 'manifest.json'), json(manifest), 'utf8');
  return manifest;
}
