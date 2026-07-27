import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { join, resolve } from 'node:path';
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
  | 'workspace_integrity_failed';

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

export class ClientWorkspaceService {
  readonly #registry: WorkspaceRegistry;
  readonly #stateRoot: string;
  readonly #connectCodex: ConnectCodex;
  readonly #receiptStore: JsonWorkspaceReceiptStore;
  readonly #sessions = new Map<string, ActiveWorkspaceSession>();

  constructor(options: ClientWorkspaceServiceOptions) {
    this.#registry = options.registry;
    this.#stateRoot = resolve(options.stateRoot);
    this.#connectCodex = options.connectCodex;
    this.#receiptStore = new JsonWorkspaceReceiptStore(join(this.#stateRoot, 'receipts'));
  }

  async createSession(workspaceId: string): Promise<CreatedWorkspaceSession> {
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
    const active = this.#get(sessionId);
    await this.#assertWorkspaceIntegrity(active.workspaceId, active.baselineRoot);
    return await active.session.startTurn(request);
  }

  async respondToApproval(
    sessionId: string,
    approvalId: string,
    decision: 'accept' | 'decline'
  ): Promise<void> {
    await this.#get(sessionId).session.respondToApproval(approvalId, decision);
  }

  async closeSession(sessionId: string): Promise<void> {
    const active = this.#get(sessionId);
    await active.session.close();
    this.#sessions.delete(sessionId);
  }

  async closeWorkspaceSessions(workspaceId: string): Promise<void> {
    const matching = [...this.#sessions.entries()].filter(
      ([, active]) => active.workspaceId === workspaceId
    );
    await Promise.all(matching.map(([, active]) => active.session.close()));
    for (const [sessionId] of matching) this.#sessions.delete(sessionId);
  }

  async exportReceipt(sessionId: string): Promise<ExportedWorkspaceReceipt> {
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
    const active = this.#sessions.get(sessionId);
    const state = active ? { workspaceId: active.workspaceId } : await this.sessionState(sessionId);
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

  async resetWorkspace(workspaceId: string, immutableSeedRoot: string): Promise<void> {
    const workspace = this.#registry.resolve(workspaceId);
    const sessions = [...this.#sessions.entries()].filter(
      ([, active]) => active.workspaceId === workspaceId
    );
    await Promise.all(sessions.map(([, active]) => active.session.close()));
    for (const [sessionId] of sessions) this.#sessions.delete(sessionId);

    await rm(workspace.sourceRoot, { recursive: true, force: true });
    await cp(join(resolve(immutableSeedRoot), workspaceId), workspace.sourceRoot, {
      recursive: true,
      force: false,
      errorOnExist: true
    });
    await rm(this.#stateRoot, { recursive: true, force: true });
    await mkdir(this.#stateRoot, { recursive: true });
  }

  async close(): Promise<void> {
    await Promise.all([...this.#sessions.values()].map((active) => active.session.close()));
    this.#sessions.clear();
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
