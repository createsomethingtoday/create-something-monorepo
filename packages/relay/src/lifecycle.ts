import type { SandboxOptions } from '@cloudflare/sandbox';

/** Reuse the pinned SDK's 10m default; explicitly clear historic keepAlive state. */
export function buildSandboxOptions(env: { SANDBOX_SLEEP_AFTER?: string }): SandboxOptions {
  const sleepAfter = env.SANDBOX_SLEEP_AFTER === undefined ? '10m' : env.SANDBOX_SLEEP_AFTER.trim().toLowerCase();
  const match = /^(\d+)(s|m|h)$/.exec(sleepAfter);
  const seconds = match ? Number(match[1]) * ({ s: 1, m: 60, h: 3600 }[match[2]] ?? 0) : 0;
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds * 1000 > Number.MAX_SAFE_INTEGER) {
    throw new Error('SANDBOX_SLEEP_AFTER must be a positive finite duration (for example 30s, 10m, 1h); never is unsupported');
  }
  return { keepAlive: false, sleepAfter };
}

/** Old triggers may still arrive during rollout. Never acquire or call a sandbox. */
export async function scheduled(_event: unknown, _env: unknown, _ctx: unknown): Promise<void> {
  console.log('[cron] Skipped: backups run only inside the live gateway container');
}
