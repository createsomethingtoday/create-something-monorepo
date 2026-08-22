import { createHash, randomUUID } from 'node:crypto';
import {
  chmod,
  chown,
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile
} from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';

import type { CompiledWorkflowBundle } from './types.js';
import { createAcceptanceSummary, type WorkflowReplayArtifacts } from './replay.js';
import {
  createOperatorConsoleData,
  OPERATOR_CONSOLE_CSS,
  OPERATOR_CONSOLE_HTML,
  OPERATOR_CONSOLE_JAVASCRIPT
} from './operator-console.js';

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

export class WorkflowArtifactOutputError extends Error {
  readonly code: 'OUTPUT_NOT_OWNED' | 'UNSAFE_OUTPUT_PATH';

  constructor(code: 'OUTPUT_NOT_OWNED' | 'UNSAFE_OUTPUT_PATH', message: string) {
    super(message);
    this.name = 'WorkflowArtifactOutputError';
    this.code = code;
  }
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
  { path: 'governed-interaction.json', select: (bundle) => bundle.governedInteraction },
  { path: 'object-schemas.json', select: (bundle) => bundle.objectSchemas },
  { path: 'runtime-targets.json', select: (bundle) => bundle.runtimeTargets },
  { path: 'tool-contracts.json', select: (bundle) => bundle.toolContracts },
  { path: 'workflow-map.json', select: (bundle) => bundle.workflowMap }
];

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function contentHash(content: string): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function artifactTarget(rootDir: string, artifactPath: string): string {
  const target = resolve(rootDir, artifactPath);
  const pathFromRoot = relative(rootDir, target);
  if (pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
    throw new WorkflowArtifactOutputError(
      'UNSAFE_OUTPUT_PATH',
      `Artifact path escapes the output directory: ${artifactPath}`
    );
  }
  return target;
}

function isMissing(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  );
}

async function assertOutputDirectoryIsReplaceable(outDir: string): Promise<void> {
  try {
    if (!(await lstat(outDir)).isDirectory()) {
      throw new WorkflowArtifactOutputError(
        'OUTPUT_NOT_OWNED',
        'Refusing to replace an output path that is not a workflow compiler directory.'
      );
    }
  } catch (error) {
    if (isMissing(error)) return;
    throw error;
  }

  let entries: string[];
  try {
    entries = await readdir(outDir);
  } catch (error) {
    if (isMissing(error)) return;
    throw new WorkflowArtifactOutputError(
      'OUTPUT_NOT_OWNED',
      'Refusing to replace an output path that is not a workflow compiler directory.'
    );
  }
  if (entries.length === 0) return;

  try {
    const manifest = JSON.parse(await readFile(join(outDir, 'manifest.json'), 'utf8')) as {
      schemaVersion?: unknown;
    };
    if (manifest.schemaVersion === 'workflow_artifact_manifest.v0.1') return;
  } catch {
    // Fall through to the stable ownership diagnostic.
  }
  throw new WorkflowArtifactOutputError(
    'OUTPUT_NOT_OWNED',
    'Refusing to replace a non-empty output directory without a workflow compiler manifest.'
  );
}

interface ExistingOutputMetadata {
  mode: number;
  uid: number;
  gid: number;
}

async function existingOutputMetadata(outDir: string): Promise<ExistingOutputMetadata | undefined> {
  try {
    const existing = await stat(outDir);
    return {
      mode: existing.mode & 0o7777,
      uid: existing.uid,
      gid: existing.gid
    };
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw error;
  }
}

async function replaceDirectoryAtomically(stagingDir: string, outDir: string): Promise<void> {
  const backupDir = join(dirname(outDir), `.${basename(outDir)}.backup-${randomUUID()}`);
  let movedExistingOutput = false;

  try {
    await rename(outDir, backupDir);
    movedExistingOutput = true;
  } catch (error) {
    if (!isMissing(error)) throw error;
  }

  try {
    await rename(stagingDir, outDir);
  } catch (error) {
    if (movedExistingOutput) await rename(backupDir, outDir);
    throw error;
  }

  if (movedExistingOutput) {
    const backupMode = (await stat(backupDir)).mode & 0o7777;
    await chmod(backupDir, backupMode | 0o700);
    await rm(backupDir, { recursive: true, force: true });
  }
}

async function writeArtifactSet(
  bundle: CompiledWorkflowBundle,
  rootDir: string,
  replay?: WorkflowReplayArtifacts
): Promise<WorkflowArtifactManifest> {
  const files = [];
  for (const artifact of ARTIFACTS) {
    const content = json(artifact.select(bundle));
    await writeFile(artifactTarget(rootDir, artifact.path), content, 'utf8');
    files.push({ path: artifact.path, hash: contentHash(content) });
  }

  if (replay) {
    const replayArtifacts: Array<{ path: string; content: string }> = [
      {
        path: 'acceptance-summary.json',
        content: json(createAcceptanceSummary(bundle, replay.report))
      },
      { path: 'evidence-ledger.json', content: json(replay.evidenceLedger) },
      { path: 'replay-report.json', content: json(replay.report) },
      {
        path: 'operator-console/data.json',
        content: json(createOperatorConsoleData(bundle, replay))
      },
      { path: 'operator-console/app.css', content: OPERATOR_CONSOLE_CSS },
      { path: 'operator-console/app.js', content: OPERATOR_CONSOLE_JAVASCRIPT },
      { path: 'operator-console/index.html', content: OPERATOR_CONSOLE_HTML }
    ];
    for (const artifact of replayArtifacts) {
      const target = artifactTarget(rootDir, artifact.path);
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
    files
  };
  await writeFile(artifactTarget(rootDir, 'manifest.json'), json(manifest), 'utf8');
  return manifest;
}

export async function writeCompiledWorkflowArtifacts(
  bundle: CompiledWorkflowBundle,
  outDir: string,
  replay?: WorkflowReplayArtifacts
): Promise<WorkflowArtifactManifest> {
  const resolvedOutDir = resolve(outDir);
  const parentDir = dirname(resolvedOutDir);
  if (parentDir === resolvedOutDir) {
    throw new WorkflowArtifactOutputError(
      'UNSAFE_OUTPUT_PATH',
      'The filesystem root cannot be used as a workflow artifact output directory.'
    );
  }

  await assertOutputDirectoryIsReplaceable(resolvedOutDir);
  const outputMetadata = await existingOutputMetadata(resolvedOutDir);
  await mkdir(parentDir, { recursive: true });
  const stagingDir = join(parentDir, `.${basename(resolvedOutDir)}.tmp-${randomUUID()}`);
  await mkdir(stagingDir);

  try {
    const manifest = await writeArtifactSet(bundle, stagingDir, replay);
    if (outputMetadata) {
      if (process.platform !== 'win32') {
        await chown(stagingDir, outputMetadata.uid, outputMetadata.gid);
      }
      await chmod(stagingDir, outputMetadata.mode);
    }
    await replaceDirectoryAtomically(stagingDir, resolvedOutDir);
    return manifest;
  } catch (error) {
    await rm(stagingDir, { recursive: true, force: true });
    throw error;
  }
}
