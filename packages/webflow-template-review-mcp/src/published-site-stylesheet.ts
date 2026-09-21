/**
 * Published-site stylesheet fetch.
 *
 * Why this exists: reviewers running in claude.ai Chat/Cowork cannot read a
 * template's compiled CSS themselves — the code-execution sandbox egress
 * allowlist blocks cdn.prod.website-files.com (host_not_allowed), so any
 * in-sandbox fetch of the stylesheet fails. This Worker-side tool fetches the
 * published page, resolves its stylesheet links, and returns the CSS text
 * (bounded, pageable, searchable) plus a structural summary. It performs no
 * Airtable write and makes no review decision.
 */

export const DEFAULT_STYLESHEET_TIMEOUT_MS = 20_000;
export const DEFAULT_STYLESHEET_MAX_CHARS = 120_000;
export const MAX_STYLESHEET_MAX_CHARS = 400_000;
export const MIN_STYLESHEET_MAX_CHARS = 1_000;
/** Hard ceiling on a single stylesheet body we will read from the network. */
export const MAX_STYLESHEET_BYTES = 3_000_000;
export const MAX_STYLESHEETS = 8;
export const MAX_INLINE_STYLE_BLOCKS = 10;
export const MAX_INLINE_STYLE_CHARS = 20_000;
export const MAX_SEARCH_TERMS = 10;
export const MAX_SEARCH_MATCHES_PER_TERM = 40;
export const MAX_SEARCH_SNIPPET_CHARS = 600;

/**
 * Hosts Webflow uses to serve compiled site CSS. Anything else referenced by a
 * <link rel="stylesheet"> is reported as third-party and only fetched when the
 * caller opts in.
 */
export const WEBFLOW_ASSET_HOSTS: ReadonlySet<string> = new Set([
  'cdn.prod.website-files.com',
  'assets.website-files.com',
  'assets-global.website-files.com',
  'uploads-ssl.webflow.com',
  'global-uploads.webflow.com',
  'daks2k3a4ib2z.cloudfront.net',
]);

export class PublishedSiteStylesheetError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PublishedSiteStylesheetError';
  }
}

export interface PublishedSiteStylesheetInput {
  published_url: string;
  include_css?: boolean;
  include_third_party?: boolean;
  max_chars?: number;
  offset?: number;
  search?: string[];
}

export interface PublishedSiteStylesheetConfig {
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

export interface StylesheetLink {
  index: number;
  href: string;
  hostname: string;
  webflow_hosted: boolean;
  /** Filename matches Webflow's compiled-CSS naming (<site>.webflow.<hash>.css). */
  webflow_compiled: boolean;
  media: string | null;
}

export interface CssSummary {
  total_chars: number;
  rule_count_approx: number;
  media_queries: string[];
  font_families: string[];
  font_face_count: number;
  important_count: number;
  custom_property_count: number;
  class_selector_count_approx: number;
}

export interface FetchedStylesheet extends StylesheetLink {
  fetched: boolean;
  skipped_reason?: 'third_party' | 'stylesheet_limit' | 'private_host' | 'non_https';
  status?: number;
  content_type?: string | null;
  error?: string;
  summary?: CssSummary;
  css?: string;
  css_offset?: number;
  css_chars_returned?: number;
  css_truncated?: boolean;
  next_offset?: number | null;
  body_truncated_at_bytes?: number;
}

export interface InlineStyleBlock {
  index: number;
  location: 'head' | 'body';
  total_chars: number;
  css: string;
  css_truncated: boolean;
}

export interface SearchMatch {
  term: string;
  stylesheet_index: number;
  char_index: number;
  /** The rule block containing the hit (selector + declarations). */
  snippet: string;
  /** Enclosing at-rule prelude (e.g. "@media screen and (max-width:479px)"), or null at top level. */
  enclosing_at_rule: string | null;
}

export interface PublishedSiteStylesheetResult {
  published_url: string;
  final_url: string;
  page_title: string | null;
  stylesheets: FetchedStylesheet[];
  inline_styles: InlineStyleBlock[];
  search_matches: SearchMatch[] | null;
  search_terms_with_no_matches: string[] | null;
  notes: string[];
}

function isPrivateHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^0\./.test(hostname)
  );
}

/**
 * Accepts published *.webflow.io staging domains only — the same boundary the
 * screenshot tool enforces. Review evidence comes from the published template,
 * never from arbitrary hosts.
 */
export function normalizePublishedWebflowUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new PublishedSiteStylesheetError('INVALID_PUBLISHED_URL', 'Provide a valid published URL.', 400, {
      published_url: value,
    });
  }
  if (url.protocol !== 'https:') {
    throw new PublishedSiteStylesheetError('INVALID_PUBLISHED_URL', 'published_url must use https.', 400, {
      published_url: value,
    });
  }
  const host = url.hostname.toLowerCase();
  if (!host.endsWith('.webflow.io') || host === 'webflow.io' || host.split('.').length < 3) {
    throw new PublishedSiteStylesheetError(
      'INVALID_PUBLISHED_URL',
      'published_url must be a published template staging domain (https://<site>.webflow.io).',
      400,
      { hostname: url.hostname },
    );
  }
  url.hash = '';
  return url;
}

function boundedInt(value: number | undefined, fallback: number, min: number, max: number, field: string): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new PublishedSiteStylesheetError('INVALID_INPUT', `${field} must be an integer between ${min} and ${max}.`, 400, {
      [field]: value,
    });
  }
  return value;
}

function normalizeSearchTerms(search: string[] | undefined): string[] {
  if (!search || search.length === 0) return [];
  if (search.length > MAX_SEARCH_TERMS) {
    throw new PublishedSiteStylesheetError('INVALID_INPUT', `search accepts at most ${MAX_SEARCH_TERMS} terms.`, 400, {
      count: search.length,
    });
  }
  const terms = search.map((term) => term.trim()).filter((term) => term.length >= 2 && term.length <= 120);
  if (terms.length !== search.length) {
    throw new PublishedSiteStylesheetError('INVALID_INPUT', 'Each search term must be 2-120 characters.', 400, { search });
  }
  return [...new Set(terms)];
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function readAttribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i'));
  if (!match) return null;
  return decodeHtmlAttribute(match[1] ?? match[2] ?? match[3] ?? '');
}

/** Extracts <link rel="stylesheet"> hrefs from HTML, resolved against baseUrl. */
export function extractStylesheetLinks(html: string, baseUrl: string): StylesheetLink[] {
  const links: StylesheetLink[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = readAttribute(tag, 'rel');
    if (!rel || !/\bstylesheet\b/i.test(rel)) continue;
    const href = readAttribute(tag, 'href');
    if (!href) continue;
    let resolved: URL;
    try {
      resolved = new URL(href, baseUrl);
    } catch {
      continue;
    }
    resolved.hash = '';
    const key = resolved.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    const hostname = resolved.hostname.toLowerCase();
    links.push({
      index: links.length,
      href: key,
      hostname,
      webflow_hosted: WEBFLOW_ASSET_HOSTS.has(hostname),
      webflow_compiled: /\.webflow(\.shared)?\.[0-9a-f]+\.css$/i.test(resolved.pathname) || /\/css\/[^/]+\.webflow\.[^/]+\.css$/i.test(resolved.pathname),
      media: readAttribute(tag, 'media'),
    });
  }
  return links;
}

/** Extracts inline <style> blocks (Webflow custom-code CSS lives here). */
export function extractInlineStyles(html: string): InlineStyleBlock[] {
  const blocks: InlineStyleBlock[] = [];
  const headEnd = html.search(/<\/head\s*>/i);
  for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
    if (blocks.length >= MAX_INLINE_STYLE_BLOCKS) break;
    const css = (match[1] ?? '').trim();
    if (!css) continue;
    const location: 'head' | 'body' = headEnd === -1 || (match.index ?? 0) < headEnd ? 'head' : 'body';
    blocks.push({
      index: blocks.length,
      location,
      total_chars: css.length,
      css: css.slice(0, MAX_INLINE_STYLE_CHARS),
      css_truncated: css.length > MAX_INLINE_STYLE_CHARS,
    });
  }
  return blocks;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  if (!match) return null;
  const title = decodeHtmlAttribute(match[1] ?? '').replace(/\s+/g, ' ').trim();
  return title || null;
}

function uniqueCapped(values: Iterable<string>, cap: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const key = value.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= cap) break;
  }
  return out;
}

/** Generic families and keywords are noise in a "which fonts does this template use" summary. */
const GENERIC_FONT_FAMILIES: ReadonlySet<string> = new Set([
  'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace',
  'ui-rounded', 'emoji', 'math', 'fangsong', 'inherit', 'initial', 'unset', 'revert', 'var(--font-family)',
]);

/** Cheap regex-based structural summary. Approximate by design; not a parser. */
export function summarizeCss(css: string): CssSummary {
  const mediaQueries = uniqueCapped(
    Array.from(css.matchAll(/@media\s*([^{]+)\{/g), (match) => (match[1] ?? '').replace(/\s+/g, ' ').trim()),
    30,
  );
  const fontFamilies = uniqueCapped(
    Array.from(css.matchAll(/font-family\s*:\s*([^;}]+)/gi), (match) =>
      (match[1] ?? '')
        .split(',')[0]
        .replace(/["']/g, '')
        .replace(/!important/gi, '')
        .trim(),
    ).filter((family) => !GENERIC_FONT_FAMILIES.has(family.toLowerCase())),
    30,
  );
  const classSelectors = new Set<string>();
  // Lookbehind excludes decimals (0.5rem), file extensions (x.woff2) and dotted paths.
  for (const match of css.matchAll(/(?<![\w/.)-])\.([a-zA-Z_-][\w-]*)/g)) {
    classSelectors.add(match[1] ?? '');
    if (classSelectors.size >= 20_000) break;
  }
  return {
    total_chars: css.length,
    rule_count_approx: (css.match(/\{/g) ?? []).length,
    media_queries: mediaQueries,
    font_families: fontFamilies,
    font_face_count: (css.match(/@font-face\b/g) ?? []).length,
    important_count: (css.match(/!\s*important/gi) ?? []).length,
    custom_property_count: (css.match(/--[\w-]+\s*:/g) ?? []).length,
    class_selector_count_approx: classSelectors.size,
  };
}

/** Locates the rule block (selector + declarations) that contains position `at`. */
function ruleBounds(css: string, at: number): { start: number; end: number } {
  const prevClose = css.lastIndexOf('}', at);
  const prevOpen = css.lastIndexOf('{', at);
  let start: number;
  if (prevOpen > prevClose) {
    // Inside a declaration block: the selector starts after the brace or block boundary before the opening brace.
    start = Math.max(css.lastIndexOf('}', prevOpen - 1), css.lastIndexOf('{', prevOpen - 1)) + 1;
  } else {
    // Inside a selector/prelude.
    start = Math.max(prevClose, prevOpen) + 1;
  }
  const closeAt = css.indexOf('}', at);
  return { start, end: closeAt === -1 ? css.length : closeAt + 1 };
}

/** Finds the prelude of the at-rule block enclosing `position`, if any (one level). */
function enclosingAtRule(css: string, position: number): string | null {
  let depth = 0;
  for (let i = position - 1; i >= 0; i -= 1) {
    const char = css[i];
    if (char === '}') depth += 1;
    else if (char === '{') {
      if (depth === 0) {
        const preludeStart = Math.max(css.lastIndexOf('}', i - 1), css.lastIndexOf('{', i - 1), css.lastIndexOf(';', i - 1)) + 1;
        const prelude = css.slice(preludeStart, i).replace(/\s+/g, ' ').trim();
        return prelude.startsWith('@') ? prelude : null;
      }
      depth -= 1;
    }
  }
  return null;
}

/**
 * Case-insensitive substring search returning the enclosing rule block for
 * each hit plus the enclosing at-rule prelude (one level, e.g. @media).
 */
export function searchCss(css: string, terms: string[], stylesheetIndex: number): SearchMatch[] {
  const matches: SearchMatch[] = [];
  const lower = css.toLowerCase();
  for (const term of terms) {
    const needle = term.toLowerCase();
    let from = 0;
    let count = 0;
    while (count < MAX_SEARCH_MATCHES_PER_TERM) {
      const at = lower.indexOf(needle, from);
      if (at === -1) break;
      const { start, end } = ruleBounds(css, at);
      const snippet = css.slice(start, end).trim();
      matches.push({
        term,
        stylesheet_index: stylesheetIndex,
        char_index: at,
        snippet: snippet.length > MAX_SEARCH_SNIPPET_CHARS ? `${snippet.slice(0, MAX_SEARCH_SNIPPET_CHARS)}…` : snippet,
        enclosing_at_rule: enclosingAtRule(css, start),
      });
      count += 1;
      from = Math.max(end, at + needle.length);
    }
  }
  return matches;
}

async function fetchText(
  url: string,
  accept: string,
  timeoutMs: number,
  fetcher: typeof fetch,
): Promise<{ status: number; ok: boolean; contentType: string | null; text: string; finalUrl: string; truncatedAtBytes?: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Accept: accept,
        'User-Agent': 'Mozilla/5.0 (compatible; WebflowTemplateReview/1.0; +https://createsomething.agency)',
      },
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type');
    let text = await response.text();
    let truncatedAtBytes: number | undefined;
    if (text.length > MAX_STYLESHEET_BYTES) {
      truncatedAtBytes = MAX_STYLESHEET_BYTES;
      text = text.slice(0, MAX_STYLESHEET_BYTES);
    }
    return {
      status: response.status,
      ok: response.ok,
      contentType,
      text,
      finalUrl: response.url || url,
      ...(truncatedAtBytes !== undefined ? { truncatedAtBytes } : {}),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new PublishedSiteStylesheetError('PUBLISHED_SITE_TIMEOUT', `Timed out after ${timeoutMs}ms fetching ${url}.`, 504, { url });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPublishedSiteStylesheet(
  input: PublishedSiteStylesheetInput,
  config: PublishedSiteStylesheetConfig = {},
): Promise<PublishedSiteStylesheetResult> {
  const fetcher = config.fetcher ?? fetch;
  const timeoutMs = config.timeoutMs ?? DEFAULT_STYLESHEET_TIMEOUT_MS;
  const pageUrl = normalizePublishedWebflowUrl(input.published_url);
  const includeCss = input.include_css ?? true;
  const includeThirdParty = input.include_third_party ?? false;
  const maxChars = boundedInt(input.max_chars, DEFAULT_STYLESHEET_MAX_CHARS, MIN_STYLESHEET_MAX_CHARS, MAX_STYLESHEET_MAX_CHARS, 'max_chars');
  const offset = boundedInt(input.offset, 0, 0, MAX_STYLESHEET_BYTES, 'offset');
  const terms = normalizeSearchTerms(input.search);
  const notes: string[] = [];

  const page = await fetchText(pageUrl.toString(), 'text/html,application/xhtml+xml', timeoutMs, fetcher);
  if (!page.ok) {
    throw new PublishedSiteStylesheetError('PUBLISHED_SITE_HTTP_ERROR', `Published site returned HTTP ${page.status}.`, page.status, {
      published_url: pageUrl.toString(),
      final_url: page.finalUrl,
    });
  }

  const links = extractStylesheetLinks(page.text, page.finalUrl);
  const inlineStyles = extractInlineStyles(page.text);
  if (links.length === 0) {
    notes.push('No <link rel="stylesheet"> tags were found in the published page HTML.');
  }
  if (links.length > MAX_STYLESHEETS) {
    notes.push(`Page references ${links.length} stylesheets; only the first ${MAX_STYLESHEETS} were considered.`);
  }

  let remainingChars = maxChars;
  const stylesheets: FetchedStylesheet[] = [];
  const searchMatches: SearchMatch[] = [];

  for (const link of links) {
    const entry: FetchedStylesheet = { ...link, fetched: false };
    if (link.index >= MAX_STYLESHEETS) {
      entry.skipped_reason = 'stylesheet_limit';
      stylesheets.push(entry);
      continue;
    }
    if (!link.href.startsWith('https:')) {
      entry.skipped_reason = 'non_https';
      stylesheets.push(entry);
      continue;
    }
    if (isPrivateHostname(link.hostname)) {
      entry.skipped_reason = 'private_host';
      stylesheets.push(entry);
      continue;
    }
    if (!link.webflow_hosted && !includeThirdParty) {
      entry.skipped_reason = 'third_party';
      stylesheets.push(entry);
      continue;
    }

    try {
      const response = await fetchText(link.href, 'text/css,*/*;q=0.1', timeoutMs, fetcher);
      entry.status = response.status;
      entry.content_type = response.contentType;
      if (!response.ok) {
        entry.error = `Stylesheet returned HTTP ${response.status}.`;
        stylesheets.push(entry);
        continue;
      }
      entry.fetched = true;
      if (response.truncatedAtBytes !== undefined) {
        entry.body_truncated_at_bytes = response.truncatedAtBytes;
        notes.push(`Stylesheet ${link.index} exceeded ${MAX_STYLESHEET_BYTES} bytes and was truncated before analysis.`);
      }
      const css = response.text;
      entry.summary = summarizeCss(css);
      if (terms.length > 0) {
        searchMatches.push(...searchCss(css, terms, link.index));
      }
      if (includeCss) {
        const start = Math.min(offset, css.length);
        const slice = css.slice(start, start + remainingChars);
        entry.css = slice;
        entry.css_offset = start;
        entry.css_chars_returned = slice.length;
        entry.css_truncated = start + slice.length < css.length;
        entry.next_offset = entry.css_truncated ? start + slice.length : null;
        remainingChars = Math.max(0, remainingChars - slice.length);
      }
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error);
    }
    stylesheets.push(entry);
  }

  if (includeCss && stylesheets.some((sheet) => sheet.css_truncated)) {
    notes.push('CSS text was truncated to max_chars. Continue with offset=next_offset, or narrow with search terms instead of paging.');
  }
  if (stylesheets.some((sheet) => sheet.skipped_reason === 'third_party')) {
    notes.push('Third-party stylesheets were listed but not fetched. Pass include_third_party=true to fetch them.');
  }

  const termsWithNoMatches = terms.length > 0 ? terms.filter((term) => !searchMatches.some((match) => match.term === term)) : null;

  return {
    published_url: pageUrl.toString(),
    final_url: page.finalUrl,
    page_title: extractTitle(page.text),
    stylesheets,
    inline_styles: inlineStyles,
    search_matches: terms.length > 0 ? searchMatches : null,
    search_terms_with_no_matches: termsWithNoMatches,
    notes,
  };
}
