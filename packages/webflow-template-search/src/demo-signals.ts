/**
 * Technical matching signals from a template's public demo homepage.
 *
 * Third parties that identify which template a live site was built from asked
 * for a supported alternative to crawling demo sites. The worker fetches each
 * demo homepage (`website_url`) on a schedule, reduces it to a small documented
 * signal set, and publishes it on `view=full` search items. The algorithm is
 * deliberately simple so a consumer can compute the same signals for any live
 * site and compare. The spec lives in README "Demo site signals"; changing
 * anything here that affects output means bumping DEMO_SIGNALS_VERSION.
 */

export const DEMO_SIGNALS_VERSION = 1;
export const DEMO_SIGNALS_MINHASH_SIZE = 32;
export const DEMO_SIGNALS_USER_AGENT = 'WebflowTemplateSearch/1.0 (+https://templates.webflow.com)';
const DEMO_SIGNALS_FETCH_TIMEOUT_MS = 8000;
/** Demo homepages above this size are rejected (`too_large`) rather than buffered. */
export const DEMO_SIGNALS_MAX_HTML_BYTES = 2_000_000;

export interface DemoSignals {
  version: number;
  fetched_at: string;
  /** Library ids from FRAMEWORK_MARKERS found in script/link tags, in marker order. */
  frameworks: string[];
  /** True when the page carries Webflow interaction (IX2) markers (`data-w-id`). */
  has_interactions: boolean;
  /** Number of distinct non-Webflow class names on the page. */
  class_count: number;
  /** MinHash signature of the class-name set; empty when the page has no custom classes. */
  class_minhash: number[];
}

export type DemoSignalFetchResult =
  | { ok: true; signals: DemoSignals }
  | { ok: false; status: number | null; reason: 'http_error' | 'not_html' | 'too_large' | 'timeout' | 'fetch_failed' };

// Ids are part of the public contract: add, never rename. Patterns run against
// the concatenated <script> and <link> tags only, so page copy cannot match.
const FRAMEWORK_MARKERS: ReadonlyArray<{ id: string; pattern: RegExp }> = [
  { id: 'gsap', pattern: /gsap(\.min)?\.js|\bgsap\.(registerPlugin|to|from|fromTo|timeline|set)\(/i },
  { id: 'scrolltrigger', pattern: /ScrollTrigger(\.min)?\.js|ScrollTrigger\.create\(|registerPlugin\(\s*ScrollTrigger/i },
  { id: 'lenis', pattern: /\blenis[^"'\s]*\.js|new\s+Lenis\(/i },
  { id: 'swiper', pattern: /\bswiper[^"'\s]*\.(js|css)|new\s+Swiper\(/i },
  { id: 'splide', pattern: /\bsplide[^"'\s]*\.(js|css)|new\s+Splide\(/i },
  { id: 'locomotive-scroll', pattern: /locomotive-scroll[^"'\s]*\.(js|css)|new\s+LocomotiveScroll\(/i },
  { id: 'barba', pattern: /@barba\/core|\bbarba(\.umd)?(\.min)?\.js|barba\.init\(/i },
  { id: 'three', pattern: /\bthree(\.module)?(\.min)?\.js|\bTHREE\.[A-Z]/ },
  { id: 'lottie', pattern: /\blottie[^"'\s]*\.js|dotlottie|lottie\.loadAnimation\(/i },
  { id: 'finsweet', pattern: /finsweet|fs-attributes/i },
  { id: 'split-type', pattern: /split-type[^"'\s]*\.js|new\s+SplitType\(/i },
  { id: 'splitting', pattern: /\bsplitting[^"'\s]*\.(js|css)|\bSplitting\(\s*\)/i },
  { id: 'alpine', pattern: /alpinejs|\balpine(\.min)?\.js/i },
  { id: 'anime', pattern: /\banime(\.es)?(\.min)?\.js|\banime\(\s*\{/i },
  { id: 'aos', pattern: /\baos(\.min)?\.(js|css)|AOS\.init\(/ },
  { id: 'typed', pattern: /\btyped(\.umd)?(\.min)?\.js|new\s+Typed\(/i },
  { id: 'rive', pattern: /@rive-app|\brive(\.min)?\.js/i },
  { id: 'spline', pattern: /@splinetool|spline-viewer/i },
  { id: 'matter', pattern: /\bmatter(\.min)?\.js|Matter\.Engine/i },
];

export const DEMO_SIGNAL_FRAMEWORK_IDS: readonly string[] = FRAMEWORK_MARKERS.map((marker) => marker.id);

/** FNV-1a 32-bit over the UTF-8 bytes of `input`. fnv1a32('a') === 0xe40c292c. */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(input)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Distinct class names from every `class` attribute, minus Webflow's own
 * `w-*` / `w--*` utility classes and the `wf-*` font-loader flags. Those are
 * shared by every Webflow site and carry no template identity.
 */
export function extractClassNames(html: string): Set<string> {
  const classes = new Set<string>();
  const attribute = /\sclass\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let match: RegExpExecArray | null;
  while ((match = attribute.exec(html))) {
    for (const name of (match[1] ?? match[2] ?? '').split(/\s+/)) {
      if (!name || /^(w|wf)-/.test(name)) continue;
      classes.add(name);
    }
  }
  return classes;
}

/**
 * MinHash signature: for each slot `i` in 0..size-1, the minimum of
 * `fnv1a32(`${i}:${className}`)` over the class set. Two signatures estimate
 * Jaccard similarity of the underlying sets as (matching slots / size).
 */
export function classMinhash(classes: Iterable<string>, size = DEMO_SIGNALS_MINHASH_SIZE): number[] {
  const signature: number[] = Array.from({ length: size }, () => 0xffffffff);
  let populated = false;
  for (const name of classes) {
    populated = true;
    for (let slot = 0; slot < size; slot += 1) {
      const hash = fnv1a32(`${slot}:${name}`);
      if (hash < signature[slot]) signature[slot] = hash;
    }
  }
  return populated ? signature : [];
}

/** Estimated Jaccard similarity of two class sets from their MinHash signatures (0–1). */
export function estimateClassSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let matches = 0;
  for (let slot = 0; slot < a.length; slot += 1) if (a[slot] === b[slot]) matches += 1;
  return matches / a.length;
}

function scriptAndLinkText(html: string): string {
  const scripts = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) ?? [];
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  return [...scripts, ...links].join('\n');
}

export function detectFrameworks(html: string): string[] {
  const haystack = scriptAndLinkText(html);
  return FRAMEWORK_MARKERS.filter((marker) => marker.pattern.test(haystack)).map((marker) => marker.id);
}

export function computeDemoSignals(html: string, fetchedAt: string): DemoSignals {
  const classes = extractClassNames(html);
  return {
    version: DEMO_SIGNALS_VERSION,
    fetched_at: fetchedAt,
    frameworks: detectFrameworks(html),
    has_interactions: /\sdata-w-id\s*=/.test(html),
    class_count: classes.size,
    class_minhash: classMinhash(classes),
  };
}

/**
 * Reads at most `maxBytes` of the body without buffering more than that. Returns
 * null when the declared or streamed size exceeds the cap; an oversized body must
 * not be able to exhaust the Worker's memory and abort a whole batch.
 */
async function readBoundedText(response: Response, maxBytes: number): Promise<string | null> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const piece of chunks) {
    bytes.set(piece, offset);
    offset += piece.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function fetchDemoSignals(
  demoUrl: string,
  fetchedAt: string,
  options: { maxBytes?: number } = {},
): Promise<DemoSignalFetchResult> {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), DEMO_SIGNALS_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(demoUrl, {
      headers: { Accept: 'text/html', 'User-Agent': DEMO_SIGNALS_USER_AGENT },
      redirect: 'follow',
      signal: abortController.signal,
    });
    if (!response.ok) return { ok: false, status: response.status, reason: 'http_error' };
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType && !/text\/html/i.test(contentType)) return { ok: false, status: response.status, reason: 'not_html' };
    const html = await readBoundedText(response, options.maxBytes ?? DEMO_SIGNALS_MAX_HTML_BYTES);
    if (html === null) return { ok: false, status: response.status, reason: 'too_large' };
    return { ok: true, signals: computeDemoSignals(html, fetchedAt) };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return { ok: false, status: null, reason: timedOut ? 'timeout' : 'fetch_failed' };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Stored JSON → DemoSignals, or null when absent or malformed. */
export function parseDemoSignals(value: string | null | undefined): DemoSignals | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<DemoSignals>;
    if (typeof parsed.version !== 'number' || !Array.isArray(parsed.class_minhash) || !Array.isArray(parsed.frameworks)) return null;
    return parsed as DemoSignals;
  } catch {
    return null;
  }
}
