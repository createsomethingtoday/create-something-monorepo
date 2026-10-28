import { jsonResponse } from './http.js';
import type { Env } from './types.js';
import { fetchWebflowPageWithRetry } from './webflow.js';

// Template submission guidelines live in the Template Marketplace CMS
// ("Submission Guidelines" collection, one item per heading, paragraph, or
// top-level list item). This endpoint is the single read path for the
// SubmissionGuidelines code component and the Template Review MCP.
export const GUIDELINES_COLLECTION_ID = '6ae2688e4e22e3dab0eb1213';

const FRESH_MS = 5 * 60 * 1000;
const CACHE_KEY = 'https://webflow-template-search.internal/api/templates/guidelines/v1';
const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
};

const KINDS: Record<string, GuidelineKind> = {
  'Heading 2': 'heading-2',
  'Heading 3': 'heading-3',
  'Heading 4': 'heading-4',
  Paragraph: 'paragraph',
  Bullet: 'bullet',
  Numbered: 'numbered',
  Quote: 'quote',
};

export type GuidelineKind = 'heading-2' | 'heading-3' | 'heading-4' | 'paragraph' | 'bullet' | 'numbered' | 'quote';
export type GuidelinesSource = 'live' | 'staged';

export interface GuidelineBlock {
  id: string;
  kind: GuidelineKind;
  html: string;
  text: string;
  requirementLevel: string | null;
  validatorChecks: string[];
}

export interface GuidelineSection {
  id: string;
  name: string;
  order: number;
  blocks: GuidelineBlock[];
}

export interface GuidelinesDocument {
  source: GuidelinesSource;
  version: string;
  generatedAt: string;
  sectionCount: number;
  blockCount: number;
  sections: GuidelineSection[];
}

interface CollectionSchema {
  fields: Array<{ slug: string; type: string; validations?: { options?: Array<{ id: string; name: string }> } | null }>;
}

interface CmsItem {
  id: string;
  isArchived?: boolean;
  isDraft?: boolean;
  fieldData: Record<string, unknown>;
}

function optionNames(schema: CollectionSchema, slug: string): Map<string, string> {
  const field = schema.fields.find((f) => f.slug === slug);
  return new Map((field?.validations?.options ?? []).map((o) => [o.id, o.name]));
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Markdown-style plain text for agents. The block's own list item has no
 * marker; nested list items become indented "- " lines.
 */
export function blockText(html: string): string {
  let depth = 0;
  const out = html.replace(/<\/?([a-z0-9]+)[^>]*>/gi, (tag, name: string) => {
    const lower = name.toLowerCase();
    const closing = tag.startsWith('</');
    if (lower === 'ul' || lower === 'ol') {
      depth += closing ? -1 : 1;
      return '';
    }
    if (lower === 'li' && !closing) return depth >= 2 ? `\n${'  '.repeat(depth - 2)}- ` : '';
    if (lower === 'br' || (closing && lower === 'p')) return '\n';
    return '';
  });
  return decodeEntities(out)
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
    .filter((line) => line.trim() !== '')
    .join('\n')
    .trim();
}

// FNV-1a 64-bit: a stable, synchronous content fingerprint for cache validation.
function fingerprint(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= BigInt(value.charCodeAt(i));
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, '0');
}

export function buildGuidelinesDocument(schema: CollectionSchema, items: CmsItem[], source: GuidelinesSource): GuidelinesDocument {
  const sectionNames = optionNames(schema, 'section');
  const kindNames = optionNames(schema, 'kind');
  const levelNames = optionNames(schema, 'requirement-level');
  const sections = new Map<string, GuidelineSection>();
  const ordered: Array<{ section: GuidelineSection; order: number; block: GuidelineBlock }> = [];

  for (const item of items) {
    if (item.isArchived || item.isDraft) continue;
    const f = item.fieldData;
    const name = sectionNames.get(String(f.section ?? ''));
    const kind = KINDS[kindNames.get(String(f.kind ?? '')) ?? ''];
    if (!name || !kind) continue;

    const sectionOrder = Number(f['section-order'] ?? 0);
    let section = sections.get(name);
    if (!section) {
      section = { id: slugify(name), name, order: sectionOrder, blocks: [] };
      sections.set(name, section);
    }
    const html = String(f.content ?? '');
    ordered.push({
      section,
      order: Number(f.order ?? 0),
      block: {
        id: String(f.slug ?? item.id),
        kind,
        html,
        text: blockText(html),
        requirementLevel: levelNames.get(String(f['requirement-level'] ?? '')) ?? null,
        validatorChecks: String(f['validator-checks'] ?? '')
          .split(',')
          .map((check) => check.trim())
          .filter(Boolean),
      },
    });
  }

  ordered.sort((a, b) => a.section.order - b.section.order || a.order - b.order || a.block.id.localeCompare(b.block.id));
  for (const { section, block } of ordered) section.blocks.push(block);
  const sorted = [...sections.values()].sort((a, b) => a.order - b.order);
  const blockCount = ordered.length;

  return {
    source,
    version: fingerprint(JSON.stringify(sorted)),
    generatedAt: new Date().toISOString(),
    sectionCount: sorted.length,
    blockCount,
    sections: sorted,
  };
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const response = await fetchWebflowPageWithRetry(url, token);
  if (!response.ok) throw new Error(`Webflow API ${response.status} for ${url}: ${(await response.text()).slice(0, 200)}`);
  return (await response.json()) as T;
}

export async function fetchGuidelinesDocument(env: Env, source: GuidelinesSource): Promise<GuidelinesDocument> {
  if (!env.WEBFLOW_API_TOKEN) throw new Error('WEBFLOW_API_TOKEN is not configured');
  const collectionId = env.WEBFLOW_GUIDELINES_COLLECTION_ID || GUIDELINES_COLLECTION_ID;
  const base = `https://api.webflow.com/v2/collections/${collectionId}`;
  const schema = await fetchJson<CollectionSchema>(base, env.WEBFLOW_API_TOKEN);

  const items: CmsItem[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await fetchJson<{ items: CmsItem[]; pagination: { total: number } }>(
      `${base}/items${source === 'live' ? '/live' : ''}?limit=100&offset=${offset}`,
      env.WEBFLOW_API_TOKEN,
    );
    items.push(...page.items);
    if (offset + 100 >= page.pagination.total) break;
  }
  return buildGuidelinesDocument(schema, items, source);
}

function filterSection(doc: GuidelinesDocument, sectionId: string | null): GuidelinesDocument {
  if (!sectionId) return doc;
  const sections = doc.sections.filter((s) => s.id === sectionId);
  return { ...doc, sections, sectionCount: sections.length, blockCount: sections.reduce((n, s) => n + s.blocks.length, 0) };
}

function defaultCache(): Cache | null {
  return typeof caches === 'undefined' ? null : caches.default;
}

async function readCached(cache: Cache | null): Promise<{ doc: GuidelinesDocument; fetchedAt: number } | null> {
  const hit = await cache?.match(CACHE_KEY);
  if (!hit) return null;
  return { doc: (await hit.json()) as GuidelinesDocument, fetchedAt: Number(hit.headers.get('x-guidelines-fetched-at') ?? 0) };
}

async function writeCached(cache: Cache | null, doc: GuidelinesDocument): Promise<void> {
  await cache?.put(
    CACHE_KEY,
    new Response(JSON.stringify(doc), {
      headers: {
        'Content-Type': 'application/json',
        // Kept for a day so a Webflow outage serves the last good copy; freshness is FRESH_MS.
        'Cache-Control': 'public, max-age=86400',
        'x-guidelines-fetched-at': String(Date.now()),
      },
    }),
  );
}

export async function handleGuidelines(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  isAdmin: () => Response | null,
): Promise<Response> {
  const url = new URL(request.url);
  const source: GuidelinesSource = url.searchParams.get('source') === 'staged' ? 'staged' : 'live';
  const sectionId = url.searchParams.get('section');
  const refresh = url.searchParams.get('refresh') === '1';

  if (source === 'staged' || refresh) {
    const denied = isAdmin();
    if (denied) return denied;
  }

  if (source === 'staged') {
    try {
      const doc = await fetchGuidelinesDocument(env, 'staged');
      return jsonResponse(request, env, filterSection(doc, sectionId), 200, { 'Cache-Control': 'no-store' });
    } catch (error) {
      console.error(JSON.stringify({ event: 'guidelines_fetch_failed', source, error: String(error) }));
      return jsonResponse(request, env, { error: 'guidelines_unavailable' }, 503, { 'Cache-Control': 'no-store' });
    }
  }

  const cache = defaultCache();
  const cached = refresh ? null : await readCached(cache);
  if (cached && Date.now() - cached.fetchedAt < FRESH_MS) {
    return jsonResponse(request, env, filterSection(cached.doc, sectionId), 200, { ...PUBLIC_CACHE_HEADERS, 'x-guidelines-cache': 'HIT' });
  }

  try {
    const doc = await fetchGuidelinesDocument(env, 'live');
    ctx.waitUntil(writeCached(cache, doc));
    return jsonResponse(request, env, filterSection(doc, sectionId), 200, { ...PUBLIC_CACHE_HEADERS, 'x-guidelines-cache': 'MISS' });
  } catch (error) {
    console.error(JSON.stringify({ event: 'guidelines_fetch_failed', source, error: String(error) }));
    if (cached) {
      return jsonResponse(request, env, filterSection(cached.doc, sectionId), 200, { ...PUBLIC_CACHE_HEADERS, 'x-guidelines-cache': 'STALE' });
    }
    return jsonResponse(request, env, { error: 'guidelines_unavailable' }, 503, { 'Cache-Control': 'no-store' });
  }
}
