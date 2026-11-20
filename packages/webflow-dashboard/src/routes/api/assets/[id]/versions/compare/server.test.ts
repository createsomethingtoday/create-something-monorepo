import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyAssetOwnership = vi.fn();
const getAssetVersion = vi.fn();

vi.mock('$lib/server/airtable', () => ({
  getAirtableClient: () => ({ verifyAssetOwnership, getAssetVersion })
}));

const { GET } = await import('./+server');

const call = () =>
  GET({
    params: { id: 'recAsset' },
    url: new URL('https://dashboard.example/api/assets/recAsset/versions/compare?from=recVer1&to=recVer2'),
    locals: { user: { email: 'creator@example.com' } },
    platform: { env: {} }
  } as unknown as Parameters<typeof GET>[0]);

const version = (id: string, snapshot: unknown) => ({ id, assetId: 'recAsset', versionNumber: 1, snapshot });

beforeEach(() => {
  vi.clearAllMocks();
  verifyAssetOwnership.mockResolvedValue(true);
});

describe('GET versions/compare', () => {
  it('says so when a version has no stored snapshot', async () => {
    getAssetVersion.mockImplementation(async (id: string) =>
      version(id, id === 'recVer1' ? { name: 'Old' } : null)
    );
    await expect(call()).rejects.toMatchObject({ status: 409 });
  });

  it('compares two versions that both store a snapshot', async () => {
    getAssetVersion.mockImplementation(async (id: string) =>
      version(id, { name: id === 'recVer1' ? 'Old' : 'New' })
    );
    const body = (await (await call()).json()) as { differences: unknown[] };
    expect(body.differences.length).toBeGreaterThan(0);
  });
});
