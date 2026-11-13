import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAssetForOwner = vi.fn();
const getReviewRounds = vi.fn();
const markRoundResponded = vi.fn();

vi.mock('$lib/server/airtable', () => ({
  getAirtableClient: () => ({ getAssetForOwner, getReviewRounds, markRoundResponded })
}));

const workerFetch = vi.fn();
vi.stubGlobal('fetch', workerFetch);

const { GET, POST } = await import('./+server');

const ORIGIN = 'https://dashboard.example';
const ENV = {
  SESSIONS: {},
  REVIEW_COMMENTS_URL: 'https://comments.example/',
  REVIEW_COMMENTS_API_KEY: 'service-key'
};

function event(method: 'GET' | 'POST', body?: unknown, env: Record<string, unknown> = ENV) {
  return {
    params: { id: 'recAsset1' },
    url: new URL(`${ORIGIN}/api/assets/recAsset1/comments`),
    request: new Request(`${ORIGIN}/api/assets/recAsset1/comments`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    }),
    locals: { user: { email: 'creator@example.com' } },
    platform: { env }
  } as never;
}

function workerReply(data: unknown, status = 200) {
  const success = status < 400;
  return new Response(JSON.stringify(success ? { success, data } : { success, error: data }), {
    status
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getAssetForOwner.mockResolvedValue({ asset: { id: 'recAsset1', type: 'App' }, isOwner: true });
  getReviewRounds.mockResolvedValue([
    {
      id: 'recVer2',
      versionNumber: 2,
      reviewType: 'Meta Update',
      submittedAt: '2026-11-10T15:00:00.000Z',
      rawStatus: '📤Changes Requested'
    },
    { id: 'recVer1', versionNumber: 1, reviewType: 'New Asset', rawStatus: '👀Admin Feedback Review' }
  ]);
  markRoundResponded.mockResolvedValue(true);
});

describe('GET /api/assets/[id]/comments', () => {
  it('calls the Worker as the creator, hides author emails and internal statuses', async () => {
    workerFetch.mockResolvedValue(
      workerReply([
        {
          id: 'c1',
          versionRef: 'recVer2',
          authorEmail: 'reviewer@example.com',
          mongoResourceId: 'internal-id',
          body: 'Fix 404',
          visibility: 'released'
        },
        // A Worker fault must not put a draft in front of a creator.
        { id: 'c0', versionRef: 'recVer2', authorEmail: 'reviewer@example.com', body: 'Unsent', visibility: 'draft' }
      ])
    );

    const response = await GET(event('GET'));
    const body = (await response.json()) as { comments: unknown[]; versions: unknown[] };

    expect(body.comments).toEqual([{ id: 'c1', versionRef: 'recVer2', body: 'Fix 404', visibility: 'released' }]);
    expect(JSON.stringify(body)).not.toMatch(/reviewer@example\.com|internal-id|Unsent/);
    expect(body.versions).toEqual([
      {
        id: 'recVer2',
        versionNumber: 2,
        reviewType: 'Meta Update',
        submittedAt: '2026-11-10T15:00:00.000Z',
        status: 'Changes Requested'
      },
      { id: 'recVer1', versionNumber: 1, reviewType: 'New Asset', submittedAt: null, status: 'In Review' }
    ]);
    expect(JSON.stringify(body)).not.toContain('Admin Feedback Review');

    const [url, init] = workerFetch.mock.calls[0];
    expect(url).toBe('https://comments.example/v1/assets/recAsset1/comments');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer service-key',
      'X-Actor-Email': 'creator@example.com',
      'X-Actor-Role': 'creator'
    });
  });

  it('is off when the Worker is not configured', async () => {
    await expect(GET(event('GET', undefined, { SESSIONS: {} }))).rejects.toMatchObject({ status: 404 });
    expect(getAssetForOwner).not.toHaveBeenCalled();
    expect(workerFetch).not.toHaveBeenCalled();
  });

  it('is off for asset types outside REVIEW_COMMENTS_ASSET_TYPES', async () => {
    const env = { ...ENV, REVIEW_COMMENTS_ASSET_TYPES: 'Template' };
    await expect(GET(event('GET', undefined, env))).rejects.toMatchObject({ status: 404 });
    expect(workerFetch).not.toHaveBeenCalled();

    workerFetch.mockResolvedValue(workerReply([]));
    const allowed = await GET(event('GET', undefined, { ...ENV, REVIEW_COMMENTS_ASSET_TYPES: 'template, app' }));
    expect(allowed.status).toBe(200);
  });

  it('rejects non-owners before calling the Worker', async () => {
    getAssetForOwner.mockResolvedValue({ asset: { id: 'recAsset1', type: 'App' }, isOwner: false });
    await expect(GET(event('GET'))).rejects.toMatchObject({ status: 403 });
    expect(workerFetch).not.toHaveBeenCalled();
  });

  it('maps a Worker outage to 502', async () => {
    workerFetch.mockResolvedValue(workerReply('internal error', 500));
    await expect(GET(event('GET'))).rejects.toMatchObject({ status: 502 });
  });
});

describe('POST /api/assets/[id]/comments', () => {
  it('posts a reply on a round of the asset and returns it to the reviewer queue', async () => {
    workerFetch.mockResolvedValue(workerReply({ id: 'c2', body: 'Fixed it' }, 201));

    const response = await POST(event('POST', { versionId: 'recVer2', body: '  Fixed it  ' }));
    expect(response.status).toBe(201);

    const [url, init] = workerFetch.mock.calls[0];
    expect(url).toBe('https://comments.example/v1/versions/recVer2/comments');
    expect(JSON.parse(init.body)).toEqual({ assetRef: 'recAsset1', body: 'Fixed it', parentId: null });

    expect(markRoundResponded).toHaveBeenCalledWith('recVer2');
    const body = (await response.json()) as { version: { status: string } };
    expect(body.version.status).toBe('Response Received');
  });

  it('leaves the status alone unless the round is in Changes Requested', async () => {
    workerFetch.mockResolvedValue(workerReply({ id: 'c3', body: 'A question' }, 201));

    const response = await POST(event('POST', { versionId: 'recVer1', body: 'A question' }));
    expect(response.status).toBe(201);
    expect(markRoundResponded).not.toHaveBeenCalled();
    expect(((await response.json()) as { version: { status: string } }).version.status).toBe('In Review');
  });

  it('does not reopen a superseded round', async () => {
    getReviewRounds.mockResolvedValue([
      { id: 'recVer3', versionNumber: 3, reviewType: 'Meta Update', rawStatus: '🆕Ready for Review' },
      { id: 'recVer2', versionNumber: 2, reviewType: 'Meta Update', rawStatus: '📤Changes Requested' }
    ]);
    workerFetch.mockResolvedValue(workerReply({ id: 'c4', body: 'See version 3' }, 201));

    const response = await POST(event('POST', { versionId: 'recVer2', body: 'See version 3' }));
    expect(response.status).toBe(201);
    expect(markRoundResponded).not.toHaveBeenCalled();
  });

  it('keeps the reply when the status update fails', async () => {
    workerFetch.mockResolvedValue(workerReply({ id: 'c2', body: 'Fixed it' }, 201));
    markRoundResponded.mockResolvedValue(false);

    const response = await POST(event('POST', { versionId: 'recVer2', body: 'Fixed it' }));
    expect(response.status).toBe(201);
    expect(((await response.json()) as { version: { status: string } }).version.status).toBe('Changes Requested');
  });

  it('does not change the status when the Worker refuses the reply', async () => {
    workerFetch.mockResolvedValue(workerReply('no review thread on this version', 404));
    await expect(POST(event('POST', { versionId: 'recVer2', body: 'hi' }))).rejects.toMatchObject({ status: 404 });
    expect(markRoundResponded).not.toHaveBeenCalled();
  });

  it('rejects a version that is not a review round of this asset', async () => {
    await expect(POST(event('POST', { versionId: 'recVerX', body: 'hi' }))).rejects.toMatchObject({
      status: 404
    });
    expect(workerFetch).not.toHaveBeenCalled();
  });

  it('validates input before any lookup', async () => {
    await expect(POST(event('POST', { versionId: 'recVer2', body: '   ' }))).rejects.toMatchObject({ status: 400 });
    await expect(POST(event('POST', { body: 'hi' }))).rejects.toMatchObject({ status: 400 });
    await expect(
      POST(event('POST', { versionId: 'recVer2', body: 'x'.repeat(20_001) }))
    ).rejects.toMatchObject({ status: 400 });
    expect(getAssetForOwner).not.toHaveBeenCalled();
  });
});
