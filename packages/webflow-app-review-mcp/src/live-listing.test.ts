import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';

import type { AirtableClient } from './airtable.js';
import { AirtableClientError } from './airtable.js';
import { readLiveListing, writeLiveListing } from './live-listing.js';
import { registerTools } from './tools.js';

const MRP_ID = '0123456789abcdef01234567';
const APP_ID = 'fedcba9876543210fedcba98';
const OTHER_MRP_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

function mrpDocument(overrides: Record<string, unknown> = {}) {
  return {
    _id: MRP_ID,
    status: 'APPROVED',
    visibility: 'PRIVATE',
    name: 'example app',
    displayName: 'Example App',
    slug: 'example-app',
    updatedOn: '2026-11-01T00:00:00.000Z',
    resource: { type: 'INTEGRATION', id: APP_ID },
    ...overrides,
  };
}

/** Fake route: a body with only mrpId returns the document; other fields are applied to it. */
function fakeRoute(initial: Record<string, unknown> | null = mrpDocument()) {
  if (initial === null) {
    const bodies: Array<Record<string, unknown>> = [];
    const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response('{}', { status: 404 });
    }) as unknown as typeof fetch;
    return { fetchFn, bodies };
  }
  let document = initial;
  const bodies: Array<Record<string, unknown>> = [];
  const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    bodies.push(body);
    const { mrpId: _mrpId, ...change } = body;
    document = { ...document, ...change };
    return new Response(JSON.stringify(document), { status: 200 });
  }) as unknown as typeof fetch;
  return { fetchFn, bodies };
}

describe('live listing client', () => {
  it('reads with a body of mrpId only, so the route writes nothing', async () => {
    const { fetchFn, bodies } = fakeRoute();

    const listing = await readLiveListing({ apiKey: 'k', fetchFn }, MRP_ID);

    expect(bodies).toEqual([{ mrpId: MRP_ID }]);
    expect(listing).toMatchObject({
      mrpId: MRP_ID,
      status: 'APPROVED',
      visibility: 'PRIVATE',
      resourceType: 'INTEGRATION',
      resourceId: APP_ID,
      isLive: false,
    });
    const [url, init] = vi.mocked(fetchFn).mock.calls[0]!;
    expect(url).toBe('https://webflow.com/admin/api/mrp/airtable');
    expect(init?.method).toBe('PUT');
    expect((init?.headers as Record<string, string>)['X-Requested-With']).toBe('XMLHttpRequest');
  });

  it('writes only status and visibility', async () => {
    const { fetchFn, bodies } = fakeRoute();

    const listing = await writeLiveListing({ apiKey: 'k', fetchFn }, MRP_ID, { visibility: 'PUBLIC' });

    expect(bodies).toEqual([{ mrpId: MRP_ID, visibility: 'PUBLIC' }]);
    expect(listing.isLive).toBe(true);
  });

  it('refuses a write with no fields, and makes no request', async () => {
    const { fetchFn } = fakeRoute();

    await expect(writeLiveListing({ apiKey: 'k', fetchFn }, MRP_ID, {})).rejects.toMatchObject({ code: 'NO_MUTATION_FIELDS' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('is off when the key is not configured', async () => {
    const { fetchFn } = fakeRoute();

    await expect(readLiveListing({ fetchFn }, MRP_ID)).rejects.toMatchObject({
      code: 'MARKETPLACE_ADMIN_KEY_UNAVAILABLE',
      status: 503,
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('rejects a malformed listing ID before any request', async () => {
    const { fetchFn } = fakeRoute();

    await expect(readLiveListing({ apiKey: 'k', fetchFn }, 'recNotAnMrp')).rejects.toMatchObject({ code: 'INVALID_MRP_ID' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each([
    [404, 'LIVE_LISTING_NOT_FOUND'],
    [403, 'MARKETPLACE_ADMIN_KEY_REJECTED'],
    [429, 'LIVE_LISTING_RATE_LIMITED'],
    [500, 'LIVE_LISTING_REQUEST_FAILED'],
  ])('maps status %i to %s', async (status, code) => {
    const fetchFn = vi.fn(async () => new Response('{}', { status })) as unknown as typeof fetch;

    await expect(readLiveListing({ apiKey: 'k', fetchFn }, MRP_ID)).rejects.toMatchObject({ code });
  });

  it('fails when the route returns HTML with status 200', async () => {
    const fetchFn = vi.fn(async () => new Response('<!doctype html>', { status: 200 })) as unknown as typeof fetch;

    await expect(readLiveListing({ apiKey: 'k', fetchFn }, MRP_ID)).rejects.toBeInstanceOf(AirtableClientError);
  });

  it('fails when the route returns a different listing', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(mrpDocument({ _id: 'bbbbbbbbbbbbbbbbbbbbbbbb' })), { status: 200 })) as unknown as typeof fetch;

    await expect(readLiveListing({ apiKey: 'k', fetchFn }, MRP_ID)).rejects.toMatchObject({ code: 'LIVE_LISTING_RESPONSE_UNEXPECTED' });
  });

  it('fails when the route returns a document with no _id', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ status: 'APPROVED' }), { status: 200 })) as unknown as typeof fetch;

    await expect(readLiveListing({ apiKey: 'k', fetchFn }, MRP_ID)).rejects.toMatchObject({ code: 'LIVE_LISTING_RESPONSE_UNEXPECTED' });
  });

  it('fails a write that the route answers with 200 but does not apply', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(mrpDocument()), { status: 200 })) as unknown as typeof fetch;

    await expect(writeLiveListing({ apiKey: 'k', fetchFn }, MRP_ID, { visibility: 'PUBLIC' })).rejects.toMatchObject({
      code: 'LIVE_LISTING_WRITE_NOT_APPLIED',
    });
  });

  it('does not put the key in an error', async () => {
    const fetchFn = vi.fn(async () => new Response('{"echo":"Bearer super-secret-key"}', { status: 403 })) as unknown as typeof fetch;

    const error = await readLiveListing({ apiKey: 'super-secret-key', fetchFn }, MRP_ID).catch((e: unknown) => e);

    expect(JSON.stringify({ message: (error as Error).message, details: (error as AirtableClientError).details })).not.toContain(
      'super-secret-key',
    );
  });
});

type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: Array<{ text: string }> }>;

function setup(options: { reviewerEmail?: string | null; listingIds?: string[]; document?: Record<string, unknown> | null; apiKey?: string | null } = {}) {
  const handlers = new Map<string, ToolHandler>();
  const server = {
    tool(name: string, _description: string, _schema: unknown, handler: ToolHandler) {
      handlers.set(name, handler);
    },
  } as unknown as McpServer;
  const client = {
    getAssetById: vi.fn().mockResolvedValue({ assetId: 'recAsset', listingProfileIds: options.listingIds ?? [MRP_ID], marketplaceStatus: 'Approved' }),
  } as unknown as AirtableClient;
  const route = fakeRoute(options.document === undefined ? mrpDocument() : options.document);
  const reviewerEmail = options.reviewerEmail === undefined ? 'reviewer@webflow.com' : options.reviewerEmail;
  registerTools(
    server,
    () => client,
    () => (reviewerEmail ? { email: reviewerEmail } : null),
    () => null,
    () => null,
    () => ({ apiKey: options.apiKey === null ? undefined : (options.apiKey ?? 'k'), fetchFn: route.fetchFn }),
  );
  const call = async (name: string, args: Record<string, unknown>) =>
    JSON.parse((await handlers.get(name)!(args)).content[0]!.text) as {
      ok: boolean;
      data?: Record<string, unknown>;
      error?: { code: string; message: string };
    };
  return { call, ...route };
}

const WRITE_ARGS = {
  asset_id: 'recAsset',
  visibility: 'PUBLIC',
  expected: { status: 'APPROVED', visibility: 'PRIVATE' },
  confirm_live_listing_write: true,
};

describe('app_review_get_live_listing', () => {
  it('finds the listing ID on the asset and reads with no write', async () => {
    const { call, bodies } = setup();

    const result = await call('app_review_get_live_listing', { asset_id: 'recAsset' });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({ belongs_to_asset: true, listing: { status: 'APPROVED', visibility: 'PRIVATE' } });
    expect(bodies).toEqual([{ mrpId: MRP_ID }]);
  });

  it('reads an unlinked listing when mrp_id is supplied, and says it does not belong', async () => {
    const { call, bodies } = setup({ listingIds: [OTHER_MRP_ID] });

    const result = await call('app_review_get_live_listing', { asset_id: 'recAsset', mrp_id: MRP_ID });

    expect(result.data).toMatchObject({ belongs_to_asset: false });
    expect(bodies).toEqual([{ mrpId: MRP_ID }]);
  });

  it('says a linked listing of another type does not belong', async () => {
    const { call } = setup({ document: mrpDocument({ resource: { type: 'TEMPLATE', id: APP_ID } }) });

    const result = await call('app_review_get_live_listing', { asset_id: 'recAsset' });

    expect(result.data).toMatchObject({ belongs_to_asset: false });
  });

  it('says a listing belongs when the asset holds the Webflow app ID that the listing is for', async () => {
    const { call } = setup({ listingIds: [APP_ID] });

    const result = await call('app_review_get_live_listing', { asset_id: 'recAsset', mrp_id: MRP_ID });

    expect(result.data).toMatchObject({ belongs_to_asset: true });
  });

  it('explains a 404 on the asset ID: Airtable holds the app ID and no listing is linked', async () => {
    const { call } = setup({ listingIds: [APP_ID], document: null });

    const result = await call('app_review_get_live_listing', { asset_id: 'recAsset' });

    expect(result.error?.code).toBe('LIVE_LISTING_NOT_FOUND');
    expect(result.error?.message).toContain('Webflow app ID');
  });

  it('asks for mrp_id when the asset has no listing ID, and makes no request', async () => {
    const { call, fetchFn } = setup({ listingIds: [] });

    const result = await call('app_review_get_live_listing', { asset_id: 'recAsset' });

    expect(result.error?.code).toBe('LIVE_LISTING_ID_UNAVAILABLE');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('asks for mrp_id when the asset has two listing IDs, and makes no request', async () => {
    const { call, fetchFn } = setup({ listingIds: [MRP_ID, OTHER_MRP_ID] });

    const result = await call('app_review_get_live_listing', { asset_id: 'recAsset' });

    expect(result.error?.code).toBe('LIVE_LISTING_ID_AMBIGUOUS');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('is off without the key', async () => {
    const { call, fetchFn } = setup({ apiKey: null });

    const result = await call('app_review_get_live_listing', { asset_id: 'recAsset' });

    expect(result.error?.code).toBe('MARKETPLACE_ADMIN_KEY_UNAVAILABLE');
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('app_review_set_live_listing', () => {
  it('finds the listing ID on the asset, reads, writes only the requested field, and names the reviewer', async () => {
    const { call, bodies } = setup();

    const result = await call('app_review_set_live_listing', WRITE_ARGS);

    expect(result.ok).toBe(true);
    expect(bodies).toEqual([{ mrpId: MRP_ID }, { mrpId: MRP_ID, visibility: 'PUBLIC' }]);
    expect(result.data).toMatchObject({
      before: { visibility: 'PRIVATE', isLive: false },
      after: { visibility: 'PUBLIC', isLive: true },
      changed_by: 'reviewer@webflow.com',
      airtable_updated: false,
    });
  });

  it('picks the supplied mrp_id when the asset links two listings', async () => {
    const { call, bodies } = setup({ listingIds: [OTHER_MRP_ID, MRP_ID] });

    const result = await call('app_review_set_live_listing', { ...WRITE_ARGS, mrp_id: MRP_ID.toUpperCase() });

    expect(result.ok).toBe(true);
    expect(bodies[1]).toEqual({ mrpId: MRP_ID, visibility: 'PUBLIC' });
  });

  it('refuses an mrp_id whose listing matches neither ID kind on the asset, and does not write', async () => {
    const { call, bodies } = setup({ listingIds: [OTHER_MRP_ID] });

    const result = await call('app_review_set_live_listing', { ...WRITE_ARGS, mrp_id: MRP_ID });

    expect(result.error?.code).toBe('LIVE_LISTING_ASSET_MISMATCH');
    expect(bodies).toEqual([{ mrpId: MRP_ID }]);
  });

  it('writes a listing the sync has not linked when the asset holds the Webflow app ID it is for', async () => {
    const { call, bodies } = setup({ listingIds: [APP_ID] });

    const result = await call('app_review_set_live_listing', { ...WRITE_ARGS, mrp_id: MRP_ID });

    expect(result.ok).toBe(true);
    expect(bodies).toEqual([{ mrpId: MRP_ID }, { mrpId: MRP_ID, visibility: 'PUBLIC' }]);
  });

  it('does not write when the asset ID is a Webflow app ID and no mrp_id is supplied', async () => {
    const { call, bodies } = setup({ listingIds: [APP_ID], document: null });

    const result = await call('app_review_set_live_listing', WRITE_ARGS);

    expect(result.error?.code).toBe('LIVE_LISTING_NOT_FOUND');
    expect(bodies).toEqual([{ mrpId: APP_ID }]);
  });

  it('refuses when the asset has no listing ID, even with mrp_id, before any request', async () => {
    const { call, fetchFn } = setup({ listingIds: [] });

    expect((await call('app_review_set_live_listing', WRITE_ARGS)).error?.code).toBe('LIVE_LISTING_ID_UNAVAILABLE');
    expect((await call('app_review_set_live_listing', { ...WRITE_ARGS, mrp_id: MRP_ID })).error?.code).toBe('LIVE_LISTING_ASSET_MISMATCH');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('refuses when the asset links two listings and no mrp_id is supplied', async () => {
    const { call, fetchFn } = setup({ listingIds: [MRP_ID, OTHER_MRP_ID] });

    const result = await call('app_review_set_live_listing', WRITE_ARGS);

    expect(result.error?.code).toBe('LIVE_LISTING_ID_AMBIGUOUS');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('refuses a session with no reviewer identity, before any request', async () => {
    const { call, fetchFn } = setup({ reviewerEmail: null });

    const result = await call('app_review_set_live_listing', WRITE_ARGS);

    expect(result.error?.code).toBe('REVIEWER_EMAIL_UNAVAILABLE');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('refuses without the confirmation flag', async () => {
    const { call, fetchFn } = setup();

    const result = await call('app_review_set_live_listing', { ...WRITE_ARGS, confirm_live_listing_write: false });

    expect(result.error?.code).toBe('LIVE_LISTING_CONFIRMATION_REQUIRED');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('refuses when no field is supplied', async () => {
    const { call, fetchFn } = setup();

    const result = await call('app_review_set_live_listing', { ...WRITE_ARGS, visibility: undefined });

    expect(result.error?.code).toBe('NO_MUTATION_FIELDS');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('refuses a linked listing that is not an app listing, and does not write', async () => {
    const { call, bodies } = setup({ document: mrpDocument({ resource: { type: 'TEMPLATE', id: APP_ID } }) });

    const result = await call('app_review_set_live_listing', WRITE_ARGS);

    expect(result.error?.code).toBe('LIVE_LISTING_ASSET_MISMATCH');
    expect(bodies).toEqual([{ mrpId: MRP_ID }]);
  });

  it('refuses when the live status differs from the expected state, and does not write', async () => {
    const { call, bodies } = setup({ document: mrpDocument({ status: 'SUSPENDED' }) });

    const result = await call('app_review_set_live_listing', WRITE_ARGS);

    expect(result.error?.code).toBe('LIVE_LISTING_CONFLICT');
    expect(bodies).toEqual([{ mrpId: MRP_ID }]);
  });

  it('refuses when only the visibility differs from the expected state, and does not write', async () => {
    const { call, bodies } = setup({ document: mrpDocument({ visibility: 'PUBLIC' }) });

    const result = await call('app_review_set_live_listing', { ...WRITE_ARGS, status: 'SUSPENDED', visibility: undefined });

    expect(result.error?.code).toBe('LIVE_LISTING_CONFLICT');
    expect(bodies).toEqual([{ mrpId: MRP_ID }]);
  });

  it('is off without the key', async () => {
    const { call, fetchFn } = setup({ apiKey: null });

    const result = await call('app_review_set_live_listing', WRITE_ARGS);

    expect(result.error?.code).toBe('MARKETPLACE_ADMIN_KEY_UNAVAILABLE');
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
