interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  run(): Promise<{ success: boolean }>;
}

interface D1DatabaseLike {
  prepare(sql: string): D1StatementLike;
}

type ActivityKind =
  | 'approval_resolved'
  | 'diff_read'
  | 'session_opened'
  | 'session_read'
  | 'turn_started'
  | 'workspace_reset';

type ClassifiedActivity = {
  kind: ActivityKind;
  sessionId: string | null;
  workspaceId: string | null;
  includesReceipt: boolean;
};

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const SAFE_RECEIPT_STATUS = new Set([
  'opening',
  'ready',
  'running',
  'completed',
  'failed',
  'closed'
]);

function safeId(value: unknown): string | null {
  return typeof value === 'string' && SAFE_ID.test(value) ? value : null;
}

function classify(request: Request): ClassifiedActivity | null {
  const pathname = new URL(request.url).pathname;
  let match: RegExpExecArray | null;
  if (request.method === 'POST' && (match = /^\/api\/workspaces\/([^/]+)\/sessions$/.exec(pathname))) {
    return { kind: 'session_opened', sessionId: null, workspaceId: safeId(match[1]), includesReceipt: true };
  }
  if (request.method === 'GET' && (match = /^\/api\/sessions\/([^/]+)$/.exec(pathname))) {
    return { kind: 'session_read', sessionId: safeId(match[1]), workspaceId: null, includesReceipt: true };
  }
  if (request.method === 'POST' && (match = /^\/api\/sessions\/([^/]+)\/turns$/.exec(pathname))) {
    return { kind: 'turn_started', sessionId: safeId(match[1]), workspaceId: null, includesReceipt: false };
  }
  if (
    request.method === 'POST' &&
    (match = /^\/api\/sessions\/([^/]+)\/approvals\/[^/]+$/.exec(pathname))
  ) {
    return { kind: 'approval_resolved', sessionId: safeId(match[1]), workspaceId: null, includesReceipt: false };
  }
  if (request.method === 'GET' && (match = /^\/api\/sessions\/([^/]+)\/diff$/.exec(pathname))) {
    return { kind: 'diff_read', sessionId: safeId(match[1]), workspaceId: null, includesReceipt: false };
  }
  if (request.method === 'POST' && (match = /^\/api\/workspaces\/([^/]+)\/reset$/.exec(pathname))) {
    return { kind: 'workspace_reset', sessionId: null, workspaceId: safeId(match[1]), includesReceipt: false };
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function sanitizedMessage(value: unknown): string {
  return typeof value === 'string'
    ? value
        .replace(/\bsk-[A-Za-z0-9_-]+\b/g, '[redacted]')
        .replace(/\b(?:api[_-]?key|token|secret)\s*[=:]\s*[^\s,;]+/gi, '$1=[redacted]')
        .replace(/\/workspace\/[^\s]+/g, '[workspace path]')
        .replace(/\/(?:Users|home)\/[^/\s]+\/[^\s]+/g, '[local path]')
        .slice(0, 4_000)
    : '';
}

function sanitizedReceipt(value: unknown): {
  sessionId: string;
  workspaceId: string;
  status: string;
  updatedAt: string;
  events: Array<Record<string, unknown>>;
} | null {
  const receipt = asRecord(value);
  const sessionId = safeId(receipt.sessionId);
  const workspaceId = safeId(receipt.workspaceId);
  if (
    !sessionId ||
    !workspaceId ||
    typeof receipt.status !== 'string' ||
    !SAFE_RECEIPT_STATUS.has(receipt.status) ||
    typeof receipt.updatedAt !== 'string' ||
    !Array.isArray(receipt.events)
  ) {
    return null;
  }
  const events = receipt.events.slice(-500).map((value) => {
    const event = asRecord(value);
    return {
      sequence: typeof event.sequence === 'number' ? event.sequence : 0,
      at: typeof event.at === 'string' ? event.at : '',
      type: typeof event.type === 'string' ? event.type.slice(0, 64) : 'runtime.error',
      message: sanitizedMessage(event.message),
      ...(typeof event.status === 'string' ? { status: event.status.slice(0, 32) } : {}),
      ...(safeId(event.approvalId) ? { approvalId: safeId(event.approvalId) } : {}),
      ...(event.approvalKind === 'command' || event.approvalKind === 'file'
        ? { approvalKind: event.approvalKind }
        : {})
    };
  });
  return { sessionId, workspaceId, status: receipt.status, updatedAt: receipt.updatedAt, events };
}

export class D1WorkspaceActivityLedger {
  constructor(
    private readonly database: D1DatabaseLike,
    private readonly now: () => Date = () => new Date()
  ) {}

  async recordResponse(sandboxId: string, request: Request, response: Response): Promise<void> {
    const activity = classify(request);
    if (!activity) return;
    let receipt: ReturnType<typeof sanitizedReceipt> = null;
    if (activity.includesReceipt && response.ok) {
      const body = asRecord(await response.clone().json().catch(() => ({})));
      receipt = sanitizedReceipt(body.receipt);
    }
    if (receipt) {
      const result = await this.database
        .prepare(
          `INSERT INTO workspace_receipts (
             sandbox_id, session_id, workspace_id, status, receipt_json, updated_at
           ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
           ON CONFLICT(sandbox_id, session_id) DO UPDATE SET
             workspace_id = excluded.workspace_id,
             status = excluded.status,
             receipt_json = excluded.receipt_json,
             updated_at = excluded.updated_at`
        )
        .bind(
          sandboxId,
          receipt.sessionId,
          receipt.workspaceId,
          receipt.status,
          JSON.stringify(receipt),
          receipt.updatedAt
        )
        .run();
      if (!result.success) throw new Error('workspace_receipt_write_failed');
      activity.sessionId = receipt.sessionId;
      activity.workspaceId = receipt.workspaceId;
    }
    const result = await this.database
      .prepare(
        `INSERT INTO workspace_actions (
           sandbox_id, session_id, workspace_id, action_kind, status_code, created_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      )
      .bind(
        sandboxId,
        activity.sessionId,
        activity.workspaceId,
        activity.kind,
        response.status,
        this.now().toISOString()
      )
      .run();
    if (!result.success) throw new Error('workspace_action_write_failed');
  }
}
