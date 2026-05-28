/**
 * Lightweight category/template suggestion endpoint.
 *
 * Replaces the archived wf-search-suggestion Vercel API.
 * Returns up to `limit` results optimised for typeahead dropdowns:
 * minimal payload, BM25-ranked when a query is present, popularity-ranked
 * when the query is empty or too short.
 *
 * GET /api/templates/suggest?q=arch&limit=5&scope=all
 */
import type { Env } from './types.js';
import { parseJsonArray } from './utils.js';

export interface SuggestItem {
  name: string;
  template_slug: string;
  url: string | null;
  category_group_name: string | null;
  is_free: boolean;
  price: number | null;
  cumulative_purchases: number | null;
  highlight: Array<{ offset: number; length: number }>;
}

export interface SuggestResponse {
  items: SuggestItem[];
  q: string | null;
}

interface SuggestRow {
  name: string;
  template_slug: string;
  listing_url: string | null;
  category_groups_json: string;
  is_free: number;
  price: number | null;
  cumulative_purchases: number | null;
}

function buildFtsQuery(input: string): string {
  const tokens = input.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  if (tokens.length === 0) return '""';
  return tokens.map((t) => `${t}*`).join(' AND ');
}

function highlightRanges(q: string, name: string): Array<{ offset: number; length: number }> {
  const nq = q.toLowerCase();
  const nn = name.toLowerCase();
  const idx = nn.indexOf(nq);
  if (idx === -1 || nq.length === 0) return [];
  return [{ offset: idx, length: nq.length }];
}

export async function suggestTemplates(env: Env, url: URL): Promise<SuggestResponse> {
  const rawQ = (url.searchParams.get('q') ?? url.searchParams.get('query') ?? '').trim();
  const limit = Math.max(1, Math.min(10, Number(url.searchParams.get('limit') ?? 5) || 5));

  if (rawQ.length < 2) {
    // Empty/short query — return most popular templates
    const rows = await env.DB
      .prepare(`
        SELECT name, template_slug, listing_url,
               category_groups_json, is_free, price, cumulative_purchases
        FROM template_documents
        WHERE marketplace_status = 'Published'
        ORDER BY COALESCE(popularity_score, 0) DESC,
                 COALESCE(cumulative_purchases, 0) DESC
        LIMIT ?
      `)
      .bind(limit)
      .all<SuggestRow>();

    return {
      q: rawQ || null,
      items: (rows.results ?? []).map((r) => mapRow(r, ''))
    };
  }

  const ftsQuery = buildFtsQuery(rawQ);

  const rows = await env.DB
    .prepare(`
      SELECT d.name, d.template_slug, d.listing_url,
             d.category_groups_json, d.is_free, d.price, d.cumulative_purchases
      FROM template_documents d
      JOIN template_documents_fts fts ON fts.template_document_id = d.id
      WHERE fts MATCH ?
        AND d.marketplace_status = 'Published'
      ORDER BY bm25(template_documents_fts, 10.0, 6.0, 1.5, 2.5, 2.0, 1.2, 0.8) ASC,
               COALESCE(d.popularity_score, 0) DESC
      LIMIT ?
    `)
    .bind(ftsQuery, limit)
    .all<SuggestRow>();

  return {
    q: rawQ,
    items: (rows.results ?? []).map((r) => mapRow(r, rawQ))
  };
}

function mapRow(r: SuggestRow, q: string): SuggestItem {
  const groups = parseJsonArray(r.category_groups_json) as Array<{ name: string; slug: string } | string>;
  const firstGroup = groups[0];
  const categoryGroupName =
    typeof firstGroup === 'object' && firstGroup !== null
      ? firstGroup.name
      : typeof firstGroup === 'string'
        ? firstGroup
        : null;

  return {
    name: r.name,
    template_slug: r.template_slug,
    url: r.listing_url ?? null,
    category_group_name: categoryGroupName,
    is_free: r.is_free === 1,
    price: r.price ?? null,
    cumulative_purchases: r.cumulative_purchases ?? null,
    highlight: q ? highlightRanges(q, r.name) : []
  };
}
