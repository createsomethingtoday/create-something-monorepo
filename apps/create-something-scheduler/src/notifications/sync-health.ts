import { z } from 'zod';

const timestamp = z.string().datetime({ offset: true });
const statusSchema = z.object({
  ready: z.boolean(),
  webflowProjectionFresh: z.boolean(),
  webflowProjectionHorizonCovered: z.boolean(),
  webflowProjectionExpiresAt: timestamp.nullable(),
  webflowCloudRefresh: z.object({
    status: z.string(),
    observedAt: timestamp.optional()
  }).passthrough().nullable()
});

export type SyncHealth = { healthy: boolean; reason: string; expiresAt: string | null };

export function assessSyncHealth(input: unknown, now: number): SyncHealth {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { healthy: false, reason: 'invalid_scheduler_status', expiresAt: null };
  const d = parsed.data;
  const problem = (reason: string): SyncHealth => ({ healthy: false, reason, expiresAt: d.webflowProjectionExpiresAt });
  if (!d.webflowCloudRefresh || d.webflowCloudRefresh.status !== 'accepted') return problem('cloud_refresh_failed_or_missing');
  const observed = Date.parse(d.webflowCloudRefresh.observedAt ?? '');
  if (!Number.isFinite(observed) || observed > now + 5 * 60_000) return problem('invalid_cloud_refresh_time');
  if (now - observed >= 20 * 60_000) return problem('cloud_refresh_overdue');
  if (!d.webflowProjectionExpiresAt || Date.parse(d.webflowProjectionExpiresAt) - now <= 20 * 60_000) return problem('projection_nearing_expiry');
  if (!d.ready || !d.webflowProjectionFresh || !d.webflowProjectionHorizonCovered) return problem('scheduler_not_ready');
  return { healthy: true, reason: 'healthy', expiresAt: d.webflowProjectionExpiresAt };
}
