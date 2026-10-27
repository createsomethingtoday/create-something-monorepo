import { describe, expect, it } from 'vitest';
import { assessSyncHealth } from './sync-health.js';
const now = Date.parse('2026-10-27T15:00:00Z');
const healthy = {
  ready: true, webflowProjectionFresh: true, webflowProjectionHorizonCovered: true,
  webflowProjectionExpiresAt: '2026-10-27T15:30:00Z',
  webflowCloudRefresh: { status: 'accepted', observedAt: '2026-10-27T14:45:00Z' }
};
describe('sync early warning policy', () => {
  it('accepts normal fifteen-minute cadence', () => expect(assessSyncHealth(healthy, now).healthy).toBe(true));
  it('warns on the first reported failure while booking remains ready', () => {
    expect(assessSyncHealth({ ...healthy, webflowCloudRefresh: { status: 'retryable' } }, now).reason).toBe('cloud_refresh_failed_or_missing');
  });
  it('warns after twenty minutes without a run, with twenty-five minutes left before expiry', () => {
    const result = assessSyncHealth({ ...healthy, webflowProjectionExpiresAt: '2026-10-27T15:25:00Z', webflowCloudRefresh: { status: 'accepted', observedAt: '2026-10-27T14:40:00Z' } }, now);
    expect(result).toMatchObject({ healthy: false, reason: 'cloud_refresh_overdue' });
    expect(Date.parse(result.expiresAt!) - now).toBe(25 * 60_000);
  });
  it('rejects invalid status and future clock skew', () => {
    expect(assessSyncHealth({}, now).healthy).toBe(false);
    expect(assessSyncHealth({ ...healthy, webflowCloudRefresh: { status: 'accepted', observedAt: '2026-10-27T15:10:00Z' } }, now).healthy).toBe(false);
  });
  it('warns when expiry approaches or readiness fails', () => {
    expect(assessSyncHealth({ ...healthy, webflowProjectionExpiresAt: '2026-10-27T15:20:00Z' }, now).reason).toBe('projection_nearing_expiry');
    expect(assessSyncHealth({ ...healthy, ready: false }, now).reason).toBe('scheduler_not_ready');
  });
});
