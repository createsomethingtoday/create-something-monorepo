type ParsedComponent = {
  name: string;
  instanceCount: number;
  isUnused: boolean;
};

type ParsedCmsCollection = {
  name: string;
  itemCount: number;
};

type ParsedInteraction = {
  trigger: string;
  targetElement: string;
  type: 'page-load' | 'element-trigger' | 'scroll' | 'other';
};

type SiteNameInput = {
  url: string;
  title?: string | null;
  uiTexts?: string[];
};

function normalizeWhitespace(value: string): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupe<T>(items: T[], keyFn: (item: T) => string): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function parseCountSegments(text: string, unitPattern: string): string[] {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return [];
  const withBoundaries = normalized.replace(
    new RegExp(`(\\d+\\s*(?:${unitPattern}))`, 'gi'),
    '$1|'
  );
  return withBoundaries
    .split('|')
    .map((segment) => normalizeWhitespace(segment))
    .filter(Boolean);
}

function stripLeadingNoise(value: string, prefixes: string[]): string {
  let current = normalizeWhitespace(value);
  for (const prefix of prefixes) {
    if (current.toLowerCase().startsWith(prefix.toLowerCase())) {
      current = normalizeWhitespace(current.slice(prefix.length));
    }
  }
  return current;
}

function looksLikeDate(value: string): boolean {
  const text = normalizeWhitespace(value);
  if (!text) return false;
  if (/(coordinated universal time|gmt|utc)/i.test(text)) return true;
  if (/\b(mon|tue|wed|thu|fri|sat|sun)\b/i.test(text)) return true;
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text)) return true;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed);
}

function parseSlugFromPreviewUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('preview');
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    return parts[parts.length - 1] || null;
  } catch {
    return null;
  }
}

function humanizeSlug(slug: string): string {
  const withoutHash = slug.replace(/-[a-f0-9]{16,}$/i, '');
  const spaced = withoutHash.replace(/[-_]+/g, ' ').trim();
  if (!spaced) return slug;
  return spaced
    .split(' ')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function extractCandidateFromTitle(title: string): string | null {
  const raw = normalizeWhitespace(title);
  if (!raw) return null;
  const parts = raw.split(' - ').map((part) => normalizeWhitespace(part)).filter(Boolean);
  const candidates = [raw, ...parts];
  const forbidden = new Set([
    'Webflow',
    'Preview',
    'Designer',
    'Dashboard'
  ]);
  for (const candidate of candidates) {
    if (!candidate || forbidden.has(candidate)) continue;
    if (looksLikeDate(candidate)) continue;
    if (candidate.length < 2 || candidate.length > 120) continue;
    return candidate;
  }
  return null;
}

export function deriveSiteName(input: SiteNameInput): string {
  const fromTitle = extractCandidateFromTitle(input.title || '');
  if (fromTitle) return fromTitle;

  const uiTexts = Array.isArray(input.uiTexts) ? input.uiTexts : [];
  for (const text of uiTexts) {
    const normalized = normalizeWhitespace(text);
    if (!normalized) continue;
    if (normalized.length < 2 || normalized.length > 100) continue;
    if (/^https?:\/\//i.test(normalized)) continue;
    if (looksLikeDate(normalized)) continue;
    if (/(design|cms|insights|share|publish|webflow)/i.test(normalized)) continue;
    if (/template/i.test(normalized) && normalized.length <= 60) return normalized;
  }

  const slug = parseSlugFromPreviewUrl(input.url);
  if (slug) return humanizeSlug(slug);
  return 'Unknown';
}

export function parseComponents(texts: string[]): ParsedComponent[] {
  const out: ParsedComponent[] = [];
  const nameToIndex = new Map<string, number>();
  const noisyPrefixes = ['Page Structures', 'Components'];

  for (const raw of texts || []) {
    for (const segment of parseCountSegments(raw, 'instances?')) {
      const match = segment.match(/^(.+?)\s*(\d+)\s*instances?$/i);
      if (!match) continue;
      let name = stripLeadingNoise(match[1], noisyPrefixes);
      name = name.replace(/^[^\w]+/, '').replace(/[^\w)\]]+$/u, '').trim();
      if (!name) continue;
      if (/^\d+$/.test(name)) continue;
      if (!/[A-Za-z]/.test(name)) continue;
      if (name.length > 140) continue;
      const count = Number.parseInt(match[2], 10);
      if (!Number.isFinite(count)) continue;

      const existing = nameToIndex.get(name.toLowerCase());
      if (existing == null) {
        nameToIndex.set(name.toLowerCase(), out.length);
        out.push({ name, instanceCount: count, isUnused: count === 0 });
      } else {
        out[existing].instanceCount = Math.max(out[existing].instanceCount, count);
        out[existing].isUnused = out[existing].instanceCount === 0;
      }
    }
  }

  return out;
}

export function parseCmsCollections(texts: string[]): ParsedCmsCollection[] {
  const out: ParsedCmsCollection[] = [];
  const skipNames = new Set([
    'CMS',
    'Collections',
    'Collection',
    'Content',
    'Items',
    'Fields'
  ]);

  for (const raw of texts || []) {
    const segments = parseCountSegments(raw, 'items?|entries|records?');
    for (const segment of segments) {
      const match = segment.match(/^(?:📋\s*)?(.+?)\s*(\d+)\s*(?:items?|entries|records?)$/i);
      if (!match) continue;
      let name = normalizeWhitespace(match[1]).replace(/^[^\w]+/u, '');
      name = stripLeadingNoise(name, ['CMS Collections', 'Collections']);
      if (!name || skipNames.has(name)) continue;
      if (!/[A-Za-z]/.test(name)) continue;
      if (name.length > 120) continue;

      const count = Number.parseInt(match[2], 10);
      if (!Number.isFinite(count)) continue;
      out.push({ name, itemCount: count });
    }
  }

  return dedupe(out, (item) => item.name.toLowerCase());
}

function classifyInteractionType(trigger: string): ParsedInteraction['type'] {
  const t = trigger.toLowerCase();
  if (t.includes('page load')) return 'page-load';
  if (t.includes('scroll')) return 'scroll';
  if (
    t.includes('hover') ||
    t.includes('click') ||
    t.includes('tap') ||
    t.includes('mouse') ||
    t.includes('dropdown')
  ) {
    return 'element-trigger';
  }
  return 'other';
}

export function parseInteractions(texts: string[]): ParsedInteraction[] {
  const out: ParsedInteraction[] = [];
  const skipPatterns = [
    /interactions/i,
    /timed animation/i,
    /^new\b/i,
    /^search\b/i,
    /^add\b/i
  ];

  for (const raw of texts || []) {
    const text = normalizeWhitespace(raw);
    if (!text) continue;
    if (text.length < 4 || text.length > 200) continue;
    if (skipPatterns.some((re) => re.test(text))) continue;
    if (/no interactions/i.test(text)) return [];

    let trigger = '';
    let target = '';

    const slashIdx = text.indexOf('/');
    if (slashIdx > 0) {
      trigger = normalizeWhitespace(text.slice(0, slashIdx));
      target = normalizeWhitespace(text.slice(slashIdx + 1));
    } else {
      const triggerMatch = text.match(
        /(page load|while scrolling in view|while scrolling|scroll into view|mouse click \(tap\)|mouse hover|click|hover|tap)/i
      );
      if (!triggerMatch) continue;
      trigger = normalizeWhitespace(triggerMatch[1]);
      target = normalizeWhitespace(text.replace(triggerMatch[0], ''));
    }

    if (!trigger) continue;
    target = target.replace(/^[-:]/, '').replace(/^on\s+/i, '').trim();
    if (!target || target === '<none>' || /^none$/i.test(target)) {
      target = 'Global';
    }

    const targetLower = target.toLowerCase();
    const noisyTarget = [
      'bring your site to life',
      'powered by gsap',
      'trigger on',
      'custom event',
      'add animations',
      'hoverpage loadscrollcustom'
    ].some((phrase) => targetLower.includes(phrase));
    if (noisyTarget) continue;
    if (target.length > 120 && !/[.#\[]/.test(target)) continue;

    out.push({
      trigger,
      targetElement: target,
      type: classifyInteractionType(trigger)
    });
  }

  return dedupe(out, (item) => `${item.trigger.toLowerCase()}|${item.targetElement.toLowerCase()}`);
}
