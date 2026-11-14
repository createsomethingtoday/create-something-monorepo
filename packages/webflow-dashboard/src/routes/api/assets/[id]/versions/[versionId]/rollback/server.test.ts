import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAssetForOwner = vi.fn();
const getAssetVersion = vi.fn();
const rollbackAssetToVersion = vi.fn();

vi.mock('$lib/server/airtable', () => ({
  getAirtableClient: () => ({ getAssetForOwner, getAssetVersion, rollbackAssetToVersion })
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
  getAssetVersion.mockResolvedValue({ id: 'recVer1', assetId: 'rec123', snapshot: { name: 'Old' } });
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

  it('refuses a version with no stored snapshot, or one of another asset, before anything is written', async () => {
    getAssetForOwner.mockResolvedValue({ asset: { id: 'rec123', type: 'Template' }, isOwner: true });

    getAssetVersion.mockResolvedValue({ id: 'recVer1', assetId: 'rec123', snapshot: null });
    await expect(call()).rejects.toMatchObject({ status: 409 });

    getAssetVersion.mockResolvedValue({ id: 'recVer1', assetId: 'recOther', snapshot: { name: 'x' } });
    await expect(call()).rejects.toMatchObject({ status: 404 });

    expect(rollbackAssetToVersion).not.toHaveBeenCalled();
  });
});
