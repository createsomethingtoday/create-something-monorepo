export type ToolAccessMode = 'off' | 'read_only' | 'normal';
export type PaidCapabilityMode = 'off' | 'handoff_only' | 'live';

export interface Env {
  AI: Ai;
  OperatorChatAgent: DurableObjectNamespace;
  OPERATOR_ADMIN_TOKEN: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_BOT_USERNAME: string;
  TELEGRAM_WEBHOOK_SECRET_TOKEN: string;
  TELEGRAM_ALLOWED_CHAT_IDS?: string;
  TELEGRAM_ALLOWED_USER_IDS?: string;
  LINEAR_API_KEY?: string;
  LINEAR_TEAM_KEY?: string;
  OPERATOR_TOOL_ACCESS_MODE?: string;
  PAID_CAPABILITY_MODE?: string;
  PAID_CAPABILITY_MAX_USD?: string;
}

export function toolAccessMode(env: Pick<Env, 'OPERATOR_TOOL_ACCESS_MODE'>): ToolAccessMode {
  const raw = env.OPERATOR_TOOL_ACCESS_MODE?.trim().toLowerCase();
  if (raw === 'off' || raw === 'normal') return raw;
  return 'read_only';
}

export function paidCapabilityMode(env: Pick<Env, 'PAID_CAPABILITY_MODE'>): PaidCapabilityMode {
  const raw = env.PAID_CAPABILITY_MODE?.trim().toLowerCase();
  if (raw === 'off' || raw === 'live') return raw;
  return 'handoff_only';
}

export function paidCapabilityMaxUsd(env: Pick<Env, 'PAID_CAPABILITY_MAX_USD'>): number {
  const parsed = Number(env.PAID_CAPABILITY_MAX_USD ?? 25);
  if (!Number.isFinite(parsed) || parsed <= 0) return 25;
  return Math.min(parsed, 250);
}
