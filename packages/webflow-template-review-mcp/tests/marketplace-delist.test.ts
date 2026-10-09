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
      for (const id of JSON.parse(String(init?.body)).itemIds as string[]) {
        const item = staged.get(id)!;
        live.set(id, { ...item, related: [...item.related] });
      }
      return new Response('{}', { status: 202 });
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

function fakeAirtable(fields: Record<string, unknown>, options: { failComment?: boolean } = {}) {
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
    listDelistedAssetsWithActiveCms: async () => [],
    listNonDelistedAssetsLinkingCmsItems: async () => [],
  } satisfies DelistAirtable;
  return { airtable, comments, writes, record };
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

test('permanent delist snapshots first, writes Airtable, strips referencers, unpublishes and archives', async () => {
  const web = fakeWebflow();
  const at = fakeAirtable(publishedFields);

  const result = await executeDelist(at.airtable, web.config, {
    assetId: ASSET,
    mode: 'permanent',
    reason: 'Creator request',
    expectedCmsItemIds: [TARGET],
    actor: 'reviewer@example.com',
    now: NOW,
  });

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
  const result = await executeDelist(at.airtable, web.config, { assetId: ASSET, mode: 'temporary', expectedCmsItemIds: [TARGET, MISSING], actor: 'x', now: NOW });
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
    executeDelist(at.airtable, { ...web.config, fetchFn: blocked }, { assetId: ASSET, mode: 'temporary', expectedCmsItemIds: [TARGET], actor: 'x', now: NOW }),
    (error: { code?: string }) => error.code === 'DELIST_UNSUPPORTED_REFERENCE',
  );
});

test('temporary delist leaves the name and delist reason untouched', async () => {
  const web = fakeWebflow();
  const at = fakeAirtable(publishedFields);
  await executeDelist(at.airtable, web.config, { assetId: ASSET, mode: 'temporary', expectedCmsItemIds: [TARGET], actor: 'x', now: NOW });
  assert.deepEqual(at.writes, [{ [F.marketplaceStatus]: '4️⃣Delisted☠️', [F.cmsStatus]: 'Archived' }]);
});

test('delist changes nothing when the snapshot comment cannot be written', async () => {
  const web = fakeWebflow();
  const at = fakeAirtable(publishedFields, { failComment: true });
  await assert.rejects(
    executeDelist(at.airtable, web.config, { assetId: ASSET, mode: 'temporary', expectedCmsItemIds: [TARGET], actor: 'x', now: NOW }),
    /comments not permitted/,
  );
  assert.equal(at.writes.length, 0);
  assert.equal(web.calls.length, 0);
});

test('delist refuses when the linked CMS items differ from the preview', async () => {
  const web = fakeWebflow();
  const at = fakeAirtable({ ...publishedFields, [F.cmsItemIds]: [TARGET, 'bbbbbbbbbbbbbbbbbbbbbbbb'] });
  await assert.rejects(
    executeDelist(at.airtable, web.config, { assetId: ASSET, mode: 'temporary', expectedCmsItemIds: [TARGET], actor: 'x', now: NOW }),
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
  await executeDelist(at.airtable, web.config, {
    assetId: ASSET,
    mode: 'permanent',
    reason: 'Creator request',
    expectedCmsItemIds: [TARGET],
    actor: 'x',
    now: NOW,
  });

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
    listDelistedAssetsWithActiveCms: async () => [
      asset('recLive', '/templates/html/live', 'c00000000000000000000001'),
      asset('recGone', '/templates/html/gone', 'c00000000000000000000002'),
      asset('recTwin', '/templates/html/twin', 'c00000000000000000000003'),
    ],
    listNonDelistedAssetsLinkingCmsItems: async () => [
      { id: 'recNewer', createdTime: '', fields: { [F.cmsItemIds]: ['c00000000000000000000003'] } } as AirtableRecord,
    ],
  } satisfies DelistAirtable;
  const fetchFn: typeof fetch = async (input) => new Response('', { status: String(input).endsWith('/live') || String(input).endsWith('/twin') ? 200 : 404 });

  const drift = await findDelistDrift(airtable, { fetchFn });

  assert.equal(drift.checked, 2);
  assert.equal(drift.skipped_shared_page, 1);
  assert.deepEqual(drift.live_after_delist.map((item) => item.asset_id), ['recLive']);
});
