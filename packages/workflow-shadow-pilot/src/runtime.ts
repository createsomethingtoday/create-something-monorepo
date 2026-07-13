import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  compileWorkflowDefinition,
  writeCompiledWorkflowArtifacts,
  type WorkflowDefinition,
} from '@create-something/workflow-compiler';

import type { WorkflowPilotCompiledRuntimeSummary } from './types.js';

export async function compileWorkflowPilotRuntime(input: {
  repoRoot: string;
  outputDir: string;
}): Promise<WorkflowPilotCompiledRuntimeSummary> {
  const baseline = JSON.parse(
    await readFile(
      path.join(
        input.repoRoot,
        'packages/workflow-compiler/fixtures/marketplace/workflow.json',
      ),
      'utf8',
    ),
  ) as WorkflowDefinition;
  const bundle = compileWorkflowDefinition(baseline);
  const runtimeDir = path.join(input.outputDir, 'compiled-runtime');
  const manifest = await writeCompiledWorkflowArtifacts(bundle, runtimeDir);
  const manifestContent = await readFile(path.join(runtimeDir, 'manifest.json'));

  return {
    schemaVersion: 'workflow_shadow_compiled_runtime_summary.v0.1',
    definitionSha256: bundle.definitionHash,
    compilerVersion: bundle.compilerVersion,
    artifactCount: manifest.files.length,
    manifestSha256: `sha256:${createHash('sha256').update(manifestContent).digest('hex')}`,
  };
}
