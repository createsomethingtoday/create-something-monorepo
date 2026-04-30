/**
 * Pure utility functions for template review logic.
 * Extracted for testability — no side effects, no browser dependencies.
 */

// =============================================================================
// Text sanitization: repair "s → space" font corruption
// =============================================================================

/**
 * Detect the "every-s-to-space" text corruption pattern.
 * Returns true when ≥2 known corrupted fragments are found.
 */
export function detectSCorruption(sample: string): boolean {
  const knownCorrupted = [
    'de cription', 'di play', 'tab ', 'cla s', 'http :', 'ub cri',
    'po t', 'ub mit', 'e ion', 'e ign', 'e arch', 'tyle '
  ];
  let hits = 0;
  const lower = sample.toLowerCase();
  for (const fragment of knownCorrupted) {
    if (lower.includes(fragment)) hits++;
  }
  return hits >= 2;
}

/**
 * Repair text where every "s" was replaced with a space.
 *
 * Conservative: only repairs strings that contain at least one known
 * corruption fragment AND have zero "s" characters.  This avoids
 * corrupting clean text like "hello world" which legitimately has no "s".
 */
export function repairSCorruption(text: string): string {
  // If the string already contains a real "s", it's not corrupted
  if (/s/i.test(text)) return text;

  // Must contain at least one known corruption pattern to proceed
  const knownFragments = [
    'de cription', 'di play', 'ub cri', 'ub mit', 'tab ', 'cla ',
    'http :', 'po t', 'e ign', 'e ion', 'e arch', 'tyle ',
    'item ', 'image ', 'cript', 'lider', 'ection', 'croll',
    'u ic', 'pon or', 'peaker', 'pon e', 'peed', 'tatu '
  ];
  const lower = text.toLowerCase();
  if (!knownFragments.some((f) => lower.includes(f))) return text;

  return text
    .replace(/([a-z]) ([a-z])/g, '$1s$2')
    .replace(/([a-z]) ([-:,)])/g, '$1s$2')
    .replace(/([a-z]) $/g, '$1s');
}

/**
 * Walk an object tree and repair all string values affected by s-corruption.
 * Returns the input unchanged if corruption is not detected.
 */
export function sanitizeAuditPayload(raw: unknown): unknown {
  if (raw == null || typeof raw !== 'object') return raw;

  const json = JSON.stringify(raw);
  if (!detectSCorruption(json)) return raw;

  function walk(value: unknown): unknown {
    if (typeof value === 'string') return repairSCorruption(value);
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        result[key] = walk(val);
      }
      return result;
    }
    return value;
  }

  return walk(raw);
}

// =============================================================================
// 404 page detection
// =============================================================================

/**
 * Determine if a page title indicates a 404/error page.
 */
export function is404PageTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  const lower = title.toLowerCase();
  return (
    lower === 'not found' ||
    lower === '404' ||
    lower.startsWith('404 ') ||
    lower.includes('page not found')
  );
}

// =============================================================================
// URL pattern matching
// =============================================================================

/**
 * Check if a URL matches any of the critical utility page patterns.
 */
export function isCriticalUtilityUrl(url: string): boolean {
  const path = url.toLowerCase();
  const patterns = ['/licens', '/instruction', '/changelog', '/change-log', '/style-guide', '/styleguide'];
  return patterns.some((p) => path.includes(p));
}

/**
 * Check if a URL looks like a Webflow tab/accordion/lightbox anchor
 * that should not be counted as a placeholder href.
 */
export function isWebflowComponentAnchor(href: string): boolean {
  if (!href.startsWith('#')) return false;
  if (/^#w-tabs-/.test(href)) return true;
  if (/^#w-dropdown-/.test(href)) return true;
  if (/^#w--/.test(href)) return true;
  return false;
}

// =============================================================================
// Alt Text Evidence Classification
// =============================================================================

export type AltTextEvidenceBucket = 'informative' | 'functional' | 'decorative-review' | 'unknown';

export interface AltTextEvidenceClassification {
  bucket: AltTextEvidenceBucket;
  reason: string;
}

function evidenceText(example: Record<string, unknown>, key: string): string {
  const value = example[key];
  return typeof value === 'string' ? value : '';
}

function evidenceNumber(example: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = example[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

/**
 * Classify a missing-alt example so reviewer evidence leads with real content
 * images and demotes shared UI chrome that often needs manual intent review.
 */
export function classifyAltTextEvidenceExample(
  example: Record<string, unknown>,
  pageUrl = ''
): AltTextEvidenceClassification {
  const selector = evidenceText(example, 'selector');
  const className = evidenceText(example, 'className');
  const src = evidenceText(example, 'src');
  const href = evidenceText(example, 'href');
  const text = evidenceText(example, 'text') || evidenceText(example, 'linkText');
  const role = evidenceText(example, 'role');
  const ariaLabel = evidenceText(example, 'ariaLabel') || evidenceText(example, 'aria-label');
  const haystack = [
    selector,
    className,
    src,
    href,
    text,
    role,
    ariaLabel,
    pageUrl
  ].join(' ').toLowerCase();

  const width = evidenceNumber(example, ['width', 'clientWidth', 'naturalWidth']);
  const height = evidenceNumber(example, ['height', 'clientHeight', 'naturalHeight']);
  const visibleArea = width * height;

  const hasInformativeContext =
    /\/(blog|post|article|news|case-stud|project|portfolio|service|product|team|speaker|event)\b/.test(pageUrl.toLowerCase()) ||
    /\b(blog|post|article|news|thumbnail|thumb|hero|cover|featured|main-image|details-main-image|card-image|collection|cms|case-study|project|portfolio|service|product|team|speaker|event|avatar|portrait|profile)\b/.test(haystack);

  const hasSharedChromeContext =
    /\b(brand|logo|logotype|icon|button-icon|btn-icon|arrow|chevron|caret|social|hamburger|menu|close|plus|minus|play|pause|badge|decor|decoration|shape|line|background|bg-image|navbar|nav-|footer|cursor|swiper|slider-control)\b/.test(haystack);

  const looksLinkedOrInteractive =
    Boolean(href) ||
    /\b(a\.|link|button|btn|cta|w-button|role=["']?button|tab|accordion|dropdown)\b/.test(haystack) ||
    role === 'button' ||
    role === 'link';

  if (hasInformativeContext && !hasSharedChromeContext) {
    return { bucket: 'informative', reason: 'content/CMS image context' };
  }

  if (visibleArea >= 40000 && !hasSharedChromeContext) {
    return { bucket: 'informative', reason: 'large visible image' };
  }

  if (hasSharedChromeContext && !href) {
    return { bucket: 'decorative-review', reason: 'shared UI chrome or decorative asset' };
  }

  if (looksLinkedOrInteractive && !text.trim() && !ariaLabel.trim()) {
    return { bucket: 'functional', reason: 'image appears to supply an interactive accessible name' };
  }

  if (hasSharedChromeContext) {
    return { bucket: 'decorative-review', reason: 'shared UI chrome or decorative asset' };
  }

  return { bucket: 'unknown', reason: 'insufficient context' };
}

// =============================================================================
// Slug resolution
// =============================================================================

/**
 * Resolve a Designer page slug against precheck discovered URLs.
 * Returns the real URL if a match is found, or null if the slug would
 * produce a phantom 404 probe.
 */
export function resolveDesignerSlug(
  slug: string,
  origin: string,
  discoveredUrls: string[]
): string | null {
  if (slug === 'home') return origin;

  const bareUrl = `${origin}/${slug}`;
  const discoveredLower = discoveredUrls.map((u) => u.toLowerCase());

  // Direct match
  if (discoveredLower.includes(bareUrl.toLowerCase())) return bareUrl;

  // Suffix match (e.g. "/templates/licensing" matches slug "licensing")
  const match = discoveredUrls.find(
    (u) => u.toLowerCase().endsWith(`/${slug}`)
  );
  if (match) return match;

  // No match — skip to avoid phantom 404
  return null;
}

// =============================================================================
// WCAG Contrast Utilities (testable outside of browser context)
// =============================================================================

/**
 * Calculate relative luminance per WCAG 2.1.
 * Input: sRGB values 0-255.
 */
export function wcagLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate WCAG contrast ratio between two colors.
 * Returns a value >= 1 (e.g., 4.5 means 4.5:1).
 */
export function wcagContrastRatio(
  fg: { r: number; g: number; b: number },
  bg: { r: number; g: number; b: number }
): number {
  const l1 = wcagLuminance(fg.r, fg.g, fg.b);
  const l2 = wcagLuminance(bg.r, bg.g, bg.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determine the WCAG AA contrast threshold for text.
 * Normal text: 4.5:1
 * Large text (>=24px, or >=18.66px if bold): 3:1
 */
export function wcagThreshold(fontSizePx: number, isBold: boolean): number {
  if (fontSizePx >= 24) return 3;
  if (fontSizePx >= 18.66 && isBold) return 3;
  return 4.5;
}

// =============================================================================
// Scoring
// =============================================================================

export type Severity = 'critical' | 'major' | 'minor' | 'info';

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 20,
  major: 10,
  minor: 5,
  info: 2
};

/**
 * Compute a weighted overall score (0-100) and letter grade from check results.
 */
export function computeScore(
  checks: Array<{ status: string; severity: Severity }>
): { score: number; grade: 'A' | 'B' | 'C' | 'D' | 'F' } {
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const check of checks) {
    if (check.status === 'manual') continue;
    const weight = SEVERITY_WEIGHTS[check.severity] || 5;
    totalWeight += weight;
    if (check.status === 'pass') earnedWeight += weight;
    else if (check.status === 'partial') earnedWeight += weight * 0.5;
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  const grade = score >= 90 ? 'A' as const
    : score >= 75 ? 'B' as const
    : score >= 60 ? 'C' as const
    : score >= 40 ? 'D' as const
    : 'F' as const;

  return { score, grade };
}
