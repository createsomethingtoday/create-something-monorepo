import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
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

export type ConnectCodex = () => Promise<CodexConnection>;

export type PublicWorkspaceSessionReceipt = Omit<
  WorkspaceSessionReceipt,
  'threadId' | 'turnId'
>;

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

export type ClientWorkspaceServiceErrorCode =
  | 'invalid_upload'
  | 'reset_unavailable'
  | 'session_not_found';

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
    return { active: false, workspaceId: receipt.workspaceId, receipt: publicReceipt(receipt) };
  }

  subscribe(
    sessionId: string,
    listener: (event: WorkspaceActivityEvent) => void
  ): () => void {
    return this.#get(sessionId).session.subscribe(listener);
  }

  async startTurn(
    sessionId: string,
    request: WorkspaceTurnRequest
  ): Promise<{ turnId: string }> {
    return await this.#get(sessionId).session.startTurn(request);
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
    const state = active
      ? { workspaceId: active.workspaceId }
      : await this.sessionState(sessionId);
    const baselineRoot = active?.baselineRoot ?? join(this.#stateRoot, 'baselines', sessionId);
    const workspace = this.#registry.resolve(state.workspaceId);
    const chunks: string[] = [];
    for (const editableRoot of workspace.editableRoots) {
      const relativeRoot = editableRoot.slice(workspace.sourceRoot.length + 1);
      const baselineEditableRoot = join(baselineRoot, relativeRoot);
      try {
        await execFileAsync(
          'git',
          ['diff', '--no-index', '--no-ext-diff', '--no-color', '--unified=3', '--', baselineEditableRoot, editableRoot],
          { maxBuffer: 512 * 1024 }
        );
      } catch (error) {
        const stdout = (error as { stdout?: string }).stdout;
        if (stdout) chunks.push(stdout);
      }
    }
    return chunks
      .join('\n')
      .split(baselineRoot).join('')
      .split(workspace.sourceRoot).join('')
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
    await Promise.all(
      [...this.#sessions.values()].map((active) => active.session.close())
    );
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
    for (const editableRoot of workspace.editableRoots) {
      const relativeRoot = editableRoot.slice(workspace.sourceRoot.length + 1);
      await cp(editableRoot, join(baselineRoot, relativeRoot), {
        recursive: true,
        force: false,
        errorOnExist: true
      });
    }
  }
}
