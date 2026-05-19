import { lookupPublicSlugMap, resolveAlias } from './db.js';
import type {
  DocumentCountRow,
  DocumentRow,
  Env,
  FacetStyleRow,
  FacetTypeRow,
  PillRow,
  SearchItem,
  SearchParams,
  SearchResponsePayload,
  TemplateSort,
} from './types.js';
import { parseJsonArray } from './utils.js';

function placeholderList(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

function buildFtsQuery(input: string): string {
  const tokens = input.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  if (tokens.length === 0) return '""';
  return tokens.map((token) => `${token}*`).join(' AND ');
}

function sortClause(sort: TemplateSort): string {
  switch (sort) {
    case 'newest':
      return "COALESCE(d.published_date, '') DESC, COALESCE(d.popularity_score, 0) DESC, d.id ASC";
    case 'price_asc':
      return "CASE WHEN d.price IS NULL THEN 1 ELSE 0 END ASC, COALESCE(d.price, 0) ASC, COALESCE(d.popularity_score, 0) DESC, d.id ASC";
    case 'price_desc':
      return "CASE WHEN d.price IS NULL THEN 1 ELSE 0 END ASC, COALESCE(d.price, 0) DESC, COALESCE(d.popularity_score, 0) DESC, d.id ASC";
    default:
      return "COALESCE(d.popularity_score, 0) DESC, COALESCE(d.cumulative_purchases, 0) DESC, COALESCE(d.unique_viewers, 0) DESC, COALESCE(d.published_date, '') DESC, d.id ASC";
  }
}

interface FilterOptions {
  excludeStyles?: boolean;
  excludeTypes?: boolean;
  excludeChildCategory?: boolean;
}

interface SqlParts {
  fromClause: string;
  whereClause: string;
  binds: unknown[];
  queryMode: boolean;
}

async function resolveAliases(env: Env, params: SearchParams): Promise<SearchParams> {
  return {
    ...params,
    childCategorySlug: await resolveAlias(env.DB, 'child_category', params.childCategorySlug),
  };
}

function buildSqlParts(params: SearchParams, options: FilterOptions = {}): SqlParts {
  const binds: unknown[] = [];
  const clauses: string[] = [];
  let fromClause = 'FROM template_documents d';
  let queryMode = false;

  if (params.q) {
    fromClause += ' JOIN template_documents_fts ON template_documents_fts.template_document_id = d.id';
    clauses.push('template_documents_fts MATCH ?');
    binds.push(buildFtsQuery(params.q));
    queryMode = true;
  }

  if (params.scope === 'featured') clauses.push('d.is_featured = 1');
  if (params.scope === 'free') clauses.push('d.is_free = 1');
  if (params.scope === 'landing_pages') clauses.push('d.is_landing_page = 1');
  if (params.freeOnly) clauses.push('d.is_free = 1');

  if (params.categoryGroupSlug) {
    clauses.push('EXISTS (SELECT 1 FROM json_each(d.category_group_slugs_json) WHERE json_each.value = ?)');
    binds.push(params.categoryGroupSlug);
  }

  if (params.childCategorySlug && !options.excludeChildCategory) {
    clauses.push(
      'EXISTS (SELECT 1 FROM template_child_categories tcc WHERE tcc.template_document_id = d.id AND tcc.child_category_slug = ?)',
    );
    binds.push(params.childCategorySlug);
  }

  if (!options.excludeStyles && params.styles.length > 0) {
    clauses.push(
      `EXISTS (SELECT 1 FROM template_styles ts WHERE ts.template_document_id = d.id AND ts.style_slug IN (${placeholderList(params.styles.length)}))`,
    );
    binds.push(...params.styles);
  }

  if (!options.excludeTypes && params.types.length > 0) {
    clauses.push(`d.template_type IN (${placeholderList(params.types.length)})`);
    binds.push(...params.types);
  }

  return {
    fromClause,
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    binds,
    queryMode,
  };
}

function queryOrderClause(params: SearchParams, queryMode: boolean): string {
  return queryMode ? `text_rank ASC, ${sortClause(params.sort)}` : sortClause(params.sort);
}

async function getTotalCount(db: D1Database, sqlParts: SqlParts): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS total ${sqlParts.fromClause} ${sqlParts.whereClause}`)
    .bind(...sqlParts.binds)
    .first<DocumentCountRow>();
  return Number(row?.total ?? 0);
}

async function resolveCategoryGroupSlugForChild(env: Env, childCategorySlug: string): Promise<string | null> {
  const row = await env.DB
    .prepare(`
      SELECT json_each.value AS slug, COUNT(*) AS total
      FROM template_documents d, json_each(d.category_group_slugs_json)
      WHERE EXISTS (
        SELECT 1
        FROM template_child_categories tcc
        WHERE tcc.template_document_id = d.id
          AND tcc.child_category_slug = ?
      )
      GROUP BY json_each.value
      ORDER BY total DESC, json_each.value ASC
      LIMIT 1
    `)
    .bind(childCategorySlug)
    .first<{ slug: string }>();

  return row?.slug ?? null;
}

async function loadFacetStyles(env: Env, params: SearchParams): Promise<FacetStyleRow[]> {
  const sqlParts = buildSqlParts(params, { excludeStyles: true, excludeTypes: true });
  const result = await env.DB
    .prepare(`
      WITH filtered AS (
        SELECT d.id
        ${sqlParts.fromClause}
        ${sqlParts.whereClause}
      )
      SELECT ts.style_name AS name, ts.style_slug AS slug, COUNT(DISTINCT ts.template_document_id) AS count
      FROM filtered
      JOIN template_styles ts ON ts.template_document_id = filtered.id
      GROUP BY ts.style_slug, ts.style_name
      ORDER BY ts.style_name ASC
    `)
    .bind(...sqlParts.binds)
    .all<FacetStyleRow>();
  return result.results ?? [];
}

async function loadFacetTypes(env: Env, params: SearchParams): Promise<FacetTypeRow[]> {
  const sqlParts = buildSqlParts(params, { excludeStyles: true, excludeTypes: true });
  const result = await env.DB
    .prepare(`
      SELECT d.template_type AS value, COUNT(*) AS count
      ${sqlParts.fromClause}
      ${sqlParts.whereClause}
      GROUP BY d.template_type
      HAVING d.template_type IS NOT NULL
      ORDER BY d.template_type ASC
    `)
    .bind(...sqlParts.binds)
    .all<FacetTypeRow>();
  return result.results ?? [];
}

async function loadSubcategoryPills(env: Env, params: SearchParams): Promise<Array<{ name: string; slug: string; count: number }>> {
  const groupSlug =
    params.categoryGroupSlug ?? (params.childCategorySlug ? await resolveCategoryGroupSlugForChild(env, params.childCategorySlug) : null);
  if (!groupSlug) return [];

  const scopedParams: SearchParams = {
    ...params,
    categoryGroupSlug: groupSlug,
    childCategorySlug: null,
    styles: [],
    types: [],
  };
  const sqlParts = buildSqlParts(scopedParams, { excludeChildCategory: true, excludeStyles: true, excludeTypes: true });

  const result = await env.DB
    .prepare(`
      WITH filtered AS (
        SELECT d.id
        ${sqlParts.fromClause}
        ${sqlParts.whereClause}
      )
      SELECT tcc.child_category_name AS name, tcc.child_category_slug AS slug, COUNT(DISTINCT tcc.template_document_id) AS count
      FROM filtered
      JOIN template_child_categories tcc ON tcc.template_document_id = filtered.id
      GROUP BY tcc.child_category_slug, tcc.child_category_name
      ORDER BY tcc.child_category_name ASC
    `)
    .bind(...sqlParts.binds)
    .all<PillRow>();

  return (result.results ?? []).map((row) => ({
    name: row.name,
    slug: row.slug,
    count: Number(row.count),
  }));
}

function toTemplateUrl(row: DocumentRow): string | null {
  return row.listing_url ?? `https://webflow.com/templates/html/${row.template_slug}`;
}

function buildCategoryGroups(names: string[], slugs: string[]): Array<{ name: string; slug: string; url: string }> {
  return names.map((name, index) => ({
    name,
    slug: slugs[index] ?? slugs[0] ?? '',
    url: `https://webflow.com/templates/category/${slugs[index] ?? slugs[0] ?? ''}`,
  }));
}

function buildStyles(names: string[], slugs: string[]): Array<{ name: string; slug: string }> {
  return names.map((name, index) => ({ name, slug: slugs[index] ?? '' }));
}

function buildTags(names: string[], slugs: string[]): Array<{ name: string; slug: string }> {
  return names.map((name, index) => ({ name, slug: slugs[index] ?? '' }));
}

function buildChildCategories(
  names: string[],
  slugs: string[],
  publicSlugMap: Record<string, string>,
): Array<{ name: string; slug: string; url: string }> {
  return names.map((name, index) => {
    const canonicalSlug = slugs[index] ?? '';
    const publicSlug = publicSlugMap[canonicalSlug] ?? canonicalSlug;
    return {
      name,
      slug: publicSlug,
      url: `https://webflow.com/templates/subcategory/${publicSlug}`,
    };
  });
}

export async function searchTemplates(env: Env, rawParams: SearchParams): Promise<SearchResponsePayload> {
  const params = await resolveAliases(env, rawParams);
  const sqlParts = buildSqlParts(params);
  const offset = (params.page - 1) * params.pageSize;
  const orderClause = queryOrderClause(params, sqlParts.queryMode);

  const [totalItems, rows, styleFacets, typeFacets, pills] = await Promise.all([
    getTotalCount(env.DB, sqlParts),
    env.DB
      .prepare(`
        SELECT
          d.*,
          ${sqlParts.queryMode ? 'bm25(template_documents_fts, 10.0, 6.0, 1.5, 2.5, 2.0, 1.2, 0.8)' : 'NULL'} AS text_rank
        ${sqlParts.fromClause}
        ${sqlParts.whereClause}
        ORDER BY ${orderClause}
        LIMIT ? OFFSET ?
      `)
      .bind(...sqlParts.binds, params.pageSize, offset)
      .all<DocumentRow>(),
    loadFacetStyles(env, params),
    loadFacetTypes(env, params),
    loadSubcategoryPills(env, params),
  ]);

  const rowResults = rows.results ?? [];
  const childSlugMap = await lookupPublicSlugMap(
    env.DB,
    'child_category',
    rowResults.flatMap((row) => parseJsonArray(row.child_category_slugs_json)).concat(pills.map((pill) => pill.slug)),
  );

  const items: SearchItem[] = rowResults.map((row) => {
    const categoryGroups = parseJsonArray(row.category_groups_json);
    const categoryGroupSlugs = parseJsonArray(row.category_group_slugs_json);
    const childCategories = parseJsonArray(row.child_categories_json);
    const childCategorySlugs = parseJsonArray(row.child_category_slugs_json);
    const styles = parseJsonArray(row.styles_json);
    const styleSlugs = parseJsonArray(row.style_slugs_json);
    const tags = parseJsonArray(row.tags_json);
    const tagSlugs = parseJsonArray(row.tag_slugs_json);

    return {
      id: row.id,
      template_slug: row.template_slug,
      name: row.name,
      url: toTemplateUrl(row),
      preview_url: row.preview_url,
      website_url: row.website_url,
      creator_name: row.creator_name,
      creator_profile_url: row.creator_profile_url,
      creator_avatar_url: row.creator_avatar_url,
      creator_avatar_alt: row.creator_avatar_alt,
      thumbnail_image_url: row.thumbnail_image_url,
      thumbnail_image_secondary_url: row.thumbnail_image_secondary_url,
      price: row.price,
      is_free: row.is_free === 1,
      is_featured: row.is_featured === 1,
      template_type: row.template_type,
      popularity_score: row.popularity_score,
      unique_viewers: row.unique_viewers,
      cumulative_purchases: row.cumulative_purchases,
      published_date: row.published_date,
      category_groups: buildCategoryGroups(categoryGroups, categoryGroupSlugs),
      child_categories: buildChildCategories(childCategories, childCategorySlugs, childSlugMap),
      styles: buildStyles(styles, styleSlugs),
      tags: buildTags(tags, tagSlugs),
    };
  });

  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / params.pageSize);

  return {
    items,
    pagination: {
      page: params.page,
      page_size: params.pageSize,
      total_items: totalItems,
      total_pages: totalPages,
      has_next_page: params.page < totalPages,
      has_previous_page: params.page > 1,
    },
    sort: params.sort,
    applied_filters: {
      q: params.q,
      scope: params.scope,
      category_group_slug: params.categoryGroupSlug,
      child_category_slug: params.childCategorySlug ? childSlugMap[params.childCategorySlug] ?? params.childCategorySlug : null,
      styles: params.styles,
      types: params.types,
      free_only: params.freeOnly,
    },
    available_facets: {
      styles: styleFacets.map((row) => ({ name: row.name, slug: row.slug, count: Number(row.count) })),
      types: typeFacets.map((row) => ({ value: row.value, count: Number(row.count) })),
    },
    subcategory_pills: pills.map((pill) => {
      const publicSlug = childSlugMap[pill.slug] ?? pill.slug;
      return {
        name: pill.name,
        slug: publicSlug,
        url: `https://webflow.com/templates/subcategory/${publicSlug}`,
        count: Number(pill.count),
        active: publicSlug === (params.childCategorySlug ? childSlugMap[params.childCategorySlug] ?? params.childCategorySlug : ''),
      };
    }),
  };
}
