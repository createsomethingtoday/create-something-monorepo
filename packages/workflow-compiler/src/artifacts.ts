import { createHash, randomUUID } from 'node:crypto';
import {
  chmod,
  chown,
  lstat,
  mkdir,
  readFile,
  readlink,
  readdir,
  rename,
  rm,
  rmdir,
  stat,
  symlink,
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

function controlDirectory(outDir: string): string {
  return join(dirname(outDir), `.${basename(outDir)}.workflow-compiler`);
}

function revisionsDirectory(outDir: string): string {
  return join(controlDirectory(outDir), 'revisions');
}

function isDirectRevisionTarget(outDir: string, target: string): boolean {
  const revisionsDir = revisionsDirectory(outDir);
  return dirname(target) === revisionsDir && basename(target).startsWith('revision-');
}

interface ExistingOutput {
  emptyDirectory: boolean;
  metadata?: ExistingOutputMetadata;
  revision?: string;
}

async function inspectExistingOutput(outDir: string): Promise<ExistingOutput> {
  let outputEntry;
  try {
    outputEntry = await lstat(outDir);
  } catch (error) {
    if (isMissing(error)) return { emptyDirectory: false };
    throw error;
  }

  if (outputEntry.isSymbolicLink()) {
    const target = resolve(dirname(outDir), await readlink(outDir));
    if (!isDirectRevisionTarget(outDir, target)) {
      throw new WorkflowArtifactOutputError(
        'OUTPUT_NOT_OWNED',
        'Refusing to replace an output path that is not a managed workflow compiler revision.'
      );
    }
    try {
      if (!(await lstat(target)).isDirectory()) throw new Error();
      const manifestPath = join(target, 'manifest.json');
      if (!(await lstat(manifestPath)).isFile()) throw new Error();
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
        schemaVersion?: unknown;
      };
      if (manifest.schemaVersion !== 'workflow_artifact_manifest.v0.1') throw new Error();
      const metadata = await stat(target);
      return {
        emptyDirectory: false,
        metadata: {
          mode: metadata.mode & 0o7777,
          uid: metadata.uid,
          gid: metadata.gid
        },
        revision: target
      };
    } catch {
      throw new WorkflowArtifactOutputError(
        'OUTPUT_NOT_OWNED',
        'Refusing to replace an output path that is not a managed workflow compiler revision.'
      );
    }
  }

  if (!outputEntry.isDirectory()) {
    throw new WorkflowArtifactOutputError(
      'OUTPUT_NOT_OWNED',
      'Refusing to replace an output path that is not a workflow compiler directory.'
    );
  }

  const entries = await readdir(outDir);
  const metadata = await stat(outDir);
  if (entries.length === 0) {
    return {
      emptyDirectory: true,
      metadata: {
        mode: metadata.mode & 0o7777,
        uid: metadata.uid,
        gid: metadata.gid
      }
    };
  }

  let legacyCompilerOutput = false;
  try {
    const manifest = JSON.parse(await readFile(join(outDir, 'manifest.json'), 'utf8')) as {
      schemaVersion?: unknown;
    };
    legacyCompilerOutput = manifest.schemaVersion === 'workflow_artifact_manifest.v0.1';
  } catch {
    // Fall through to the stable ownership diagnostic.
  }
  if (legacyCompilerOutput) {
    throw new WorkflowArtifactOutputError(
      'OUTPUT_NOT_OWNED',
      'Refusing to migrate a legacy workflow compiler directory in place; choose a new output path so publication can remain atomic.'
    );
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

async function applyOwnershipRecursively(rootDir: string, uid: number, gid: number): Promise<void> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const target = join(rootDir, entry.name);
    if (entry.isDirectory()) await applyOwnershipRecursively(target, uid, gid);
    await chown(target, uid, gid);
  }
}

async function ensureManagedDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true, mode: 0o700 });
  if (!(await lstat(path)).isDirectory()) {
    throw new WorkflowArtifactOutputError(
      'OUTPUT_NOT_OWNED',
      'Refusing to use a workflow compiler control path that is not a directory.'
    );
  }
}

async function applyManagedDirectoryMetadata(
  paths: string[],
  metadata: ExistingOutputMetadata
): Promise<void> {
  for (const path of paths) {
    if (process.platform !== 'win32') await chown(path, metadata.uid, metadata.gid);
    await chmod(path, metadata.mode | 0o700);
  }
}

async function publishRevisionAtomically(
  revisionDir: string,
  outDir: string,
  removeEmptyDirectory: boolean
): Promise<void> {
  const parentDir = dirname(outDir);
  const pointer = join(parentDir, `.${basename(outDir)}.pointer-${randomUUID()}`);
  const target = process.platform === 'win32' ? revisionDir : relative(parentDir, revisionDir);
  await symlink(target, pointer, process.platform === 'win32' ? 'junction' : 'dir');
  try {
    if (removeEmptyDirectory) await rmdir(outDir);
    await rename(pointer, outDir);
  } catch (error) {
    await rm(pointer, { force: true });
    throw error;
  }
}

async function pruneManagedRevisions(
  revisionsDir: string,
  currentRevision: string,
  previousRevision?: string
): Promise<void> {
  const retained = new Set([currentRevision, previousRevision].filter(Boolean));
  const entries = await readdir(revisionsDir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const target = join(revisionsDir, entry.name);
      if (retained.has(target)) return;
      if (!entry.name.startsWith('revision-') && !entry.name.startsWith('.tmp-')) return;
      await chmod(target, 0o700).catch(() => undefined);
      await rm(target, { recursive: true, force: true }).catch(() => undefined);
    })
  );
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

  const existingOutput = await inspectExistingOutput(resolvedOutDir);
  const outputMetadata = existingOutput.metadata;
  await mkdir(parentDir, { recursive: true });
  const controlDir = controlDirectory(resolvedOutDir);
  const revisionsDir = revisionsDirectory(resolvedOutDir);
  await ensureManagedDirectory(controlDir);
  await ensureManagedDirectory(revisionsDir);
  const revisionId = randomUUID();
  const stagingDir = join(revisionsDir, `.tmp-${revisionId}`);
  const revisionDir = join(revisionsDir, `revision-${revisionId}`);
  await mkdir(stagingDir);
  const initialStagingMetadata = await stat(stagingDir);
  const publicationMetadata =
    outputMetadata ??
    ({
      mode: initialStagingMetadata.mode & 0o7777,
      uid: initialStagingMetadata.uid,
      gid: initialStagingMetadata.gid
    } satisfies ExistingOutputMetadata);
  if (outputMetadata && process.platform !== 'win32') {
    await chown(stagingDir, outputMetadata.uid, outputMetadata.gid);
    await chmod(stagingDir, 0o2700);
  }

  try {
    const manifest = await writeArtifactSet(bundle, stagingDir, replay);
    if (outputMetadata) {
      if (process.platform !== 'win32') {
        await applyOwnershipRecursively(stagingDir, outputMetadata.uid, outputMetadata.gid);
      }
      await chmod(stagingDir, outputMetadata.mode);
    }
    await applyManagedDirectoryMetadata([controlDir, revisionsDir], publicationMetadata);
    await rename(stagingDir, revisionDir);
    await publishRevisionAtomically(revisionDir, resolvedOutDir, existingOutput.emptyDirectory);
    if (existingOutput.revision && outputMetadata) {
      await chmod(existingOutput.revision, outputMetadata.mode | 0o700).catch(() => undefined);
    }
    await pruneManagedRevisions(revisionsDir, revisionDir, existingOutput.revision).catch(
      () => undefined
    );
    return manifest;
  } catch (error) {
    await rm(stagingDir, { recursive: true, force: true });
    await rm(revisionDir, { recursive: true, force: true });
    throw error;
  }
}
