import type { AliasType, CreatorLookupValue, DocumentCountRow, SlugAliasInput, TemplateDocumentInput, TemplateImageSourceStats } from './types.js';
import type { WebflowDesignerAvatarRecord, WebflowTemplateImageRecord } from './webflow.js';
import { chunk, nowIso } from './utils.js';

export interface TemplateImageRefreshRow {
  id: string;
  templateSlug: string;
  name: string;
  listingUrl: string | null;
  thumbnailImageUrl: string | null;
  thumbnailImageSecondaryUrl: string | null;
}

export interface TemplateImageUpdateInput {
  id: string;
  thumbnailImageUrl: string | null;
  thumbnailImageSecondaryUrl: string | null;
}

export interface TemplateLookupTarget {
  id: string;
  templateSlug: string | null;
  sourceLastModifiedTime?: string | null;
}

type BatchProgress = () => Promise<void>;

const TEMPLATE_IMAGE_REFRESH_SELECT = `SELECT id, template_slug AS templateSlug, name, listing_url AS listingUrl, thumbnail_image_url AS thumbnailImageUrl, thumbnail_image_secondary_url AS thumbnailImageSecondaryUrl
       FROM template_documents`;

const STALE_IMAGE_WHERE = `thumbnail_image_url IS NULL
          OR thumbnail_image_url LIKE '%airtableusercontent.com%'
          OR thumbnail_image_url LIKE '%dl.airtable.com%'
          OR thumbnail_image_secondary_url LIKE '%airtableusercontent.com%'
          OR thumbnail_image_secondary_url LIKE '%dl.airtable.com%'`;

const TEMP_ATTACHMENT_IMAGE_WHERE = `thumbnail_image_url LIKE '%airtableusercontent.com%'
          OR thumbnail_image_url LIKE '%dl.airtable.com%'
          OR thumbnail_image_secondary_url LIKE '%airtableusercontent.com%'
          OR thumbnail_image_secondary_url LIKE '%dl.airtable.com%'`;
const TEMPLATE_LOOKUP_QUERY_BATCH_SIZE = 40;

async function runStatementBatches(
  db: D1Database,
  statements: D1PreparedStatement[],
  options: { onBatch?: BatchProgress } = {},
): Promise<number> {
  let totalChanges = 0;
  for (const group of chunk(statements, 50)) {
    const results = await db.batch(group);
    for (const result of results) {
      totalChanges += result.meta?.changes ?? 0;
    }
    await options.onBatch?.();
  }
  return totalChanges;
}

const IMAGE_BACKFILL_ATTEMPT_RETRY_AFTER_MS = 6 * 60 * 60 * 1000;
const STALE_IMAGE_REFRESH_LIMIT = 24;
const IMAGE_REFRESH_LOOKUP_BATCH_SIZE = 50;
const SYNC_JOB_LOCK_KEY = 'template_sync';

function normalizeCreatorLookupName(value: string): string {
  return value.trim().toLowerCase();
}

export interface SyncJobRecord {
  lock_key: string;
  job_id: string;
  mode: string;
  status: 'running' | 'succeeded' | 'failed';
  started_at: string;
  heartbeat_at: string;
  expires_at: string;
  finished_at: string | null;
  summary_json: string | null;
  error: string | null;
}

export interface SyncStateRecord {
  key: string;
  value_json: string;
  updated_at: string;
}

export interface SyncJobLock {
  lockKey: string;
  jobId: string;
  mode: string;
}

export interface SyncJobAcquireResult {
  acquired: boolean;
  lock: SyncJobLock;
  activeJob: SyncJobRecord | null;
}

const UPSERT_TEMPLATE_SQL = `
  INSERT INTO template_documents (
    id,
    template_slug,
    name,
    listing_url,
    preview_url,
    website_url,
    mrp_id,
    creator_name,
    creator_record_id,
    creator_slug,
    creator_profile_url,
    creator_avatar_url,
    creator_avatar_alt,
    thumbnail_image_url,
    thumbnail_image_secondary_url,
    carousel_image_urls_json,
    description_short,
    description_long_html,
    description_long_text,
    category_groups_json,
    category_group_slugs_json,
    child_categories_json,
    child_category_slugs_json,
    styles_json,
    style_slugs_json,
    tags_json,
    tag_slugs_json,
    template_type,
    is_free,
    is_featured,
    is_landing_page,
    reviewer_pick_reason,
    popularity_score,
    unique_viewers,
    cumulative_purchases,
    price,
    published_date,
    marketplace_status,
    source_last_modified_time,
    synced_at,
    category_groups_text,
    child_categories_text,
    styles_text,
    tags_text
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
  ON CONFLICT(id) DO UPDATE SET
    template_slug = excluded.template_slug,
    name = excluded.name,
    listing_url = excluded.listing_url,
    preview_url = excluded.preview_url,
    website_url = excluded.website_url,
    mrp_id = excluded.mrp_id,
    creator_name = excluded.creator_name,
    creator_record_id = excluded.creator_record_id,
    creator_slug = excluded.creator_slug,
    creator_profile_url = CASE
      WHEN (excluded.creator_profile_url IS NULL OR excluded.creator_profile_url = '')
        AND template_documents.creator_profile_url IS NOT NULL
        AND template_documents.creator_profile_url != ''
        THEN template_documents.creator_profile_url
      ELSE excluded.creator_profile_url
    END,
    creator_avatar_url = CASE
      WHEN (
          excluded.creator_avatar_url IS NULL
          OR excluded.creator_avatar_url = ''
          OR excluded.creator_avatar_url LIKE '%airtableusercontent.com%'
          OR excluded.creator_avatar_url LIKE '%dl.airtable.com%'
        )
        AND template_documents.creator_avatar_url LIKE 'https://cdn.prod.website-files.com/%'
        THEN template_documents.creator_avatar_url
      ELSE excluded.creator_avatar_url
    END,
    creator_avatar_alt = CASE
      WHEN (excluded.creator_avatar_alt IS NULL OR excluded.creator_avatar_alt = '')
        AND template_documents.creator_avatar_alt IS NOT NULL
        AND template_documents.creator_avatar_alt != ''
        THEN template_documents.creator_avatar_alt
      ELSE excluded.creator_avatar_alt
    END,
    thumbnail_image_url = CASE
      WHEN (
          excluded.thumbnail_image_url IS NULL
          OR excluded.thumbnail_image_url = ''
          OR excluded.thumbnail_image_url LIKE '%airtableusercontent.com%'
          OR excluded.thumbnail_image_url LIKE '%dl.airtable.com%'
        )
        AND template_documents.thumbnail_image_url LIKE 'https://cdn.prod.website-files.com/%'
        THEN template_documents.thumbnail_image_url
      ELSE excluded.thumbnail_image_url
    END,
    thumbnail_image_secondary_url = CASE
      WHEN (
          excluded.thumbnail_image_secondary_url IS NULL
          OR excluded.thumbnail_image_secondary_url = ''
          OR excluded.thumbnail_image_secondary_url LIKE '%airtableusercontent.com%'
          OR excluded.thumbnail_image_secondary_url LIKE '%dl.airtable.com%'
        )
        AND template_documents.thumbnail_image_secondary_url LIKE 'https://cdn.prod.website-files.com/%'
        THEN template_documents.thumbnail_image_secondary_url
      ELSE excluded.thumbnail_image_secondary_url
    END,
    carousel_image_urls_json = excluded.carousel_image_urls_json,
    description_short = excluded.description_short,
    description_long_html = excluded.description_long_html,
    description_long_text = excluded.description_long_text,
    category_groups_json = excluded.category_groups_json,
    category_group_slugs_json = excluded.category_group_slugs_json,
    child_categories_json = excluded.child_categories_json,
    child_category_slugs_json = excluded.child_category_slugs_json,
    styles_json = excluded.styles_json,
    style_slugs_json = excluded.style_slugs_json,
    tags_json = excluded.tags_json,
    tag_slugs_json = excluded.tag_slugs_json,
    template_type = excluded.template_type,
    is_free = excluded.is_free,
    is_featured = excluded.is_featured,
    is_landing_page = excluded.is_landing_page,
    reviewer_pick_reason = COALESCE(excluded.reviewer_pick_reason, template_documents.reviewer_pick_reason),
    popularity_score = excluded.popularity_score,
    unique_viewers = excluded.unique_viewers,
    cumulative_purchases = excluded.cumulative_purchases,
    price = excluded.price,
    published_date = excluded.published_date,
    marketplace_status = excluded.marketplace_status,
    source_last_modified_time = excluded.source_last_modified_time,
    synced_at = excluded.synced_at,
    category_groups_text = excluded.category_groups_text,
    child_categories_text = excluded.child_categories_text,
    styles_text = excluded.styles_text,
    tags_text = excluded.tags_text
`;

function toJson(value: string[]): string {
  return JSON.stringify(value);
}

function placeholderList(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

function addMilliseconds(iso: string, milliseconds: number): string {
  return new Date(new Date(iso).getTime() + milliseconds).toISOString();
}

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getSummaryMode(summary: unknown): string | null {
  if (!summary || typeof summary !== 'object' || !('mode' in summary)) return null;
  const mode = (summary as { mode?: unknown }).mode;
  return typeof mode === 'string' && mode.length > 0 ? mode : null;
}

function hasTemplateOfferSignal(record: WebflowTemplateImageRecord): boolean {
  return record.price !== null || record.isFree !== null;
}

function templateOfferBinds(record: WebflowTemplateImageRecord) {
  const hasPrice = record.price !== null ? 1 : 0;
  const hasFree = record.isFree !== null ? 1 : 0;
  const freeValue = record.isFree === null ? null : record.isFree ? 1 : 0;
  return { hasPrice, price: record.price, hasFree, freeValue };
}

function pushTemplateOfferUpdateById(
  db: D1Database,
  statements: D1PreparedStatement[],
  record: WebflowTemplateImageRecord,
  syncedAt: string,
): void {
  if (!record.id || !hasTemplateOfferSignal(record)) return;
  const offer = templateOfferBinds(record);

  statements.push(
    db
      .prepare(
        `UPDATE template_documents
         SET price = CASE WHEN ? = 1 THEN ? ELSE price END,
             is_free = CASE WHEN ? = 1 THEN ? ELSE is_free END,
             synced_at = ?
         WHERE id = ?
           AND (
             (? = 1 AND NOT (price IS ?))
             OR (? = 1 AND NOT (is_free IS ?))
           )`,
      )
      .bind(
        offer.hasPrice,
        offer.price,
        offer.hasFree,
        offer.freeValue,
        syncedAt,
        record.id,
        offer.hasPrice,
        offer.price,
        offer.hasFree,
        offer.freeValue,
      ),
  );
}

function pushTemplateOfferUpdateByName(
  db: D1Database,
  statements: D1PreparedStatement[],
  record: WebflowTemplateImageRecord,
  syncedAt: string,
): void {
  if (!record.name || !hasTemplateOfferSignal(record)) return;
  const offer = templateOfferBinds(record);

  statements.push(
    db
      .prepare(
        `UPDATE template_documents
         SET price = CASE WHEN ? = 1 THEN ? ELSE price END,
             is_free = CASE WHEN ? = 1 THEN ? ELSE is_free END,
             synced_at = ?
         WHERE name = ?
           AND (SELECT COUNT(*) FROM template_documents WHERE name = ?) = 1
           AND (
             (? = 1 AND NOT (price IS ?))
             OR (? = 1 AND NOT (is_free IS ?))
           )`,
      )
      .bind(
        offer.hasPrice,
        offer.price,
        offer.hasFree,
        offer.freeValue,
        syncedAt,
        record.name,
        record.name,
        offer.hasPrice,
        offer.price,
        offer.hasFree,
        offer.freeValue,
      ),
  );
}

export function publicSyncJobRecord(record: SyncJobRecord | null) {
  if (!record) return null;
  return {
    job_id: record.job_id,
    mode: record.mode,
    status: record.status,
    started_at: record.started_at,
    heartbeat_at: record.heartbeat_at,
    expires_at: record.expires_at,
    finished_at: record.finished_at,
    error: record.error,
    summary: parseJson(record.summary_json),
  };
}

export async function getActiveSyncJob(db: D1Database, now = nowIso()): Promise<SyncJobRecord | null> {
  return db
    .prepare(
      `SELECT *
       FROM sync_jobs
       WHERE lock_key = ?
         AND status = 'running'
         AND expires_at > ?
       LIMIT 1`,
    )
    .bind(SYNC_JOB_LOCK_KEY, now)
    .first<SyncJobRecord>();
}

export async function getLatestSyncJob(db: D1Database): Promise<SyncJobRecord | null> {
  return db.prepare('SELECT * FROM sync_jobs WHERE lock_key = ? LIMIT 1').bind(SYNC_JOB_LOCK_KEY).first<SyncJobRecord>();
}

export async function acquireSyncJobLock(
  db: D1Database,
  mode: string,
  options: { ttlMs?: number; now?: string; staleHeartbeatMs?: number } = {},
): Promise<SyncJobAcquireResult> {
  const startedAt = options.now ?? nowIso();
  const ttlMs = options.ttlMs ?? 20 * 60 * 1000;
  const expiresAt = addMilliseconds(startedAt, ttlMs);
  const staleHeartbeatCutoff = options.staleHeartbeatMs ? addMilliseconds(startedAt, -options.staleHeartbeatMs) : null;
  const jobId = `${mode}-${crypto.randomUUID()}`;

  await db
    .prepare(
      `INSERT INTO sync_jobs (
         lock_key,
         job_id,
         mode,
         status,
         started_at,
         heartbeat_at,
         expires_at,
         finished_at,
         summary_json,
         error
       ) VALUES (?, ?, ?, 'running', ?, ?, ?, NULL, NULL, NULL)
       ON CONFLICT(lock_key) DO UPDATE SET
         job_id = excluded.job_id,
         mode = excluded.mode,
         status = excluded.status,
         started_at = excluded.started_at,
         heartbeat_at = excluded.heartbeat_at,
         expires_at = excluded.expires_at,
         finished_at = NULL,
         summary_json = NULL,
         error = NULL
       WHERE sync_jobs.status != 'running'
          OR sync_jobs.expires_at <= ?
          OR (? IS NOT NULL AND sync_jobs.heartbeat_at <= ?)`,
    )
    .bind(SYNC_JOB_LOCK_KEY, jobId, mode, startedAt, startedAt, expiresAt, startedAt, staleHeartbeatCutoff, staleHeartbeatCutoff)
    .run();

  const activeJob = await db.prepare('SELECT * FROM sync_jobs WHERE lock_key = ?').bind(SYNC_JOB_LOCK_KEY).first<SyncJobRecord>();
  const acquired = activeJob?.job_id === jobId && activeJob.status === 'running';

  return {
    acquired,
    lock: {
      lockKey: SYNC_JOB_LOCK_KEY,
      jobId,
      mode,
    },
    activeJob: acquired ? null : activeJob,
  };
}

export async function finishSyncJobLock(
  db: D1Database,
  lock: SyncJobLock,
  result:
    | { status: 'succeeded'; summary: unknown; finishedAt?: string }
    | { status: 'failed'; error: unknown; finishedAt?: string },
): Promise<void> {
  const finishedAt = result.finishedAt ?? nowIso();
  const summaryJson = result.status === 'succeeded' ? JSON.stringify(result.summary) : null;
  const error = result.status === 'failed' ? (result.error instanceof Error ? result.error.message : String(result.error)) : null;

  await db
    .prepare(
      `UPDATE sync_jobs
       SET status = ?,
           heartbeat_at = ?,
           finished_at = ?,
           summary_json = ?,
           error = ?
       WHERE lock_key = ?
         AND job_id = ?`,
    )
    .bind(result.status, finishedAt, finishedAt, summaryJson, error, lock.lockKey, lock.jobId)
    .run();
}

export async function heartbeatSyncJobLock(db: D1Database, lock: SyncJobLock, heartbeatAt = nowIso()): Promise<void> {
  await db
    .prepare(
      `UPDATE sync_jobs
       SET heartbeat_at = ?
       WHERE lock_key = ?
         AND job_id = ?
         AND status = 'running'`,
    )
    .bind(heartbeatAt, lock.lockKey, lock.jobId)
    .run();
}

export async function listTemplateDocumentIds(db: D1Database): Promise<string[]> {
  const { results } = await db.prepare('SELECT id FROM template_documents').all<{ id: string }>();
  return (results ?? []).map((row) => row.id);
}

export async function upsertTemplateDocuments(db: D1Database, documents: TemplateDocumentInput[]): Promise<void> {
  const statements: D1PreparedStatement[] = [];

  for (const document of documents) {
    // If a different record has claimed this slug, evict it before inserting.
    statements.push(
      db
        .prepare(
          'DELETE FROM template_styles WHERE template_document_id = (SELECT id FROM template_documents WHERE template_slug = ? AND id != ?)',
        )
        .bind(document.templateSlug, document.id),
    );
    statements.push(
      db
        .prepare(
          'DELETE FROM template_child_categories WHERE template_document_id = (SELECT id FROM template_documents WHERE template_slug = ? AND id != ?)',
        )
        .bind(document.templateSlug, document.id),
    );
    statements.push(
      db
        .prepare(
          'DELETE FROM template_category_memberships WHERE template_document_id = (SELECT id FROM template_documents WHERE template_slug = ? AND id != ?)',
        )
        .bind(document.templateSlug, document.id),
    );
    statements.push(
      db.prepare('DELETE FROM template_documents WHERE template_slug = ? AND id != ?').bind(document.templateSlug, document.id),
    );
    statements.push(db.prepare('DELETE FROM template_styles WHERE template_document_id = ?').bind(document.id));
    statements.push(db.prepare('DELETE FROM template_child_categories WHERE template_document_id = ?').bind(document.id));
    statements.push(db.prepare('DELETE FROM template_category_memberships WHERE template_document_id = ?').bind(document.id));
    statements.push(
      db.prepare(UPSERT_TEMPLATE_SQL).bind(
        document.id,
        document.templateSlug,
        document.name,
        document.listingUrl,
        document.previewUrl,
        document.websiteUrl,
        document.mrpId,
        document.creatorName,
        document.creatorRecordId,
        document.creatorSlug,
        document.creatorProfileUrl,
        document.creatorAvatarUrl,
        document.creatorAvatarAlt,
        document.thumbnailImageUrl,
        document.thumbnailImageSecondaryUrl,
        JSON.stringify(document.carouselImageUrls),
        document.descriptionShort,
        document.descriptionLongHtml,
        document.descriptionLongText,
        toJson(document.categoryGroups),
        toJson(document.categoryGroupSlugs),
        toJson(document.childCategories),
        toJson(document.childCategorySlugs),
        toJson(document.styles),
        toJson(document.styleSlugs),
        toJson(document.tags),
        toJson(document.tagSlugs),
        document.templateType,
        document.isFree ? 1 : 0,
        document.isFeatured ? 1 : 0,
        document.isLandingPage ? 1 : 0,
        document.reviewerPickReason,
        document.popularityScore,
        document.uniqueViewers,
        document.cumulativePurchases,
        document.price,
        document.publishedDate,
        document.marketplaceStatus,
        document.sourceLastModifiedTime,
        document.syncedAt,
        document.categoryGroups.join(' '),
        document.childCategories.join(' '),
        document.styles.join(' '),
        document.tags.join(' '),
      ),
    );

    for (const [index, styleSlug] of document.styleSlugs.entries()) {
      statements.push(
        db.prepare('INSERT OR REPLACE INTO template_styles (template_document_id, style_name, style_slug) VALUES (?, ?, ?)').bind(
          document.id,
          document.styles[index] ?? styleSlug,
          styleSlug,
        ),
      );
    }

    for (const [index, childCategorySlug] of document.childCategorySlugs.entries()) {
      statements.push(
        db
          .prepare(
            'INSERT OR REPLACE INTO template_child_categories (template_document_id, child_category_name, child_category_slug) VALUES (?, ?, ?)',
          )
          .bind(document.id, document.childCategories[index] ?? childCategorySlug, childCategorySlug),
      );
    }

    for (const membership of document.categoryMemberships) {
      statements.push(
        db
          .prepare(
            'INSERT OR REPLACE INTO template_category_memberships (template_document_id, category_group_name, category_group_slug, child_category_name, child_category_slug) VALUES (?, ?, ?, ?, ?)',
          )
          .bind(
            document.id,
            membership.categoryGroupName,
            membership.categoryGroupSlug,
            membership.childCategoryName,
            membership.childCategorySlug,
          ),
      );
    }
  }

  for (const group of chunk(statements, 50)) {
    await db.batch(group);
  }
}

export async function deleteTemplateDocuments(db: D1Database, ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const statements = ids.flatMap((id) => [
    db.prepare('DELETE FROM template_styles WHERE template_document_id = ?').bind(id),
    db.prepare('DELETE FROM template_child_categories WHERE template_document_id = ?').bind(id),
    db.prepare('DELETE FROM template_category_memberships WHERE template_document_id = ?').bind(id),
    db.prepare('DELETE FROM template_documents WHERE id = ?').bind(id),
  ]);

  for (const group of chunk(statements, 50)) {
    await db.batch(group);
  }
}

export async function upsertSlugAliases(db: D1Database, aliases: SlugAliasInput[]): Promise<number> {
  const unique = new Map<string, SlugAliasInput>();
  for (const alias of aliases) {
    const aliasSlug = alias.aliasSlug.trim();
    const canonicalSlug = alias.canonicalSlug.trim();
    if (!aliasSlug || !canonicalSlug || aliasSlug === canonicalSlug) continue;
    unique.set(`${alias.slugType}:${aliasSlug}`, {
      ...alias,
      aliasSlug,
      canonicalSlug,
      note: alias.note?.trim() || null,
    });
  }

  const updatedAt = nowIso();
  const statements = Array.from(unique.values()).map((alias) =>
    db
      .prepare(
        `INSERT INTO slug_aliases (slug_type, alias_slug, canonical_slug, note, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(slug_type, alias_slug) DO UPDATE SET
           canonical_slug = excluded.canonical_slug,
           note = excluded.note,
           updated_at = excluded.updated_at`,
      )
      .bind(alias.slugType, alias.aliasSlug, alias.canonicalSlug, alias.note, updatedAt),
  );

  return runStatementBatches(db, statements);
}

// Bulk-refresh thumbnail and carousel image URLs for all published templates.
// Airtable signed URLs expire in ~2 hours; this is called on the hourly cron so
// URLs in D1 are always fresh enough for the proxy to fetch from Airtable.
export async function refreshTemplateImageUrls(
  db: D1Database,
  records: Array<{ id: string; thumbnailImageUrl: string | null; thumbnailImageSecondaryUrl: string | null; carouselImageUrls: string[] }>,
  syncedAt: string,
  options: { onBatch?: BatchProgress } = {},
): Promise<number> {
  if (records.length === 0) return 0;

  const statements: D1PreparedStatement[] = records.map((record) =>
    db
      .prepare(
        `UPDATE template_documents
         SET thumbnail_image_url = ?,
             thumbnail_image_secondary_url = ?,
             carousel_image_urls_json = ?,
             synced_at = ?
         WHERE id = ?`,
      )
      .bind(
        record.thumbnailImageUrl,
        record.thumbnailImageSecondaryUrl,
        JSON.stringify(record.carouselImageUrls),
        syncedAt,
        record.id,
      ),
  );

  return runStatementBatches(db, statements, options);
}

// Bulk-update thumbnail and carousel URLs sourced from stable Webflow CDN URLs.
// Unlike Airtable signed URLs (which expire in ~2h), Webflow CDN URLs are permanent.
// Keyed by sync-record-id which equals the D1 template id.
export async function updateTemplateImagesFromWebflow(
  db: D1Database,
  records: WebflowTemplateImageRecord[],
  syncedAt: string,
  options: { onBatch?: BatchProgress } = {},
): Promise<number> {
  if (records.length === 0) return 0;

  const statements: D1PreparedStatement[] = [];

  for (const record of records) {
    const carouselImageUrlsJson = JSON.stringify(record.carouselImageUrls);

    if (record.id && record.templateSlug) {
      // Match upsertTemplateDocuments behavior: if another D1 row still owns
      // this canonical Webflow slug, evict it before the stable CMS record wins.
      statements.push(
        db
          .prepare(
            'DELETE FROM template_styles WHERE template_document_id = (SELECT id FROM template_documents WHERE template_slug = ? AND id != ?)',
          )
          .bind(record.templateSlug, record.id),
      );
      statements.push(
        db
          .prepare(
            'DELETE FROM template_child_categories WHERE template_document_id = (SELECT id FROM template_documents WHERE template_slug = ? AND id != ?)',
          )
          .bind(record.templateSlug, record.id),
      );
      statements.push(
        db
          .prepare(
            'DELETE FROM template_category_memberships WHERE template_document_id = (SELECT id FROM template_documents WHERE template_slug = ? AND id != ?)',
          )
          .bind(record.templateSlug, record.id),
      );
      statements.push(db.prepare('DELETE FROM template_documents WHERE template_slug = ? AND id != ?').bind(record.templateSlug, record.id));
    }

    if (record.id) {
      statements.push(
        db
          .prepare(
            `UPDATE template_documents
             SET template_slug = COALESCE(?, template_slug),
                 listing_url = COALESCE(?, listing_url),
                 reviewer_pick_reason = ?,
                 thumbnail_image_url = ?,
                 thumbnail_image_secondary_url = ?,
                 carousel_image_urls_json = ?,
                 synced_at = ?
             WHERE id = ?
               AND (
                 (? IS NOT NULL AND NOT (template_slug IS ?))
                 OR (? IS NOT NULL AND NOT (listing_url IS ?))
                 OR NOT (reviewer_pick_reason IS ?)
                 OR NOT (thumbnail_image_url IS ?)
                 OR NOT (thumbnail_image_secondary_url IS ?)
                 OR NOT (carousel_image_urls_json IS ?)
               )`,
          )
          .bind(
            record.templateSlug,
            record.listingUrl,
            record.reviewerPickReason,
            record.thumbnailImageUrl,
            record.thumbnailImageSecondaryUrl,
            carouselImageUrlsJson,
            syncedAt,
            record.id,
            record.templateSlug,
            record.templateSlug,
            record.listingUrl,
            record.listingUrl,
            record.reviewerPickReason,
            record.thumbnailImageUrl,
            record.thumbnailImageSecondaryUrl,
            carouselImageUrlsJson,
          ),
      );
      pushTemplateOfferUpdateById(db, statements, record, syncedAt);
      continue;
    }

    if (record.name) {
      statements.push(
        db
          .prepare(
            `UPDATE template_documents
             SET template_slug = COALESCE(?, template_slug),
                 listing_url = COALESCE(?, listing_url),
                 reviewer_pick_reason = ?,
                 thumbnail_image_url = ?,
                 thumbnail_image_secondary_url = ?,
                 carousel_image_urls_json = ?,
                 synced_at = ?
             WHERE name = ?
               AND (SELECT COUNT(*) FROM template_documents WHERE name = ?) = 1
               AND (
                 ? IS NULL
                 OR NOT EXISTS (
                   SELECT 1
                   FROM template_documents
                   WHERE template_slug = ?
                     AND name != ?
                 )
               )
               AND (
                 (? IS NOT NULL AND NOT (template_slug IS ?))
                 OR (? IS NOT NULL AND NOT (listing_url IS ?))
                 OR NOT (reviewer_pick_reason IS ?)
                 OR NOT (thumbnail_image_url IS ?)
                 OR NOT (thumbnail_image_secondary_url IS ?)
                 OR NOT (carousel_image_urls_json IS ?)
               )`,
          )
          .bind(
            record.templateSlug,
            record.listingUrl,
            record.reviewerPickReason,
            record.thumbnailImageUrl,
            record.thumbnailImageSecondaryUrl,
            carouselImageUrlsJson,
            syncedAt,
            record.name,
            record.name,
            record.templateSlug,
            record.templateSlug,
            record.name,
            record.templateSlug,
            record.templateSlug,
            record.listingUrl,
            record.listingUrl,
            record.reviewerPickReason,
            record.thumbnailImageUrl,
            record.thumbnailImageSecondaryUrl,
            carouselImageUrlsJson,
          ),
      );
      pushTemplateOfferUpdateByName(db, statements, record, syncedAt);
    }
  }

  return runStatementBatches(db, statements, options);
}

// Bulk-update creator profile URLs and avatar URLs sourced from Webflow CMS.
// Prefer sync-record-id when available, then exact creator name for rows that
// never received the linked creator record.
export async function updateCreatorAvatarsFromWebflow(
  db: D1Database,
  records: WebflowDesignerAvatarRecord[],
  syncedAt: string,
  options: { matchByName?: boolean; forceMatchByName?: boolean; onBatch?: BatchProgress } = {},
): Promise<number> {
  if (records.length === 0) return 0;

  const statements: D1PreparedStatement[] = [];
  const matchByName = options.matchByName !== false;
  const forceMatchByName = options.forceMatchByName === true;

  for (const record of records) {
    const avatarUrl = record.avatarUrl;
    const avatarAlt = avatarUrl ? record.avatarAlt ?? record.name : null;

    if (record.syncRecordId) {
      statements.push(
        db
          .prepare(
            `UPDATE template_documents
             SET creator_avatar_url = CASE
                   WHEN ? IS NOT NULL AND NOT (creator_avatar_url IS ?) THEN ?
                   ELSE creator_avatar_url
                 END,
                 creator_avatar_alt = CASE
                   WHEN ? IS NOT NULL THEN ?
                   ELSE creator_avatar_alt
                 END,
                 creator_slug = CASE
                   WHEN ? IS NOT NULL
                    AND NOT (? LIKE '%-archive'
                      AND creator_slug IS NOT NULL
                      AND creator_slug != ''
                      AND creator_slug NOT LIKE '%-archive')
                     THEN ?
                   ELSE creator_slug
                 END,
                 creator_profile_url = CASE
                   WHEN ? IS NOT NULL
                    AND NOT (? LIKE '%-archive'
                      AND creator_profile_url IS NOT NULL
                      AND creator_profile_url != ''
                      AND creator_profile_url NOT LIKE '%-archive')
                     THEN ?
                   ELSE creator_profile_url
                 END,
                 synced_at = ?
             WHERE creator_record_id = ?
               AND (
                 (? IS NOT NULL AND NOT (creator_avatar_url IS ?))
                 OR (? IS NOT NULL AND NOT (creator_avatar_alt IS ?))
                 OR (? IS NOT NULL AND NOT (creator_slug IS ?))
                 OR (? IS NOT NULL AND NOT (creator_profile_url IS ?))
               )`,
          )
          .bind(
            avatarUrl,
            avatarUrl,
            avatarUrl,
            avatarUrl,
            avatarAlt,
            record.slug,
            record.slug,
            record.slug,
            record.profileUrl,
            record.profileUrl,
            record.profileUrl,
            syncedAt,
            record.syncRecordId,
            avatarUrl,
            avatarUrl,
            avatarUrl,
            avatarAlt,
            record.slug,
            record.slug,
            record.profileUrl,
            record.profileUrl,
          ),
      );
    }

    if (!matchByName) continue;

    if (forceMatchByName) {
      statements.push(
        db
          .prepare(
            `UPDATE template_documents
             SET creator_avatar_url = CASE
                   WHEN ? IS NOT NULL AND NOT (creator_avatar_url IS ?) THEN ?
                   ELSE creator_avatar_url
                 END,
                 creator_avatar_alt = CASE
                   WHEN ? IS NOT NULL THEN ?
                   ELSE creator_avatar_alt
                 END,
                 creator_slug = CASE
                   WHEN ? IS NOT NULL
                    AND NOT (? LIKE '%-archive'
                      AND creator_slug IS NOT NULL
                      AND creator_slug != ''
                      AND creator_slug NOT LIKE '%-archive')
                     THEN ?
                   ELSE creator_slug
                 END,
                 creator_profile_url = CASE
                   WHEN ? IS NOT NULL
                    AND NOT (? LIKE '%-archive'
                      AND creator_profile_url IS NOT NULL
                      AND creator_profile_url != ''
                      AND creator_profile_url NOT LIKE '%-archive')
                     THEN ?
                   ELSE creator_profile_url
                 END,
                 creator_record_id = COALESCE(?, creator_record_id),
                 synced_at = ?
             WHERE creator_name = ?
               AND (
                 (? IS NOT NULL AND NOT (creator_avatar_url IS ?))
                 OR (? IS NOT NULL AND NOT (creator_avatar_alt IS ?))
                 OR (? IS NOT NULL AND NOT (creator_slug IS ?))
                 OR (? IS NOT NULL AND NOT (creator_profile_url IS ?))
                 OR (? IS NOT NULL AND NOT (creator_record_id IS ?))
               )`,
          )
          .bind(
            avatarUrl,
            avatarUrl,
            avatarUrl,
            avatarUrl,
            avatarAlt,
            record.slug,
            record.slug,
            record.slug,
            record.profileUrl,
            record.profileUrl,
            record.profileUrl,
            record.syncRecordId,
            syncedAt,
            record.name,
            avatarUrl,
            avatarUrl,
            avatarUrl,
            avatarAlt,
            record.slug,
            record.slug,
            record.profileUrl,
            record.profileUrl,
            record.syncRecordId,
            record.syncRecordId,
          ),
      );
    } else {
      statements.push(
        db
          .prepare(
            `UPDATE template_documents
             SET creator_avatar_url = CASE
                   WHEN ? IS NOT NULL AND NOT (creator_avatar_url IS ?) THEN ?
                   ELSE creator_avatar_url
                 END,
                 creator_avatar_alt = CASE
                   WHEN ? IS NOT NULL THEN ?
                   ELSE creator_avatar_alt
                 END,
                 creator_slug = CASE
                   WHEN ? IS NOT NULL
                    AND NOT (? LIKE '%-archive'
                      AND creator_slug IS NOT NULL
                      AND creator_slug != ''
                      AND creator_slug NOT LIKE '%-archive')
                     THEN ?
                   ELSE creator_slug
                 END,
                 creator_profile_url = CASE
                   WHEN ? IS NOT NULL
                    AND NOT (? LIKE '%-archive'
                      AND creator_profile_url IS NOT NULL
                      AND creator_profile_url != ''
                      AND creator_profile_url NOT LIKE '%-archive')
                     THEN ?
                   ELSE creator_profile_url
                 END,
                 creator_record_id = COALESCE(NULLIF(creator_record_id, ''), ?),
                 synced_at = ?
             WHERE creator_name = ?
               AND (
                 creator_record_id IS NULL
                 OR creator_record_id = ''
                 OR creator_record_id = ?
                 OR ? IS NULL
               )
               AND (
                 (? IS NOT NULL AND NOT (creator_avatar_url IS ?))
                 OR (? IS NOT NULL AND NOT (creator_avatar_alt IS ?))
                 OR (? IS NOT NULL AND NOT (creator_slug IS ?))
                 OR (? IS NOT NULL AND NOT (creator_profile_url IS ?))
                 OR (? IS NOT NULL AND (creator_record_id IS NULL OR creator_record_id = ''))
               )`,
          )
          .bind(
            avatarUrl,
            avatarUrl,
            avatarUrl,
            avatarUrl,
            avatarAlt,
            record.slug,
            record.slug,
            record.slug,
            record.profileUrl,
            record.profileUrl,
            record.profileUrl,
            record.syncRecordId,
            syncedAt,
            record.name,
            record.syncRecordId,
            record.syncRecordId,
            avatarUrl,
            avatarUrl,
            avatarUrl,
            avatarAlt,
            record.slug,
            record.slug,
            record.profileUrl,
            record.profileUrl,
            record.syncRecordId,
          ),
      );
    }
  }

  return runStatementBatches(db, statements, options);
}

// Some template rows have a creator display name but no linked creator record ID.
// When another row with the same exact creator name has complete creator metadata,
// copy that metadata across. The HAVING guard avoids ambiguous duplicate names.
export async function backfillCreatorFieldsByName(
  db: D1Database,
  syncedAt: string,
  options: { documentIds?: string[] } = {},
): Promise<number> {
  const uniqueDocumentIds = Array.from(new Set((options.documentIds ?? []).filter(Boolean)));
  const scopedDocumentFilter =
    uniqueDocumentIds.length > 0 ? `\n         AND id IN (${placeholderList(uniqueDocumentIds.length)})` : '';
  const result = await db
    .prepare(
      `WITH known_creators AS (
         SELECT
           creator_name,
           MAX(creator_record_id) AS creator_record_id,
           MAX(creator_slug) AS creator_slug,
           MAX(creator_profile_url) AS creator_profile_url,
           MAX(creator_avatar_url) AS creator_avatar_url,
           MAX(creator_avatar_alt) AS creator_avatar_alt
         FROM template_documents
         WHERE creator_name IS NOT NULL
           AND creator_name != ''
           AND creator_record_id IS NOT NULL
           AND creator_record_id != ''
           AND (
             (creator_profile_url IS NOT NULL AND creator_profile_url != '')
             OR (creator_avatar_url IS NOT NULL AND creator_avatar_url != '')
           )
         GROUP BY creator_name
         HAVING COUNT(DISTINCT creator_record_id) = 1
       )
       UPDATE template_documents
       SET creator_record_id = CASE
             WHEN creator_record_id IS NULL OR creator_record_id = ''
               THEN (SELECT known_creators.creator_record_id FROM known_creators WHERE known_creators.creator_name = template_documents.creator_name)
             ELSE creator_record_id
          END,
          creator_slug = CASE
            WHEN creator_slug IS NULL OR creator_slug = ''
              THEN (SELECT known_creators.creator_slug FROM known_creators WHERE known_creators.creator_name = template_documents.creator_name)
            ELSE creator_slug
          END,
          creator_profile_url = CASE
             WHEN creator_profile_url IS NULL OR creator_profile_url = ''
               THEN (SELECT known_creators.creator_profile_url FROM known_creators WHERE known_creators.creator_name = template_documents.creator_name)
             ELSE creator_profile_url
           END,
           creator_avatar_url = CASE
             WHEN creator_avatar_url IS NULL OR creator_avatar_url = ''
               THEN (SELECT known_creators.creator_avatar_url FROM known_creators WHERE known_creators.creator_name = template_documents.creator_name)
             ELSE creator_avatar_url
           END,
           creator_avatar_alt = CASE
             WHEN creator_avatar_alt IS NULL OR creator_avatar_alt = ''
               THEN COALESCE(
                 (SELECT known_creators.creator_avatar_alt FROM known_creators WHERE known_creators.creator_name = template_documents.creator_name),
                 creator_name
               )
             ELSE creator_avatar_alt
           END,
           synced_at = ?
       WHERE creator_name IN (SELECT creator_name FROM known_creators)
         AND (
           creator_record_id IS NULL
           OR creator_record_id = ''
           OR creator_slug IS NULL
           OR creator_slug = ''
           OR creator_profile_url IS NULL
           OR creator_profile_url = ''
           OR creator_avatar_url IS NULL
           OR creator_avatar_url = ''
           OR creator_avatar_alt IS NULL
           OR creator_avatar_alt = ''
         )${scopedDocumentFilter}`,
    )
    .bind(syncedAt, ...uniqueDocumentIds)
    .run();

  return result.meta?.changes ?? 0;
}

// Rows can arrive with only the creator display name when Airtable linked-record
// fields are incomplete. Fill missing creator fields from the current creator
// lookup only when the display name maps to exactly one creator.
export async function backfillCreatorFieldsFromLookup(
  db: D1Database,
  creators: Map<string, CreatorLookupValue>,
  syncedAt: string,
  options: { documentIds?: string[]; onBatch?: BatchProgress } = {},
): Promise<number> {
  if (creators.size === 0) return 0;
  const uniqueDocumentIds = Array.from(new Set((options.documentIds ?? []).filter(Boolean)));
  const scopedDocumentFilter =
    uniqueDocumentIds.length > 0 ? `\n             AND id IN (${placeholderList(uniqueDocumentIds.length)})` : '';

  const creatorsByName = new Map<string, CreatorLookupValue[]>();
  for (const creator of creators.values()) {
    const normalizedName = normalizeCreatorLookupName(creator.name);
    if (!normalizedName) continue;
    const current = creatorsByName.get(normalizedName) ?? [];
    current.push(creator);
    creatorsByName.set(normalizedName, current);
  }

  const statements: D1PreparedStatement[] = [];
  for (const [normalizedName, matchingCreators] of creatorsByName.entries()) {
    if (matchingCreators.length !== 1) continue;
    const creator = matchingCreators[0];
    const creatorSlug = creator.slug || null;
    const profileUrl = creator.profileUrl || (creatorSlug ? `https://webflow.com/templates/designers/${creatorSlug}` : null);
    const avatarAlt = creator.avatarAlt ?? creator.name;
    if (!creator.id && !creatorSlug && !profileUrl && !creator.avatarUrl) continue;

    statements.push(
      db
        .prepare(
          `UPDATE template_documents
           SET creator_record_id = CASE
                 WHEN ? IS NOT NULL AND (creator_record_id IS NULL OR creator_record_id = '') THEN ?
                 ELSE creator_record_id
               END,
               creator_slug = CASE
                 WHEN ? IS NOT NULL AND (creator_slug IS NULL OR creator_slug = '') THEN ?
                 ELSE creator_slug
               END,
               creator_profile_url = CASE
                 WHEN ? IS NOT NULL AND (creator_profile_url IS NULL OR creator_profile_url = '') THEN ?
                 ELSE creator_profile_url
               END,
               creator_avatar_url = CASE
                 WHEN ? IS NOT NULL
                   AND (
                     creator_avatar_url IS NULL
                     OR creator_avatar_url = ''
                     OR creator_avatar_url LIKE '%airtableusercontent.com%'
                     OR creator_avatar_url LIKE '%dl.airtable.com%'
                   )
                   THEN ?
                 ELSE creator_avatar_url
               END,
               creator_avatar_alt = CASE
                 WHEN creator_avatar_alt IS NULL OR creator_avatar_alt = '' THEN ?
                 ELSE creator_avatar_alt
               END,
               synced_at = ?
           WHERE lower(trim(creator_name)) = ?
             AND (
               creator_record_id IS NULL
               OR creator_record_id = ''
               OR creator_slug IS NULL
               OR creator_slug = ''
               OR creator_profile_url IS NULL
               OR creator_profile_url = ''
               OR creator_avatar_url IS NULL
               OR creator_avatar_url = ''
               OR creator_avatar_url LIKE '%airtableusercontent.com%'
               OR creator_avatar_url LIKE '%dl.airtable.com%'
               OR creator_avatar_alt IS NULL
               OR creator_avatar_alt = ''
             )${scopedDocumentFilter}`,
        )
        .bind(
          creator.id,
          creator.id,
          creatorSlug,
          creatorSlug,
          profileUrl,
          profileUrl,
          creator.avatarUrl,
          creator.avatarUrl,
          avatarAlt,
          syncedAt,
          normalizedName,
          ...uniqueDocumentIds,
        ),
    );
  }

  if (statements.length === 0) return 0;

  return runStatementBatches(db, statements, options);
}

// Creator avatar/profile URL updates in Airtable do not bump the template's LMT,
// so incremental sync misses them. This function uses the freshly-loaded creator map
// to patch any template_document whose stored creator fields differ from current values.
export async function backfillCreatorAvatars(
  db: D1Database,
  creators: Map<string, CreatorLookupValue>,
  syncedAt: string,
  options: { overwriteExisting?: boolean; onBatch?: BatchProgress } = {},
): Promise<number> {
  if (creators.size === 0) return 0;

  const statements: D1PreparedStatement[] = [];
  const overwriteExisting = options.overwriteExisting === true;

  for (const [creatorId, creator] of creators) {
    const avatarUrl = creator.avatarUrl;
    const profileUrl = creator.profileUrl || null;
    const creatorSlug = creator.slug || null;
    const avatarAlt = creator.avatarAlt ?? creator.name;

    // Skip creators with no useful data to backfill.
    if (!avatarUrl && !profileUrl && !creatorSlug) continue;

    if (overwriteExisting) {
      statements.push(
        db
          .prepare(
            `UPDATE template_documents
             SET creator_avatar_url = ?,
                 creator_avatar_alt = ?,
                 creator_slug = COALESCE(?, creator_slug),
                 creator_profile_url = ?,
                 synced_at = ?
             WHERE creator_record_id = ?
               AND (
                 NOT (creator_avatar_url IS ?)
                 OR (? IS NOT NULL AND NOT (creator_slug IS ?))
                 OR NOT (creator_profile_url IS ?)
               )`,
          )
          .bind(
            avatarUrl,
            avatarAlt,
            creatorSlug,
            profileUrl,
            syncedAt,
            creatorId,
            avatarUrl,
            creatorSlug,
            creatorSlug,
            profileUrl,
          ),
      );
      continue;
    }

    statements.push(
      db
        .prepare(
          `UPDATE template_documents
           SET creator_avatar_url = CASE
                 WHEN ? IS NOT NULL
                   AND (
                     creator_avatar_url IS NULL
                     OR creator_avatar_url = ''
                     OR creator_avatar_url LIKE '%airtableusercontent.com%'
                     OR creator_avatar_url LIKE '%dl.airtable.com%'
                   )
                   THEN ?
                 ELSE creator_avatar_url
               END,
               creator_avatar_alt = CASE
                 WHEN ? IS NOT NULL
                   AND (
                     creator_avatar_url IS NULL
                     OR creator_avatar_url = ''
                     OR creator_avatar_url LIKE '%airtableusercontent.com%'
                     OR creator_avatar_url LIKE '%dl.airtable.com%'
                   )
                   THEN ?
                 WHEN creator_avatar_alt IS NULL OR creator_avatar_alt = '' THEN ?
                 ELSE creator_avatar_alt
               END,
               creator_slug = CASE
                 WHEN ? IS NOT NULL AND (creator_slug IS NULL OR creator_slug = '') THEN ?
                 ELSE creator_slug
               END,
               creator_profile_url = CASE
                 WHEN ? IS NOT NULL AND (creator_profile_url IS NULL OR creator_profile_url = '') THEN ?
                 ELSE creator_profile_url
               END,
               synced_at = ?
           WHERE creator_record_id = ?
             AND (
               creator_avatar_url IS NULL
               OR creator_avatar_url = ''
               OR creator_avatar_url LIKE '%airtableusercontent.com%'
               OR creator_avatar_url LIKE '%dl.airtable.com%'
               OR creator_avatar_alt IS NULL
               OR creator_avatar_alt = ''
               OR creator_slug IS NULL
               OR creator_slug = ''
               OR creator_profile_url IS NULL
               OR creator_profile_url = ''
             )`,
        )
        .bind(
          avatarUrl,
          avatarUrl,
          avatarUrl,
          avatarAlt,
          avatarAlt,
          creatorSlug,
          creatorSlug,
          profileUrl,
          profileUrl,
          syncedAt,
          creatorId,
        ),
    );
  }

  if (statements.length === 0) return 0;

  return runStatementBatches(db, statements, options);
}

export async function listTemplateImageRefreshRows(
  db: D1Database,
  changedIds: string[] = [],
  options: { includeStale?: boolean } = {},
): Promise<TemplateImageRefreshRow[]> {
  const rowsById = new Map<string, TemplateImageRefreshRow>();
  const uniqueChangedIds = Array.from(new Set(changedIds.filter(Boolean)));

  if (uniqueChangedIds.length > 0) {
    for (const idBatch of chunk(uniqueChangedIds, IMAGE_REFRESH_LOOKUP_BATCH_SIZE)) {
      const changedResult = await db
        .prepare(`${TEMPLATE_IMAGE_REFRESH_SELECT} WHERE id IN (${placeholderList(idBatch.length)})`)
        .bind(...idBatch)
        .all<TemplateImageRefreshRow>();

      for (const row of changedResult.results ?? []) {
        rowsById.set(row.id, row);
      }
    }
  }

  if (options.includeStale === false) {
    return Array.from(rowsById.values());
  }

  const staleResult = await db
    .prepare(
      `${TEMPLATE_IMAGE_REFRESH_SELECT}
       WHERE ${STALE_IMAGE_WHERE}
       ORDER BY is_featured DESC, COALESCE(popularity_score, 0) DESC, COALESCE(source_last_modified_time, '') DESC
       LIMIT ${STALE_IMAGE_REFRESH_LIMIT}`,
    )
    .all<TemplateImageRefreshRow>();

  for (const row of staleResult.results ?? []) {
    if (!rowsById.has(row.id)) rowsById.set(row.id, row);
  }

  return Array.from(rowsById.values());
}

export async function listTemplateImageBackfillRows(
  db: D1Database,
  limit: number,
  templateSlugs: string[] = [],
  options: { now?: string; retryAfterMs?: number; includeStable?: boolean } = {},
): Promise<TemplateImageRefreshRow[]> {
  const uniqueTemplateSlugs = Array.from(new Set(templateSlugs.map((slug) => slug.trim()).filter(Boolean)));
  if (uniqueTemplateSlugs.length > 0) {
    const result = await db
      .prepare(
        `${TEMPLATE_IMAGE_REFRESH_SELECT}
         WHERE template_slug IN (${placeholderList(uniqueTemplateSlugs.length)})
           ${options.includeStable ? '' : `AND (${STALE_IMAGE_WHERE})`}
         ORDER BY is_featured DESC, COALESCE(popularity_score, 0) DESC, COALESCE(source_last_modified_time, '') DESC
         LIMIT ?`,
      )
      .bind(...uniqueTemplateSlugs, limit)
      .all<TemplateImageRefreshRow>();

    return result.results ?? [];
  }

  const result = await db
    .prepare(
      `${TEMPLATE_IMAGE_REFRESH_SELECT}
       LEFT JOIN template_image_backfill_attempts AS image_attempts
         ON image_attempts.template_document_id = template_documents.id
       WHERE ${STALE_IMAGE_WHERE}
       ORDER BY
         CASE
           WHEN image_attempts.last_attempted_at IS NULL THEN 0
           WHEN image_attempts.last_attempted_at <= ? THEN 1
           ELSE 2
         END,
         image_attempts.consecutive_misses ASC,
         is_featured DESC,
         COALESCE(popularity_score, 0) DESC,
         COALESCE(source_last_modified_time, '') DESC
       LIMIT ?`,
    )
    .bind(
      new Date(new Date(options.now ?? nowIso()).getTime() - (options.retryAfterMs ?? IMAGE_BACKFILL_ATTEMPT_RETRY_AFTER_MS)).toISOString(),
      limit,
    )
    .all<TemplateImageRefreshRow>();

  return result.results ?? [];
}

export async function markTemplateImageBackfillAttempts(
  db: D1Database,
  rows: TemplateImageRefreshRow[],
  resolvedIds: string[],
  attemptedAt = nowIso(),
): Promise<void> {
  if (rows.length === 0) return;

  const resolved = new Set(resolvedIds);
  const statements: D1PreparedStatement[] = [];

  for (const row of rows) {
    if (resolved.has(row.id)) {
      statements.push(db.prepare('DELETE FROM template_image_backfill_attempts WHERE template_document_id = ?').bind(row.id));
      continue;
    }

    statements.push(
      db
        .prepare(
          `INSERT INTO template_image_backfill_attempts (template_document_id, last_attempted_at, consecutive_misses)
           VALUES (?, ?, 1)
           ON CONFLICT(template_document_id) DO UPDATE SET
             last_attempted_at = excluded.last_attempted_at,
             consecutive_misses = template_image_backfill_attempts.consecutive_misses + 1`,
        )
        .bind(row.id, attemptedAt),
    );
  }

  for (const group of chunk(statements, 50)) {
    await db.batch(group);
  }
}

export async function updateTemplateDocumentImages(
  db: D1Database,
  updates: TemplateImageUpdateInput[],
  syncedAt = nowIso(),
  options: { onBatch?: BatchProgress } = {},
): Promise<number> {
  if (updates.length === 0) return 0;

  const statements = updates.map((update) =>
    db
      .prepare(
        'UPDATE template_documents SET thumbnail_image_url = ?, thumbnail_image_secondary_url = ?, synced_at = ? WHERE id = ?',
      )
      .bind(update.thumbnailImageUrl, update.thumbnailImageSecondaryUrl, syncedAt, update.id),
  );

  await runStatementBatches(db, statements, options);

  return updates.length;
}

export async function templateImageSourceStats(db: D1Database): Promise<TemplateImageSourceStats> {
  const row = await db
    .prepare(
      `SELECT
        COUNT(*) AS total_rows,
        SUM(CASE WHEN thumbnail_image_url IS NOT NULL OR thumbnail_image_secondary_url IS NOT NULL THEN 1 ELSE 0 END) AS rows_with_image,
        SUM(CASE
          WHEN COALESCE(thumbnail_image_url, '') LIKE '%website-files.com%'
            OR COALESCE(thumbnail_image_secondary_url, '') LIKE '%website-files.com%'
            OR COALESCE(thumbnail_image_url, '') LIKE '%uploads-ssl.webflow.com%'
            OR COALESCE(thumbnail_image_secondary_url, '') LIKE '%uploads-ssl.webflow.com%'
          THEN 1 ELSE 0
        END) AS rows_with_webflow_image,
        SUM(CASE WHEN ${TEMP_ATTACHMENT_IMAGE_WHERE} THEN 1 ELSE 0 END) AS rows_with_temp_airtable_image,
        SUM(CASE WHEN thumbnail_image_url IS NULL AND thumbnail_image_secondary_url IS NULL THEN 1 ELSE 0 END) AS rows_missing_image
       FROM template_documents`,
    )
    .first<TemplateImageSourceStats>();

  return {
    total_rows: Number(row?.total_rows ?? 0),
    rows_with_image: Number(row?.rows_with_image ?? 0),
    rows_with_webflow_image: Number(row?.rows_with_webflow_image ?? 0),
    rows_with_temp_airtable_image: Number(row?.rows_with_temp_airtable_image ?? 0),
    rows_missing_image: Number(row?.rows_missing_image ?? 0),
  };
}

export async function getSyncCursor(db: D1Database, key = 'airtable_last_modified_cursor'): Promise<string | null> {
  const row = await db.prepare('SELECT value_json FROM sync_state WHERE key = ?').bind(key).first<{ value_json: string }>();
  if (!row?.value_json) return null;
  try {
    const parsed = JSON.parse(row.value_json) as { cursor?: string };
    return parsed.cursor ?? null;
  } catch {
    return null;
  }
}

export async function setSyncCursor(db: D1Database, cursor: string, key = 'airtable_last_modified_cursor'): Promise<void> {
  await db
    .prepare(
      'INSERT INTO sync_state (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at',
    )
    .bind(key, JSON.stringify({ cursor }), nowIso())
    .run();
}

export async function getPublicSearchCacheVersion(db: D1Database, fallback: string): Promise<string> {
  const row = await db.prepare('SELECT value_json FROM sync_state WHERE key = ?').bind('public_search_cache_version').first<{ value_json: string }>();
  if (!row?.value_json) return fallback;

  const parsed = parseJson(row.value_json);
  if (!parsed || typeof parsed !== 'object') return fallback;
  const version = (parsed as { version?: unknown }).version;
  return typeof version === 'string' && version.trim().length > 0 ? version : fallback;
}

export async function bumpPublicSearchCacheVersion(db: D1Database, reason: string): Promise<string> {
  const updatedAt = nowIso();
  const version = `${updatedAt}:${reason}`;
  await db
    .prepare(
      'INSERT INTO sync_state (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at',
    )
    .bind('public_search_cache_version', JSON.stringify({ version, reason }), updatedAt)
    .run();
  return version;
}

function isSourceNewer(nextSourceLastModifiedTime: string | null | undefined, currentSourceLastModifiedTime: string | null): boolean {
  if (!nextSourceLastModifiedTime) return false;
  if (!currentSourceLastModifiedTime) return true;
  const nextTime = Date.parse(nextSourceLastModifiedTime);
  const currentTime = Date.parse(currentSourceLastModifiedTime);
  if (!Number.isFinite(nextTime) || !Number.isFinite(currentTime)) return nextSourceLastModifiedTime > currentSourceLastModifiedTime;
  return nextTime > currentTime;
}

export async function filterMissingOrStaleTemplateLookupTargets(
  db: D1Database,
  targets: TemplateLookupTarget[],
): Promise<TemplateLookupTarget[]> {
  const uniqueTargets = Array.from(
    new Map(targets.filter((target) => target.id || target.templateSlug).map((target) => [target.id, target])).values(),
  );
  if (uniqueTargets.length === 0) return [];

  const rows: Array<{ id: string; templateSlug: string | null; sourceLastModifiedTime: string | null }> = [];
  for (const targetBatch of chunk(uniqueTargets, TEMPLATE_LOOKUP_QUERY_BATCH_SIZE)) {
    const ids = targetBatch.map((target) => target.id).filter(Boolean);
    const slugs = targetBatch.map((target) => target.templateSlug).filter((slug): slug is string => Boolean(slug));
    const clauses: string[] = [];
    const binds: string[] = [];
    if (ids.length > 0) {
      clauses.push(`id IN (${placeholderList(ids.length)})`);
      binds.push(...ids);
    }
    if (slugs.length > 0) {
      clauses.push(`template_slug IN (${placeholderList(slugs.length)})`);
      binds.push(...slugs);
    }
    if (clauses.length === 0) continue;

    const result = await db
      .prepare(
        `SELECT id, template_slug AS templateSlug, source_last_modified_time AS sourceLastModifiedTime
         FROM template_documents
         WHERE ${clauses.join(' OR ')}`,
      )
      .bind(...binds)
      .all<{ id: string; templateSlug: string | null; sourceLastModifiedTime: string | null }>();
    rows.push(...(result.results ?? []));
  }
  const existingById = new Map(rows.map((row) => [row.id, row]));
  const existingBySlug = new Map(rows.filter((row) => row.templateSlug).map((row) => [row.templateSlug, row]));

  return uniqueTargets.filter((target) => {
    const existing = existingById.get(target.id) ?? (target.templateSlug ? existingBySlug.get(target.templateSlug) : undefined);
    if (!existing) return true;
    return isSourceNewer(target.sourceLastModifiedTime, existing.sourceLastModifiedTime);
  });
}

export async function recordSyncSummary(db: D1Database, summary: unknown, key: string): Promise<void> {
  await db
    .prepare(
      'INSERT INTO sync_state (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at',
    )
    .bind(key, JSON.stringify(summary), nowIso())
    .run();

  const mode = getSummaryMode(summary);
  if (mode) await clearSyncErrorForMode(db, mode);
}

async function clearSyncErrorForMode(db: D1Database, mode: string): Promise<void> {
  const row = await db
    .prepare('SELECT value_json FROM sync_state WHERE key = ?')
    .bind('last_sync_error')
    .first<{ value_json: string }>();
  const errorMode = getSummaryMode(parseJson(row?.value_json ?? null));
  if (errorMode && errorMode !== mode) return;

  await db.prepare('DELETE FROM sync_state WHERE key = ?').bind('last_sync_error').run();
}

export async function getSyncStateRecords(db: D1Database, keys: string[]): Promise<SyncStateRecord[]> {
  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));
  if (uniqueKeys.length === 0) return [];

  const result = await db
    .prepare(
      `SELECT key, value_json, updated_at
       FROM sync_state
       WHERE key IN (${placeholderList(uniqueKeys.length)})
       ORDER BY key`,
    )
    .bind(...uniqueKeys)
    .all<SyncStateRecord>();

  return result.results ?? [];
}

export function publicSyncStateRecord(record: SyncStateRecord) {
  return {
    key: record.key,
    updated_at: record.updated_at,
    value: parseJson(record.value_json),
  };
}

export async function resolveAlias(db: D1Database, slugType: AliasType, input: string | null): Promise<string | null> {
  if (!input) return null;
  const row = await db
    .prepare('SELECT canonical_slug FROM slug_aliases WHERE slug_type = ? AND alias_slug = ?')
    .bind(slugType, input)
    .first<{ canonical_slug: string }>();
  return row?.canonical_slug ?? input;
}

export async function lookupPublicSlugMap(
  db: D1Database,
  slugType: AliasType,
  canonicalSlugs: string[],
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(canonicalSlugs.filter(Boolean)));
  if (unique.length === 0) return {};

  const result = await db
    .prepare(
      `SELECT canonical_slug, alias_slug
       FROM slug_aliases
       WHERE slug_type = ?
         AND canonical_slug IN (${placeholderList(unique.length)})
       ORDER BY canonical_slug, alias_slug`,
    )
    .bind(slugType, ...unique)
    .all<{ canonical_slug: string; alias_slug: string }>();

  const map: Record<string, string> = {};
  for (const row of result.results ?? []) {
    if (!map[row.canonical_slug]) {
      map[row.canonical_slug] = row.alias_slug;
    }
  }
  return map;
}

export async function healthCounts(db: D1Database): Promise<{ documents: number; fts_rows: number; aliases: number }> {
  const [documents, ftsRows, aliases] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS total FROM template_documents').first<DocumentCountRow>(),
    db.prepare('SELECT COUNT(*) AS total FROM template_documents_fts').first<DocumentCountRow>(),
    db.prepare('SELECT COUNT(*) AS total FROM slug_aliases').first<DocumentCountRow>(),
  ]);

  return {
    documents: Number(documents?.total ?? 0),
    fts_rows: Number(ftsRows?.total ?? 0),
    aliases: Number(aliases?.total ?? 0),
  };
}
