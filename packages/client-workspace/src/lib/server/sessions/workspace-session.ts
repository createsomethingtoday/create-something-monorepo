import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

import type { ResolvedWorkspaceDefinition } from '../workspaces/registry.js';

export type CodexUserInput =
  | { type: 'text'; text: string }
  | { type: 'localImage'; path: string; detail: 'high' };

export type WorkspaceSandboxPolicy = {
  type: 'workspaceWrite';
  writableRoots: string[];
  networkAccess: false;
};

export type StartThreadOptions = {
  cwd: string;
  model: 'gpt-5.5';
  approvalPolicy: 'untrusted';
  developerInstructions: string;
};

export type StartTurnOptions = {
  threadId: string;
  input: CodexUserInput[];
  approvalPolicy: 'untrusted';
  sandboxPolicy: WorkspaceSandboxPolicy;
};

export type CodexServerMessage = {
  id?: number | string;
  method?: string;
  params?: Record<string, unknown>;
  error?: unknown;
};

export interface CodexConnection {
  onMessage(listener: (message: CodexServerMessage) => void): void;
  startThread(options: StartThreadOptions): Promise<{ threadId: string }>;
  startTurn(options: StartTurnOptions): Promise<{ turnId: string }>;
  respond(id: number | string, result: unknown): void;
  close(): void;
}

export type WorkspaceActivityEventType =
  | 'session.ready'
  | 'session.closed'
  | 'turn.started'
  | 'agent.message'
  | 'command.started'
  | 'command.output'
  | 'file.changed'
  | 'diff.updated'
  | 'approval.requested'
  | 'approval.resolved'
  | 'turn.completed'
  | 'turn.failed'
  | 'runtime.error';

export type WorkspaceActivityEvent = {
  sequence: number;
  at: string;
  type: WorkspaceActivityEventType;
  message: string;
  status?: 'running' | 'completed' | 'failed' | 'pending' | 'declined' | 'accepted';
  approvalId?: string;
  approvalKind?: 'command' | 'file';
};

export type WorkspaceSessionStatus = 'opening' | 'ready' | 'running' | 'completed' | 'failed' | 'closed';

export type WorkspaceSessionReceipt = {
  sessionId: string;
  workspaceId: string;
  threadId?: string;
  turnId?: string;
  status: WorkspaceSessionStatus;
  updatedAt: string;
  events: WorkspaceActivityEvent[];
};

export interface WorkspaceReceiptStore {
  put(receipt: WorkspaceSessionReceipt): Promise<void>;
  get(sessionId: string): Promise<WorkspaceSessionReceipt | null>;
}

export class MemoryWorkspaceReceiptStore implements WorkspaceReceiptStore {
  readonly #receipts = new Map<string, WorkspaceSessionReceipt>();

  async put(receipt: WorkspaceSessionReceipt): Promise<void> {
    this.#receipts.set(receipt.sessionId, structuredClone(receipt));
  }

  async get(sessionId: string): Promise<WorkspaceSessionReceipt | null> {
    const receipt = this.#receipts.get(sessionId);
    return receipt ? structuredClone(receipt) : null;
  }
}

export class JsonWorkspaceReceiptStore implements WorkspaceReceiptStore {
  readonly #root: string;

  constructor(root: string) {
    this.#root = resolve(root);
  }

  async put(receipt: WorkspaceSessionReceipt): Promise<void> {
    const destination = this.#pathFor(receipt.sessionId);
    await mkdir(this.#root, { recursive: true });
    const temporary = `${destination}.${crypto.randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(receipt, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600
    });
    await rename(temporary, destination);
  }

  async get(sessionId: string): Promise<WorkspaceSessionReceipt | null> {
    const path = this.#pathFor(sessionId);
    try {
      const value = JSON.parse(await readFile(path, 'utf8')) as unknown;
      if (!isWorkspaceSessionReceipt(value) || value.sessionId !== sessionId) {
        throw new Error('invalid_workspace_receipt');
      }
      return structuredClone(value);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  #pathFor(sessionId: string): string {
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(sessionId)) {
      throw new Error('invalid_session_id');
    }
    return join(this.#root, `${sessionId}.json`);
  }
}

export type WorkspaceAttachment = {
  path: string;
  mimeType: string;
  sizeBytes: number;
};

export type WorkspaceTurnRequest = {
  text: string;
  attachment?: WorkspaceAttachment;
};

export type WorkspaceSessionErrorCode =
  | 'approval_not_found'
  | 'forbidden_intent'
  | 'invalid_attachment'
  | 'invalid_turn'
  | 'session_closed'
  | 'turn_conflict';

export class WorkspaceSessionError extends Error {
  readonly code: WorkspaceSessionErrorCode;

  constructor(code: WorkspaceSessionErrorCode, message: string) {
    super(message);
    this.name = 'WorkspaceSessionError';
    this.code = code;
  }
}

export type WorkspaceSessionOptions = {
  id: string;
  workspace: Readonly<ResolvedWorkspaceDefinition>;
  codex: CodexConnection;
  uploadRoot: string;
  receiptStore: WorkspaceReceiptStore;
  now?: () => Date;
};

type PendingApproval = {
  requestId: number | string;
  kind: 'command' | 'file';
};

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_PROMPT_CHARACTERS = 12_000;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const FORBIDDEN_INTENT_PATTERNS = [
  /\bdeploy(?:ed|ing|ment)?\b/i,
  /\bpublish(?:ed|ing)?\b/i,
  /\binvit(?:e|ed|ing|ation)\b/i,
  /\b(?:rotate|replace|revoke|delete|change)\b.{0,40}\b(?:api[ _-]?key|credential|password|secret|token)s?\b/i
];

const WORKSPACE_DEVELOPER_INSTRUCTIONS = `You are editing one allowlisted client frontend workspace.
Stay inside the current workspace root. Do not deploy, publish, change credentials, access secrets,
or mutate third-party systems. Keep changes small and visible, run focused checks when useful, and
stop for approval when a command or file change is outside the active policy.`;

function isWithin(root: string, candidate: string): boolean {
  const fromRoot = relative(root, candidate);
  return fromRoot === '' || (!fromRoot.startsWith(`..${sep}`) && fromRoot !== '..' && !isAbsolute(fromRoot));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function sanitizedText(value: unknown, workspaceRoot: string): string {
  if (typeof value !== 'string') return '';
  return value
    .split(workspaceRoot)
    .join('[workspace]')
    .replace(/\bsk-[A-Za-z0-9_-]+\b/g, '[redacted]')
    .replace(/\b(?:api[_-]?key|token|secret)\s*[=:]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/\/(?:Users|home)\/[^/\s]+\/[^\s]+/g, '[local path]')
    .slice(0, 4_000);
}

function isWorkspaceSessionReceipt(value: unknown): value is WorkspaceSessionReceipt {
  const receipt = asRecord(value);
  return (
    typeof receipt.sessionId === 'string' &&
    typeof receipt.workspaceId === 'string' &&
    typeof receipt.status === 'string' &&
    typeof receipt.updatedAt === 'string' &&
    Array.isArray(receipt.events)
  );
}

function classifyRuntimeError(value: unknown): string {
  let diagnostic = '';
  try {
    diagnostic = JSON.stringify(value).toLowerCase();
  } catch {
    return 'agent_execution_failed';
  }
  if (
    /insufficient[_ -]?quota|quota[_ -]?exhausted|exceeded (?:your )?current quota|billing (?:details|quota)|run out of credits/.test(
      diagnostic
    )
  ) {
    return 'quota_exhausted';
  }
  if (/local.?image|input.?image|image (?:input|load|decode)|\bimage\b/.test(diagnostic)) {
    return 'image_input_failed';
  }
  if (/auth|credential|invalid.?api.?key|\b401\b/.test(diagnostic)) {
    return 'authentication_failed';
  }
  if (/rate.?limit|too many requests|\b429\b/.test(diagnostic)) return 'rate_limited';
  if (/model|\b404\b/.test(diagnostic)) return 'model_unavailable';
  if (/sandbox|permission denied|operation not permitted/.test(diagnostic)) return 'sandbox_failed';
  return 'agent_execution_failed';
}

function safeRelativePath(workspaceRoot: string, rawPath: unknown): string {
  if (typeof rawPath !== 'string') return 'workspace file';
  const candidate = resolve(rawPath);
  if (!isWithin(workspaceRoot, candidate)) return 'workspace file';
  return relative(workspaceRoot, candidate) || 'workspace file';
}

export class WorkspaceSession {
  readonly #id: string;
  readonly #workspace: Readonly<ResolvedWorkspaceDefinition>;
  readonly #codex: CodexConnection;
  readonly #uploadRoot: string;
  readonly #receiptStore: WorkspaceReceiptStore;
  readonly #now: () => Date;
  readonly #subscribers = new Set<(event: WorkspaceActivityEvent) => void>();
  readonly #pendingApprovals = new Map<string, PendingApproval>();
  readonly #agentMessageBuffers = new Map<string, string>();

  #receipt: WorkspaceSessionReceipt;
  #sequence = 0;
  #activeTurn = false;
  #closed = false;

  constructor(options: WorkspaceSessionOptions) {
    this.#id = options.id;
    this.#workspace = options.workspace;
    this.#codex = options.codex;
    this.#uploadRoot = resolve(options.uploadRoot);
    this.#receiptStore = options.receiptStore;
    this.#now = options.now ?? (() => new Date());
    this.#receipt = {
      sessionId: options.id,
      workspaceId: options.workspace.id,
      status: 'opening',
      updatedAt: this.#now().toISOString(),
      events: []
    };

    this.#codex.onMessage((message) => this.#handleCodexMessage(message));
  }

  subscribe(listener: (event: WorkspaceActivityEvent) => void): () => void {
    this.#subscribers.add(listener);
    return () => this.#subscribers.delete(listener);
  }

  async open(): Promise<WorkspaceSessionReceipt> {
    this.#assertOpen();
    if (this.#receipt.threadId) return this.receipt();

    const { threadId } = await this.#codex.startThread({
      cwd: this.#workspace.sourceRoot,
      model: 'gpt-5.5',
      approvalPolicy: 'untrusted',
      developerInstructions: WORKSPACE_DEVELOPER_INSTRUCTIONS
    });
    this.#receipt.threadId = threadId;
    this.#receipt.status = 'ready';
    this.#emit({ type: 'session.ready', message: 'Workspace agent is ready.', status: 'completed' });
    await this.#persist();
    return this.receipt();
  }

  async startTurn(request: WorkspaceTurnRequest): Promise<{ turnId: string }> {
    this.#assertOpen();
    if (this.#activeTurn) {
      throw new WorkspaceSessionError('turn_conflict', 'A workspace turn is already running.');
    }
    const text = request.text.trim();
    if (text === '' || text.length > MAX_PROMPT_CHARACTERS) {
      throw new WorkspaceSessionError('invalid_turn', 'Turn text is missing or too long.');
    }
    if (FORBIDDEN_INTENT_PATTERNS.some((pattern) => pattern.test(text))) {
      throw new WorkspaceSessionError(
        'forbidden_intent',
        'Deployment, publication, invitation, and credential intents are unavailable.'
      );
    }
    const input: CodexUserInput[] = [{ type: 'text', text }];
    if (request.attachment) {
      input.push(this.#validateAttachment(request.attachment));
    }
    if (!this.#receipt.threadId) await this.open();

    this.#activeTurn = true;
    this.#agentMessageBuffers.clear();
    this.#receipt.status = 'running';
    try {
      const { turnId } = await this.#codex.startTurn({
        threadId: this.#receipt.threadId!,
        input,
        approvalPolicy: 'untrusted',
        sandboxPolicy: {
          type: 'workspaceWrite',
          writableRoots: [this.#workspace.sourceRoot],
          networkAccess: false
        }
      });
      this.#receipt.turnId = turnId;
      this.#emit({ type: 'turn.started', message: 'Agent turn started.', status: 'running' });
      await this.#persist();
      return { turnId };
    } catch {
      this.#activeTurn = false;
      this.#receipt.status = 'failed';
      this.#emit({ type: 'runtime.error', message: 'agent_start_failed', status: 'failed' });
      await this.#persist();
      throw new WorkspaceSessionError('invalid_turn', 'The agent turn could not start.');
    }
  }

  async respondToApproval(approvalId: string, decision: 'accept' | 'decline'): Promise<void> {
    this.#assertOpen();
    const pending = this.#pendingApprovals.get(approvalId);
    if (!pending) {
      throw new WorkspaceSessionError('approval_not_found', 'Approval request is no longer pending.');
    }
    this.#pendingApprovals.delete(approvalId);
    this.#codex.respond(pending.requestId, { decision });
    this.#emit({
      type: 'approval.resolved',
      message: decision === 'accept' ? 'Action approved.' : 'Action declined.',
      status: decision === 'accept' ? 'accepted' : 'declined',
      approvalId,
      approvalKind: pending.kind
    });
    await this.#persist();
  }

  receipt(): WorkspaceSessionReceipt {
    return structuredClone(this.#receipt);
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    this.#activeTurn = false;
    this.#receipt.status = 'closed';
    this.#emit({ type: 'session.closed', message: 'Workspace session closed.', status: 'completed' });
    await this.#persist();
    this.#codex.close();
    this.#subscribers.clear();
    this.#pendingApprovals.clear();
    this.#agentMessageBuffers.clear();
  }

  #assertOpen(): void {
    if (this.#closed) {
      throw new WorkspaceSessionError('session_closed', 'Workspace session is closed.');
    }
  }

  #validateAttachment(attachment: WorkspaceAttachment): CodexUserInput {
    const attachmentPath = resolve(attachment.path);
    if (
      !ALLOWED_IMAGE_TYPES.has(attachment.mimeType) ||
      !Number.isFinite(attachment.sizeBytes) ||
      attachment.sizeBytes <= 0 ||
      attachment.sizeBytes > MAX_ATTACHMENT_BYTES ||
      !isWithin(this.#uploadRoot, attachmentPath)
    ) {
      throw new WorkspaceSessionError('invalid_attachment', 'Attachment is outside the allowed image boundary.');
    }
    return { type: 'localImage', path: attachmentPath, detail: 'high' };
  }

  #handleCodexMessage(message: CodexServerMessage): void {
    const params = asRecord(message.params);
    if (message.id !== undefined && message.method?.endsWith('/requestApproval')) {
      const kind = message.method.includes('fileChange') ? 'file' : 'command';
      const approvalId = crypto.randomUUID();
      this.#pendingApprovals.set(approvalId, { requestId: message.id, kind });
      const command = sanitizedText(params.command, this.#workspace.sourceRoot);
      this.#emit({
        type: 'approval.requested',
        message: command ? `Approve command: ${command}` : `Approve ${kind} change.`,
        status: 'pending',
        approvalId,
        approvalKind: kind
      });
      void this.#persist();
      return;
    }

    switch (message.method) {
      case 'item/agentMessage/delta': {
        const itemId = typeof params.itemId === 'string' ? params.itemId : 'active-message';
        const delta = typeof params.delta === 'string' ? params.delta : '';
        const buffered = `${this.#agentMessageBuffers.get(itemId) ?? ''}${delta}`;
        this.#agentMessageBuffers.set(itemId, buffered.slice(0, 16_000));
        break;
      }
      case 'item/started': {
        const item = asRecord(params.item);
        if (item.type === 'agentMessage' && typeof item.id === 'string') {
          this.#agentMessageBuffers.set(item.id, typeof item.text === 'string' ? item.text : '');
        } else if (item.type === 'commandExecution') {
          const command = sanitizedText(item.command, this.#workspace.sourceRoot);
          this.#emit({
            type: 'command.started',
            message: command ? `Running ${command}` : 'Running a workspace command.',
            status: 'running'
          });
        } else if (item.type === 'fileChange') {
          this.#emit({ type: 'file.changed', message: 'Preparing file changes.', status: 'running' });
        }
        break;
      }
      case 'item/completed': {
        const item = asRecord(params.item);
        if (item.type === 'agentMessage') {
          const itemId = typeof item.id === 'string' ? item.id : 'active-message';
          const text = typeof item.text === 'string' ? item.text : this.#agentMessageBuffers.get(itemId);
          this.#emitAgentMessage(text);
          this.#agentMessageBuffers.delete(itemId);
        }
        break;
      }
      case 'item/commandExecution/outputDelta':
        this.#emit({
          type: 'command.output',
          message: 'Command produced additional output.',
          status: 'running'
        });
        break;
      case 'item/fileChange/patchUpdated': {
        const changes = Array.isArray(params.changes) ? params.changes : [];
        const files = changes
          .map((change) => safeRelativePath(this.#workspace.sourceRoot, asRecord(change).path))
          .filter((path, index, all) => all.indexOf(path) === index)
          .slice(0, 8);
        this.#emit({
          type: 'file.changed',
          message: files.length > 0 ? `Updated ${files.join(', ')}` : 'Updated workspace files.',
          status: 'running'
        });
        break;
      }
      case 'turn/diff/updated': {
        this.#emit({
          type: 'diff.updated',
          message: 'Workspace diff updated.',
          status: 'running'
        });
        break;
      }
      case 'turn/completed': {
        for (const text of this.#agentMessageBuffers.values()) this.#emitAgentMessage(text);
        this.#agentMessageBuffers.clear();
        const turn = asRecord(params.turn);
        const failed = turn.status === 'failed' || Boolean(turn.error);
        this.#activeTurn = false;
        this.#receipt.status = failed ? 'failed' : 'completed';
        this.#emit({
          type: failed ? 'turn.failed' : 'turn.completed',
          message: failed ? classifyRuntimeError(turn.error) : 'Agent turn completed.',
          status: failed ? 'failed' : 'completed'
        });
        break;
      }
      case 'error':
        this.#emit({
          type: 'runtime.error',
          message: classifyRuntimeError(params.error ?? message.error ?? params),
          status: 'failed'
        });
        break;
    }
    void this.#persist();
  }

  #emit(event: Omit<WorkspaceActivityEvent, 'sequence' | 'at'>): void {
    const normalized: WorkspaceActivityEvent = {
      ...event,
      sequence: ++this.#sequence,
      at: this.#now().toISOString()
    };
    this.#receipt.events.push(normalized);
    if (this.#receipt.events.length > 500) this.#receipt.events.shift();
    this.#receipt.updatedAt = normalized.at;
    for (const subscriber of this.#subscribers) subscriber(structuredClone(normalized));
  }

  #emitAgentMessage(value: unknown): void {
    const message = sanitizedText(value, this.#workspace.sourceRoot).trim();
    if (message) this.#emit({ type: 'agent.message', message, status: 'completed' });
  }

  async #persist(): Promise<void> {
    await this.#receiptStore.put(this.receipt());
  }
}
