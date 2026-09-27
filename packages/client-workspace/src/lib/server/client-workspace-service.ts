import { cp, lstat, mkdir, mkdtemp, readFile, readdir, readlink, realpath, rename, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

import {
  JsonWorkspaceReceiptStore,
  WorkspaceSession,
  type CodexConnection,
  type WorkspaceActivityEvent,
  type WorkspaceAttachment,
  type WorkspaceSessionReceipt,
  type WorkspaceTurnRequest
} from './sessions/workspace-session.js';
import { materializeDemoSeed } from './workspaces/demo-seed.js';
import type { PublicWorkspace, WorkspaceRegistry } from './workspaces/registry.js';
import {
  captureWorkspaceIntegrity,
  inspectWorkspaceIntegrity,
  type WorkspaceIntegrityManifest
} from './workspaces/integrity.js';

export type ConnectCodex = () => Promise<CodexConnection>;

export type PublicWorkspaceSessionReceipt = Omit<WorkspaceSessionReceipt, 'threadId' | 'turnId'>;

export type ClientWorkspaceServiceOptions = {
  registry: WorkspaceRegistry;
  stateRoot: string;
  connectCodex: ConnectCodex;
};

export type CreatedWorkspaceSession = {
  workspace: PublicWorkspace;
  receipt: PublicWorkspaceSessionReceipt;
};

export type WorkspaceSessionState = {
  active: boolean;
  workspaceId: string;
  receipt: PublicWorkspaceSessionReceipt;
};

export type ExportedWorkspaceReceipt = {
  schema: 'create-something/client-workspace-receipt@1';
  exportedAt: string;
  receipt: PublicWorkspaceSessionReceipt;
};

export type ClientWorkspaceServiceErrorCode =
  | 'invalid_upload'
  | 'reset_unavailable'
  | 'session_not_found'
  | 'session_resume_failed'
  | 'workspace_integrity_failed'
  | 'workspace_resetting';

export class ClientWorkspaceServiceError extends Error {
  readonly code: ClientWorkspaceServiceErrorCode;

  constructor(code: ClientWorkspaceServiceErrorCode, message: string) {
    super(message);
    this.name = 'ClientWorkspaceServiceError';
    this.code = code;
  }
}

type ActiveWorkspaceSession = {
  workspaceId: string;
  uploadRoot: string;
  baselineRoot: string;
  session: WorkspaceSession;
};

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const execFileAsync = promisify(execFile);
const UPLOAD_EXTENSIONS = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp']
]);

function publicReceipt(receipt: WorkspaceSessionReceipt): PublicWorkspaceSessionReceipt {
  const { threadId: _threadId, turnId: _turnId, ...safe } = receipt;
  return safe;
}

function baselineEditableRoot(
  baselineRoot: string,
  workspaceRoot: string,
  editableRoot: string
): string {
  const relativeRoot = editableRoot.slice(workspaceRoot.length + 1);
  return join(baselineRoot, 'editable', relativeRoot || '__root__');
}

function isWithin(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}

// Walk physical descendants without following directory links. Relative links
// may be retained only when their canonical target stays inside the seed.
async function validateSeedDescendants(seed: string, directory = seed): Promise<void> {
  seed = await realpath(seed);
  for (const name of await readdir(directory)) {
    const path = join(directory, name);
    const entry = await lstat(path);
    if (entry.isSymbolicLink()) {
      if (isAbsolute(await readlink(path)) || !isWithin(seed, await realpath(path))) {
        throw new Error('seed_link_escape');
      }
    } else if (entry.isDirectory()) {
      await validateSeedDescendants(seed, path);
    } else if (!entry.isFile()) {
      throw new Error('invalid_seed_entry');
    }
  }
}

// A contained link may textually traverse the seed root (for example,
// demo/alias -> ../demo/src/page). Rebase it to the staged tree before
// validating or promoting the replacement.
async function rebaseSeedLinks(seed: string, replacement: string, directory = seed): Promise<void> {
  for (const name of await readdir(directory)) {
    const path = join(directory, name);
    const entry = await lstat(path);
    if (entry.isSymbolicLink()) {
      const target = await realpath(path);
      if (!isWithin(seed, target)) throw new Error('seed_link_escape');
      const stagedLink = join(replacement, relative(seed, path));
      const stagedTarget = join(replacement, relative(seed, target));
      await rm(stagedLink);
      await symlink(relative(dirname(stagedLink), stagedTarget) || '.', stagedLink);
    } else if (entry.isDirectory()) {
      await rebaseSeedLinks(seed, replacement, path);
    }
  }
}

export class ClientWorkspaceService {
  readonly #registry: WorkspaceRegistry;
  readonly #stateRoot: string;
  readonly #connectCodex: ConnectCodex;
  readonly #receiptStore: JsonWorkspaceReceiptStore;
  readonly #sessions = new Map<string, ActiveWorkspaceSession>();
  readonly #workspaceOperations = new Map<string, Promise<void>>();
  readonly #resetting = new Set<string>();

  constructor(options: ClientWorkspaceServiceOptions) {
    this.#registry = options.registry;
    this.#stateRoot = resolve(options.stateRoot);
    this.#connectCodex = options.connectCodex;
    this.#receiptStore = new JsonWorkspaceReceiptStore(join(this.#stateRoot, 'receipts'));
  }

  async createSession(workspaceId: string): Promise<CreatedWorkspaceSession> {
    return await this.#runWorkspace(workspaceId, () => this.#createSession(workspaceId));
  }

  async #createSession(workspaceId: string): Promise<CreatedWorkspaceSession> {
    const workspace = this.#registry.resolve(workspaceId);
    const sessionId = `session-${crypto.randomUUID()}`;
    const uploadRoot = join(this.#stateRoot, 'uploads', sessionId);
    const baselineRoot = join(this.#stateRoot, 'baselines', sessionId);
    await this.#captureBaseline(workspaceId, baselineRoot);
    const codex = await this.#connectCodex();
    const session = new WorkspaceSession({
      id: sessionId,
      workspace,
      codex,
      uploadRoot,
      receiptStore: this.#receiptStore
    });
    this.#sessions.set(sessionId, { workspaceId, uploadRoot, baselineRoot, session });
    try {
      const receipt = await session.open();
      return { workspace: this.#registry.get(workspaceId), receipt: publicReceipt(receipt) };
    } catch (error) {
      this.#sessions.delete(sessionId);
      await session.close();
      throw error;
    }
  }

  receipt(sessionId: string): PublicWorkspaceSessionReceipt {
    return publicReceipt(this.#get(sessionId).session.receipt());
  }

  workspaceId(sessionId: string): string {
    return this.#get(sessionId).workspaceId;
  }

  async sessionState(sessionId: string): Promise<WorkspaceSessionState> {
    return await this.#runSession(sessionId, () => this.#sessionState(sessionId));
  }

  async #sessionState(sessionId: string): Promise<WorkspaceSessionState> {
    const active = this.#sessions.get(sessionId);
    if (active) {
      return {
        active: true,
        workspaceId: active.workspaceId,
        receipt: publicReceipt(active.session.receipt())
      };
    }
    let receipt: WorkspaceSessionReceipt | null = null;
    try {
      receipt = await this.#receiptStore.get(sessionId);
    } catch {
      receipt = null;
    }
    if (!receipt) {
      throw new ClientWorkspaceServiceError('session_not_found', 'Workspace session not found.');
    }
    this.#registry.resolve(receipt.workspaceId);
    if (receipt.status !== 'ready' && receipt.status !== 'completed') {
      return { active: false, workspaceId: receipt.workspaceId, receipt: publicReceipt(receipt) };
    }

    const workspace = this.#registry.resolve(receipt.workspaceId);
    const baselineRoot = join(this.#stateRoot, 'baselines', sessionId);
    await this.#assertWorkspaceIntegrity(receipt.workspaceId, baselineRoot);
    const codex = await this.#connectCodex();
    const uploadRoot = join(this.#stateRoot, 'uploads', sessionId);
    const session = new WorkspaceSession({
      id: sessionId,
      workspace,
      codex,
      uploadRoot,
      receiptStore: this.#receiptStore,
      initialReceipt: receipt
    });
    try {
      const resumed = await session.open();
      this.#sessions.set(sessionId, {
        workspaceId: receipt.workspaceId,
        uploadRoot,
        baselineRoot,
        session
      });
      return {
        active: true,
        workspaceId: receipt.workspaceId,
        receipt: publicReceipt(resumed)
      };
    } catch (error) {
      session.disconnect();
      throw new ClientWorkspaceServiceError(
        'session_resume_failed',
        'The prior Codex conversation could not be resumed safely.'
      );
    }
  }

  subscribe(sessionId: string, listener: (event: WorkspaceActivityEvent) => void): () => void {
    return this.#get(sessionId).session.subscribe(listener);
  }

  async startTurn(sessionId: string, request: WorkspaceTurnRequest): Promise<{ turnId: string }> {
    return await this.#runSession(sessionId, () => this.#startTurn(sessionId, request));
  }

  async #startTurn(sessionId: string, request: WorkspaceTurnRequest): Promise<{ turnId: string }> {
    const active = this.#get(sessionId);
    await this.#assertWorkspaceIntegrity(active.workspaceId, active.baselineRoot);
    return await active.session.startTurn(request);
  }

  async respondToApproval(
    sessionId: string,
    approvalId: string,
    decision: 'accept' | 'decline'
  ): Promise<void> {
    await this.#runSession(sessionId, () => this.#respondToApproval(sessionId, approvalId, decision));
  }

  async #respondToApproval(
    sessionId: string,
    approvalId: string,
    decision: 'accept' | 'decline'
  ): Promise<void> {
    await this.#get(sessionId).session.respondToApproval(approvalId, decision);
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.#runSession(sessionId, () => this.#closeSession(sessionId));
  }

  async #closeSession(sessionId: string): Promise<void> {
    const active = this.#get(sessionId);
    await active.session.close();
    this.#sessions.delete(sessionId);
  }

  async closeWorkspaceSessions(workspaceId: string): Promise<void> {
    await this.#runWorkspace(workspaceId, () => this.#closeWorkspaceSessions(workspaceId));
  }

  async #closeWorkspaceSessions(workspaceId: string): Promise<void> {
    const matching = [...this.#sessions.entries()].filter(
      ([, active]) => active.workspaceId === workspaceId
    );
    await Promise.all(matching.map(([, active]) => active.session.close()));
    for (const [sessionId] of matching) this.#sessions.delete(sessionId);
  }

  async exportReceipt(sessionId: string): Promise<ExportedWorkspaceReceipt> {
    return await this.#runSession(sessionId, () => this.#exportReceipt(sessionId));
  }

  async #exportReceipt(sessionId: string): Promise<ExportedWorkspaceReceipt> {
    const active = this.#sessions.get(sessionId);
    const receipt = active?.session.receipt() ?? (await this.#receiptStore.get(sessionId));
    if (!receipt) {
      throw new ClientWorkspaceServiceError('session_not_found', 'Workspace session not found.');
    }
    return {
      schema: 'create-something/client-workspace-receipt@1',
      exportedAt: new Date().toISOString(),
      receipt: publicReceipt(receipt)
    };
  }

  async storeAttachment(sessionId: string, file: File): Promise<WorkspaceAttachment> {
    return await this.#runSession(sessionId, () => this.#storeAttachment(sessionId, file));
  }

  async #storeAttachment(sessionId: string, file: File): Promise<WorkspaceAttachment> {
    const active = this.#get(sessionId);
    const extension = UPLOAD_EXTENSIONS.get(file.type);
    if (!extension || file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      throw new ClientWorkspaceServiceError(
        'invalid_upload',
        'Upload must be a PNG, JPEG, or WebP image no larger than 5 MB.'
      );
    }
    await mkdir(active.uploadRoot, { recursive: true });
    const path = join(active.uploadRoot, `${crypto.randomUUID()}${extension}`);
    await writeFile(path, Buffer.from(await file.arrayBuffer()), { mode: 0o600 });
    return { path, mimeType: file.type, sizeBytes: file.size };
  }

  async workspaceDiff(sessionId: string): Promise<string> {
    return await this.#runSession(sessionId, () => this.#workspaceDiff(sessionId));
  }

  async #workspaceDiff(sessionId: string): Promise<string> {
    const active = this.#sessions.get(sessionId);
    const state = active ? { workspaceId: active.workspaceId } : await this.#sessionState(sessionId);
    const baselineRoot = active?.baselineRoot ?? join(this.#stateRoot, 'baselines', sessionId);
    const workspace = this.#registry.resolve(state.workspaceId);
    const chunks: string[] = [];
    const integrityChanges = await this.#workspaceIntegrityChanges(state.workspaceId, baselineRoot);
    if (integrityChanges.length > 0) {
      chunks.push(
        [
          'WORKSPACE POLICY VIOLATION: changes outside declared editable roots',
          ...integrityChanges.map((change) => `${change.kind.toUpperCase()} ${change.path}`)
        ].join('\n')
      );
    }
    for (const editableRoot of workspace.editableRoots) {
      const baselineRootForEdit = baselineEditableRoot(
        baselineRoot,
        workspace.sourceRoot,
        editableRoot
      );
      try {
        await execFileAsync(
          'git',
          [
            'diff',
            '--no-index',
            '--no-ext-diff',
            '--no-color',
            '--unified=3',
            '--',
            baselineRootForEdit,
            editableRoot
          ],
          { maxBuffer: 512 * 1024 }
        );
      } catch (error) {
        const stdout = (error as { stdout?: string }).stdout;
        if (stdout) chunks.push(stdout);
      }
    }
    return chunks
      .join('\n')
      .split(baselineRoot)
      .join('')
      .split(workspace.sourceRoot)
      .join('')
      .slice(0, 120_000);
  }

  async resetWorkspace(workspaceId: string, immutableSeedRoot?: string): Promise<void> {
    this.#assertNotResetting(workspaceId);
    this.#resetting.add(workspaceId);
    try {
      await this.#runWorkspace(workspaceId, () => this.#resetWorkspace(workspaceId, immutableSeedRoot), true);
    } finally {
      this.#resetting.delete(workspaceId);
    }
  }

  async #resetWorkspace(workspaceId: string, immutableSeedRoot?: string): Promise<void> {
    const workspace = this.#registry.resolve(workspaceId);
    // Stage the complete seed before touching source files or session authority.
    let stagingRoot: string | undefined;
    try {
      const source = await realpath(workspace.sourceRoot);
      const state = await realpath(this.#stateRoot).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return this.#stateRoot;
        throw error;
      });
      if (isWithin(source, state)) throw new Error('state_inside_source');
      stagingRoot = await mkdtemp(join(dirname(workspace.sourceRoot), '.reset-'));
      const replacement = join(stagingRoot, 'replacement');
      if (immutableSeedRoot) {
        const seed = await realpath(join(resolve(immutableSeedRoot), workspaceId));
        if (!(await stat(seed)).isDirectory()) throw new Error('invalid_seed');
        for (const entry of this.#registry.list()) {
          const mutableRoot = await realpath(this.#registry.resolve(entry.id).sourceRoot);
          if (isWithin(mutableRoot, seed) || isWithin(seed, mutableRoot)) throw new Error('mutable_seed');
        }
        await validateSeedDescendants(seed);
        await cp(seed, replacement, {
          recursive: true, errorOnExist: true, verbatimSymlinks: true
        });
        await rebaseSeedLinks(seed, replacement);
        // Validate the staged tree too: it must be contained at its final depth,
        // not merely point back into the external seed through copied links.
        await validateSeedDescendants(replacement);
      } else {
        if (workspaceId !== 'demo-frontend') throw new Error('missing_seed');
        await materializeDemoSeed(replacement);
        // Dependencies are operator-owned and outside the demo's editable src root.
        // Retain the installed dependency tree; reset never installs over the network.
        await cp(join(source, 'node_modules'), join(replacement, 'node_modules'), {
          recursive: true, verbatimSymlinks: true
        }).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT') throw error;
        });
      }
    } catch {
      if (stagingRoot) await rm(stagingRoot, { recursive: true, force: true });
      throw new ClientWorkspaceServiceError('reset_unavailable', 'The immutable workspace seed is unavailable.');
    }

    let preserveBackup = false;
    try {
      // Receipts are the ownership index, including sessions from prior runtimes.
      const receiptFiles = await readdir(join(this.#stateRoot, 'receipts')).catch(
        (error: NodeJS.ErrnoException) => {
          if (error.code === 'ENOENT') return [];
          throw error;
        }
      );
      const ownedSessions = new Set<string>();
      for (const file of receiptFiles) {
        if (!file.endsWith('.json')) continue;
        const sessionId = file.slice(0, -5);
        const receipt = await this.#receiptStore.get(sessionId);
        if (receipt?.workspaceId === workspaceId) ownedSessions.add(sessionId);
      }
      for (const [sessionId, active] of this.#sessions) {
        if (active.workspaceId === workspaceId) ownedSessions.add(sessionId);
      }
      await this.#closeWorkspaceSessions(workspaceId);
      // Revoke persisted authority before exposing a different source tree. A
      // failed cleanup must never make an idle pre-reset thread resumable.
      for (const sessionId of ownedSessions) {
        const receipt = await this.#receiptStore.get(sessionId);
        if (!receipt) continue;
        await this.#receiptStore.put({
          ...receipt,
          status: 'closed',
          threadId: undefined,
          turnId: undefined,
          updatedAt: new Date().toISOString()
        });
      }
      const recovery = {
        workspaceId,
        sourceRoot: workspace.sourceRoot,
        sessionIds: [...ownedSessions],
        phase: 'authority_revoked'
      };
      const recordRecovery = async () => {
        await writeFile(join(stagingRoot, 'reset.json'), `${JSON.stringify(recovery, null, 2)}\n`, {
          mode: 0o600
        });
      };
      await recordRecovery();

      const backup = join(stagingRoot, 'original');
      await rename(workspace.sourceRoot, backup);
      preserveBackup = true;
      try {
        await rename(join(stagingRoot, 'replacement'), workspace.sourceRoot);
      } catch (error) {
        try {
          await rename(backup, workspace.sourceRoot);
          preserveBackup = false;
        } catch {
          preserveBackup = true;
        }
        throw error;
      }
      recovery.phase = 'source_replaced';
      await recordRecovery();
      for (const sessionId of ownedSessions) {
        await rm(join(this.#stateRoot, 'receipts', `${sessionId}.json`), { force: true });
        await rm(join(this.#stateRoot, 'uploads', sessionId), { recursive: true, force: true });
        await rm(join(this.#stateRoot, 'baselines', sessionId), { recursive: true, force: true });
      }
      preserveBackup = false;
    } finally {
      if (!preserveBackup) await rm(stagingRoot, { recursive: true, force: true });
    }
  }

  async close(): Promise<void> {
    await Promise.all(this.#registry.list().map(({ id }) =>
      this.#runWorkspace(id, () => this.#closeWorkspaceSessions(id), true)
    ));
  }

  #assertNotResetting(workspaceId: string): void {
    if (this.#resetting.has(workspaceId)) {
      throw new ClientWorkspaceServiceError('workspace_resetting', 'The workspace is resetting. Try again when reset finishes.');
    }
  }

  // One admission queue per workspace. Reset closes admission immediately and
  // waits for already-admitted operations before snapshotting session ownership.
  async #runWorkspace<T>(workspaceId: string, operation: () => Promise<T>, duringReset = false): Promise<T> {
    this.#registry.resolve(workspaceId);
    if (!duringReset) this.#assertNotResetting(workspaceId);
    const previous = this.#workspaceOperations.get(workspaceId) ?? Promise.resolve();
    let release!: () => void;
    const finished = new Promise<void>((resolve) => { release = resolve; });
    this.#workspaceOperations.set(workspaceId, finished);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.#workspaceOperations.get(workspaceId) === finished) {
        this.#workspaceOperations.delete(workspaceId);
      }
    }
  }

  async #runSession<T>(sessionId: string, operation: () => Promise<T>): Promise<T> {
    // This lookup only selects the queue. The operation re-reads authority while
    // holding that queue, so a receipt read before reset cannot resume afterward.
    const workspaceId = this.#sessions.get(sessionId)?.workspaceId ??
      (await this.#receiptStore.get(sessionId))?.workspaceId;
    if (!workspaceId) {
      throw new ClientWorkspaceServiceError('session_not_found', 'Workspace session not found.');
    }
    return await this.#runWorkspace(workspaceId, operation);
  }

  #get(sessionId: string): ActiveWorkspaceSession {
    const active = this.#sessions.get(sessionId);
    if (!active) {
      throw new ClientWorkspaceServiceError('session_not_found', 'Workspace session not found.');
    }
    return active;
  }

  async #captureBaseline(workspaceId: string, baselineRoot: string): Promise<void> {
    const workspace = this.#registry.resolve(workspaceId);
    await mkdir(baselineRoot, { recursive: true });
    await writeFile(
      join(baselineRoot, 'integrity.json'),
      `${JSON.stringify(await captureWorkspaceIntegrity(workspace), null, 2)}\n`,
      { encoding: 'utf8', mode: 0o600 }
    );
    for (const editableRoot of workspace.editableRoots) {
      await cp(
        editableRoot,
        baselineEditableRoot(baselineRoot, workspace.sourceRoot, editableRoot),
        {
          recursive: true,
          force: false,
          errorOnExist: true
        }
      );
    }
  }

  async #workspaceIntegrityChanges(workspaceId: string, baselineRoot: string) {
    const workspace = this.#registry.resolve(workspaceId);
    let baseline: WorkspaceIntegrityManifest;
    try {
      baseline = JSON.parse(
        await readFile(join(baselineRoot, 'integrity.json'), 'utf8')
      ) as WorkspaceIntegrityManifest;
    } catch {
      throw new ClientWorkspaceServiceError(
        'workspace_integrity_failed',
        'The workspace integrity baseline is unavailable.'
      );
    }
    if (baseline.schema !== 'create-something/workspace-integrity@1') {
      throw new ClientWorkspaceServiceError(
        'workspace_integrity_failed',
        'The workspace integrity baseline is invalid.'
      );
    }
    return await inspectWorkspaceIntegrity(workspace, baseline);
  }

  async #assertWorkspaceIntegrity(workspaceId: string, baselineRoot: string): Promise<void> {
    const changes = await this.#workspaceIntegrityChanges(workspaceId, baselineRoot);
    if (changes.length === 0) return;
    throw new ClientWorkspaceServiceError(
      'workspace_integrity_failed',
      `Workspace policy boundary changed: ${changes.map((change) => change.path).join(', ')}`
    );
  }
}
