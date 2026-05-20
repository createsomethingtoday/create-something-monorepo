import type { AliasType, CreatorLookupValue, DocumentCountRow, TemplateDocumentInput, TemplateImageSourceStats } from './types.js';
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

const STALE_IMAGE_REFRESH_LIMIT = 24;

const UPSERT_TEMPLATE_SQL = `
  INSERT INTO template_documents (
    id,
    template_slug,
    name,
    listing_url,
    preview_url,
    website_url,
    creator_name,
    creator_record_id,
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
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
  ON CONFLICT(id) DO UPDATE SET
    template_slug = excluded.template_slug,
    name = excluded.name,
    listing_url = excluded.listing_url,
    preview_url = excluded.preview_url,
    website_url = excluded.website_url,
    creator_name = excluded.creator_name,
    creator_record_id = excluded.creator_record_id,
    creator_profile_url = excluded.creator_profile_url,
    creator_avatar_url = excluded.creator_avatar_url,
    creator_avatar_alt = excluded.creator_avatar_alt,
    thumbnail_image_url = excluded.thumbnail_image_url,
    thumbnail_image_secondary_url = excluded.thumbnail_image_secondary_url,
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

export async function clearIndex(db: D1Database): Promise<void> {
  // Delete in chunks to avoid D1's per-statement CPU time limit on large tables.
  for (const table of ['template_styles', 'template_child_categories', 'template_documents'] as const) {
    let hasMore = true;
    while (hasMore) {
      const result = await db.prepare(`DELETE FROM ${table} WHERE rowid IN (SELECT rowid FROM ${table} LIMIT 1000)`).run();
      hasMore = (result.meta?.changes ?? 0) > 0;
    }
  }
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
      db.prepare('DELETE FROM template_documents WHERE template_slug = ? AND id != ?').bind(document.templateSlug, document.id),
    );
    statements.push(db.prepare('DELETE FROM template_styles WHERE template_document_id = ?').bind(document.id));
    statements.push(db.prepare('DELETE FROM template_child_categories WHERE template_document_id = ?').bind(document.id));
    statements.push(
      db.prepare(UPSERT_TEMPLATE_SQL).bind(
        document.id,
        document.templateSlug,
        document.name,
        document.listingUrl,
        document.previewUrl,
        document.websiteUrl,
        document.creatorName,
        document.creatorRecordId,
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
    db.prepare('DELETE FROM template_documents WHERE id = ?').bind(id),
  ]);

  for (const group of chunk(statements, 50)) {
    await db.batch(group);
  }
}

// Bulk-refresh thumbnail and carousel image URLs for all published templates.
// Airtable signed URLs expire in ~2 hours; this is called on the hourly cron so
// URLs in D1 are always fresh enough for the proxy to fetch from Airtable.
export async function refreshTemplateImageUrls(
  db: D1Database,
  records: Array<{ id: string; thumbnailImageUrl: string | null; thumbnailImageSecondaryUrl: string | null; carouselImageUrls: string[] }>,
  syncedAt: string,
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

  let totalChanges = 0;
  for (const group of chunk(statements, 50)) {
    const results = await db.batch(group);
    for (const result of results) {
      totalChanges += result.meta?.changes ?? 0;
    }
  }

  return totalChanges;
}

// Bulk-update thumbnail and carousel URLs sourced from stable Webflow CDN URLs.
// Unlike Airtable signed URLs (which expire in ~2h), Webflow CDN URLs are permanent.
// Keyed by sync-record-id which equals the D1 template id.
export async function updateTemplateImagesFromWebflow(
  db: D1Database,
  records: WebflowTemplateImageRecord[],
  syncedAt: string,
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

  let totalChanges = 0;
  for (const group of chunk(statements, 50)) {
    const results = await db.batch(group);
    for (const result of results) {
      totalChanges += result.meta?.changes ?? 0;
    }
  }

  return totalChanges;
}

// Bulk-update creator avatar URLs sourced from stable Webflow CDN URLs.
// Prefer sync-record-id when available, then exact creator name for rows that
// never received the linked creator record.
export async function updateCreatorAvatarsFromWebflow(
  db: D1Database,
  records: WebflowDesignerAvatarRecord[],
  syncedAt: string,
): Promise<number> {
  if (records.length === 0) return 0;

  const statements: D1PreparedStatement[] = [];

  for (const record of records) {
    if (record.syncRecordId) {
      statements.push(
        db
          .prepare(
            `UPDATE template_documents
             SET creator_avatar_url = ?,
                 creator_avatar_alt = ?,
                 creator_profile_url = COALESCE(NULLIF(creator_profile_url, ''), ?),
                 synced_at = ?
             WHERE creator_record_id = ?`,
          )
          .bind(record.avatarUrl, record.avatarAlt ?? record.name, record.profileUrl, syncedAt, record.syncRecordId),
      );
    }

    statements.push(
      db
        .prepare(
          `UPDATE template_documents
           SET creator_avatar_url = ?,
               creator_avatar_alt = ?,
               creator_profile_url = COALESCE(NULLIF(creator_profile_url, ''), ?),
               creator_record_id = COALESCE(NULLIF(creator_record_id, ''), ?),
               synced_at = ?
           WHERE creator_name = ?
             AND (
               creator_record_id IS NULL
               OR creator_record_id = ''
               OR creator_record_id = ?
               OR ? IS NULL
             )`,
        )
        .bind(
          record.avatarUrl,
          record.avatarAlt ?? record.name,
          record.profileUrl,
          record.syncRecordId,
          syncedAt,
          record.name,
          record.syncRecordId,
          record.syncRecordId,
        ),
    );
  }

  let totalChanges = 0;
  for (const group of chunk(statements, 50)) {
    const results = await db.batch(group);
    for (const result of results) {
      totalChanges += result.meta?.changes ?? 0;
    }
  }

  return totalChanges;
}

// Some template rows have a creator display name but no linked creator record ID.
// When another row with the same exact creator name has complete creator metadata,
// copy that metadata across. The HAVING guard avoids ambiguous duplicate names.
export async function backfillCreatorFieldsByName(db: D1Database, syncedAt: string): Promise<number> {
  const result = await db
    .prepare(
      `WITH known_creators AS (
         SELECT
           creator_name,
           MAX(creator_record_id) AS creator_record_id,
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
           OR creator_profile_url IS NULL
           OR creator_profile_url = ''
           OR creator_avatar_url IS NULL
           OR creator_avatar_url = ''
           OR creator_avatar_alt IS NULL
           OR creator_avatar_alt = ''
         )`,
    )
    .bind(syncedAt)
    .run();

  return result.meta?.changes ?? 0;
}

// Creator avatar/profile URL updates in Airtable do not bump the template's LMT,
// so incremental sync misses them. This function uses the freshly-loaded creator map
// to patch any template_document whose stored creator fields differ from current values.
export async function backfillCreatorAvatars(
  db: D1Database,
  creators: Map<string, CreatorLookupValue>,
  syncedAt: string,
): Promise<number> {
  if (creators.size === 0) return 0;

  const statements: D1PreparedStatement[] = [];

  for (const [creatorId, creator] of creators) {
    const avatarUrl = creator.avatarUrl;
    const profileUrl = creator.profileUrl || null;
    const avatarAlt = creator.avatarAlt ?? creator.name;

    // Skip creators with no useful data to backfill.
    if (!avatarUrl && !profileUrl) continue;

    statements.push(
      db
        .prepare(
          `UPDATE template_documents
           SET creator_avatar_url = ?,
               creator_avatar_alt = ?,
               creator_profile_url = ?,
               synced_at = ?
           WHERE creator_record_id = ?
             AND (
               NOT (creator_avatar_url IS ?)
               OR NOT (creator_profile_url IS ?)
             )`,
        )
        .bind(avatarUrl, avatarAlt, profileUrl, syncedAt, creatorId, avatarUrl, profileUrl),
    );
  }

  if (statements.length === 0) return 0;

  let totalChanges = 0;
  for (const group of chunk(statements, 50)) {
    const results = await db.batch(group);
    for (const result of results) {
      totalChanges += result.meta?.changes ?? 0;
    }
  }

  return totalChanges;
}

export async function listTemplateImageRefreshRows(
  db: D1Database,
  changedIds: string[] = [],
): Promise<TemplateImageRefreshRow[]> {
  const rowsById = new Map<string, TemplateImageRefreshRow>();
  const uniqueChangedIds = Array.from(new Set(changedIds.filter(Boolean)));

  if (uniqueChangedIds.length > 0) {
    const changedResult = await db
      .prepare(`${TEMPLATE_IMAGE_REFRESH_SELECT} WHERE id IN (${placeholderList(uniqueChangedIds.length)})`)
      .bind(...uniqueChangedIds)
      .all<TemplateImageRefreshRow>();

    for (const row of changedResult.results ?? []) {
      rowsById.set(row.id, row);
    }
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

export async function listTemplateImageBackfillRows(db: D1Database, limit: number): Promise<TemplateImageRefreshRow[]> {
  const result = await db
    .prepare(
      `${TEMPLATE_IMAGE_REFRESH_SELECT}
       WHERE ${TEMP_ATTACHMENT_IMAGE_WHERE}
       ORDER BY is_featured DESC, COALESCE(popularity_score, 0) DESC, COALESCE(source_last_modified_time, '') DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all<TemplateImageRefreshRow>();

  return result.results ?? [];
}

export async function updateTemplateDocumentImages(
  db: D1Database,
  updates: TemplateImageUpdateInput[],
  syncedAt = nowIso(),
): Promise<number> {
  if (updates.length === 0) return 0;

  const statements = updates.map((update) =>
    db
      .prepare(
        'UPDATE template_documents SET thumbnail_image_url = ?, thumbnail_image_secondary_url = ?, synced_at = ? WHERE id = ?',
      )
      .bind(update.thumbnailImageUrl, update.thumbnailImageSecondaryUrl, syncedAt, update.id),
  );

  for (const group of chunk(statements, 50)) {
    await db.batch(group);
  }

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

export async function recordSyncSummary(db: D1Database, summary: unknown, key: string): Promise<void> {
  await db
    .prepare(
      'INSERT INTO sync_state (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at',
    )
    .bind(key, JSON.stringify(summary), nowIso())
    .run();
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
