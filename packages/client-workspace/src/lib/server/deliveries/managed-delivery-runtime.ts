import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { inspectBuildReleasePackage } from '@create-something/delivery-schema/build-release';
import {
  CLIENT_WORKSPACE_PACKAGE_SCHEMA_V2,
  verifyClientWorkspacePackageWithPolicy,
  type ClientWorkspaceTrustPolicy,
  type VerifiedClientWorkspacePackage,
  type VerifiedClientWorkspacePackageV2
} from '@create-something/delivery-schema/client-workspace-package';

import { importClientWorkspaceDelivery } from './importer.js';
import type { WorkspaceDefinition } from '../workspaces/registry.js';

const STATE_SCHEMA = 'create-something/managed-delivery@1' as const;
const PLAN_SCHEMA = 'create-something/delivery-update-plan@1' as const;

type VerifiedPackage = VerifiedClientWorkspacePackage | VerifiedClientWorkspacePackageV2;
type FileMap = Map<string, Buffer>;

type ReleasePointer = { version: string; packageId: string };
type ManagedDeliveryState = {
  schema: typeof STATE_SCHEMA;
  workspaceId: string;
  active: ReleasePointer;
  rollback?: { id: string; release: ReleasePointer };
};

export type DeliveryUpdatePlan = {
  schema: typeof PLAN_SCHEMA;
  planId: string;
  workspaceId: string;
  fromVersion: string;
  toVersion: string;
  added: string[];
  changed: string[];
  removed: string[];
  conflicts: string[];
  preservedClientPaths: string[];
};

type StoredDeliveryUpdatePlan = DeliveryUpdatePlan & {
  packagePath: string;
  workingDigest: string;
  packageId: string;
};

export type ManagedDeliveryRuntimeOptions = {
  managedRoot: string;
  stateRoot: string;
  trustPolicy: ClientWorkspaceTrustPolicy;
};

export type ManagedDeliveryErrorCode =
  | 'checkpoint_not_found'
  | 'delivery_not_managed'
  | 'rollback_unavailable'
  | 'update_conflict'
  | 'update_invalid'
  | 'update_not_newer'
  | 'update_plan_not_found'
  | 'update_plan_stale';

export class ManagedDeliveryError extends Error {
  readonly code: ManagedDeliveryErrorCode;

  constructor(code: ManagedDeliveryErrorCode, message: string) {
    super(message);
    this.name = 'ManagedDeliveryError';
    this.code = code;
  }
}

function safeSegment(value: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) {
    throw new ManagedDeliveryError('update_invalid', 'Delivery identifier is invalid.');
  }
  return value;
}

function sha256(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function mapDigest(files: FileMap): string {
  const hash = createHash('sha256');
  for (const [path, content] of [...files].sort(([left], [right]) => left.localeCompare(right))) {
    hash.update(path).update('\0').update(sha256(content)).update('\0');
  }
  return hash.digest('hex');
}

function same(left: Buffer | undefined, right: Buffer | undefined): boolean {
  if (!left || !right) return left === right;
  return left.equals(right);
}

function compareVersions(left: string, right: string): number {
  const a = left.split('-', 1)[0].split('.').map(Number);
  const b = right.split('-', 1)[0].split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

async function readTree(root: string): Promise<FileMap> {
  const files: FileMap = new Map();
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new ManagedDeliveryError(
          'update_invalid',
          'Managed deliveries cannot contain links.'
        );
      }
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile())
        files.set(relative(root, path).split(sep).join('/'), await readFile(path));
    }
  }
  await visit(root);
  return files;
}

async function writeTree(root: string, files: FileMap): Promise<void> {
  await mkdir(root, { recursive: true, mode: 0o700 });
  for (const [path, content] of files) {
    const target = join(root, ...path.split('/'));
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, content, { mode: 0o600 });
  }
}

function sourceFiles(verified: VerifiedPackage): FileMap {
  const prefix = `${verified.manifest.workspace.sourcePrefix}/`;
  const files: FileMap = new Map();
  for (const [path, content] of verified.files) {
    if (path.startsWith(prefix)) files.set(path.slice(prefix.length), content);
  }
  if (files.size === 0) {
    throw new ManagedDeliveryError('update_invalid', 'Delivery workspace source is empty.');
  }
  return files;
}

function updatePlan(
  planId: string,
  workspaceId: string,
  fromVersion: string,
  toVersion: string,
  base: FileMap,
  working: FileMap,
  incoming: FileMap
): DeliveryUpdatePlan {
  const added: string[] = [];
  const changed: string[] = [];
  const removed: string[] = [];
  const conflicts: string[] = [];
  const preservedClientPaths: string[] = [];
  const paths = new Set([...base.keys(), ...working.keys(), ...incoming.keys()]);
  for (const path of [...paths].sort()) {
    const baseFile = base.get(path);
    const workingFile = working.get(path);
    const incomingFile = incoming.get(path);
    const clientChanged = !same(baseFile, workingFile);
    const upstreamChanged = !same(baseFile, incomingFile);
    if (clientChanged) preservedClientPaths.push(path);
    if (clientChanged && upstreamChanged && !same(workingFile, incomingFile)) {
      conflicts.push(path);
      continue;
    }
    if (!upstreamChanged) continue;
    if (!baseFile && incomingFile) added.push(path);
    else if (baseFile && !incomingFile) removed.push(path);
    else changed.push(path);
  }
  return {
    schema: PLAN_SCHEMA,
    planId,
    workspaceId,
    fromVersion,
    toVersion,
    added,
    changed,
    removed,
    conflicts,
    preservedClientPaths
  };
}

export class ManagedDeliveryRuntime {
  readonly #managedRoot: string;
  readonly #stateRoot: string;
  readonly #trustPolicy: ClientWorkspaceTrustPolicy;

  constructor(options: ManagedDeliveryRuntimeOptions) {
    this.#managedRoot = resolve(options.managedRoot);
    this.#stateRoot = resolve(options.stateRoot);
    this.#trustPolicy = options.trustPolicy;
  }

  async install(packageJson: string | Buffer): Promise<WorkspaceDefinition> {
    const verified = this.#verify(packageJson);
    const definition = await importClientWorkspaceDelivery({
      packageJson,
      trustPolicy: this.#trustPolicy,
      managedRoot: this.#managedRoot,
      stateRoot: this.#stateRoot
    });
    const release = this.#releasePointer(verified);
    const releaseSource = this.#releaseSource(definition.id, release.version);
    await mkdir(dirname(releaseSource), { recursive: true, mode: 0o700 });
    await cp(definition.sourceRoot, releaseSource, {
      recursive: true,
      force: false,
      errorOnExist: true
    });
    await this.#writeState({
      schema: STATE_SCHEMA,
      workspaceId: definition.id,
      active: release
    });
    return definition;
  }

  async planUpdate(packageJson: string | Buffer): Promise<DeliveryUpdatePlan> {
    const verified = this.#verify(packageJson);
    if (verified.manifest.schema !== CLIENT_WORKSPACE_PACKAGE_SCHEMA_V2) {
      throw new ManagedDeliveryError('update_invalid', 'Updates require a versioned package.');
    }
    await this.#validateRelease(verified);
    const workspaceId = safeSegment(verified.manifest.workspace.id);
    const state = await this.#readOrMigrateState(workspaceId);
    if (compareVersions(verified.manifest.releaseVersion, state.active.version) <= 0) {
      throw new ManagedDeliveryError('update_not_newer', 'Delivery update is not newer.');
    }
    const base = await readTree(this.#releaseSource(workspaceId, state.active.version));
    const working = await readTree(this.#workspaceRoot(workspaceId));
    const incoming = sourceFiles(verified);
    const planId = randomUUID();
    const publicPlan = updatePlan(
      planId,
      workspaceId,
      state.active.version,
      verified.manifest.releaseVersion,
      base,
      working,
      incoming
    );
    const pendingRoot = join(this.#deliveryRoot(workspaceId), 'pending');
    await mkdir(pendingRoot, { recursive: true, mode: 0o700 });
    const packagePath = join(pendingRoot, `${planId}.csworkspace`);
    await writeFile(packagePath, packageJson, { mode: 0o600, flag: 'wx' });
    await this.#writeJson(join(pendingRoot, `${planId}.json`), {
      ...publicPlan,
      packagePath,
      workingDigest: mapDigest(working),
      packageId: verified.manifest.packageId
    } satisfies StoredDeliveryUpdatePlan);
    return publicPlan;
  }

  async applyUpdate(planId: string): Promise<DeliveryUpdatePlan> {
    safeSegment(planId);
    const stored = await this.#findPlan(planId);
    if (stored.conflicts.length > 0) {
      throw new ManagedDeliveryError('update_conflict', 'Delivery update has client conflicts.');
    }
    const workspaceRoot = this.#workspaceRoot(stored.workspaceId);
    const working = await readTree(workspaceRoot);
    if (mapDigest(working) !== stored.workingDigest) {
      throw new ManagedDeliveryError(
        'update_plan_stale',
        'Workspace changed after update preview.'
      );
    }
    const verified = this.#verify(await readFile(stored.packagePath));
    if (
      verified.manifest.schema !== CLIENT_WORKSPACE_PACKAGE_SCHEMA_V2 ||
      verified.manifest.workspace.id !== stored.workspaceId ||
      verified.manifest.packageId !== stored.packageId ||
      verified.manifest.releaseVersion !== stored.toVersion
    ) {
      throw new ManagedDeliveryError('update_invalid', 'Pending update identity changed.');
    }
    const state = await this.#readState(stored.workspaceId);
    if (state.active.version !== stored.fromVersion) {
      throw new ManagedDeliveryError('update_plan_stale', 'Active delivery changed after preview.');
    }
    const base = await readTree(this.#releaseSource(stored.workspaceId, state.active.version));
    const incoming = sourceFiles(verified);
    const finalFiles = new Map(incoming);
    for (const path of new Set([...base.keys(), ...working.keys()])) {
      const baseFile = base.get(path);
      const workingFile = working.get(path);
      if (same(baseFile, workingFile)) continue;
      const incomingFile = incoming.get(path);
      if (!same(baseFile, incomingFile) && !same(workingFile, incomingFile)) {
        throw new ManagedDeliveryError('update_conflict', 'Workspace changed into a conflict.');
      }
      if (workingFile) finalFiles.set(path, workingFile);
      else finalFiles.delete(path);
    }

    const transactionRoot = join(this.#managedRoot, '.transactions', randomUUID());
    const finalRoot = join(transactionRoot, 'workspace');
    await writeTree(finalRoot, finalFiles);
    const nextReleaseSource = this.#releaseSource(stored.workspaceId, stored.toVersion);
    if (existsSync(nextReleaseSource)) {
      if (mapDigest(await readTree(nextReleaseSource)) !== mapDigest(incoming)) {
        throw new ManagedDeliveryError(
          'update_invalid',
          'Delivery release version does not match its stored content.'
        );
      }
    } else {
      const stagedRelease = join(transactionRoot, 'release');
      await writeTree(stagedRelease, incoming);
      await mkdir(dirname(nextReleaseSource), { recursive: true, mode: 0o700 });
      await rename(stagedRelease, nextReleaseSource);
    }
    const rollbackId = randomUUID();
    const rollbackRoot = join(
      this.#deliveryRoot(stored.workspaceId),
      'rollback',
      rollbackId,
      'workspace'
    );
    await mkdir(dirname(rollbackRoot), { recursive: true, mode: 0o700 });
    await rename(workspaceRoot, rollbackRoot);
    try {
      await rename(finalRoot, workspaceRoot);
      await this.#writeState({
        schema: STATE_SCHEMA,
        workspaceId: stored.workspaceId,
        active: { version: stored.toVersion, packageId: stored.packageId },
        rollback: { id: rollbackId, release: state.active }
      });
    } catch (error) {
      if (existsSync(workspaceRoot)) {
        await rename(workspaceRoot, join(transactionRoot, 'failed-workspace'));
      }
      if (existsSync(rollbackRoot)) await rename(rollbackRoot, workspaceRoot);
      throw error;
    } finally {
      await rm(transactionRoot, { recursive: true, force: true });
    }
    await rm(stored.packagePath, { force: true });
    await rm(join(dirname(stored.packagePath), `${stored.planId}.json`), { force: true });
    return {
      schema: stored.schema,
      planId: stored.planId,
      workspaceId: stored.workspaceId,
      fromVersion: stored.fromVersion,
      toVersion: stored.toVersion,
      added: stored.added,
      changed: stored.changed,
      removed: stored.removed,
      conflicts: stored.conflicts,
      preservedClientPaths: stored.preservedClientPaths
    };
  }

  async rollback(workspaceId: string): Promise<void> {
    const state = await this.#readState(safeSegment(workspaceId));
    if (!state.rollback) {
      throw new ManagedDeliveryError('rollback_unavailable', 'No delivery rollback is available.');
    }
    const workspaceRoot = this.#workspaceRoot(workspaceId);
    const rollbackRoot = join(
      this.#deliveryRoot(workspaceId),
      'rollback',
      state.rollback.id,
      'workspace'
    );
    if (!existsSync(rollbackRoot)) {
      throw new ManagedDeliveryError('rollback_unavailable', 'Delivery rollback data is missing.');
    }
    const transactionRoot = join(this.#managedRoot, '.transactions', randomUUID());
    const displaced = join(transactionRoot, 'workspace');
    await mkdir(transactionRoot, { recursive: true, mode: 0o700 });
    await rename(workspaceRoot, displaced);
    try {
      await rename(rollbackRoot, workspaceRoot);
      await this.#writeState({
        schema: STATE_SCHEMA,
        workspaceId,
        active: state.rollback.release
      });
    } catch (error) {
      if (existsSync(workspaceRoot)) {
        await rename(workspaceRoot, join(transactionRoot, 'failed-workspace'));
      }
      if (existsSync(displaced)) await rename(displaced, workspaceRoot);
      throw error;
    }
    await rm(transactionRoot, { recursive: true, force: true });
    await rm(join(this.#deliveryRoot(workspaceId), 'rollback', state.rollback.id), {
      recursive: true,
      force: true
    });
  }

  async checkpoint(workspaceId: string): Promise<string> {
    safeSegment(workspaceId);
    await this.#readOrMigrateState(workspaceId);
    const checkpointId = randomUUID();
    await cp(
      this.#workspaceRoot(workspaceId),
      join(this.#deliveryRoot(workspaceId), 'checkpoints', checkpointId, 'workspace'),
      { recursive: true, force: false, errorOnExist: true }
    );
    return checkpointId;
  }

  async undo(workspaceId: string, checkpointId: string): Promise<void> {
    safeSegment(workspaceId);
    safeSegment(checkpointId);
    const checkpointRoot = join(
      this.#deliveryRoot(workspaceId),
      'checkpoints',
      checkpointId,
      'workspace'
    );
    if (!existsSync(checkpointRoot)) {
      throw new ManagedDeliveryError('checkpoint_not_found', 'Workspace checkpoint not found.');
    }
    const workspaceRoot = this.#workspaceRoot(workspaceId);
    const transactionRoot = join(this.#managedRoot, '.transactions', randomUUID());
    const displaced = join(transactionRoot, 'workspace');
    await mkdir(transactionRoot, { recursive: true, mode: 0o700 });
    await rename(workspaceRoot, displaced);
    try {
      await cp(checkpointRoot, workspaceRoot, {
        recursive: true,
        force: false,
        errorOnExist: true
      });
    } catch (error) {
      if (existsSync(workspaceRoot)) {
        await rm(workspaceRoot, { recursive: true, force: true });
      }
      if (existsSync(displaced)) await rename(displaced, workspaceRoot);
      throw error;
    }
    await rm(transactionRoot, { recursive: true, force: true });
  }

  #verify(packageJson: string | Buffer): VerifiedPackage {
    return verifyClientWorkspacePackageWithPolicy(packageJson, this.#trustPolicy);
  }

  #releasePointer(verified: VerifiedPackage): ReleasePointer {
    return {
      version:
        verified.manifest.schema === CLIENT_WORKSPACE_PACKAGE_SCHEMA_V2
          ? verified.manifest.releaseVersion
          : `legacy-${verified.manifest.packageId}`,
      packageId: verified.manifest.packageId
    };
  }

  #workspaceRoot(workspaceId: string): string {
    return join(this.#managedRoot, safeSegment(workspaceId));
  }

  #deliveryRoot(workspaceId: string): string {
    return join(this.#stateRoot, 'managed-deliveries', safeSegment(workspaceId));
  }

  #releaseSource(workspaceId: string, version: string): string {
    return join(this.#deliveryRoot(workspaceId), 'releases', safeSegment(version), 'workspace');
  }

  async #validateRelease(verified: VerifiedPackage): Promise<void> {
    const validationRoot = join(this.#stateRoot, '.delivery-validation', randomUUID());
    try {
      await writeTree(validationRoot, verified.files);
      const releaseManifest = join(
        validationRoot,
        ...verified.manifest.releaseManifestPath.split('/')
      );
      const inspection = inspectBuildReleasePackage(releaseManifest);
      if (!inspection.releaseReady) {
        throw new ManagedDeliveryError(
          'update_invalid',
          'Delivery Build release evidence is not ready.'
        );
      }
      const sourceRoot = join(
        validationRoot,
        ...verified.manifest.workspace.sourcePrefix.split('/')
      );
      const previewRoot =
        verified.manifest.workspace.preview.root === '.'
          ? sourceRoot
          : join(sourceRoot, ...verified.manifest.workspace.preview.root.split('/'));
      if (!existsSync(join(previewRoot, ...verified.manifest.workspace.preview.entry.split('/')))) {
        throw new ManagedDeliveryError('update_invalid', 'Delivery preview entry is missing.');
      }
    } finally {
      await rm(validationRoot, { recursive: true, force: true });
    }
  }

  async #readOrMigrateState(workspaceId: string): Promise<ManagedDeliveryState> {
    try {
      return await this.#readState(workspaceId);
    } catch (error) {
      if (!(error instanceof ManagedDeliveryError) || error.code !== 'delivery_not_managed') {
        throw error;
      }
    }
    const legacyPackage = join(this.#stateRoot, 'deliveries', `${workspaceId}.csworkspace`);
    if (!existsSync(legacyPackage) || !existsSync(this.#workspaceRoot(workspaceId))) {
      throw new ManagedDeliveryError(
        'delivery_not_managed',
        'Delivery lifecycle state is missing.'
      );
    }
    const verified = this.#verify(await readFile(legacyPackage));
    if (verified.manifest.workspace.id !== workspaceId) {
      throw new ManagedDeliveryError('update_invalid', 'Legacy delivery identity is invalid.');
    }
    const release = this.#releasePointer(verified);
    await writeTree(this.#releaseSource(workspaceId, release.version), sourceFiles(verified));
    const state: ManagedDeliveryState = {
      schema: STATE_SCHEMA,
      workspaceId,
      active: release
    };
    await this.#writeState(state);
    return state;
  }

  async #readState(workspaceId: string): Promise<ManagedDeliveryState> {
    try {
      const state = JSON.parse(
        await readFile(join(this.#deliveryRoot(workspaceId), 'state.json'), 'utf8')
      ) as ManagedDeliveryState;
      if (state.schema !== STATE_SCHEMA || state.workspaceId !== workspaceId) throw new Error();
      return state;
    } catch {
      throw new ManagedDeliveryError(
        'delivery_not_managed',
        'Delivery lifecycle state is missing.'
      );
    }
  }

  async #writeState(state: ManagedDeliveryState): Promise<void> {
    await this.#writeJson(join(this.#deliveryRoot(state.workspaceId), 'state.json'), state);
  }

  async #writeJson(path: string, value: unknown): Promise<void> {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const temporary = `${path}.${randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      mode: 0o600,
      flag: 'wx'
    });
    await rename(temporary, path);
  }

  async #findPlan(planId: string): Promise<StoredDeliveryUpdatePlan> {
    const roots = join(this.#stateRoot, 'managed-deliveries');
    if (!existsSync(roots)) {
      throw new ManagedDeliveryError('update_plan_not_found', 'Delivery update plan not found.');
    }
    for (const workspace of await readdir(roots, { withFileTypes: true })) {
      if (!workspace.isDirectory()) continue;
      const path = join(roots, workspace.name, 'pending', `${planId}.json`);
      if (!existsSync(path)) continue;
      const plan = JSON.parse(await readFile(path, 'utf8')) as StoredDeliveryUpdatePlan;
      if (plan.schema === PLAN_SCHEMA && plan.planId === planId) return plan;
    }
    throw new ManagedDeliveryError('update_plan_not_found', 'Delivery update plan not found.');
  }
}
