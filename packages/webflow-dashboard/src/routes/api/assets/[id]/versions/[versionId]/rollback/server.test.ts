import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAssetForOwner = vi.fn();
const rollbackAssetToVersion = vi.fn();

vi.mock('$lib/server/airtable', () => ({
  getAirtableClient: () => ({ getAssetForOwner, rollbackAssetToVersion })
}));
vi.mock('$lib/server/assets-cache', () => ({
  invalidateAssetsCache: vi.fn().mockResolvedValue(undefined)
}));

const { POST } = await import('./+server');

const call = () =>
  POST({
    params: { id: 'rec123', versionId: 'recVer1' },
    locals: { user: { email: 'creator@example.com' } },
    platform: { env: { SESSIONS: {} } }
  } as unknown as Parameters<typeof POST>[0]);

beforeEach(() => {
  vi.clearAllMocks();
  rollbackAssetToVersion.mockResolvedValue({ id: 'rec123' });
});

describe('POST rollback', () => {
  it('refuses to roll back an app listing', async () => {
    getAssetForOwner.mockResolvedValue({ asset: { id: 'rec123', type: 'App' }, isOwner: true });
    await expect(call()).rejects.toMatchObject({ status: 409 });
    expect(rollbackAssetToVersion).not.toHaveBeenCalled();
  });

  it('refuses a non-owner, and rolls back a template for its owner', async () => {
    getAssetForOwner.mockResolvedValue({ asset: { id: 'rec123', type: 'Template' }, isOwner: false });
    await expect(call()).rejects.toMatchObject({ status: 403 });

    getAssetForOwner.mockResolvedValue({ asset: { id: 'rec123', type: 'Template' }, isOwner: true });
    expect((await call()).status).toBe(200);
    expect(rollbackAssetToVersion).toHaveBeenCalledWith('rec123', 'recVer1', 'creator@example.com');
  });
});
