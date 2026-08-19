import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateAssetWithImages = vi.fn();
const getAssetForOwner = vi.fn();

vi.mock('$lib/server/airtable', () => ({
  getAirtableClient: () => ({
    getAssetForOwner,
    updateAssetWithImages,
    checkAssetNameUniqueness: vi.fn().mockResolvedValue({ unique: true }),
    createAssetVersionFromAsset: vi.fn().mockResolvedValue({ id: 'ver1' })
  })
}));

vi.mock('$lib/server/assets-cache', () => ({
  invalidateAssetsCache: vi.fn().mockResolvedValue(undefined)
}));

const { PUT } = await import('./+server');

const ORIGIN = 'https://dashboard.example';
const AIRTABLE_IMAGE =
  'https://v5.airtableusercontent.com/v3/u/55/55/1785794400000/r0LsDcUS2BxWEbdvhyDbmQ/UE_Z01UA21N2/mmHcRUPc7Isv';

function callPut(body: Record<string, unknown>) {
  return PUT({
    params: { id: 'rec123' },
    url: new URL(`${ORIGIN}/api/assets/rec123`),
    request: new Request(`${ORIGIN}/api/assets/rec123`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }),
    locals: { user: { email: 'creator@example.com' } },
    platform: { env: { SESSIONS: {}, CSRF_TRUSTED_ORIGINS: undefined } }
  } as unknown as Parameters<typeof PUT>[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  getAssetForOwner.mockResolvedValue({
    asset: { id: 'rec123', name: 'Template', thumbnailUrl: AIRTABLE_IMAGE },
    isOwner: true
  });
  updateAssetWithImages.mockResolvedValue({ id: 'rec123', name: 'Template' });
});

describe('PUT /api/assets/[id] image URL validation', () => {
  it('rejects a thumbnail pointing at an arbitrary remote host', async () => {
    await expect(callPut({ thumbnailUrl: 'https://evil.example/payload.webp' })).rejects.toMatchObject(
      { status: 400 }
    );
    // The write must not reach Airtable, which would fetch and re-host the file.
    expect(updateAssetWithImages).not.toHaveBeenCalled();
  });

  it('rejects a remote URL hidden among valid carousel images', async () => {
    await expect(
      callPut({ carouselImages: [AIRTABLE_IMAGE, 'https://evil.example/payload.webp'] })
    ).rejects.toMatchObject({ status: 400 });
    expect(updateAssetWithImages).not.toHaveBeenCalled();
  });

  it('rejects a remote secondary thumbnail', async () => {
    await expect(
      callPut({ secondaryThumbnails: ['https://evil.example/payload.webp'] })
    ).rejects.toMatchObject({ status: 400 });
    expect(updateAssetWithImages).not.toHaveBeenCalled();
  });

  it('accepts an unchanged Airtable-hosted image so ordinary edits still save', async () => {
    const response = await callPut({
      thumbnailUrl: AIRTABLE_IMAGE,
      carouselImages: [AIRTABLE_IMAGE]
    });

    expect(response.status).toBe(200);
    expect(updateAssetWithImages).toHaveBeenCalled();
  });

  it('accepts a freshly uploaded dashboard image', async () => {
    const response = await callPut({ thumbnailUrl: `${ORIGIN}/api/uploads/abc/thumb.webp` });

    expect(response.status).toBe(200);
    expect(updateAssetWithImages).toHaveBeenCalled();
  });

  it('accepts a null thumbnail, which clears the image', async () => {
    const response = await callPut({ thumbnailUrl: null });

    expect(response.status).toBe(200);
    expect(updateAssetWithImages).toHaveBeenCalled();
  });

  it('returns a clean failed-update response when Airtable returns no record', async () => {
    updateAssetWithImages.mockResolvedValue(null);

    await expect(callPut({ thumbnailUrl: `${ORIGIN}/api/uploads/abc/thumb.webp` })).rejects.toMatchObject(
      { status: 500 }
    );
  });
});
