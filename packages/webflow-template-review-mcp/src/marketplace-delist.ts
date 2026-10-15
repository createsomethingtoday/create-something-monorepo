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
 * back, then the CMS. Relist reads only the referencer lists, so a
 * single-item delist writes the snapshot comment only when the unpublish
 * reports referencers, before any of them is stripped (a 409 changes nothing,
 * so the CMS is still untouched if that write fails). An asset with several
 * CMS items writes it up front instead: a later item's referencers must not
 * fail the snapshot after an earlier item was already taken down.
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
  | 'listDelistedAssetsWithCmsItems'
  | 'listPublishedAssetsLinkingCmsItems'
>;

interface CmsRef {
  id: string;
  name: string;
  /** Absent in snapshots written before Tags support; those were Templates items. */
  collectionId?: string;
}

/** Which copies of a referencing item listed the target before the delist. Absent in older snapshots: restore both. */
interface SnapshotRef extends CmsRef {
  staged?: boolean;
  live?: boolean;
}

interface DelistSnapshot {
  asset_id: string;
  at: string;
  by: string;
  mode: DelistMode;
  original?: { name: string; marketplace_status: string | null; cms_status: string | null; delist_reason: string | null };
  cms_item_ids: string[];
  /** CMS item id → items (templates' related-assets, tag pages' templates) that listed it before the takedown. */
  referencers: Record<string, SnapshotRef[]>;
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

  /** Webflow can answer 202 and still not publish an item (it lists it under `errors`), so check every id came back. */
  async publish(itemIds: string[]): Promise<void> {
    const result = await this.call('POST', `/${MARKETPLACE_TEMPLATES_COLLECTION_ID}/items/publish`, { itemIds });
    if (result.status !== 200 && result.status !== 202) this.fail('publish items', itemIds.join(','), result);
    const published = new Set(stringList(result.json?.publishedItemIds));
    const errors = Array.isArray(result.json?.errors) ? result.json.errors : [];
    if (errors.length > 0 || itemIds.some((id) => !published.has(id))) this.fail('publish items', itemIds.join(','), result);
  }

  /** Which copies (staged, live) of the referencing item currently list `targetId`. */
  async referenceState(ref: CmsRef, targetId: string): Promise<{ staged: boolean; live: boolean }> {
    const collectionId = ref.collectionId ?? MARKETPLACE_TEMPLATES_COLLECTION_ID;
    const field = REFERENCE_FIELDS[collectionId];
    const state = { staged: false, live: false };
    for (const live of [false, true]) {
      const item = await this.getItem(ref.id, live, collectionId);
      state[live ? 'live' : 'staged'] = stringList(item?.fieldData?.[field]).includes(targetId);
    }
    return state;
  }

  /**
   * Remove or add `targetId` in the referencing item's template list. `copies` limits which
   * copies are touched (relist restores only the ones the delist changed). Returns which copies changed.
   */
  async setReference(
    ref: CmsRef,
    targetId: string,
    present: boolean,
    copies: { staged: boolean; live: boolean } = { staged: true, live: true },
  ): Promise<{ staged: boolean; live: boolean }> {
    const collectionId = ref.collectionId ?? MARKETPLACE_TEMPLATES_COLLECTION_ID;
    const field = REFERENCE_FIELDS[collectionId];
    const changed = { staged: false, live: false };
    for (const live of [false, true]) {
      if (!copies[live ? 'live' : 'staged']) continue;
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

function assertHasCmsItems(asset: ReturnType<typeof readAsset>): void {
  if (asset.cms_item_ids.length === 0) {
    throw new AirtableClientError(
      'DELIST_NO_CMS_ITEMS',
      'This asset has no linked Webflow Templates CMS item, so there is no listing page to take down or restore. Nothing was changed.',
      409,
      { asset_id: asset.asset_id },
    );
  }
}

/** Delist applies to a published listing, or to an asset already Delisted whose page is still up (repair). */
function assertDelistable(asset: ReturnType<typeof readAsset>): void {
  if (asset.marketplace_status !== MARKETPLACE_STATUS_PUBLISHED && asset.marketplace_status !== MARKETPLACE_STATUS_DELISTED) {
    throw new AirtableClientError(
      'DELIST_ASSET_NOT_PUBLISHED',
      'Delist only applies to an asset whose 🚀Marketplace Status is Published (or already Delisted with its page still live).',
      409,
      { marketplace_status: asset.marketplace_status },
    );
  }
}

/**
 * An older version (update twin) can share its CMS item with the published listing that replaced it.
 * Unpublishing that item would take the newer listing down, so refuse before changing anything.
 */
async function assertNotSharedWithPublished(airtable: DelistAirtable, asset: ReturnType<typeof readAsset>): Promise<void> {
  const owners = (await airtable.listPublishedAssetsLinkingCmsItems(asset.cms_item_ids)).filter((record) => record.id !== asset.asset_id);
  const shared = owners
    .map((record) => ({
      asset_id: record.id,
      name: typeof record.fields[F.name] === 'string' ? (record.fields[F.name] as string) : '',
      cms_item_ids: stringList(record.fields[F.cmsItemIds]).filter((id) => asset.cms_item_ids.includes(id)),
    }))
    .filter((owner) => owner.cms_item_ids.length > 0);
  if (shared.length > 0) {
    throw new AirtableClientError(
      'DELIST_CMS_ITEM_SHARED',
      'A CMS item linked to this asset also belongs to a published listing (an update twin). Unpublishing it would take that listing down. Nothing was changed; delist the old asset in Airtable only, or unlink the shared item first.',
      409,
      { published_owners: shared },
    );
  }
}

/** Ties a confirm to the exact preview: asset, mode, reason, CMS items, and the planned Airtable writes. */
async function planToken(asset: ReturnType<typeof readAsset>, writes: Record<string, unknown>): Promise<string> {
  const plan = JSON.stringify({ asset_id: asset.asset_id, cms_item_ids: [...asset.cms_item_ids].sort(), writes: Object.entries(writes).sort() });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plan));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
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
  assertDelistable(asset);
  assertHasCmsItems(asset);
  await assertNotSharedWithPublished(airtable, asset);
  const items = [];
  for (const id of asset.cms_item_ids) {
    const exists = (await cms.getItem(id, false)) !== null;
    items.push({ cms_item_id: id, missing_in_webflow: !exists, live: exists && (await cms.getItem(id, true)) !== null });
  }
  const writes = delistFieldWrites(asset, input.mode, input.reason, input.now ?? new Date());
  return {
    plan_token: await planToken(asset, writes),
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
  input: { assetId: string; mode: DelistMode; reason?: DelistReason; expectedCmsItemIds: string[]; planToken: string; actor: string; now?: Date },
) {
  const now = input.now ?? new Date();
  const cms = new MarketplaceCms(cmsConfig);
  const asset = readAsset(await airtable.getDelistAssetFields(input.assetId));
  assertExpectedItems(asset.cms_item_ids, input.expectedCmsItemIds);
  assertDelistable(asset);
  assertHasCmsItems(asset);
  const writes = delistFieldWrites(asset, input.mode, input.reason, now);
  if ((await planToken(asset, writes)) !== input.planToken) {
    throw new AirtableClientError(
      'DELIST_PLAN_CHANGED',
      'The mode, reason, or planned Airtable writes differ from the approved preview. Run the preview again and confirm the new plan.',
      409,
    );
  }
  await assertNotSharedWithPublished(airtable, asset);

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

  // 1. Several items: prove the snapshot can be written before any change. Failure here aborts with nothing changed.
  if (asset.cms_item_ids.length > 1) await writeSnapshot();

  // 2. Airtable first so Whalesync has nothing to push back.
  await airtable.updateDelistAssetFields(asset.asset_id, writes);

  // 3. CMS: unpublish each item (stripping referencers on 409, after saving them), then archive the staged copy.
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
        // Record which copies list the target, so relist restores only those.
        const refs: SnapshotRef[] = [];
        for (const ref of outcome.referencers) refs.push({ ...ref, ...(await cms.referenceState(ref, itemId)) });
        snapshot.referencers[itemId] = refs;
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
        for (const ref of refs) {
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
    airtable: writes,
    cms_items: items,
    public_page: asset.page_path,
    public_page_status: status,
    verified: status === 404,
  };
}

/** True when the item is archived or unpublished, or the page answers 404 (a 429/5xx/redirect is not proof of an outage). */
async function listingDown(cms: MarketplaceCms, config: MarketplaceCmsConfig, itemId: string, pagePath: string | null): Promise<boolean> {
  const staged = await cms.getItem(itemId, false);
  if (staged !== null && (staged.isArchived === true || (await cms.getItem(itemId, true)) === null)) return true;
  return (await pageStatus(config, pagePath)) === 404;
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
  assertHasCmsItems(asset);
  const snapshots = snapshotsSinceLastRelist(await airtable.listAssetComments(asset.asset_id));
  // An interrupted relist leaves Airtable Published with the listing still down; allow resuming it.
  // Only a single-item delist with no referencers leaves no snapshot (several items always snapshot up front),
  // so for that case the listing state decides.
  const resuming =
    asset.marketplace_status === MARKETPLACE_STATUS_PUBLISHED &&
    (snapshots.length > 0 || (asset.cms_item_ids.length === 1 && (await listingDown(cms, cmsConfig, asset.cms_item_ids[0]!, asset.page_path))));
  if (asset.marketplace_status !== MARKETPLACE_STATUS_DELISTED && !resuming) {
    throw new AirtableClientError('ASSET_NOT_DELISTED', 'Relist only applies to an asset whose 🚀Marketplace Status is Delisted.', 409, {
      marketplace_status: asset.marketplace_status,
    });
  }
  if (asset.delist_reason === 'Policy infringement') {
    throw new AirtableClientError(
      'RELIST_POLICY_DELIST',
      'This template was delisted for Policy infringement. Policy delists stay down; relist needs a reviewer decision outside this tool.',
      409,
    );
  }

  const referencers = new Map<string, Map<string, SnapshotRef>>();
  // A retried delist writes another snapshot after a partial strip; a copy changed in any attempt is restored.
  for (const snapshot of snapshots) {
    for (const [itemId, refs] of Object.entries(snapshot.referencers ?? {})) {
      const byId = referencers.get(itemId) ?? new Map<string, SnapshotRef>();
      for (const ref of refs) {
        const seen = byId.get(ref.id);
        if (!seen) byId.set(ref.id, ref);
        else if (typeof seen.staged !== 'boolean' || typeof ref.staged !== 'boolean') byId.set(ref.id, { ...seen, staged: undefined, live: undefined });
        else byId.set(ref.id, { ...seen, staged: seen.staged || ref.staged, live: Boolean(seen.live) || Boolean(ref.live) });
      }
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
      const copies = typeof ref.staged === 'boolean' && typeof ref.live === 'boolean' ? { staged: ref.staged, live: ref.live } : undefined;
      restored.push({ ...ref, ...(await cms.setReference(ref, itemId, true, copies)) });
    }
    items.push({ cms_item_id: itemId, unarchived: true, published: true, referencers_restored: restored });
  }

  // The marker ends resumability, so write it only once the page is confirmed back (or there is no page to check).
  const status = await waitForPageStatus(cmsConfig, asset.page_path, 200);
  const published = items.filter((item) => item.published).length;
  // With no page path, a relist is complete only if at least one CMS item was actually republished.
  const complete = status === 200 || (status === null && published > 0);
  // The marker only retires snapshots; with none there is nothing to retire (and no comment write to fail).
  if (complete && snapshots.length > 0) {
    await airtable.addAssetComment(asset.asset_id, `${RELIST_MARKER}\n${JSON.stringify({ at: now.toISOString(), by: input.actor })}`);
  }
  return {
    asset_id: asset.asset_id,
    name: listedName(asset.name),
    resumed: resuming,
    snapshots_used: snapshots.length,
    cms_items: items,
    public_page: asset.page_path,
    public_page_status: status,
    verified: status === 200,
    ...(complete
      ? {}
      : {
          note:
            published > 0
              ? 'The page is not back yet. Re-run relist to retry; it resumes from the current state.'
              : 'No linked CMS item exists in Webflow, so nothing was republished. Fix the asset\'s CMS link, then re-run relist.',
        }),
  };
}

export interface DelistDriftItem {
  asset_id: string;
  name: string;
  page_path: string;
  cms_item_ids: string[];
}

/**
 * Delisted assets whose listing page still serves 200. Every Delisted asset with a CMS item is
 * checked (Whalesync's read-back can say Archived while the live page is still up). Excludes
 * update twins whose CMS item also belongs to a Published asset (that page is correctly live).
 */
export async function findDelistDrift(airtable: DelistAirtable, cmsConfig: Pick<MarketplaceCmsConfig, 'fetchFn' | 'publicBaseUrl'>) {
  const candidates = (await airtable.listDelistedAssetsWithCmsItems()).map(readAsset);
  const shared = await airtable.listPublishedAssetsLinkingCmsItems(candidates.flatMap((asset) => asset.cms_item_ids));
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
