import type { Env } from './types.js';

export type AbuseEventType =
  | 'session_minted'
  | 'session_rejected'
  | 'request_rejected'
  | 'turn_allowed'
  | 'turn_denied'
  | 'turn_failed'
  | 'turn_settled';

export interface AbuseEvent {
  actualCostMicroUsd?: number;
  cacheInputTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  reason?: string;
  type: AbuseEventType;
}

// Fixed allowlist: no request body, prompt, IP, auth/challenge token, session
// identifier, or template context can enter Analytics Engine.
export function recordAbuseEvent(env: Env, event: AbuseEvent): void {
  env.AGENT_ANALYTICS?.writeDataPoint({
    indexes: [event.type],
    blobs: [event.type, event.reason ?? '', env.ANTHROPIC_MODEL ?? '', env.ENVIRONMENT ?? ''],
    doubles: [
      event.actualCostMicroUsd ?? 0,
      event.inputTokens ?? 0,
      event.outputTokens ?? 0,
      event.cacheInputTokens ?? 0,
    ],
  });
}

