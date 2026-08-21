import type { AgentProgressInput, AgentRunStatus, StoredAgentDecision } from './agent-console.js';

export type CodexThreadHistoryMode = 'legacy' | 'paginated';
export type CodexThreadStatus =
  | { type: 'notLoaded' | 'idle' | 'systemError' }
  | { type: 'active'; activeFlags?: string[] };

export interface CodexThreadSummary {
  id: string;
  parentThreadId?: string | null;
  ephemeral?: boolean;
  name?: string | null;
  preview?: string;
  historyMode?: CodexThreadHistoryMode;
  updatedAt: number;
  cwd: string;
  status: CodexThreadStatus;
}

export interface CodexTaskProgressOptions {
  cwd: string;
  now?: number;
  ttlMs?: number;
  limit?: number;
  minimumIdleMs?: number;
}

export interface CodexRpcNotification {
  method: string;
  params?: Record<string, unknown>;
}

export interface CodexRpcClient {
  request<T>(method: string, params?: unknown): Promise<T>;
  subscribe(listener: (notification: CodexRpcNotification) => void): () => void;
}

export interface CodexDispatchProgress {
  threadId: string;
  turnId: string;
  phase: string;
  summary: string;
}

export interface CodexDispatchOptions {
  cwd: string;
  timeoutMs?: number;
  completionPollMs?: number;
  onProgress?: (progress: CodexDispatchProgress) => void | Promise<void>;
}

export interface CodexDispatchResult {
  threadId: string;
  turnId: string;
  status: 'completed' | 'interrupted' | 'failed';
  summary: string;
}

interface CodexTurnSummary {
  id: string;
  status: 'completed' | 'interrupted' | 'failed' | 'inProgress';
  items?: unknown[];
}

interface CodexThreadResponse {
  thread: {
    id: string;
    turns?: CodexTurnSummary[];
  };
}

const NEW_TASK_DECISION = {
  id: 'start',
  kind: 'continue' as const,
  label: 'Start new task',
  description: 'Review a spoken prompt, then start a local Codex task.',
  requires_confirmation: true,
  requires_text: true,
  remote_safe: true
};

const PROMPT_TASK_DECISION = {
  id: 'prompt',
  kind: 'redirect' as const,
  label: 'Prompt task',
  description: 'Review a spoken prompt, then continue this local Codex task.',
  requires_confirmation: true,
  requires_text: true,
  remote_safe: true
};

function boundedText(value: string | null | undefined, maximum: number): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').slice(0, maximum);
}

function codexThreadId(agentId: string): string | null {
  if (agentId === 'codex:new') return null;
  if (!agentId.startsWith('codex:')) throw new Error('Codex task id does not match its provider.');
  const threadId = agentId.slice('codex:'.length);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/.test(threadId)) {
    throw new Error('Codex task id is not a safe resumable thread reference.');
  }
  return threadId;
}

function operatorPrompt(decision: StoredAgentDecision): string {
  const message = boundedText(decision.message, 500);
  if (!message) throw new Error('A confirmed Codex prompt is required.');
  const device = boundedText(decision.device_id, 48) || 'Calm Operator';
  return `Operator prompt from ${device}:\n\n${message}\n\nWork within the current sandbox and approval policy. If broader authority or user input is required, stop with a clear handoff.`;
}

function notificationString(params: Record<string, unknown>, key: string): string {
  return typeof params[key] === 'string' ? params[key] : '';
}

function completedTurn(notification: CodexRpcNotification): CodexTurnSummary | null {
  if (notification.method !== 'turn/completed') return null;
  const turn = notification.params?.turn;
  if (!turn || typeof turn !== 'object') return null;
  const value = turn as Record<string, unknown>;
  const status = value.status;
  if (
    typeof value.id !== 'string' ||
    (status !== 'completed' && status !== 'interrupted' && status !== 'failed')
  ) {
    return null;
  }
  return { id: value.id, status, items: Array.isArray(value.items) ? value.items : [] };
}

function completedAgentMessage(notification: CodexRpcNotification): string {
  if (notification.method !== 'item/completed') return '';
  const item = notification.params?.item;
  if (!item || typeof item !== 'object') return '';
  const value = item as Record<string, unknown>;
  return value.type === 'agentMessage' && typeof value.text === 'string' ? value.text : '';
}

function turnAgentMessage(turn: CodexTurnSummary): string {
  for (const item of [...(turn.items ?? [])].reverse()) {
    if (!item || typeof item !== 'object') continue;
    const value = item as Record<string, unknown>;
    if (value.type === 'agentMessage' && typeof value.text === 'string') return value.text;
  }
  return '';
}

export async function dispatchCodexDecision(
  rpc: CodexRpcClient,
  decision: StoredAgentDecision,
  options: CodexDispatchOptions
): Promise<CodexDispatchResult> {
  if (decision.provider !== 'codex') throw new Error('Decision is not addressed to Codex.');
  const existingThreadId = codexThreadId(decision.agent_id);
  const prompt = operatorPrompt(decision);
  const timeoutMs = Math.max(1_000, options.timeoutMs ?? 10 * 60_000);
  const completionPollMs = Math.max(25, options.completionPollMs ?? 2_000);

  const threadResponse = existingThreadId
    ? await rpc.request<CodexThreadResponse>('thread/resume', {
        threadId: existingThreadId,
        approvalPolicy: 'never'
      })
    : await rpc.request<CodexThreadResponse>('thread/start', {
        cwd: options.cwd,
        approvalPolicy: 'never',
        sandbox: 'workspace-write',
        serviceName: 'calm_operator_stopwatch'
      });
  const threadId = threadResponse.thread.id;
  const activeTurn = [...(threadResponse.thread.turns ?? [])]
    .reverse()
    .find((turn) => turn.status === 'inProgress');
  let turnId = activeTurn?.id ?? '';
  let earlyCompletion: CodexTurnSummary | undefined;
  let lastAgentMessage = '';
  let resolveCompletion!: (turn: CodexTurnSummary) => void;
  const completion = new Promise<CodexTurnSummary>((resolve) => {
    resolveCompletion = resolve;
  });

  const unsubscribe = rpc.subscribe((notification) => {
    const params = notification.params ?? {};
    if (notificationString(params, 'threadId') !== threadId) return;
    const notificationTurnId = notificationString(params, 'turnId');
    if (turnId && notificationTurnId && notificationTurnId !== turnId) return;

    if (notification.method === 'item/agentMessage/delta') {
      lastAgentMessage = (lastAgentMessage + notificationString(params, 'delta')).slice(-4_000);
      const publish = options.onProgress?.({
        threadId,
        turnId: notificationTurnId || turnId,
        phase: 'Codex responding',
        summary: boundedText(lastAgentMessage, 220)
      });
      if (publish) void Promise.resolve(publish).catch(() => undefined);
    }
    const message = completedAgentMessage(notification);
    if (message) lastAgentMessage = message.slice(-4_000);

    const turn = completedTurn(notification);
    if (!turn) return;
    if (!turnId) {
      earlyCompletion = turn;
      return;
    }
    if (turn.id === turnId) resolveCompletion(turn);
  });

  try {
    if (activeTurn) {
      const response = await rpc.request<{ turnId: string }>('turn/steer', {
        threadId,
        input: [{ type: 'text', text: prompt }],
        expectedTurnId: activeTurn.id
      });
      turnId = response.turnId;
    } else {
      const response = await rpc.request<{ turn: CodexTurnSummary }>('turn/start', {
        threadId,
        input: [{ type: 'text', text: prompt }],
        approvalPolicy: 'never'
      });
      turnId = response.turn.id;
    }

    const bufferedCompletion = earlyCompletion as CodexTurnSummary | undefined;
    if (bufferedCompletion?.id === turnId) resolveCompletion(bufferedCompletion);
    let stopPolling = false;
    const polledCompletion = (async (): Promise<CodexTurnSummary> => {
      while (!stopPolling) {
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, completionPollMs);
          (timer as unknown as { unref?: () => void }).unref?.();
        });
        if (stopPolling) break;
        try {
          const response = await rpc.request<CodexThreadResponse>('thread/read', {
            threadId,
            includeTurns: true
          });
          const turn = response.thread.turns?.find((candidate) => candidate.id === turnId);
          if (
            turn &&
            (turn.status === 'completed' ||
              turn.status === 'interrupted' ||
              turn.status === 'failed')
          ) {
            lastAgentMessage = turnAgentMessage(turn) || lastAgentMessage;
            return turn;
          }
        } catch {
          // The terminal notification remains authoritative when read-back is transiently unavailable.
        }
      }
      return await new Promise<CodexTurnSummary>(() => undefined);
    })();
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error(`Codex turn exceeded ${timeoutMs}ms.`)),
        timeoutMs
      );
    });
    let turn: CodexTurnSummary;
    try {
      turn = await Promise.race([completion, polledCompletion, timeout]);
    } catch (error) {
      await rpc.request('turn/interrupt', { threadId, turnId }).catch(() => undefined);
      throw error;
    } finally {
      stopPolling = true;
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
    }

    return {
      threadId,
      turnId,
      status: turn.status as CodexDispatchResult['status'],
      summary:
        boundedText(lastAgentMessage, 220) ||
        (turn.status === 'completed' ? 'Codex completed the task.' : `Codex turn ${turn.status}.`)
    };
  } finally {
    unsubscribe();
  }
}

function directoryLabel(cwd: string): string {
  const normalized = cwd.replace(/\/+$/, '');
  return normalized.split('/').filter(Boolean).at(-1) || 'the trusted workspace';
}

function threadState(thread: CodexThreadSummary): {
  status: AgentRunStatus;
  phase: string;
  needsInput: boolean;
} {
  if (thread.historyMode === 'paginated') {
    return { status: 'waiting', phase: 'Read-only history', needsInput: false };
  }
  if (thread.status.type === 'systemError') {
    return { status: 'failed', phase: 'Codex runtime error', needsInput: true };
  }
  if (thread.status.type === 'active') {
    const flags = new Set(thread.status.activeFlags ?? []);
    if (flags.has('waitingOnApproval')) {
      return { status: 'blocked', phase: 'Desktop approval required', needsInput: true };
    }
    if (flags.has('waitingOnUserInput')) {
      return { status: 'waiting', phase: 'Agent needs input', needsInput: true };
    }
    return { status: 'working', phase: 'Codex working', needsInput: false };
  }
  return { status: 'waiting', phase: 'Ready for prompt', needsInput: false };
}

export function buildCodexTaskProgress(
  threads: CodexThreadSummary[],
  options: CodexTaskProgressOptions
): AgentProgressInput[] {
  const now = options.now ?? Date.now();
  const expiresAt = now + Math.max(10_000, options.ttlMs ?? 30_000);
  const minimumIdleMs = Math.max(0, options.minimumIdleMs ?? 2 * 60_000);
  const output: AgentProgressInput[] = [
    {
      agent_id: 'codex:new',
      provider: 'codex',
      label: 'New Codex task',
      status: 'waiting',
      phase: 'Laptop ready',
      summary: `Speak a prompt to start in ${directoryLabel(options.cwd)}.`,
      detail: options.cwd,
      progress_version: 1,
      needs_input: true,
      decisions: [NEW_TASK_DECISION],
      expires_at: expiresAt,
      payload: { authority: 'local-codex-app-server', history_mode: 'legacy' }
    }
  ];

  for (const thread of threads) {
    const state = threadState(thread);
    const historyMode = thread.historyMode ?? 'legacy';
    const idleRuntime = thread.status.type === 'idle' || thread.status.type === 'notLoaded';
    const settled = now - thread.updatedAt * 1_000 >= minimumIdleMs;
    const canPrompt = historyMode === 'legacy' && idleRuntime && settled;
    const recentlyChanged = historyMode === 'legacy' && idleRuntime && !settled;
    output.push({
      agent_id: `codex:${thread.id}`,
      provider: 'codex',
      label: boundedText(thread.name, 72) || boundedText(thread.preview, 72) || 'Codex task',
      status: state.status,
      phase: recentlyChanged ? 'Recent desktop activity' : state.phase,
      summary: boundedText(thread.preview, 220) || 'No task preview is available.',
      detail: boundedText(thread.cwd, 500),
      progress_version: Math.max(1, Math.round(thread.updatedAt)),
      needs_input: state.needsInput,
      decisions: canPrompt ? [PROMPT_TASK_DECISION] : [],
      expires_at: expiresAt,
      payload: {
        authority: canPrompt ? 'local-codex-app-server' : 'read-only',
        history_mode: historyMode,
        thread_id: thread.id,
        cwd: thread.cwd,
        control_reason:
          historyMode === 'paginated'
            ? 'paginated-history-not-resumable'
            : !idleRuntime
              ? 'runtime-not-idle'
              : !settled
                ? 'recent-desktop-activity'
                : 'settled-legacy-thread'
      }
    });
  }

  return output;
}

export function assertCodexDecisionAuthorized(
  progress: AgentProgressInput[],
  decision: StoredAgentDecision
): void {
  const task = progress.find((item) => item.agent_id === decision.agent_id);
  if (!task || task.provider !== 'codex') {
    throw new Error('Codex task is no longer available to the Stopwatch.');
  }
  if (task.progress_version !== decision.progress_version) {
    throw new Error(
      'Codex task changed after the Stopwatch rendered it; review the current state.'
    );
  }
  if (!task.decisions?.some((action) => action.id === decision.decision_id)) {
    throw new Error('Codex task no longer exposes that action to the Stopwatch.');
  }
}

export async function listCodexTaskProgress(
  rpc: CodexRpcClient,
  options: CodexTaskProgressOptions
): Promise<AgentProgressInput[]> {
  const limit = Math.max(1, Math.min(7, Math.round(options.limit ?? 7)));
  const response = await rpc.request<{ data: CodexThreadSummary[] }>('thread/list', {
    cursor: null,
    limit,
    sortKey: 'recency_at',
    sortDirection: 'desc',
    archived: false,
    useStateDbOnly: true
  });
  const threads = response.data
    .filter((thread) => !thread.ephemeral && !thread.parentThreadId)
    .slice(0, limit);
  return buildCodexTaskProgress(threads, options);
}
