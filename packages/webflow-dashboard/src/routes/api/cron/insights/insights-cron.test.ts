import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ publish: vi.fn(), rest: vi.fn() }));
vi.mock('@create-something/webflow-dashboard-core/marketplace-insights-publish', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createAirtableRest: mocks.rest,
  publishMarketplaceInsights: mocks.publish
}));
import { POST } from './+server';

const env = {
  CRON_SECRET: 'cron-secret',
  ENVIRONMENT: 'production',
  AIRTABLE_API_KEY: 'fixture-only',
  AIRTABLE_BASE_ID: 'appFixture0000000',
  MARKETPLACE_INSIGHTS_SNAPSHOT_TABLE_ID: 'tblFixture0000000'
};
const call = (query = '', headers: Record<string, string> = { authorization: 'Bearer cron-secret' }, envOverrides = {}) => {
  const url = new URL(`https://dashboard.test/api/cron/insights${query}`);
  return POST({
    request: new Request(url, { method: 'POST', headers }),
    url,
    platform: { env: { ...env, ...envOverrides } }
  } as never);
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.rest.mockReturnValue({ fixture: true });
  mocks.publish.mockResolvedValue({
    snapshotAt: '2026-11-09T16:00:00.000Z',
    summary: { totalSales: 5, totalRevenue: 230, sellingTemplates: 2, fulfillmentSales: 1 },
    leaderboardRows: 2,
    categoryRows: 3,
    recordId: 'recFixture0000000',
    taxonomyNotes: [{ kind: 'unmapped', name: 'x', used: 'Other' }],
    creatorEmailNotes: []
  });
});

describe('POST /api/cron/insights', () => {
  it('rejects calls without the cron secret before touching Airtable', async () => {
    await expect(call('', {})).rejects.toMatchObject({ status: 401 });
    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it('accepts the scheduler Worker secret alongside the shared one', async () => {
    const own = { SCHEDULER_CRON_SECRET: 'scheduler-secret' };
    await expect(call('', { authorization: 'Bearer wrong' }, own)).rejects.toMatchObject({ status: 401 });
    expect(await (await call('', { authorization: 'Bearer cron-secret' }, own)).json()).toMatchObject({ success: true });
    const response = await call('', { authorization: 'Bearer scheduler-secret' }, own);
    expect(await response.json()).toMatchObject({ success: true });
  });

  it('publishes the latest complete window and returns counts, not record-level notes', async () => {
    const response = await call();
    const body = await response.json();
    expect(mocks.rest).toHaveBeenCalledWith({ apiKey: 'fixture-only', baseId: 'appFixture0000000' });
    const [, options] = mocks.publish.mock.calls[0];
    expect(options.snapshotTable).toBe('tblFixture0000000');
    expect(options.asOf.toISOString()).toMatch(/T16:00:00.000Z$/);
    expect(body).toMatchObject({ success: true, recordId: 'recFixture0000000', taxonomyNotes: 1, creatorEmailNotes: 0 });
  });

  it('republishes a requested window end', async () => {
    await call('?asOf=2026-11-09T16:00:00.000Z');
    expect(mocks.publish.mock.calls[0][1].asOf.toISOString()).toBe('2026-11-09T16:00:00.000Z');
    await expect(call('?asOf=not-a-date')).rejects.toMatchObject({ status: 400 });
  });

  it('fails loudly when the window is not ready or the table is not configured', async () => {
    mocks.publish.mockRejectedValueOnce(new Error('Fivetran sellers activation has no rows for window'));
    await expect(call()).rejects.toMatchObject({ status: 500 });
    await expect(call('', undefined, { MARKETPLACE_INSIGHTS_SNAPSHOT_TABLE_ID: undefined })).rejects.toMatchObject({
      status: 500
    });
  });
});
