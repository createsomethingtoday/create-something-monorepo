/**
 * Category Suggestions API with text search and caching
 * Port of Vercel serverless function to Cloudflare Workers
 */

interface Env {
  AIRTABLE_API_KEY?: string;
  AIRTABLE_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  AIRTABLE_BASE?: string;
  AIRTABLE_TABLE?: string;
  AIRTABLE_VIEW?: string;
  KEYWORD_WEIGHT_FACTOR?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
  description: string;
  itemCount: number;
  popularity7d: number;
  boost: number;
  groupName: string;
  groupSlug: string;
  keywords: Array<{ term: string; weight: number }>;
  isActive: boolean;
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

// In-memory cache (per worker instance)
let memCache: { ts: number; data: Category[] } | null = null;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function normalize(value: unknown): string {
  return (value || '').toString().normalize('NFKD').toLowerCase();
}

function tokenize(value: string): string[] {
  return normalize(value).split(/\s+/).filter(Boolean);
}

function getField(fields: Record<string, unknown>, candidates: string[]): unknown {
  for (const key of candidates) {
    if (fields && Object.prototype.hasOwnProperty.call(fields, key)) return fields[key];
  }
  return undefined;
}

function toArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return value.split(',');
  return [String(value)];
}

function getKeywordDefaultWeight(fields: Record<string, unknown>): number {
  const raw = getField(fields, ['🔑Keyword Default Weight', 'Keyword Default Weight', 'Keyword Weight Default', 'Keyword Default']);
  let w = Number(raw);
  if (!isFinite(w) || isNaN(w)) w = 0.5;
  return Math.max(0, Math.min(1, w));
}

function parseKeywords(fields: Record<string, unknown>): Array<{ term: string; weight: number }> {
  const raw = getField(fields, ['Keyword', 'Keywords', 'Keyword(s)', 'Key Words', '🔑Keywords']);
  const defaultWeight = getKeywordDefaultWeight(fields);
  const parts = toArray(raw).flatMap(v => toArray(v));
  const parsed: Array<{ term: string; weight: number }> = [];
  
  for (const part of parts) {
    const s = String(part || '').trim();
    if (!s) continue;
    const m = s.match(/^(.*?)\s*(?:[:|,-]|\s*\()\s*([0-9]+(?:\.[0-9]+)?)\s*\)?\s*$/);
    let term = s;
    let weight = defaultWeight;
    if (m) {
      term = m[1].trim();
      weight = Number(m[2]);
    }
    if (!term) continue;
    if (!isFinite(weight) || isNaN(weight)) weight = defaultWeight;
    weight = Math.max(0, Math.min(1, weight));
    parsed.push({ term, weight });
  }
  
  // Dedupe by normalized term (keep max weight)
  const byTerm = new Map<string, number>();
  for (const { term, weight } of parsed) {
    const key = normalize(term);
    const prev = byTerm.get(key) ?? 0;
    if (weight > prev) byTerm.set(key, weight);
  }
  return Array.from(byTerm, ([term, weight]) => ({ term, weight }));
}

function buildAliases(fields: Record<string, unknown>, name: string): string[] {
  const aliases: string[] = [];
  aliases.push(...toArray(getField(fields, ['Aliases', 'Alias', 'Synonyms', '🏷️Tags (Free Form)'])));
  aliases.push(...toArray(getField(fields, ['🪣Category Group Display Names', 'Group', 'Group Name'])));
  
  const groupSlug = getField(fields, ['🪣Category Group CMS Slug', 'Group Slug']);
  if (typeof groupSlug === 'string' && groupSlug) {
    aliases.push(groupSlug.replace(/-/g, ' '));
  }
  
  if (typeof name === 'string' && name) {
    if (name.includes('&')) aliases.push(name.replace(/\s*&\s*/g, ' and '));
    aliases.push(name + ' websites');
    aliases.push(name.replace(/\s*\(.*\)\s*/g, '').trim());
  }
  
  return Array.from(new Set(
    aliases
      .map(s => String(s).trim())
      .filter(s => s && !/not in script|name is different|categories are different|will break/i.test(s))
  ));
}

function mapRecord(record: AirtableRecord): Category {
  const f = record.fields || {};
  const name = String(getField(f, ['Name', 'Category Name']) || '').trim();
  let slug = String(getField(f, ['🥞CMS Slug', 'Slug', 'slug']) || '').trim();
  if (!slug && name) {
    slug = name.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
  }

  const published = Number(getField(f, ['#️⃣👛Published', 'Published', 'Item Count']) || 0);
  const total = Number(getField(f, ['#️⃣👛Total', 'Total']) || 0);
  const itemCount = isNaN(published) ? (isNaN(total) ? 0 : total) : published;
  const description = String(getField(f, ['ℹ️Description (Short)', 'Description']) || '').trim();
  const boostRaw = Number(getField(f, ['Boost', 'Rank Boost']) || 0);
  const active = getField(f, ['🥞CMS Status', 'Active']);
  const isActive = Array.isArray(active) ? active.includes('Active') : String(active || '').toLowerCase() !== 'false';

  return {
    id: record.id,
    name,
    slug,
    aliases: buildAliases(f, name),
    description,
    itemCount,
    popularity7d: itemCount,
    boost: isNaN(boostRaw) ? 0 : boostRaw,
    groupName: String(getField(f, ['🪣Category Group Display Names', 'Group', 'Group Name']) || '').trim(),
    groupSlug: String(getField(f, ['🪣Category Group CMS Slug', 'Group Slug']) || '').trim(),
    keywords: parseKeywords(f),
    isActive,
  };
}

function textScore(query: string, cat: Category): number {
  const nq = normalize(query).trim();
  if (!nq) return 0;
  const name = normalize(cat.name);
  const aliases = (cat.aliases || []).map(normalize);
  const tokens = tokenize(cat.name);

  let score = 0;
  const starts = (s: string) => s.startsWith(nq);
  const contains = (s: string) => s.includes(nq);

  if (starts(name)) score = Math.max(score, 1.0);
  if (tokens.some(t => starts(t))) score = Math.max(score, 0.8);
  if (aliases.some(a => starts(a))) score = Math.max(score, 0.7);
  if (contains(name)) score = Math.max(score, 0.6);
  if (aliases.some(a => a.includes(nq))) score = Math.max(score, 0.6);
  if (name === nq) score += 0.2;

  return Math.min(score, 1);
}

function keywordTextScore(query: string, cat: Category, keywordWeightFactor: number): number {
  const nq = normalize(query).trim();
  if (!nq) return 0;
  const keywords = Array.isArray(cat.keywords) ? cat.keywords : [];
  let score = 0;
  for (const kw of keywords) {
    if (!kw || !kw.term) continue;
    const term = normalize(kw.term);
    const weight = Math.max(0, Math.min(1, Number(kw.weight) || 0));
    if (weight <= 0) continue;
    if (term === nq) score = Math.max(score, 1.0 * weight + 0.1);
    else if (term.startsWith(nq)) score = Math.max(score, 0.8 * weight);
    else if (term.includes(nq)) score = Math.max(score, 0.6 * weight);
  }
  return Math.min(score * keywordWeightFactor, 1);
}

function finalScore(query: string, cat: Category, keywordWeightFactor: number): number {
  const ts = textScore(query, cat);
  const kws = keywordTextScore(query, cat, keywordWeightFactor);
  const textRelevance = Math.max(ts, kws);
  const pop = cat.popularity7d ? Math.min(Math.log10(Number(cat.popularity7d) + 1) / 3, 0.3) : 0;
  const boost = Number(cat.boost || 0);
  return 0.6 * textRelevance + pop + boost;
}

function highlightRanges(query: string, name: string): Array<{ offset: number; length: number }> {
  const nq = normalize(query);
  const nn = normalize(name);
  const idx = nn.indexOf(nq);
  if (idx === -1 || nq.length === 0) return [];
  return [{ offset: idx, length: nq.length }];
}

function isEditDistanceLE1(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, diff = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diff > 1) return false;
    if (la > lb) i++;
    else if (lb > la) j++;
    else { i++; j++; }
  }
  if (i < la || j < lb) diff++;
  return diff <= 1;
}

async function fetchAirtableCategories(env: Env): Promise<Category[]> {
  const AIRTABLE_API_KEY = env.AIRTABLE_API_KEY || env.AIRTABLE_KEY;
  const AIRTABLE_BASE_ID = env.AIRTABLE_BASE_ID || env.AIRTABLE_BASE;
  // Default to the Categories table ID
  const AIRTABLE_TABLE = env.AIRTABLE_TABLE || 'tblSygBX7adZ4VNjK';
  const AIRTABLE_VIEW = env.AIRTABLE_VIEW; // Optional - don't default to 'Public'
  
  if (!AIRTABLE_BASE_ID || !AIRTABLE_API_KEY) {
    throw new Error('Missing required env vars: AIRTABLE_BASE/AIRTABLE_BASE_ID, AIRTABLE_KEY/AIRTABLE_API_KEY');
  }

  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`);
    if (AIRTABLE_VIEW) url.searchParams.set('view', AIRTABLE_VIEW);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[suggest] Airtable error', res.status, text);
      throw new Error(`Airtable error ${res.status}`);
    }

    const data = await res.json() as { records: AirtableRecord[]; offset?: string };
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  return records.map(mapRecord).filter(r => r.name);
}

async function loadCategories(env: Env): Promise<Category[]> {
  if (memCache && Date.now() - memCache.ts < TTL_MS) return memCache.data;
  const data = await fetchAirtableCategories(env);
  memCache = { ts: Date.now(), data };
  return data;
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  const url = new URL(context.request.url);
  const q = String(url.searchParams.get('q') || '').slice(0, 64);
  const limit = Math.max(1, Math.min(5, Number(url.searchParams.get('limit') || 5)));
  const debug = url.searchParams.has('debug');
  const diag = url.searchParams.has('diag');
  
  const keywordWeightFactor = (() => {
    const raw = context.env.KEYWORD_WEIGHT_FACTOR;
    const n = Number(raw);
    if (!isFinite(n) || isNaN(n)) return 1;
    return Math.max(0, Math.min(2, n));
  })();

  try {
    if (diag) {
      const envState = {
        hasBase: !!context.env.AIRTABLE_BASE_ID,
        hasKey: !!context.env.AIRTABLE_API_KEY,
        table: context.env.AIRTABLE_TABLE || '[default]',
        view: context.env.AIRTABLE_VIEW || '[default]',
      };
      return new Response(
        JSON.stringify({ ok: true, env: envState, now: Date.now(), cachedAt: memCache?.ts || null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cats = await loadCategories(context.env);
    const active = cats.filter(c => c.isActive !== false);

    if (debug) {
      return new Response(
        JSON.stringify({
          ok: true,
          counts: { total: cats.length, active: active.length },
          sample: active.slice(0, 5).map(c => ({ id: c.id, name: c.name, slug: c.slug, itemCount: c.itemCount })),
          cachedAt: memCache?.ts || null,
          ttlMs: TTL_MS,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let items: Array<{
      id: string;
      name: string;
      slug: string;
      itemCount: number;
      groupName?: string;
      highlight: Array<{ offset: number; length: number }>;
      score: number;
    }> = [];

    if (normalize(q).length < 2) {
      items = active
        .slice()
        .sort((a, b) => (Number(b.popularity7d) || 0) - (Number(a.popularity7d) || 0))
        .slice(0, limit)
        .map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          itemCount: Number(c.itemCount || 0),
          groupName: c.groupName || undefined,
          highlight: [],
          score: 0,
        }));
    } else {
      const nq = normalize(q);

      // Early candidate pruning
      let candidates = active
        .filter(c => {
          const nn = normalize(c.name);
          const a = (c.aliases || []).map(normalize);
          const kw = (c.keywords || []).map(k => normalize(k.term || ''));
          return (
            nn.startsWith(nq) ||
            nn.includes(nq) ||
            a.some(x => x.startsWith(nq)) ||
            kw.some(t => t && (t.startsWith(nq) || (nq.length >= 3 && t.includes(nq))))
          );
        })
        .slice(0, 150);

      // Typo-tolerant fallback
      if (!candidates.length) {
        const near = (s: string) => isEditDistanceLE1(s, nq);
        candidates = active.filter(c => {
          const nn = normalize(c.name);
          if (near(nn)) return true;
          const tokens = tokenize(c.name);
          if (tokens.some(t => near(t))) return true;
          const a = (c.aliases || []).map(normalize);
          if (a.some(t => near(t))) return true;
          const kw = (c.keywords || []).map(k => normalize(k.term || ''));
          if (kw.some(t => near(t))) return true;
          return false;
        }).slice(0, 150);
      }

      const pool = candidates.length ? candidates : active;
      const scored = pool.map(c => ({ c, s: finalScore(q, c, keywordWeightFactor) }));

      items = scored
        .filter(x => x.s > 0.35)
        .sort((a, b) => b.s - a.s)
        .slice(0, limit)
        .map(x => ({
          id: x.c.id,
          name: x.c.name,
          slug: x.c.slug,
          itemCount: Number(x.c.itemCount || 0),
          groupName: x.c.groupName || undefined,
          highlight: highlightRanges(q, x.c.name),
          score: Number(x.s.toFixed(3)),
        }));

      // Fallback to popular categories
      if (!items.length) {
        items = active
          .slice()
          .sort((a, b) => (Number(b.popularity7d) || 0) - (Number(a.popularity7d) || 0))
          .slice(0, limit)
          .map(c => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            itemCount: Number(c.itemCount || 0),
            groupName: c.groupName || undefined,
            highlight: [],
            score: 0,
          }));
      }
    }

    return new Response(
      JSON.stringify({ items, cachedAt: memCache?.ts || null, ttlMs: TTL_MS }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=300',
        },
      }
    );
  } catch (e) {
    const message = e && (e as Error).message ? (e as Error).message : 'Server error';
    console.error('[suggest] Handler error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
