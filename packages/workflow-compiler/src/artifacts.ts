import { createHash, randomUUID } from 'node:crypto';
import type { Dirent } from 'node:fs';
import {
  chmod,
  chown,
  lstat,
  mkdir,
  opendir,
  readFile,
  readlink,
  realpath,
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
import {
  createWorkflowArtifactAttestation,
  parseWorkflowArtifactAttestation,
  verifyWorkflowArtifactAttestation,
  workflowArtifactManifestHash,
  WorkflowArtifactAttestationError,
  type WorkflowArtifactKey,
  type WorkflowArtifactSigningOptions
} from './attestation.js';

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

export type WorkflowArtifactVerificationErrorCode =
  | 'ARTIFACT_HASH_MISMATCH'
  | 'INVALID_ARTIFACT_TYPE'
  | 'INVALID_MANIFEST'
  | 'MISSING_ARTIFACT'
  | 'RESOURCE_LIMIT_EXCEEDED'
  | 'UNDECLARED_ARTIFACT'
  | 'UNSAFE_ARTIFACT_PATH';

export class WorkflowArtifactVerificationError extends Error {
  readonly code: WorkflowArtifactVerificationErrorCode;
  readonly path?: string;

  constructor(code: WorkflowArtifactVerificationErrorCode, message: string, path?: string) {
    super(message);
    this.name = 'WorkflowArtifactVerificationError';
    this.code = code;
    this.path = path;
  }
}

export interface WorkflowArtifactVerificationReceipt {
  schemaVersion: 'workflow_artifact_verification_receipt.v0.1';
  status: 'integrity_verified' | 'verified';
  workflowId: string;
  workflowVersion: string;
  definitionHash: string;
  compilerVersion: string;
  manifestHash: string;
  fileCount: number;
  attestation:
    | { status: 'unsigned' }
    | {
        status: 'present_unverified' | 'verified';
        algorithm: 'Ed25519';
        keyId: string;
        publicKeyFingerprint: string;
      };
}

export interface VerifyWorkflowArtifactBundleOptions {
  publicKey?: WorkflowArtifactKey;
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

const MAX_ARTIFACT_FILES = 512;
const MAX_ARTIFACT_PATH_LENGTH = 512;
const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_ARTIFACT_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_ARTIFACT_BYTES = 100 * 1024 * 1024;
const MAX_ATTESTATION_BYTES = 16 * 1024;
const MAX_BUNDLE_INVENTORY_ENTRIES = 4096;

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function contentHash(content: string | Uint8Array): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
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

function assertSafeArtifactPath(path: string): void {
  if (
    path.length > MAX_ARTIFACT_PATH_LENGTH ||
    path.startsWith('/') ||
    path.startsWith('\\') ||
    /^[A-Za-z]:[\\/]/.test(path) ||
    path.includes('\\') ||
    path
      .split('/')
      .some((part) => part === '' || part === '.' || part === '..' || part.includes('\0'))
  ) {
    throw new WorkflowArtifactVerificationError(
      'UNSAFE_ARTIFACT_PATH',
      'Workflow artifact paths must be normalized relative paths.',
      path
    );
  }
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

async function readValidatedArtifactManifest(rootDir: string): Promise<WorkflowArtifactManifest> {
  const manifestPath = join(rootDir, 'manifest.json');
  let manifest: unknown;
  try {
    const manifestEntry = await lstat(manifestPath);
    if (!manifestEntry.isFile()) {
      throw new WorkflowArtifactVerificationError(
        'INVALID_ARTIFACT_TYPE',
        'Workflow artifact manifest must be a regular file.',
        'manifest.json'
      );
    }
    if (manifestEntry.size > MAX_MANIFEST_BYTES) {
      throw new WorkflowArtifactVerificationError(
        'RESOURCE_LIMIT_EXCEEDED',
        'Workflow artifact manifest exceeds the verification size limit.',
        'manifest.json'
      );
    }
    const manifestBytes = await readFile(manifestPath);
    if (manifestBytes.byteLength > MAX_MANIFEST_BYTES) {
      throw new WorkflowArtifactVerificationError(
        'RESOURCE_LIMIT_EXCEEDED',
        'Workflow artifact manifest exceeds the verification size limit.',
        'manifest.json'
      );
    }
    manifest = JSON.parse(manifestBytes.toString('utf8'));
  } catch (error) {
    if (error instanceof WorkflowArtifactVerificationError) throw error;
    if (isMissing(error)) {
      throw new WorkflowArtifactVerificationError(
        'MISSING_ARTIFACT',
        'Workflow artifact manifest is missing.',
        'manifest.json'
      );
    }
    if (error instanceof SyntaxError) {
      throw new WorkflowArtifactVerificationError(
        'INVALID_MANIFEST',
        'Workflow artifact manifest is not valid JSON.',
        'manifest.json'
      );
    }
    throw error;
  }
  if (
    !isRecord(manifest) ||
    !hasExactKeys(manifest, [
      'compilerVersion',
      'definitionHash',
      'files',
      'schemaVersion',
      'workflowId',
      'workflowVersion'
    ]) ||
    manifest.schemaVersion !== 'workflow_artifact_manifest.v0.1' ||
    typeof manifest.workflowId !== 'string' ||
    manifest.workflowId.length === 0 ||
    typeof manifest.workflowVersion !== 'string' ||
    manifest.workflowVersion.length === 0 ||
    typeof manifest.definitionHash !== 'string' ||
    !/^sha256:[a-f0-9]{64}$/.test(manifest.definitionHash) ||
    typeof manifest.compilerVersion !== 'string' ||
    manifest.compilerVersion.length === 0 ||
    !Array.isArray(manifest.files)
  ) {
    throw new WorkflowArtifactVerificationError(
      'INVALID_MANIFEST',
      'Workflow artifact manifest does not match workflow_artifact_manifest.v0.1.',
      'manifest.json'
    );
  }
  if (manifest.files.length > MAX_ARTIFACT_FILES) {
    throw new WorkflowArtifactVerificationError(
      'RESOURCE_LIMIT_EXCEEDED',
      'Workflow artifact manifest exceeds the file-count limit.',
      'manifest.json'
    );
  }

  const requiredPaths = new Set(ARTIFACTS.map((artifact) => artifact.path));
  const seenPaths = new Set<string>();
  const files: WorkflowArtifactManifest['files'] = [];
  let previousPath: string | undefined;
  let totalArtifactBytes = 0;
  for (const value of manifest.files) {
    if (
      !isRecord(value) ||
      !hasExactKeys(value, ['hash', 'path']) ||
      typeof value.path !== 'string' ||
      value.path.length === 0 ||
      typeof value.hash !== 'string' ||
      !/^sha256:[a-f0-9]{64}$/.test(value.hash)
    ) {
      throw new WorkflowArtifactVerificationError(
        'INVALID_MANIFEST',
        'Workflow artifact manifest contains an invalid file entry.',
        'manifest.json'
      );
    }
    assertSafeArtifactPath(value.path);
    if (seenPaths.has(value.path) || (previousPath !== undefined && value.path <= previousPath)) {
      throw new WorkflowArtifactVerificationError(
        'INVALID_MANIFEST',
        'Workflow artifact manifest paths must be sorted and unique.',
        'manifest.json'
      );
    }
    let target: string;
    try {
      target = artifactTarget(rootDir, value.path);
    } catch {
      throw new WorkflowArtifactVerificationError(
        'UNSAFE_ARTIFACT_PATH',
        'Workflow artifact path escapes the bundle root.',
        value.path
      );
    }
    const canonicalPath = relative(rootDir, target).replaceAll('\\', '/');
    if (canonicalPath !== value.path) {
      throw new WorkflowArtifactVerificationError(
        'UNSAFE_ARTIFACT_PATH',
        'Workflow artifact paths must be normalized relative paths.',
        value.path
      );
    }
    let artifactEntry;
    try {
      artifactEntry = await lstat(target);
    } catch (error) {
      if (isMissing(error)) {
        throw new WorkflowArtifactVerificationError(
          'MISSING_ARTIFACT',
          'A declared workflow artifact is missing.',
          value.path
        );
      }
      throw error;
    }
    if (!artifactEntry.isFile()) {
      throw new WorkflowArtifactVerificationError(
        'INVALID_ARTIFACT_TYPE',
        'Declared workflow artifacts must be regular files.',
        value.path
      );
    }
    if (artifactEntry.size > MAX_ARTIFACT_BYTES) {
      throw new WorkflowArtifactVerificationError(
        'RESOURCE_LIMIT_EXCEEDED',
        'A workflow artifact exceeds the per-file verification size limit.',
        value.path
      );
    }
    if (totalArtifactBytes + artifactEntry.size > MAX_TOTAL_ARTIFACT_BYTES) {
      throw new WorkflowArtifactVerificationError(
        'RESOURCE_LIMIT_EXCEEDED',
        'Workflow artifact content exceeds the total verification size limit.',
        value.path
      );
    }
    const artifactBytes = await readFile(target);
    if (artifactBytes.byteLength > MAX_ARTIFACT_BYTES) {
      throw new WorkflowArtifactVerificationError(
        'RESOURCE_LIMIT_EXCEEDED',
        'A workflow artifact exceeds the per-file verification size limit.',
        value.path
      );
    }
    totalArtifactBytes += artifactBytes.byteLength;
    if (totalArtifactBytes > MAX_TOTAL_ARTIFACT_BYTES) {
      throw new WorkflowArtifactVerificationError(
        'RESOURCE_LIMIT_EXCEEDED',
        'Workflow artifact content exceeds the total verification size limit.',
        value.path
      );
    }
    if (contentHash(artifactBytes) !== value.hash) {
      throw new WorkflowArtifactVerificationError(
        'ARTIFACT_HASH_MISMATCH',
        'Workflow artifact content does not match its manifest hash.',
        value.path
      );
    }
    seenPaths.add(value.path);
    requiredPaths.delete(value.path);
    previousPath = value.path;
    files.push({ path: value.path, hash: value.hash });
  }
  if (requiredPaths.size > 0) {
    throw new WorkflowArtifactVerificationError(
      'INVALID_MANIFEST',
      'Workflow artifact manifest omits required base artifacts.',
      'manifest.json'
    );
  }

  let compiledWorkflow: unknown;
  try {
    compiledWorkflow = JSON.parse(
      await readFile(artifactTarget(rootDir, 'compiled-workflow.json'), 'utf8')
    );
  } catch {
    throw new WorkflowArtifactVerificationError(
      'INVALID_MANIFEST',
      'Compiled workflow identity cannot be read.',
      'compiled-workflow.json'
    );
  }
  if (
    !isRecord(compiledWorkflow) ||
    compiledWorkflow.workflowId !== manifest.workflowId ||
    compiledWorkflow.workflowVersion !== manifest.workflowVersion ||
    compiledWorkflow.definitionHash !== manifest.definitionHash ||
    compiledWorkflow.compilerVersion !== manifest.compilerVersion
  ) {
    throw new WorkflowArtifactVerificationError(
      'INVALID_MANIFEST',
      'Compiled workflow identity does not match the artifact manifest.',
      'compiled-workflow.json'
    );
  }

  return {
    schemaVersion: 'workflow_artifact_manifest.v0.1',
    workflowId: manifest.workflowId,
    workflowVersion: manifest.workflowVersion,
    definitionHash: manifest.definitionHash,
    compilerVersion: manifest.compilerVersion,
    files
  };
}

async function verifyDeclaredBundleInventory(
  rootDir: string,
  manifest: WorkflowArtifactManifest,
  hasAttestation: boolean
): Promise<void> {
  const declaredFiles = new Set([
    'manifest.json',
    ...manifest.files.map((file) => file.path),
    ...(hasAttestation ? ['attestation.json'] : [])
  ]);
  const declaredDirectories = new Set<string>();
  for (const path of declaredFiles) {
    const parts = path.split('/');
    for (let index = 1; index < parts.length; index += 1) {
      declaredDirectories.add(parts.slice(0, index).join('/'));
    }
  }
  let inventoryEntryCount = 0;

  async function walk(currentDir: string): Promise<void> {
    const entries: Dirent[] = [];
    const directory = await opendir(currentDir);
    for await (const entry of directory) {
      inventoryEntryCount += 1;
      if (inventoryEntryCount > MAX_BUNDLE_INVENTORY_ENTRIES) {
        throw new WorkflowArtifactVerificationError(
          'RESOURCE_LIMIT_EXCEEDED',
          'Workflow artifact bundle exceeds the inventory-entry verification limit.'
        );
      }
      entries.push(entry);
    }
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const target = join(currentDir, entry.name);
      const path = relative(rootDir, target).replaceAll('\\', '/');
      if (entry.isSymbolicLink()) {
        throw new WorkflowArtifactVerificationError(
          'INVALID_ARTIFACT_TYPE',
          'Workflow artifact bundles cannot contain internal symbolic links.',
          path
        );
      }
      if (entry.isDirectory()) {
        if (!declaredDirectories.has(path)) {
          throw new WorkflowArtifactVerificationError(
            'UNDECLARED_ARTIFACT',
            'Workflow artifact bundle contains an undeclared directory.',
            path
          );
        }
        await walk(target);
      } else if (entry.isFile()) {
        if (!declaredFiles.has(path)) {
          throw new WorkflowArtifactVerificationError(
            'UNDECLARED_ARTIFACT',
            'Workflow artifact bundle contains an undeclared file.',
            path
          );
        }
      } else {
        throw new WorkflowArtifactVerificationError(
          'INVALID_ARTIFACT_TYPE',
          'Workflow artifact bundles may contain only regular files and directories.',
          path
        );
      }
    }
  }
  await walk(rootDir);
}

async function resolveWorkflowArtifactBundleRoot(rootDir: string): Promise<string> {
  try {
    const resolvedRootDir = await realpath(resolve(rootDir));
    if (!(await lstat(resolvedRootDir)).isDirectory()) {
      throw new WorkflowArtifactVerificationError(
        'INVALID_ARTIFACT_TYPE',
        'Workflow artifact bundle root must be a directory.'
      );
    }
    return resolvedRootDir;
  } catch (error) {
    if (error instanceof WorkflowArtifactVerificationError) throw error;
    if (isMissing(error)) {
      throw new WorkflowArtifactVerificationError(
        'MISSING_ARTIFACT',
        'Workflow artifact manifest is missing.',
        'manifest.json'
      );
    }
    throw error;
  }
}

/** @internal Deterministic seam for exercising concurrent pointer publication. */
export async function verifyWorkflowArtifactBundleWithRootPinnedHook(
  rootDir: string,
  options: VerifyWorkflowArtifactBundleOptions,
  onRootPinned: (resolvedRootDir: string) => void | Promise<void>
): Promise<WorkflowArtifactVerificationReceipt> {
  const resolvedRootDir = await resolveWorkflowArtifactBundleRoot(rootDir);
  await onRootPinned(resolvedRootDir);
  const manifest = await readValidatedArtifactManifest(resolvedRootDir);
  const attestationPath = join(resolvedRootDir, 'attestation.json');
  let attestationValue: unknown;
  try {
    const attestationEntry = await lstat(attestationPath);
    if (!attestationEntry.isFile()) {
      throw new WorkflowArtifactAttestationError(
        'INVALID_ATTESTATION',
        'Workflow artifact attestation must be a regular file.'
      );
    }
    if (attestationEntry.size > MAX_ATTESTATION_BYTES) {
      throw new WorkflowArtifactAttestationError(
        'INVALID_ATTESTATION',
        'Workflow artifact attestation exceeds the verification size limit.'
      );
    }
    const attestationBytes = await readFile(attestationPath);
    if (attestationBytes.byteLength > MAX_ATTESTATION_BYTES) {
      throw new WorkflowArtifactAttestationError(
        'INVALID_ATTESTATION',
        'Workflow artifact attestation exceeds the verification size limit.'
      );
    }
    attestationValue = JSON.parse(attestationBytes.toString('utf8')) as unknown;
  } catch (error) {
    if (error instanceof WorkflowArtifactAttestationError) throw error;
    if (error instanceof SyntaxError) {
      throw new WorkflowArtifactAttestationError(
        'INVALID_ATTESTATION',
        'Workflow artifact attestation is not valid JSON.'
      );
    }
    if (!isMissing(error)) throw error;
  }

  if (attestationValue === undefined && options.publicKey !== undefined) {
    throw new WorkflowArtifactAttestationError(
      'ATTESTATION_MISSING',
      'A trusted public key was supplied but the workflow artifact bundle is unsigned.'
    );
  }
  const attestation =
    attestationValue === undefined
      ? undefined
      : options.publicKey === undefined
        ? parseWorkflowArtifactAttestation(attestationValue)
        : verifyWorkflowArtifactAttestation(manifest, attestationValue, options.publicKey);
  await verifyDeclaredBundleInventory(resolvedRootDir, manifest, attestationValue !== undefined);
  return {
    schemaVersion: 'workflow_artifact_verification_receipt.v0.1',
    status: options.publicKey === undefined ? 'integrity_verified' : 'verified',
    workflowId: manifest.workflowId,
    workflowVersion: manifest.workflowVersion,
    definitionHash: manifest.definitionHash,
    compilerVersion: manifest.compilerVersion,
    manifestHash: workflowArtifactManifestHash(manifest),
    fileCount: manifest.files.length,
    attestation:
      attestation === undefined
        ? { status: 'unsigned' }
        : {
            status: options.publicKey === undefined ? 'present_unverified' : 'verified',
            algorithm: attestation.algorithm,
            keyId: attestation.keyId,
            publicKeyFingerprint: attestation.publicKeyFingerprint
          }
  };
}

export async function verifyWorkflowArtifactBundle(
  rootDir: string,
  options: VerifyWorkflowArtifactBundleOptions = {}
): Promise<WorkflowArtifactVerificationReceipt> {
  return verifyWorkflowArtifactBundleWithRootPinnedHook(rootDir, options, () => undefined);
}

interface ExistingOutput {
  emptyDirectory: boolean;
  artifactModes?: Map<string, ArtifactMode>;
  metadata?: ExistingOutputMetadata;
  revision?: string;
}

interface ArtifactMode {
  kind: 'directory' | 'file';
  mode: number;
}

async function collectArtifactModes(
  rootDir: string,
  currentDir = rootDir,
  modes = new Map<string, ArtifactMode>()
): Promise<Map<string, ArtifactMode>> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const target = join(currentDir, entry.name);
    const pathFromRoot = relative(rootDir, target);
    if (entry.isDirectory()) {
      modes.set(pathFromRoot, {
        kind: 'directory',
        mode: (await lstat(target)).mode & 0o7777
      });
      await collectArtifactModes(rootDir, target, modes);
    } else if (entry.isFile()) {
      modes.set(pathFromRoot, { kind: 'file', mode: (await lstat(target)).mode & 0o7777 });
    }
  }
  return modes;
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
      await readValidatedArtifactManifest(target);
      const metadata = await stat(target);
      return {
        artifactModes: await collectArtifactModes(target),
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

async function applyArtifactMetadataRecursively(
  rootDir: string,
  metadata: ExistingOutputMetadata,
  previousModes: Map<string, ArtifactMode> | undefined,
  currentDir = rootDir
): Promise<void> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const target = join(currentDir, entry.name);
    const pathFromRoot = relative(rootDir, target);
    const kind = entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : undefined;
    if (!kind) continue;
    if (kind === 'directory') {
      await applyArtifactMetadataRecursively(rootDir, metadata, previousModes, target);
    }
    if (process.platform !== 'win32') await chown(target, metadata.uid, metadata.gid);
    const previous = previousModes?.get(pathFromRoot);
    const mode = previous?.kind === kind ? previous.mode : kind === 'directory' ? 0o755 : 0o644;
    await chmod(target, mode);
  }
}

function isAlreadyPresent(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'EEXIST'
  );
}

async function ensureManagedDirectory(path: string): Promise<void> {
  try {
    await mkdir(path, { mode: 0o700 });
  } catch (error) {
    if (!isAlreadyPresent(error)) throw error;
  }
  if (!(await lstat(path)).isDirectory()) {
    throw new WorkflowArtifactOutputError(
      'OUTPUT_NOT_OWNED',
      'Refusing to use a workflow compiler control path that is not a directory.'
    );
  }
}

const CONTROL_MARKER_SCHEMA_VERSION = 'workflow_compiler_control.v0.1';
const CONTROL_MARKER_FILENAME = 'control.json';

function unownedControlDirectoryError(): WorkflowArtifactOutputError {
  return new WorkflowArtifactOutputError(
    'OUTPUT_NOT_OWNED',
    'Refusing to use an unmarked workflow compiler control directory.'
  );
}

async function validateControlMarker(controlDir: string, outDir: string): Promise<void> {
  try {
    const markerPath = join(controlDir, CONTROL_MARKER_FILENAME);
    if (!(await lstat(markerPath)).isFile()) throw new Error();
    const marker = JSON.parse(await readFile(markerPath, 'utf8')) as {
      schemaVersion?: unknown;
      outputPath?: unknown;
    };
    if (marker.schemaVersion !== CONTROL_MARKER_SCHEMA_VERSION || marker.outputPath !== outDir) {
      throw new Error();
    }
  } catch {
    throw unownedControlDirectoryError();
  }
}

async function writeControlMarker(controlDir: string, outDir: string): Promise<void> {
  const markerPath = join(controlDir, CONTROL_MARKER_FILENAME);
  try {
    await writeFile(
      markerPath,
      json({ schemaVersion: CONTROL_MARKER_SCHEMA_VERSION, outputPath: outDir }),
      { encoding: 'utf8', flag: 'wx', mode: 0o600 }
    );
  } catch (error) {
    if (isAlreadyPresent(error)) {
      await validateControlMarker(controlDir, outDir);
      return;
    }
    throw error;
  }
}

async function ensureCompilerControlDirectory(
  controlDir: string,
  outDir: string,
  migrationRevision: string | undefined
): Promise<void> {
  let created = false;
  try {
    await mkdir(controlDir, { mode: 0o700 });
    created = true;
  } catch (error) {
    if (!isAlreadyPresent(error)) throw error;
  }

  let controlEntry;
  try {
    controlEntry = await lstat(controlDir);
  } catch {
    throw unownedControlDirectoryError();
  }
  if (!controlEntry.isDirectory()) throw unownedControlDirectoryError();

  if (!created) {
    const markerPath = join(controlDir, CONTROL_MARKER_FILENAME);
    try {
      await lstat(markerPath);
      await validateControlMarker(controlDir, outDir);
      return;
    } catch (error) {
      if (!isMissing(error)) throw error;
    }

    const revisionsDir = revisionsDirectory(outDir);
    if (migrationRevision === undefined || dirname(migrationRevision) !== revisionsDir) {
      throw unownedControlDirectoryError();
    }
    try {
      if (!(await lstat(revisionsDir)).isDirectory()) throw new Error();
      if (!(await lstat(migrationRevision)).isDirectory()) throw new Error();
    } catch {
      throw unownedControlDirectoryError();
    }
    await writeControlMarker(controlDir, outDir);
    return;
  }

  const markerPath = join(controlDir, CONTROL_MARKER_FILENAME);
  try {
    await writeControlMarker(controlDir, outDir);
  } catch (error) {
    await rm(markerPath, { force: true });
    await rmdir(controlDir).catch(() => undefined);
    throw error;
  }
}

async function applyManagedDirectoryMetadata(
  paths: string[],
  metadata: ExistingOutputMetadata,
  markerPath: string
): Promise<void> {
  for (const path of paths) {
    if (process.platform !== 'win32') await chown(path, metadata.uid, metadata.gid);
    await chmod(path, (metadata.mode & ~0o022) | 0o700);
  }
  if (process.platform !== 'win32') await chown(markerPath, metadata.uid, metadata.gid);
  await chmod(markerPath, 0o600);
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

async function writeArtifactSet(
  bundle: CompiledWorkflowBundle,
  rootDir: string,
  replay?: WorkflowReplayArtifacts,
  signing?: WorkflowArtifactSigningOptions
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
  if (signing) {
    await writeFile(
      artifactTarget(rootDir, 'attestation.json'),
      json(createWorkflowArtifactAttestation(manifest, signing)),
      'utf8'
    );
  }
  return manifest;
}

export async function writeCompiledWorkflowArtifacts(
  bundle: CompiledWorkflowBundle,
  outDir: string,
  replay?: WorkflowReplayArtifacts,
  signing?: WorkflowArtifactSigningOptions
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
  const controlMarkerPath = join(controlDir, CONTROL_MARKER_FILENAME);
  await ensureCompilerControlDirectory(controlDir, resolvedOutDir, existingOutput.revision);
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
    const manifest = await writeArtifactSet(bundle, stagingDir, replay, signing);
    await applyArtifactMetadataRecursively(
      stagingDir,
      publicationMetadata,
      existingOutput.artifactModes
    );
    await chmod(stagingDir, publicationMetadata.mode);
    await applyManagedDirectoryMetadata(
      [controlDir, revisionsDir],
      publicationMetadata,
      controlMarkerPath
    );
    await rename(stagingDir, revisionDir);
    await publishRevisionAtomically(revisionDir, resolvedOutDir, existingOutput.emptyDirectory);
    return manifest;
  } catch (error) {
    await rm(stagingDir, { recursive: true, force: true });
    await rm(revisionDir, { recursive: true, force: true });
    throw error;
  }
}
