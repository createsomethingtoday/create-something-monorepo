import assert from 'node:assert/strict';
import test from 'node:test';

import type { AirtableRecord } from '../src/airtable.js';
import {
  archivedName,
  executeDelist,
  executeRelist,
  findDelistDrift,
  listedName,
  previewDelist,
  type DelistAirtable,
  type MarketplaceCmsConfig,
} from '../src/marketplace-delist.js';
import { DELIST_ASSET_FIELD_IDS as F } from '../src/schema.js';

const TARGET = 'a00000000000000000000001';
const REF_A = 'a00000000000000000000002';
const REF_B = 'a00000000000000000000003';
const TAG = 'a00000000000000000000004';
const MISSING = 'a00000000000000000000005';
const TEMPLATES = '641b464e78789f611a5d4496';
const TAGS = '641b464e78789f7d8b5d4495';
const ASSET = 'recTESTASSET00001';
const PATH = '/templates/html/sample-website-template';
const NOW = new Date('2026-10-09T18:00:00Z');

interface CmsItem {
  related: string[];
  isArchived: boolean;
}

/** In-memory Webflow Templates collection + public page host. */
function fakeWebflow() {
  const staged = new Map<string, CmsItem>([
    [TARGET, { related: [], isArchived: false }],
    [REF_A, { related: [TARGET, 'aaaaaaaaaaaaaaaaaaaaaaaa'], isArchived: false }],
    [REF_B, { related: [TARGET], isArchived: false }],
    [TAG, { related: [TARGET, REF_A], isArchived: false }],
  ]);
  const collectionOf = (id: string) => (id === TAG ? TAGS : TEMPLATES);
  const fieldOf = (id: string) => (id === TAG ? 'templates' : 'related-assets');
  const live = new Map<string, CmsItem>(Array.from(staged, ([id, item]) => [id, { ...item, related: [...item.related] }]));
  const calls: string[] = [];

  const fetchFn: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    if (url.hostname === 'webflow.com') {
      const id = url.pathname === PATH ? TARGET : null;
      return new Response('', { status: id && live.has(id) ? 200 : 404 });
    }
    calls.push(`${method} ${url.pathname}`);
    const [, , , collectionId, , itemId, liveSegment] = url.pathname.split('/');
    if (itemId === 'publish') {
      const ids = JSON.parse(String(init?.body)).itemIds as string[];
      for (const id of ids) {
        const item = staged.get(id)!;
        live.set(id, { ...item, related: [...item.related] });
      }
      return Response.json({ publishedItemIds: ids }, { status: 202 });
    }
    const store = liveSegment === 'live' ? live : staged;
    const item = store.get(itemId);
    assert.ok(!item || collectionOf(itemId) === collectionId, `${itemId} requested from the wrong collection`);
    if (method === 'GET') {
      if (!item) return new Response('{}', { status: 404 });
      return Response.json({ id: itemId, isArchived: item.isArchived, fieldData: { [fieldOf(itemId)]: item.related } });
    }
    if (method === 'PATCH') {
      if (!item) return new Response('{}', { status: 404 });
      const body = JSON.parse(String(init?.body));
      if (body.fieldData?.[fieldOf(itemId)]) item.related = body.fieldData[fieldOf(itemId)];
      if (typeof body.isArchived === 'boolean') item.isArchived = body.isArchived;
      return Response.json({ id: itemId });
    }
    if (method === 'DELETE') {
      const referencers = Array.from(live).filter(([, other]) => other.related.includes(itemId));
      if (referencers.length > 0) {
        return Response.json(
          {
            code: 'conflict',
            details: [{ conflicts: referencers.map(([id]) => ({ type: 'item_ref', ref: { id, collectionId: collectionOf(id), name: `Ref ${id.slice(0, 4)}` } })) }],
          },
          { status: 409 },
        );
      }
      live.delete(itemId);
      return new Response(null, { status: 204 });
    }
    throw new Error(`unexpected ${method} ${url}`);
  };

  const config: MarketplaceCmsConfig = { siteToken: 'test', fetchFn, pauseMs: 0, verifyAttempts: 1 };
  return { staged, live, calls, config };
}

/** Nothing links to the target, so its unpublish never 409s. */
function withoutReferencers(web: ReturnType<typeof fakeWebflow>) {
  for (const store of [web.staged, web.live]) {
    for (const item of store.values()) item.related = item.related.filter((id) => id !== TARGET);
  }
  return web;
}

function fakeAirtable(fields: Record<string, unknown>, options: { failComment?: boolean; publishedOwners?: AirtableRecord[] } = {}) {
  const record: AirtableRecord = { id: ASSET, createdTime: '', fields: { [F.type]: 'Template🏗️', ...fields } } as AirtableRecord;
  const comments: Array<{ id: string; text: string; createdTime: string }> = [];
  const writes: Array<Record<string, unknown>> = [];
  const airtable = {
    getDelistAssetFields: async () => ({ ...record, fields: { ...record.fields } }),
    updateDelistAssetFields: async (_id: string, update: Record<string, unknown>) => {
      writes.push(update);
      Object.assign(record.fields, update);
      return record;
    },
    addAssetComment: async (_id: string, text: string) => {
      if (options.failComment) throw new Error('comments not permitted');
      comments.unshift({ id: `com${comments.length}`, text, createdTime: '' });
      return { id: `com${comments.length}` };
    },
    listAssetComments: async () => comments,
    listDelistedAssetsWithCmsItems: async () => [],
    listPublishedAssetsLinkingCmsItems: async () => [{ ...record }, ...(options.publishedOwners ?? [])],
  } satisfies DelistAirtable;
  return { airtable, comments, writes, record };
}

type Fake = ReturnType<typeof fakeAirtable>;

/** Preview, then confirm with the preview's ids and plan token (the tool's two-call flow). */
async function delist(
  at: Fake,
  config: MarketplaceCmsConfig,
  input: { mode: 'permanent' | 'temporary'; reason?: 'Creator request' | 'Stripe status' | 'Policy infringement'; confirmMode?: 'permanent' | 'temporary' },
) {
  const preview = await previewDelist(at.airtable, config, { assetId: ASSET, mode: input.mode, reason: input.reason, now: NOW });
  return executeDelist(at.airtable, config, {
    assetId: ASSET,
    mode: input.confirmMode ?? input.mode,
    reason: input.reason,
    expectedCmsItemIds: preview.cms_items.map((item) => item.cms_item_id),
    planToken: preview.plan_token,
    actor: 'reviewer@example.com',
    now: NOW,
  });
}

const publishedFields = {
  [F.name]: 'Sample Archived 0F7D58B8',
  [F.marketplaceStatus]: '3️⃣Published🚀',
  [F.cmsStatus]: 'Active',
  [F.detailPagePath]: PATH,
  [F.cmsItemIds]: [TARGET],
};

test('archivedName replaces any earlier Archived suffixes with the delist date; listedName strips them', () => {
  assert.equal(archivedName('NovaX Archived 323D108F Archived CE3FB6DC', NOW), 'NovaX Archived 20261009');
  assert.equal(archivedName('Sample', NOW), 'Sample Archived 20261009');
  assert.equal(listedName('Sample Archived 20261009'), 'Sample');
  assert.equal(listedName('SoftBit - Ecommerce'), 'SoftBit - Ecommerce');
});

test('permanent delist writes Airtable, snapshots and strips referencers, unpublishes and archives', async () => {
  const web = fakeWebflow();
  const at = fakeAirtable(publishedFields);

  const result = await delist(at, web.config, { mode: 'permanent', reason: 'Creator request' });

  assert.equal(result.verified, true);
  assert.equal(result.public_page_status, 404);
  assert.deepEqual(at.writes, [
    {
      [F.marketplaceStatus]: '4️⃣Delisted☠️',
      [F.cmsStatus]: 'Archived',
      [F.delistReason]: 'Creator request',
      [F.name]: 'Sample Archived 20261009',
    },
  ]);
  assert.equal(web.live.has(TARGET), false);
  assert.equal(web.staged.get(TARGET)?.isArchived, true);
  // Only the target id is removed; other related templates stay.
  assert.deepEqual(web.staged.get(REF_A)?.related, ['aaaaaaaaaaaaaaaaaaaaaaaa']);
  assert.deepEqual(web.live.get(REF_A)?.related, ['aaaaaaaaaaaaaaaaaaaaaaaa']);
  assert.deepEqual(web.live.get(REF_B)?.related, []);
  // Tag pages feature templates too; only the target leaves the tag's list.
  assert.deepEqual(web.live.get(TAG)?.related, [REF_A]);
  assert.equal(result.cms_items[0]?.referencers_stripped.length, 3);

  // Newest comment carries the referencers so relist can restore them.
  const latest = JSON.parse(at.comments[0]!.text.split('\n')[1]!);
  assert.deepEqual(latest.referencers[TARGET].map((ref: { id: string }) => ref.id).sort(), [REF_A, REF_B, TAG].sort());
  assert.equal(latest.original.name, 'Sample Archived 0F7D58B8');
});

test('a CMS item still linked in Airtable but deleted in Webflow is skipped, not fatal', async () => {
  const web = fakeWebflow();
  const at = fakeAirtable({ ...publishedFields, [F.cmsItemIds]: [TARGET, MISSING] });
  const result = await delist(at, web.config, { mode: 'temporary' });
  assert.equal(result.verified, true);
  assert.equal(result.cms_items[1]?.missing_in_webflow, true);
  assert.equal(web.live.has(TARGET), false);
});

test('an unpublish blocked by an unsupported collection stops with the reference in the error', async () => {
  const web = fakeWebflow();
  const blocked: typeof fetch = async (input, init) =>
    (init?.method ?? 'GET') === 'DELETE'
      ? Response.json({ details: [{ conflicts: [{ type: 'item_ref', ref: { id: 'x', collectionId: 'other', name: 'Other' } }] }] }, { status: 409 })
      : web.config.fetchFn!(input, init);
  const at = fakeAirtable(publishedFields);
  await assert.rejects(
    delist(at, { ...web.config, fetchFn: blocked }, { mode: 'temporary' }),
    (error: { code?: string }) => error.code === 'DELIST_UNSUPPORTED_REFERENCE',
  );
});

test('temporary delist leaves the name and delist reason untouched', async () => {
  const web = fakeWebflow();
  const at = fakeAirtable(publishedFields);
  await delist(at, web.config, { mode: 'temporary' });
  assert.deepEqual(at.writes, [{ [F.marketplaceStatus]: '4️⃣Delisted☠️', [F.cmsStatus]: 'Archived' }]);
});

test('a delist with no referencers writes no comment, so it succeeds when comments are not permitted', async () => {
  const web = withoutReferencers(fakeWebflow());
  const at = fakeAirtable(publishedFields, { failComment: true });
  const result = await delist(at, web.config, { mode: 'permanent', reason: 'Creator request' });
  assert.equal(result.verified, true);
  assert.equal(web.live.has(TARGET), false);
  assert.equal(web.staged.get(TARGET)?.isArchived, true);
  assert.equal(at.comments.length, 0);
});

test('a delist with referencers stops before stripping them when the snapshot comment cannot be written', async () => {
  const web = fakeWebflow();
  const at = fakeAirtable(publishedFields, { failComment: true });
  await assert.rejects(
    delist(at, web.config, { mode: 'temporary' }),
    (error: { code?: string }) => error.code === 'DELIST_PARTIAL_REFERENCER_SNAPSHOT_FAILED',
  );
  // Airtable is already Delisted; the CMS is untouched, so no link is lost.
  assert.deepEqual(at.writes, [{ [F.marketplaceStatus]: '4️⃣Delisted☠️', [F.cmsStatus]: 'Archived' }]);
  assert.equal(web.live.has(TARGET), true);
  assert.equal(web.staged.get(TARGET)?.isArchived, false);
  assert.deepEqual(web.live.get(REF_B)?.related, [TARGET]);
  assert.deepEqual(web.live.get(TAG)?.related, [TARGET, REF_A]);
  assert.ok(web.calls.every((call) => !call.startsWith('PATCH ')), 'no item was patched');
});

test('an asset with several CMS items changes nothing when the snapshot comment cannot be written', async () => {
  const web = withoutReferencers(fakeWebflow());
  const at = fakeAirtable({ ...publishedFields, [F.cmsItemIds]: [TARGET, MISSING] }, { failComment: true });
  await assert.rejects(delist(at, web.config, { mode: 'temporary' }), /comments not permitted/);
  assert.equal(at.writes.length, 0);
  assert.ok(web.calls.every((call) => call.startsWith('GET ')), 'only the preview reads ran');
});

test('delist refuses when the linked CMS items differ from the preview', async () => {
  const web = fakeWebflow();
  const at = fakeAirtable({ ...publishedFields, [F.cmsItemIds]: [TARGET, 'bbbbbbbbbbbbbbbbbbbbbbbb'] });
  await assert.rejects(
    executeDelist(at.airtable, web.config, { assetId: ASSET, mode: 'temporary', expectedCmsItemIds: [TARGET], planToken: '0'.repeat(64), actor: 'x', now: NOW }),
    (error: { code?: string }) => error.code === 'DELIST_PLAN_CHANGED',
  );
  assert.equal(at.writes.length, 0);
});

test('delist fails closed without a CMS token', async () => {
  const at = fakeAirtable(publishedFields);
  await assert.rejects(
    previewDelist(at.airtable, {}, { assetId: ASSET, mode: 'temporary' }),
    (error: { code?: string }) => error.code === 'MARKETPLACE_CMS_TOKEN_UNAVAILABLE',
  );
});

test('relist restores fields, republishes, and puts the item back into stripped related-assets', async () => {
  const web = fakeWebflow();
  const at = fakeAirtable(publishedFields);
  await delist(at, web.config, { mode: 'permanent', reason: 'Creator request' });

  const result = await executeRelist(at.airtable, { ...web.config, verifyAttempts: 1 }, { assetId: ASSET, expectedCmsItemIds: [TARGET], actor: 'x', now: NOW });

  assert.equal(result.verified, true);
  assert.deepEqual(at.writes.at(-1), {
    [F.marketplaceStatus]: '3️⃣Published🚀',
    [F.cmsStatus]: 'Active',
    [F.delistReason]: null,
    [F.name]: 'Sample',
  });
  assert.equal(web.staged.get(TARGET)?.isArchived, false);
  assert.equal(web.live.has(TARGET), true);
  assert.ok(web.live.get(REF_A)?.related.includes(TARGET));
  assert.ok(web.staged.get(REF_B)?.related.includes(TARGET));
  assert.ok(web.live.get(TAG)?.related.includes(TARGET));
  assert.match(at.comments[0]!.text, /^\[template-review:relist v1\]/);
});

test('drift reports delisted assets still serving 200 and skips pages owned by a newer listing', async () => {
  const asset = (id: string, path: string, cmsId: string): AirtableRecord =>
    ({ id, createdTime: '', fields: { [F.name]: id, [F.detailPagePath]: path, [F.cmsItemIds]: [cmsId] } }) as AirtableRecord;
  const airtable = {
    ...fakeAirtable({}).airtable,
    listDelistedAssetsWithCmsItems: async () => [
      asset('recLive', '/templates/html/live', 'c00000000000000000000001'),
      asset('recGone', '/templates/html/gone', 'c00000000000000000000002'),
      asset('recTwin', '/templates/html/twin', 'c00000000000000000000003'),
    ],
    listPublishedAssetsLinkingCmsItems: async () => [
      { id: 'recNewer', createdTime: '', fields: { [F.cmsItemIds]: ['c00000000000000000000003'] } } as AirtableRecord,
    ],
  } satisfies DelistAirtable;
  const fetchFn: typeof fetch = async (input) => new Response('', { status: String(input).endsWith('/live') || String(input).endsWith('/twin') ? 200 : 404 });

  const drift = await findDelistDrift(airtable, { fetchFn });

  assert.equal(drift.checked, 2);
  assert.equal(drift.skipped_shared_page, 1);
  assert.deepEqual(drift.live_after_delist.map((item) => item.asset_id), ['recLive']);
});

test('a confirm whose mode differs from the approved preview is refused before any write', async () => {
  const web = fakeWebflow();
  const at = fakeAirtable(publishedFields);
  await assert.rejects(
    delist(at, web.config, { mode: 'temporary', reason: 'Creator request', confirmMode: 'permanent' }),
    (error: { code?: string }) => error.code === 'DELIST_PLAN_CHANGED',
  );
  assert.equal(at.writes.length, 0);
  assert.equal(at.comments.length, 0);
});

test('an asset with no linked CMS item is refused instead of flipping Airtable alone', async () => {
  const web = fakeWebflow();
  const at = fakeAirtable({ ...publishedFields, [F.cmsItemIds]: [] });
  await assert.rejects(previewDelist(at.airtable, web.config, { assetId: ASSET, mode: 'temporary' }), (error: { code?: string }) => error.code === 'DELIST_NO_CMS_ITEMS');
  await assert.rejects(
    executeRelist(at.airtable, web.config, { assetId: ASSET, expectedCmsItemIds: [], actor: 'x', now: NOW }),
    (error: { code?: string }) => error.code === 'DELIST_NO_CMS_ITEMS',
  );
  assert.equal(at.writes.length, 0);
});

test('an asset that is not Published (or already Delisted) is refused', async () => {
  const web = fakeWebflow();
  const at = fakeAirtable({ ...publishedFields, [F.marketplaceStatus]: '2️⃣Upcoming' });
  await assert.rejects(previewDelist(at.airtable, web.config, { assetId: ASSET, mode: 'temporary' }), (error: { code?: string }) => error.code === 'DELIST_ASSET_NOT_PUBLISHED');
});

test('a CMS item shared with a published update twin is refused, so the newer listing stays up', async () => {
  const web = fakeWebflow();
  const twin = { id: 'recNEWERTWIN00001', createdTime: '', fields: { [F.name]: 'Sample v2', [F.cmsItemIds]: [TARGET] } } as AirtableRecord;
  const at = fakeAirtable(publishedFields, { publishedOwners: [twin] });
  await assert.rejects(previewDelist(at.airtable, web.config, { assetId: ASSET, mode: 'temporary' }), (error: { code?: string; details?: any }) => {
    assert.equal(error.code, 'DELIST_CMS_ITEM_SHARED');
    assert.equal(error.details?.published_owners?.[0]?.asset_id, 'recNEWERTWIN00001');
    return true;
  });
  assert.equal(web.live.has(TARGET), true);
});

test('relist refuses a Policy infringement delist', async () => {
  const web = fakeWebflow();
  const at = fakeAirtable(publishedFields);
  await delist(at, web.config, { mode: 'permanent', reason: 'Policy infringement' });
  await assert.rejects(
    executeRelist(at.airtable, web.config, { assetId: ASSET, expectedCmsItemIds: [TARGET], actor: 'x', now: NOW }),
    (error: { code?: string }) => error.code === 'RELIST_POLICY_DELIST',
  );
  assert.equal(web.live.has(TARGET), false);
});

test('relist restores only the referencer copies the delist changed', async () => {
  const web = fakeWebflow();
  // An editor already removed the target from REF_B's staged copy; only its live copy still lists it.
  web.staged.get(REF_B)!.related = [];
  const at = fakeAirtable(publishedFields);
  await delist(at, web.config, { mode: 'temporary' });
  await executeRelist(at.airtable, web.config, { assetId: ASSET, expectedCmsItemIds: [TARGET], actor: 'x', now: NOW });
  assert.ok(web.live.get(REF_B)?.related.includes(TARGET));
  assert.deepEqual(web.staged.get(REF_B)?.related, []);
  assert.ok(web.staged.get(REF_A)?.related.includes(TARGET));
});

test('a publish that answers 202 with item errors fails, and the relist can be re-run to finish', async () => {
  const web = fakeWebflow();
  const at = fakeAirtable(publishedFields);
  await delist(at, web.config, { mode: 'temporary' });
  let failPublish = true;
  const flaky: typeof fetch = async (input, init) => {
    if (failPublish && String(input).endsWith('/items/publish')) {
      failPublish = false;
      return Response.json({ publishedItemIds: [], errors: [{ id: TARGET, message: 'validation' }] }, { status: 202 });
    }
    return web.config.fetchFn!(input, init);
  };
  const config = { ...web.config, fetchFn: flaky };
  await assert.rejects(
    executeRelist(at.airtable, config, { assetId: ASSET, expectedCmsItemIds: [TARGET], actor: 'x', now: NOW }),
    (error: { code?: string }) => error.code === 'MARKETPLACE_CMS_WRITE_FAILED',
  );
  assert.equal(web.live.has(TARGET), false);
  const retry = await executeRelist(at.airtable, config, { assetId: ASSET, expectedCmsItemIds: [TARGET], actor: 'x', now: NOW });
  assert.equal(retry.resumed, true);
  assert.equal(retry.verified, true);
});

test('a relist interrupted after a delist with no referencers (no snapshot) can be re-run to finish', async () => {
  const web = withoutReferencers(fakeWebflow());
  const at = fakeAirtable(publishedFields);
  await delist(at, web.config, { mode: 'temporary' });
  assert.equal(at.comments.length, 0);
  let failPublish = true;
  const flaky: typeof fetch = async (input, init) => {
    if (failPublish && String(input).endsWith('/items/publish')) {
      failPublish = false;
      return Response.json({ publishedItemIds: [], errors: [{ id: TARGET, message: 'validation' }] }, { status: 202 });
    }
    return web.config.fetchFn!(input, init);
  };
  const config = { ...web.config, fetchFn: flaky };
  await assert.rejects(
    executeRelist(at.airtable, config, { assetId: ASSET, expectedCmsItemIds: [TARGET], actor: 'x', now: NOW }),
    (error: { code?: string }) => error.code === 'MARKETPLACE_CMS_WRITE_FAILED',
  );
  const retry = await executeRelist(at.airtable, config, { assetId: ASSET, expectedCmsItemIds: [TARGET], actor: 'x', now: NOW });
  assert.equal(retry.resumed, true);
  assert.equal(retry.verified, true);
});

test('relist still refuses a Published asset whose listing is fully live', async () => {
  const web = withoutReferencers(fakeWebflow());
  const at = fakeAirtable(publishedFields);
  await assert.rejects(
    executeRelist(at.airtable, web.config, { assetId: ASSET, expectedCmsItemIds: [TARGET], actor: 'x', now: NOW }),
    (error: { code?: string }) => error.code === 'ASSET_NOT_DELISTED',
  );
  assert.equal(at.writes.length, 0);
});

test('a transient page error on a live Published asset is not treated as an interrupted relist', async () => {
  const web = withoutReferencers(fakeWebflow());
  const at = fakeAirtable(publishedFields);
  const flaky: typeof fetch = async (input, init) =>
    new URL(String(input)).hostname === 'webflow.com' ? new Response('', { status: 503 }) : web.config.fetchFn!(input, init);
  await assert.rejects(
    executeRelist(at.airtable, { ...web.config, fetchFn: flaky }, { assetId: ASSET, expectedCmsItemIds: [TARGET], actor: 'x', now: NOW }),
    (error: { code?: string }) => error.code === 'ASSET_NOT_DELISTED',
  );
  assert.equal(at.writes.length, 0);
});

test('relist that cannot confirm the page leaves no marker, so it can be re-run', async () => {
  const web = fakeWebflow();
  const at = fakeAirtable(publishedFields);
  await delist(at, web.config, { mode: 'temporary' });
  const down: typeof fetch = async (input, init) =>
    new URL(String(input)).hostname === 'webflow.com' ? new Response('', { status: 404 }) : web.config.fetchFn!(input, init);
  const first = await executeRelist(at.airtable, { ...web.config, fetchFn: down }, { assetId: ASSET, expectedCmsItemIds: [TARGET], actor: 'x', now: NOW });
  assert.equal(first.verified, false);
  assert.doesNotMatch(at.comments[0]!.text, /^\[template-review:relist v1\]/);
  const second = await executeRelist(at.airtable, web.config, { assetId: ASSET, expectedCmsItemIds: [TARGET], actor: 'x', now: NOW });
  assert.equal(second.resumed, true);
  assert.equal(second.verified, true);
  assert.match(at.comments[0]!.text, /^\[template-review:relist v1\]/);
});

test('copy flags from a retried delist are merged, so relist restores every copy any attempt removed', async () => {
  const web = fakeWebflow();
  const at = fakeAirtable({ ...publishedFields, [F.marketplaceStatus]: '4️⃣Delisted☠️' });
  const snapshot = (flags: { staged: boolean; live: boolean }) =>
    `[template-review:delist-snapshot v1]\n${JSON.stringify({ asset_id: ASSET, at: '', by: 'x', mode: 'temporary', cms_item_ids: [TARGET], referencers: { [TARGET]: [{ id: REF_B, name: 'B', collectionId: TEMPLATES, ...flags }] } })}`;
  // First attempt stripped the staged copy and failed on live; the retry saw only live.
  at.comments.unshift({ id: 'c1', text: snapshot({ staged: true, live: true }), createdTime: '' });
  at.comments.unshift({ id: 'c2', text: snapshot({ staged: false, live: true }), createdTime: '' });
  web.staged.get(REF_B)!.related = [];
  web.live.get(REF_B)!.related = [];
  web.live.delete(TARGET);
  await executeRelist(at.airtable, web.config, { assetId: ASSET, expectedCmsItemIds: [TARGET], actor: 'x', now: NOW });
  assert.ok(web.staged.get(REF_B)?.related.includes(TARGET));
  assert.ok(web.live.get(REF_B)?.related.includes(TARGET));
});

test('relist with no page path and no CMS item left in Webflow does not record completion', async () => {
  const web = fakeWebflow();
  const at = fakeAirtable({ ...publishedFields, [F.marketplaceStatus]: '4️⃣Delisted☠️', [F.detailPagePath]: undefined, [F.cmsItemIds]: [MISSING] });
  at.comments.unshift({ id: 'c1', text: `[template-review:delist-snapshot v1]\n${JSON.stringify({ asset_id: ASSET, at: '', by: 'x', mode: 'temporary', cms_item_ids: [MISSING], referencers: {} })}`, createdTime: '' });
  const result = await executeRelist(at.airtable, web.config, { assetId: ASSET, expectedCmsItemIds: [MISSING], actor: 'x', now: NOW });
  assert.equal(result.verified, false);
  assert.match(String(result.note), /nothing was republished/);
  assert.doesNotMatch(at.comments[0]!.text, /^\[template-review:relist v1\]/);
});
