import type { AgentProgressInput, StoredAgentDecision } from './agent-console.js';
import type { CodexDispatchProgress, CodexDispatchResult } from './codex-app-server.js';

function boundedText(value: string | null | undefined, maximum: number): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').slice(0, maximum);
}

function expiry(now: number, ttlMs: number): number {
  return now + Math.max(1_000, Math.round(ttlMs));
}

function labelFor(decision: StoredAgentDecision): string {
  return boundedText(decision.message, 72) || 'Codex task';
}

function detailFor(decision: StoredAgentDecision): string {
  return `Prompted from ${decision.device_id || 'stopwatch'}.`;
}

export function buildCodexRelayActiveProgress(input: {
  decision: StoredAgentDecision;
  update: CodexDispatchProgress;
  now: number;
  ttlMs: number;
}): AgentProgressInput {
  const { decision, update, now, ttlMs } = input;
  return {
    agent_id: `codex:${update.threadId}`,
    provider: 'codex',
    label: labelFor(decision),
    status: 'working',
    phase: update.phase,
    summary: update.summary,
    detail: detailFor(decision),
    progress_version: decision.progress_version,
    needs_input: false,
    decisions: [],
    expires_at: expiry(now, ttlMs),
    payload: {
      authority: 'local-codex-app-server',
      thread_id: update.threadId,
      turn_id: update.turnId
    }
  };
}

export function buildCodexRelayTerminalProgress(input: {
  decision: StoredAgentDecision;
  result: CodexDispatchResult;
  now: number;
  ttlMs: number;
}): AgentProgressInput {
  const { decision, result, now, ttlMs } = input;
  const status =
    result.status === 'completed' ? 'completed' : result.status === 'failed' ? 'failed' : 'stopped';
  const phase =
    result.status === 'completed'
      ? 'Codex completed'
      : result.status === 'failed'
        ? 'Codex failed'
        : 'Codex interrupted';
  return {
    agent_id: `codex:${result.threadId}`,
    provider: 'codex',
    label: labelFor(decision),
    status,
    phase,
    summary: result.summary,
    detail: detailFor(decision),
    progress_version: decision.progress_version,
    needs_input: false,
    decisions: [],
    expires_at: expiry(now, ttlMs),
    payload: {
      authority: 'local-codex-app-server',
      thread_id: result.threadId,
      turn_id: result.turnId
    }
  };
}

export function completedCodexDecisionSummary(result: CodexDispatchResult): string {
  if (result.status !== 'completed') {
    throw new Error(
      `Codex turn ${result.status}: ${boundedText(result.summary, 180) || 'No result summary.'}`
    );
  }
  return result.summary;
}

export async function publishCodexTerminalProgressBestEffort(
  publish: () => Promise<unknown>
): Promise<boolean> {
  try {
    await publish();
    return true;
  } catch {
    return false;
  }
}

export function createSerialProgressPublisher<T>(
  publish: (value: T) => Promise<unknown>
): {
  enqueue(value: T): Promise<void>;
  drain(): Promise<void>;
} {
  let pending = Promise.resolve();
  return {
    enqueue(value: T) {
      const next = pending
        .catch(() => undefined)
        .then(() => publish(value))
        .then(() => undefined);
      pending = next;
      return next;
    },
    drain() {
      return pending.catch(() => undefined);
    }
  };
}
