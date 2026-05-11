import { canonicalizeCategoryGroupSlug } from './slug.js';
import type { CategoryMetadataPayload, Env } from './types.js';

interface CategoryRow {
  name: string | null;
}

interface CategoryCountRow {
  total: number;
}

function fallbackNameFromSlug(slug: string): string {
  return slug
    .replace(/-websites$/i, '')
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function buildCategoryTitle(name: string): string {
  return `${name} Website Templates & Page Designs | Webflow`;
}

function buildCategoryDescription(name: string): string {
  return `Get our HTML5 responsive ${name} website templates and easily customize your ${name} template with Webflow.`;
}

export async function getCategoryMetadata(env: Env, rawSlug: string): Promise<CategoryMetadataPayload | null> {
  const slug = canonicalizeCategoryGroupSlug(decodeURIComponent(rawSlug));
  const [nameRow, countRow] = await Promise.all([
    env.DB
      .prepare(
        `
        SELECT
          json_extract(d.category_groups_json, '$[' || category_slugs.key || ']') AS name
        FROM template_documents d, json_each(d.category_group_slugs_json) AS category_slugs
        WHERE category_slugs.value = ?
          AND json_extract(d.category_groups_json, '$[' || category_slugs.key || ']') IS NOT NULL
        ORDER BY COALESCE(d.popularity_score, 0) DESC, d.name ASC
        LIMIT 1
      `,
      )
      .bind(slug)
      .first<CategoryRow>(),
    env.DB
      .prepare(
        `
        SELECT COUNT(*) AS total
        FROM template_documents d
        WHERE EXISTS (
          SELECT 1
          FROM json_each(d.category_group_slugs_json)
          WHERE json_each.value = ?
        )
      `,
      )
      .bind(slug)
      .first<CategoryCountRow>(),
  ]);

  const totalItems = Number(countRow?.total ?? 0);
  if (totalItems < 1) return null;

  const name = (nameRow?.name ?? '').trim() || fallbackNameFromSlug(slug);
  return {
    slug,
    name,
    title: buildCategoryTitle(name),
    description: buildCategoryDescription(name),
    canonical_url: `https://webflow.com/templates/category/${slug}`,
    total_items: totalItems,
  };
}
