import { AirtableClientError, type AirtableClient, type AirtableRecord } from './airtable.js';
import {
  DELIST_ASSET_FIELD_IDS as F,
  MARKETPLACE_STATUS_DELISTED,
  MARKETPLACE_STATUS_PUBLISHED,
  type DelistReason,
} from './schema.js';

/**
 * Marketplace listing takedown and restore.
 *
 * Why this exists: flipping 🚀Marketplace Status / 🥞CMS Status in Airtable does
 * not take a listing page down — Whalesync never unpublishes the Webflow
 * Templates item. The page only 404s after `DELETE /items/{id}/live`, which
 * 409s while other live items link to it (templates' `related-assets`, tag pages' `templates`). This
 * module runs that runbook (reference: creator delist runbook) end to end and
 * stores what it changed as an Airtable comment on the asset so relist can
 * put it back.
 *
 * Order matters: Airtable is written first so Whalesync has nothing to push
 * back, then the CMS. The snapshot comment is written before any change; if
 * it cannot be written, nothing is changed.
 */

export const MARKETPLACE_TEMPLATES_COLLECTION_ID = '641b464e78789f611a5d4496';
const MARKETPLACE_TAGS_COLLECTION_ID = '641b464e78789f7d8b5d4495';
/**
 * Collections whose items can block an unpublish, and the multi-reference field
 * that points at templates. Templates: related-assets ("you may also like").
 * Tags: templates (the featured templates on a tag page, e.g. Portfolio).
 */
const REFERENCE_FIELDS: Record<string, string> = {
  [MARKETPLACE_TEMPLATES_COLLECTION_ID]: 'related-assets',
  [MARKETPLACE_TAGS_COLLECTION_ID]: 'templates',
};
const SNAPSHOT_MARKER = '[template-review:delist-snapshot v1]';
const RELIST_MARKER = '[template-review:relist v1]';
const ARCHIVED_SUFFIX = /( Archived [0-9A-Za-z]{8})+$/;

export type DelistMode = 'permanent' | 'temporary';

export interface MarketplaceCmsConfig {
  /** cms:write site token for the Marketplace site (worker secret). */
  siteToken?: string;
  fetchFn?: typeof fetch;
  apiBaseUrl?: string;
  publicBaseUrl?: string;
  /** Pause after each Webflow call; the Data API allows ~60 requests/minute. */
  pauseMs?: number;
  /** Public-page checks after the change (2.5s apart). */
  verifyAttempts?: number;
  verifyIntervalMs?: number;
}

export type DelistAirtable = Pick<
  AirtableClient,
  | 'getDelistAssetFields'
  | 'updateDelistAssetFields'
  | 'addAssetComment'
  | 'listAssetComments'
  | 'listDelistedAssetsWithActiveCms'
  | 'listNonDelistedAssetsLinkingCmsItems'
>;

interface CmsRef {
  id: string;
  name: string;
  /** Absent in snapshots written before Tags support; those were Templates items. */
  collectionId?: string;
}

interface DelistSnapshot {
  asset_id: string;
  at: string;
  by: string;
  mode: DelistMode;
  original?: { name: string; marketplace_status: string | null; cms_status: string | null; delist_reason: string | null };
  cms_item_ids: string[];
  /** CMS item id → items (templates' related-assets, tag pages' templates) that listed it before the takedown. */
  referencers: Record<string, CmsRef[]>;
}

const sleep = (ms: number) => (ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve());

function selectName(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as { name?: unknown }).name === 'string') {
    return (value as { name: string }).name;
  }
  return null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/** Webflow item JSON can carry raw control characters inside strings (creator bios); tolerate them. */
function parseLenient(text: string): any {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    try {
      return JSON.parse(text.replace(/[\u0000-\u001f]/g, ' '));
    } catch {
      return null;
    }
  }
}

function chicagoDateStamp(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now)
    .replaceAll('-', '');
}

export function archivedName(name: string, now: Date): string {
  return `${name.replace(ARCHIVED_SUFFIX, '')} Archived ${chicagoDateStamp(now)}`;
}

export function listedName(name: string): string {
  return name.replace(ARCHIVED_SUFFIX, '');
}

class MarketplaceCms {
  private readonly token: string;
  private readonly fetchFn: typeof fetch;
  private readonly base: string;
  private readonly pauseMs: number;

  constructor(config: MarketplaceCmsConfig) {
    if (!config.siteToken) {
      throw new AirtableClientError(
        'MARKETPLACE_CMS_TOKEN_UNAVAILABLE',
        'The Marketplace CMS site token is not configured in this MCP runtime, so listings cannot be taken down or restored here.',
        503,
      );
    }
    this.token = config.siteToken;
    this.fetchFn = config.fetchFn ?? ((input, init) => fetch(input, init));
    this.base = `${(config.apiBaseUrl ?? 'https://api.webflow.com').replace(/\/$/, '')}/v2/collections`;
    this.pauseMs = config.pauseMs ?? 1100;
  }

  private async call(method: string, path: string, body?: unknown): Promise<{ status: number; json: any }> {
    for (let attempt = 0; ; attempt += 1) {
      const response = await this.fetchFn(`${this.base}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get('retry-after'));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000);
        continue;
      }
      const json = parseLenient(await response.text());
      await sleep(this.pauseMs);
      if (response.status === 401 || response.status === 403) {
        throw new AirtableClientError('MARKETPLACE_CMS_TOKEN_REJECTED', `Webflow rejected the Marketplace CMS token (${response.status}).`, response.status);
      }
      return { status: response.status, json };
    }
  }

  private fail(action: string, itemId: string, result: { status: number; json: any }): never {
    throw new AirtableClientError('MARKETPLACE_CMS_WRITE_FAILED', `Webflow ${action} failed with status ${result.status}.`, result.status, {
      cms_item_id: itemId,
      response: result.json,
    });
  }

  async getItem(itemId: string, live: boolean, collectionId = MARKETPLACE_TEMPLATES_COLLECTION_ID): Promise<any | null> {
    const result = await this.call('GET', `/${collectionId}/items/${itemId}${live ? '/live' : ''}`);
    if (result.status === 404) return null;
    if (result.status !== 200) this.fail(`GET ${live ? 'live' : 'staged'} item`, itemId, result);
    return result.json;
  }

  async patchItem(itemId: string, live: boolean, body: unknown, collectionId = MARKETPLACE_TEMPLATES_COLLECTION_ID): Promise<void> {
    const result = await this.call('PATCH', `/${collectionId}/items/${itemId}${live ? '/live' : ''}`, body);
    if (result.status !== 200) this.fail(`PATCH ${live ? 'live' : 'staged'} item`, itemId, result);
  }

  /** Unpublish. Returns the referencing templates when Webflow refuses with 409. */
  async deleteLive(itemId: string): Promise<{ deleted: true } | { deleted: false; referencers: CmsRef[] }> {
    const result = await this.call('DELETE', `/${MARKETPLACE_TEMPLATES_COLLECTION_ID}/items/${itemId}/live`);
    if (result.status === 204 || result.status === 200) return { deleted: true };
    if (result.status === 409) {
      const referencers: CmsRef[] = [];
      const unsupported: unknown[] = [];
      for (const detail of result.json?.details ?? []) {
        for (const conflict of detail?.conflicts ?? []) {
          const ref = conflict?.ref;
          if (typeof ref?.id === 'string' && REFERENCE_FIELDS[ref.collectionId]) {
            referencers.push({ id: ref.id, name: String(ref.name ?? ''), collectionId: ref.collectionId });
          } else {
            unsupported.push(ref ?? conflict);
          }
        }
      }
      if (unsupported.length > 0) {
        throw new AirtableClientError(
          'DELIST_UNSUPPORTED_REFERENCE',
          'Webflow refuses to unpublish because an item in a collection this tool does not edit links to it. Remove that link by hand, then re-run.',
          409,
          { cms_item_id: itemId, unsupported_references: unsupported },
        );
      }
      if (referencers.length > 0) return { deleted: false, referencers };
    }
    this.fail('DELETE live item', itemId, result);
  }

  async publish(itemIds: string[]): Promise<void> {
    const result = await this.call('POST', `/${MARKETPLACE_TEMPLATES_COLLECTION_ID}/items/publish`, { itemIds });
    if (result.status !== 200 && result.status !== 202) this.fail('publish items', itemIds.join(','), result);
  }

  /** Remove or add `targetId` in the referencing item's template list (staged and live copies). Returns which copies changed. */
  async setReference(ref: CmsRef, targetId: string, present: boolean): Promise<{ staged: boolean; live: boolean }> {
    const collectionId = ref.collectionId ?? MARKETPLACE_TEMPLATES_COLLECTION_ID;
    const field = REFERENCE_FIELDS[collectionId];
    const changed = { staged: false, live: false };
    for (const live of [false, true]) {
      const item = await this.getItem(ref.id, live, collectionId);
      if (!item) continue;
      const current = stringList(item.fieldData?.[field]);
      const has = current.includes(targetId);
      if (has === present) continue;
      const next = present ? [...current, targetId] : current.filter((id) => id !== targetId);
      await this.patchItem(ref.id, live, { fieldData: { [field]: next } }, collectionId);
      changed[live ? 'live' : 'staged'] = true;
    }
    return changed;
  }
}

async function pageStatus(config: MarketplaceCmsConfig, path: string | null): Promise<number | null> {
  if (!path) return null;
  const fetchFn = config.fetchFn ?? ((input, init) => fetch(input, init));
  const base = (config.publicBaseUrl ?? 'https://webflow.com').replace(/\/$/, '');
  const response = await fetchFn(`${base}${path}`, { method: 'GET', redirect: 'manual' });
  await response.body?.cancel();
  return response.status;
}

async function waitForPageStatus(config: MarketplaceCmsConfig, path: string | null, expected: number): Promise<number | null> {
  const attempts = config.verifyAttempts ?? 4;
  let status: number | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) await sleep(config.verifyIntervalMs ?? 2500);
    status = await pageStatus(config, path);
    if (status === expected || status === null) return status;
  }
  return status;
}

function readAsset(record: AirtableRecord) {
  const fields = record.fields;
  const path = typeof fields[F.detailPagePath] === 'string' ? (fields[F.detailPagePath] as string) : null;
  return {
    asset_id: record.id,
    name: typeof fields[F.name] === 'string' ? (fields[F.name] as string) : '',
    marketplace_status: selectName(fields[F.marketplaceStatus]),
    cms_status: selectName(fields[F.cmsStatus]),
    delist_reason: selectName(fields[F.delistReason]),
    cms_status_actual: stringList(fields[F.cmsStatusActual]),
    cms_item_ids: [...new Set(stringList(fields[F.cmsItemIds]))],
    page_path: path,
  };
}

function assertExpectedItems(actual: string[], expected: string[]): void {
  const a = [...actual].sort();
  const e = [...new Set(expected)].sort();
  if (a.length !== e.length || a.some((id, index) => id !== e[index])) {
    throw new AirtableClientError(
      'DELIST_PLAN_CHANGED',
      'The CMS items linked to this asset no longer match the preview. Run the preview again and confirm the new list.',
      409,
      { expected_cms_item_ids: e, current_cms_item_ids: a },
    );
  }
}

function delistFieldWrites(asset: ReturnType<typeof readAsset>, mode: DelistMode, reason: DelistReason | undefined, now: Date) {
  const fields: Record<string, unknown> = {
    [F.marketplaceStatus]: MARKETPLACE_STATUS_DELISTED,
    [F.cmsStatus]: 'Archived',
  };
  // A temporary delist (relist expected after a fix) leaves the reason and name alone,
  // so the relist does not have to undo them.
  if (mode === 'permanent') {
    fields[F.delistReason] = reason;
    fields[F.name] = archivedName(asset.name, now);
  }
  return fields;
}

export async function previewDelist(airtable: DelistAirtable, cmsConfig: MarketplaceCmsConfig, input: { assetId: string; mode: DelistMode; reason?: DelistReason; now?: Date }) {
  const asset = readAsset(await airtable.getDelistAssetFields(input.assetId));
  const cms = new MarketplaceCms(cmsConfig);
  const items = [];
  for (const id of asset.cms_item_ids) {
    const exists = (await cms.getItem(id, false)) !== null;
    items.push({ cms_item_id: id, missing_in_webflow: !exists, live: exists && (await cms.getItem(id, true)) !== null });
  }
  const writes = delistFieldWrites(asset, input.mode, input.reason, input.now ?? new Date());
  return {
    asset,
    public_page_status: await pageStatus(cmsConfig, asset.page_path),
    cms_items: items,
    planned_airtable_writes: {
      marketplace_status: writes[F.marketplaceStatus],
      cms_status: writes[F.cmsStatus],
      ...(input.mode === 'permanent' ? { delist_reason: writes[F.delistReason], name: writes[F.name] } : {}),
    },
    planned_cms_changes: items.map((item) => ({
      cms_item_id: item.cms_item_id,
      unpublish: item.live,
      archive_staged: !item.missing_in_webflow,
    })),
    note:
      'Items that link to this template (other templates\' related-assets, tag pages\' featured templates) are found when the unpublish runs (Webflow reports them in its 409). They are saved to an Airtable comment on the asset before the template is removed from their lists, so relist can restore them.',
  };
}

export async function executeDelist(
  airtable: DelistAirtable,
  cmsConfig: MarketplaceCmsConfig,
  input: { assetId: string; mode: DelistMode; reason?: DelistReason; expectedCmsItemIds: string[]; actor: string; now?: Date },
) {
  const now = input.now ?? new Date();
  const cms = new MarketplaceCms(cmsConfig);
  const asset = readAsset(await airtable.getDelistAssetFields(input.assetId));
  assertExpectedItems(asset.cms_item_ids, input.expectedCmsItemIds);

  const snapshot: DelistSnapshot = {
    asset_id: asset.asset_id,
    at: now.toISOString(),
    by: input.actor,
    mode: input.mode,
    original: {
      name: asset.name,
      marketplace_status: asset.marketplace_status,
      cms_status: asset.cms_status,
      delist_reason: asset.delist_reason,
    },
    cms_item_ids: asset.cms_item_ids,
    referencers: {},
  };
  const writeSnapshot = () => airtable.addAssetComment(asset.asset_id, `${SNAPSHOT_MARKER}\n${JSON.stringify(snapshot)}`);

  // 1. Snapshot before any change. Failure here aborts with nothing changed.
  await writeSnapshot();

  // 2. Airtable first so Whalesync has nothing to push back.
  await airtable.updateDelistAssetFields(asset.asset_id, delistFieldWrites(asset, input.mode, input.reason, now));

  // 3. CMS: unpublish each item (stripping referencers on 409), then archive the staged copy.
  const items = [];
  for (const itemId of asset.cms_item_ids) {
    // Airtable can still link a CMS item that was deleted in Webflow (an old Whalesync duplicate). Nothing to take down.
    if ((await cms.getItem(itemId, false)) === null) {
      items.push({ cms_item_id: itemId, missing_in_webflow: true, was_live: false, unpublished: false, archived_staged: false, referencers_stripped: [] });
      continue;
    }
    const wasLive = (await cms.getItem(itemId, true)) !== null;
    let stripped: Array<CmsRef & { staged: boolean; live: boolean }> = [];
    if (wasLive) {
      let outcome = await cms.deleteLive(itemId);
      if (!outcome.deleted) {
        snapshot.referencers[itemId] = outcome.referencers;
        try {
          await writeSnapshot();
        } catch (error) {
          throw new AirtableClientError(
            'DELIST_PARTIAL_REFERENCER_SNAPSHOT_FAILED',
            'Airtable was set to Delisted, but the list of templates that link to this one could not be saved, so the CMS was not changed. Re-run after fixing the comment write.',
            500,
            { cms_item_id: itemId, referencers: outcome.referencers, cause: error instanceof Error ? error.message : String(error) },
          );
        }
        for (const ref of outcome.referencers) {
          stripped.push({ ...ref, ...(await cms.setReference(ref, itemId, false)) });
        }
        outcome = await cms.deleteLive(itemId);
        if (!outcome.deleted) {
          throw new AirtableClientError('DELIST_STILL_REFERENCED', 'Webflow still refuses to unpublish the item after stripping the reported referencers.', 409, {
            cms_item_id: itemId,
            referencers: outcome.referencers,
          });
        }
      }
    }
    await cms.patchItem(itemId, false, { isArchived: true });
    items.push({ cms_item_id: itemId, was_live: wasLive, unpublished: wasLive, archived_staged: true, referencers_stripped: stripped });
  }

  const status = await waitForPageStatus(cmsConfig, asset.page_path, 404);
  return {
    asset_id: asset.asset_id,
    mode: input.mode,
    airtable: delistFieldWrites(asset, input.mode, input.reason, now),
    cms_items: items,
    public_page: asset.page_path,
    public_page_status: status,
    verified: status === 404,
  };
}

/** Snapshots since the last relist, newest first. */
function snapshotsSinceLastRelist(comments: Array<{ text: string }>): DelistSnapshot[] {
  const snapshots: DelistSnapshot[] = [];
  for (const comment of comments) {
    if (comment.text.startsWith(RELIST_MARKER)) break;
    if (!comment.text.startsWith(SNAPSHOT_MARKER)) continue;
    const parsed = parseLenient(comment.text.slice(SNAPSHOT_MARKER.length).trim());
    if (parsed && typeof parsed === 'object') snapshots.push(parsed as DelistSnapshot);
  }
  return snapshots;
}

export async function executeRelist(
  airtable: DelistAirtable,
  cmsConfig: MarketplaceCmsConfig,
  input: { assetId: string; expectedCmsItemIds: string[]; actor: string; now?: Date },
) {
  const now = input.now ?? new Date();
  const cms = new MarketplaceCms(cmsConfig);
  const asset = readAsset(await airtable.getDelistAssetFields(input.assetId));
  assertExpectedItems(asset.cms_item_ids, input.expectedCmsItemIds);
  if (asset.marketplace_status !== MARKETPLACE_STATUS_DELISTED) {
    throw new AirtableClientError('ASSET_NOT_DELISTED', 'Relist only applies to an asset whose 🚀Marketplace Status is Delisted.', 409, {
      marketplace_status: asset.marketplace_status,
    });
  }

  const snapshots = snapshotsSinceLastRelist(await airtable.listAssetComments(asset.asset_id));
  const referencers = new Map<string, Map<string, CmsRef>>();
  for (const snapshot of snapshots) {
    for (const [itemId, refs] of Object.entries(snapshot.referencers ?? {})) {
      const byId = referencers.get(itemId) ?? new Map<string, CmsRef>();
      for (const ref of refs) byId.set(ref.id, ref);
      referencers.set(itemId, byId);
    }
  }

  await airtable.updateDelistAssetFields(asset.asset_id, {
    [F.marketplaceStatus]: MARKETPLACE_STATUS_PUBLISHED,
    [F.cmsStatus]: 'Active',
    [F.delistReason]: null,
    [F.name]: listedName(asset.name),
  });

  const items = [];
  for (const itemId of asset.cms_item_ids) {
    if ((await cms.getItem(itemId, false)) === null) {
      items.push({ cms_item_id: itemId, missing_in_webflow: true, unarchived: false, published: false, referencers_restored: [] });
      continue;
    }
    await cms.patchItem(itemId, false, { isArchived: false });
    await cms.publish([itemId]);
    const restored = [];
    for (const ref of referencers.get(itemId)?.values() ?? []) {
      restored.push({ ...ref, ...(await cms.setReference(ref, itemId, true)) });
    }
    items.push({ cms_item_id: itemId, unarchived: true, published: true, referencers_restored: restored });
  }

  await airtable.addAssetComment(asset.asset_id, `${RELIST_MARKER}\n${JSON.stringify({ at: now.toISOString(), by: input.actor })}`);
  const status = await waitForPageStatus(cmsConfig, asset.page_path, 200);
  return {
    asset_id: asset.asset_id,
    name: listedName(asset.name),
    snapshots_used: snapshots.length,
    cms_items: items,
    public_page: asset.page_path,
    public_page_status: status,
    verified: status === 200,
  };
}

export interface DelistDriftItem {
  asset_id: string;
  name: string;
  page_path: string;
  cms_item_ids: string[];
}

/**
 * Delisted assets whose listing page still serves 200. Excludes update twins
 * whose CMS item also belongs to a non-delisted asset (that page is correctly live).
 */
export async function findDelistDrift(airtable: DelistAirtable, cmsConfig: Pick<MarketplaceCmsConfig, 'fetchFn' | 'publicBaseUrl'>) {
  const candidates = (await airtable.listDelistedAssetsWithActiveCms()).map(readAsset);
  const shared = await airtable.listNonDelistedAssetsLinkingCmsItems(candidates.flatMap((asset) => asset.cms_item_ids));
  const sharedIds = new Set(shared.flatMap((record) => stringList(record.fields[F.cmsItemIds])));

  const live: DelistDriftItem[] = [];
  let skippedShared = 0;
  const queue = candidates.filter((asset) => {
    const isShared = asset.cms_item_ids.some((id) => sharedIds.has(id));
    if (isShared) skippedShared += 1;
    return !isShared && asset.page_path;
  });
  for (let index = 0; index < queue.length; index += 5) {
    const batch = queue.slice(index, index + 5);
    const statuses = await Promise.all(batch.map((asset) => pageStatus(cmsConfig, asset.page_path)));
    batch.forEach((asset, position) => {
      if (statuses[position] === 200) {
        live.push({ asset_id: asset.asset_id, name: asset.name, page_path: asset.page_path!, cms_item_ids: asset.cms_item_ids });
      }
    });
  }
  return { checked: queue.length, skipped_shared_page: skippedShared, live_after_delist: live };
}

export function formatDriftAlert(drift: Awaited<ReturnType<typeof findDelistDrift>>): string | null {
  if (drift.live_after_delist.length === 0) return null;
  const lines = drift.live_after_delist.map((item) => `• ${item.name} — https://webflow.com${item.page_path} (asset ${item.asset_id})`);
  return [
    `*${drift.live_after_delist.length} delisted template(s) still have a live Marketplace page.*`,
    'Run `template_review_delist_template` on each (preview first).',
    ...lines,
  ].join('\n');
}
