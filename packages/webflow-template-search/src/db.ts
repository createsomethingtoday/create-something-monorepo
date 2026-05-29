import type {
  AliasType,
  ChildCategoryTaxonomyInput,
  DocumentCountRow,
  TaxonomyMetadataInput,
  TaxonomyMetadataItem,
  TaxonomyMetadataType,
  TemplateDocumentInput,
} from './types.js';
import { chunk, nowIso } from './utils.js';

export interface TemplateImagePatch {
  templateSlug: string;
  thumbnailImageUrl: string | null;
  thumbnailImageSecondaryUrl: string | null;
}

const UPSERT_TEMPLATE_SQL = `
  INSERT INTO template_documents (
    id,
    template_slug,
    name,
    listing_url,
    preview_url,
    website_url,
    creator_name,
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
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
  ON CONFLICT(id) DO UPDATE SET
    template_slug = excluded.template_slug,
    name = excluded.name,
    listing_url = excluded.listing_url,
    preview_url = excluded.preview_url,
    website_url = excluded.website_url,
    creator_name = excluded.creator_name,
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
  await ensureChildCategoryTaxonomySchema(db);
  await ensureTaxonomyMetadataSchema(db);
  await db.exec(`
    DELETE FROM template_styles;
    DELETE FROM template_child_categories;
    DELETE FROM child_category_taxonomy;
    DELETE FROM taxonomy_metadata;
    DELETE FROM template_documents;
  `);
}

export async function updateTemplateImagesBySlug(
  db: D1Database,
  patches: TemplateImagePatch[],
  syncedAt: string = nowIso(),
): Promise<number> {
  const filtered = patches.filter((patch) => patch.templateSlug && (patch.thumbnailImageUrl || patch.thumbnailImageSecondaryUrl));
  if (filtered.length === 0) return 0;

  let updated = 0;
  for (const group of chunk(filtered, 50)) {
    const matched = await db
      .prepare(`SELECT COUNT(*) AS total FROM template_documents WHERE template_slug IN (${placeholderList(group.length)})`)
      .bind(...group.map((patch) => patch.templateSlug))
      .first<{ total: number }>();

    await db.batch(
      group.map((patch) =>
        db
          .prepare(
            `
            UPDATE template_documents
            SET
              thumbnail_image_url = COALESCE(?, thumbnail_image_url),
              thumbnail_image_secondary_url = COALESCE(?, thumbnail_image_secondary_url),
              synced_at = ?
            WHERE template_slug = ?
          `,
          )
          .bind(patch.thumbnailImageUrl, patch.thumbnailImageSecondaryUrl, syncedAt, patch.templateSlug),
      ),
    );
    updated += matched?.total ?? 0;
  }

  return updated;
}

export async function ensureChildCategoryTaxonomySchema(db: D1Database): Promise<void> {
  await db
    .prepare(
      `
      CREATE TABLE IF NOT EXISTS child_category_taxonomy (
        child_category_slug TEXT NOT NULL,
        child_category_name TEXT NOT NULL,
        category_group_slug TEXT NOT NULL,
        category_group_name TEXT NOT NULL,
        PRIMARY KEY (child_category_slug, category_group_slug)
      )
    `,
    )
    .run();

  await db
    .prepare(
      `
      CREATE INDEX IF NOT EXISTS idx_child_category_taxonomy_group
        ON child_category_taxonomy (category_group_slug, child_category_slug)
    `,
    )
    .run();
}

async function ensureTextColumn(db: D1Database, tableName: string, columnName: string): Promise<void> {
  const existing = await db.prepare(`PRAGMA table_info(${tableName})`).all<{ name: string }>();
  if ((existing.results ?? []).some((row) => row.name === columnName)) return;
  await db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} TEXT NOT NULL DEFAULT ''`).run();
}

export async function upsertChildCategoryTaxonomy(db: D1Database, taxonomy: ChildCategoryTaxonomyInput[]): Promise<void> {
  await ensureChildCategoryTaxonomySchema(db);
  if (taxonomy.length === 0) return;

  const statements = [
    db.prepare('DELETE FROM child_category_taxonomy'),
    ...taxonomy.map((entry) =>
      db
        .prepare(
          `
          INSERT OR REPLACE INTO child_category_taxonomy (
            child_category_slug,
            child_category_name,
            category_group_slug,
            category_group_name
          ) VALUES (?, ?, ?, ?)
        `,
        )
        .bind(
          entry.childCategorySlug,
          entry.childCategoryName,
          entry.categoryGroupSlug,
          entry.categoryGroupName,
        ),
    ),
  ];

  for (const group of chunk(statements, 50)) {
    await db.batch(group);
  }
}

export async function ensureTaxonomyMetadataSchema(db: D1Database): Promise<void> {
  await db
    .prepare(
      `
      CREATE TABLE IF NOT EXISTS taxonomy_metadata (
        taxonomy_type TEXT NOT NULL,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        description_short TEXT NOT NULL DEFAULT '',
        description_landing_page TEXT NOT NULL DEFAULT '',
        related_keywords_json TEXT NOT NULL DEFAULT '[]',
        parent_category_group_slug TEXT,
        parent_category_group_name TEXT,
        synced_at TEXT NOT NULL,
        PRIMARY KEY (taxonomy_type, slug)
      )
    `,
    )
    .run();

  await ensureTextColumn(db, 'taxonomy_metadata', 'description_landing_page');

  await db
    .prepare(
      `
      CREATE INDEX IF NOT EXISTS idx_taxonomy_metadata_parent
        ON taxonomy_metadata (taxonomy_type, parent_category_group_slug)
    `,
    )
    .run();
}

export async function upsertTaxonomyMetadata(db: D1Database, metadata: TaxonomyMetadataInput[]): Promise<void> {
  await ensureTaxonomyMetadataSchema(db);
  if (metadata.length === 0) return;

  const statements = [
    db.prepare('DELETE FROM taxonomy_metadata'),
    ...metadata.map((entry) =>
      db
        .prepare(
          `
          INSERT OR REPLACE INTO taxonomy_metadata (
            taxonomy_type,
            slug,
            name,
            description_short,
            description_landing_page,
            related_keywords_json,
            parent_category_group_slug,
            parent_category_group_name,
            synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        )
        .bind(
          entry.taxonomyType,
          entry.slug,
          entry.name,
          entry.descriptionShort,
          entry.descriptionLandingPage,
          JSON.stringify(entry.relatedKeywords),
          entry.parentCategoryGroupSlug,
          entry.parentCategoryGroupName,
          entry.syncedAt,
        ),
    ),
  ];

  for (const group of chunk(statements, 50)) {
    await db.batch(group);
  }
}

function toTaxonomyMetadataItem(row: {
  taxonomy_type: TaxonomyMetadataType;
  slug: string;
  name: string;
  description_short: string;
  description_landing_page: string;
  related_keywords_json: string;
  parent_category_group_slug: string | null;
  parent_category_group_name: string | null;
}): TaxonomyMetadataItem {
  let relatedKeywords: string[] = [];
  try {
    const parsed = JSON.parse(row.related_keywords_json) as unknown;
    if (Array.isArray(parsed)) {
      relatedKeywords = parsed.filter((value): value is string => typeof value === 'string');
    }
  } catch {
    relatedKeywords = [];
  }

  return {
    type: row.taxonomy_type,
    slug: row.slug,
    name: row.name,
    description_short: row.description_short,
    description_landing_page: row.description_landing_page,
    related_keywords: relatedKeywords,
    parent_category_group_slug: row.parent_category_group_slug,
    parent_category_group_name: row.parent_category_group_name,
  };
}

export async function getTaxonomyMetadata(
  db: D1Database,
  taxonomyType: TaxonomyMetadataType,
  slug: string | null,
): Promise<TaxonomyMetadataItem | null> {
  if (!slug) return null;
  await ensureTaxonomyMetadataSchema(db);

  const row = await db
    .prepare(
      `
      SELECT
        taxonomy_type,
        slug,
        name,
        description_short,
        description_landing_page,
        related_keywords_json,
        parent_category_group_slug,
        parent_category_group_name
      FROM taxonomy_metadata
      WHERE taxonomy_type = ?
        AND slug = ?
    `,
    )
    .bind(taxonomyType, slug)
    .first<{
      taxonomy_type: TaxonomyMetadataType;
      slug: string;
      name: string;
      description_short: string;
      description_landing_page: string;
      related_keywords_json: string;
      parent_category_group_slug: string | null;
      parent_category_group_name: string | null;
    }>();

  return row ? toTaxonomyMetadataItem(row) : null;
}

export async function upsertTemplateDocuments(db: D1Database, documents: TemplateDocumentInput[]): Promise<void> {
  const statements: D1PreparedStatement[] = [];

  for (const document of documents) {
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
