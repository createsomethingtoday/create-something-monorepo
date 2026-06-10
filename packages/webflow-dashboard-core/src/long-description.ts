export interface LongDescriptionSanitizeOptions {
  allowImages?: boolean;
}

export interface LongDescriptionImage {
  src: string;
  alt: string;
}

const DEFAULT_OPTIONS: Required<LongDescriptionSanitizeOptions> = {
  allowImages: true
};

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const UNWRAPPED_TAGS = new Set(['article', 'div', 'header', 'main', 'section', 'span', 'u']);
const TEXT_FORMAT_TAGS = new Set(['a', 'strong', 'em', 'p', 'ul', 'ol', 'li', 'br']);
const OPTIONAL_FORMAT_TAGS = new Set(['blockquote', 'code', 'pre', 'hr']);
const MEDIA_TAGS = new Set(['figure', 'figcaption', 'img']);
const BLOCKED_WITH_CONTENT =
  /<(script|style|iframe|object|embed|audio|video|select|textarea|template)\b[^>]*>[\s\S]*?<\/\1>/gi;
const BLOCKED_SELF_CLOSING =
  /<(script|style|iframe|object|embed|audio|video|select|textarea|template)\b[^>]*\/?>/gi;
const TAG_PATTERN = /<\/?[^>]+>/g;
const ORDERED_LIST_PATTERN = /<ol\b[^>]*>([\s\S]*?)<\/ol>/gi;
const LIST_ITEM_PATTERN = /<li\b([^>]*)>[\s\S]*?<\/li>/gi;
const ATTR_PATTERN = /([^\s"'<>/=]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

export function sanitizeLongDescriptionHtml(
  value: string | null | undefined,
  options: LongDescriptionSanitizeOptions = {}
): string {
  const trimmed = value?.trim();
  if (!trimmed) return '';

  const resolved = { ...DEFAULT_OPTIONS, ...options };
  if (!containsHtmlTag(trimmed)) {
    return plainTextToLongDescriptionHtml(trimmed);
  }

  const withoutBlocked = normalizeQuillListMarkup(trimmed)
    .replace(BLOCKED_WITH_CONTENT, '')
    .replace(BLOCKED_SELF_CLOSING, '');

  let output = '';
  let cursor = 0;
  let match: RegExpExecArray | null;
  const suppressedClosings = new Map<string, number>();

  while ((match = TAG_PATTERN.exec(withoutBlocked))) {
    output += escapeHtmlText(withoutBlocked.slice(cursor, match.index));
    output += sanitizeTag(match[0], resolved, suppressedClosings);
    cursor = match.index + match[0].length;
  }

  output += escapeHtmlText(withoutBlocked.slice(cursor));
  return cleanupLongDescriptionHtml(output);
}

function normalizeQuillListMarkup(value: string): string {
  return value.replace(ORDERED_LIST_PATTERN, (source, content: string) => {
    const matches = Array.from(content.matchAll(LIST_ITEM_PATTERN));
    if (matches.length === 0) return source;

    const matchedItems = matches.map((match) => match[0]).join('');
    if (content.replace(/\s+/g, '') !== matchedItems.replace(/\s+/g, '')) {
      return source;
    }

    let output = '';
    let currentTag: 'ol' | 'ul' | null = null;
    let currentItems: string[] = [];

    const flush = () => {
      if (!currentTag || currentItems.length === 0) return;
      output += `<${currentTag}>${currentItems.join('')}</${currentTag}>`;
      currentTag = null;
      currentItems = [];
    };

    for (const match of matches) {
      const attrs = parseAttributes(match[1] || '');
      const listTag = attrs.get('data-list') === 'bullet' ? 'ul' : 'ol';
      if (currentTag && currentTag !== listTag) {
        flush();
      }
      currentTag = listTag;
      currentItems.push(match[0]);
    }

    flush();
    return output || source;
  });
}

export function plainTextToLongDescriptionHtml(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return '';

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtmlText(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function getLongDescriptionText(value: string | null | undefined): string {
  return decodeBasicEntities(String(value || '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractLongDescriptionImages(
  value: string | null | undefined
): LongDescriptionImage[] {
  const images: LongDescriptionImage[] = [];
  const html = sanitizeLongDescriptionHtml(value, { allowImages: true });
  const imagePattern = /<img\b([^>]*)>/gi;
  let match: RegExpExecArray | null;

  while ((match = imagePattern.exec(html))) {
    const attrs = parseAttributes(match[1] || '');
    const src = sanitizeImageUrl(attrs.get('src') || '');
    if (!src) continue;
    images.push({
      src,
      alt: attrs.get('alt') || ''
    });
  }

  return images;
}

function containsHtmlTag(value: string): boolean {
  return /<\/?[a-zA-Z][\w:-]*(?:\s[^>]*)?>/.test(value);
}

function sanitizeTag(
  tagSource: string,
  options: Required<LongDescriptionSanitizeOptions>,
  suppressedClosings: Map<string, number>
): string {
  const tagMatch = tagSource.match(/^<\s*(\/?)\s*([a-zA-Z][\w:-]*)\b([^>]*)\/?\s*>$/);
  if (!tagMatch) return '';

  const closing = Boolean(tagMatch[1]);
  const rawName = tagMatch[2].toLowerCase();
  const attrs = tagMatch[3] || '';
  const name = normalizeTagName(rawName);

  if (!isAllowedTag(name, options)) {
    if (!closing && !isVoidTag(name)) incrementSuppressedClosing(suppressedClosings, name);
    if (closing && shouldSuppressClosing(suppressedClosings, name)) return '';
    return '';
  }
  if (UNWRAPPED_TAGS.has(name)) return '';

  if (closing) {
    if (shouldSuppressClosing(suppressedClosings, name)) return '';
    if (name === 'br' || name === 'hr' || name === 'img') return '';
    return `</${name}>`;
  }

  if (name === 'br' || name === 'hr') return `<${name}>`;
  if (name === 'a') {
    const anchor = sanitizeAnchorTag(attrs);
    if (!anchor) incrementSuppressedClosing(suppressedClosings, name);
    return anchor;
  }
  if (name === 'img') return sanitizeImageTag(attrs, options);
  if (name === 'figure' || name === 'figcaption') return `<${name}>`;
  return `<${name}>`;
}

function incrementSuppressedClosing(
  suppressedClosings: Map<string, number>,
  tagName: string
): void {
  suppressedClosings.set(tagName, (suppressedClosings.get(tagName) || 0) + 1);
}

function shouldSuppressClosing(suppressedClosings: Map<string, number>, tagName: string): boolean {
  const count = suppressedClosings.get(tagName) || 0;
  if (count <= 0) return false;
  if (count === 1) {
    suppressedClosings.delete(tagName);
  } else {
    suppressedClosings.set(tagName, count - 1);
  }
  return true;
}

function isVoidTag(tagName: string): boolean {
  return tagName === 'br' || tagName === 'hr' || tagName === 'img';
}

function normalizeTagName(tagName: string): string {
  if (tagName === 'h1' || tagName === 'h2') return 'h3';
  if (tagName === 'b') return 'strong';
  if (tagName === 'i') return 'em';
  return tagName;
}

function isAllowedTag(tagName: string, options: Required<LongDescriptionSanitizeOptions>): boolean {
  if (TEXT_FORMAT_TAGS.has(tagName)) return true;
  if (OPTIONAL_FORMAT_TAGS.has(tagName)) return true;
  if (HEADING_TAGS.has(tagName) && tagName !== 'h1' && tagName !== 'h2') return true;
  if (UNWRAPPED_TAGS.has(tagName)) return true;
  if (options.allowImages && MEDIA_TAGS.has(tagName)) return true;
  return false;
}

function sanitizeAnchorTag(attrsSource: string): string {
  const attrs = parseAttributes(attrsSource);
  const href = sanitizeLinkUrl(attrs.get('href') || '');
  if (!href) return '';
  return `<a href="${escapeHtmlAttribute(href)}" target="_blank" rel="noopener noreferrer">`;
}

function sanitizeImageTag(
  attrsSource: string,
  options: Required<LongDescriptionSanitizeOptions>
): string {
  if (!options.allowImages) return '';

  const attrs = parseAttributes(attrsSource);
  const src = sanitizeImageUrl(attrs.get('src') || '');
  if (!src) return '';

  const alt = attrs.get('alt') || '';
  const width = sanitizeDimension(attrs.get('width') || '');
  const height = sanitizeDimension(attrs.get('height') || '');
  const dimensionAttrs = [
    width ? ` width="${width}"` : '',
    height ? ` height="${height}"` : ''
  ].join('');

  return `<img src="${escapeHtmlAttribute(src)}" alt="${escapeHtmlAttribute(alt)}" loading="lazy"${dimensionAttrs}>`;
}

function sanitizeLinkUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    if (url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'mailto:') {
      return url.toString();
    }
  } catch {
    return '';
  }

  return '';
}

function sanitizeImageUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return '';
    if (url.username || url.password) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function sanitizeDimension(value: string): string {
  const trimmed = value.trim();
  if (!/^\d{1,5}$/.test(trimmed)) return '';
  const numeric = Number(trimmed);
  if (!Number.isInteger(numeric) || numeric <= 0 || numeric > 10000) return '';
  return String(numeric);
}

function parseAttributes(attrsSource: string): Map<string, string> {
  const attrs = new Map<string, string>();
  let match: RegExpExecArray | null;

  while ((match = ATTR_PATTERN.exec(attrsSource))) {
    const name = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? '';
    attrs.set(name, decodeBasicEntities(value.trim()));
  }

  return attrs;
}

function cleanupLongDescriptionHtml(value: string): string {
  return value
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<li>\s*<\/li>/gi, '')
    .replace(/<figcaption>\s*<\/figcaption>/gi, '')
    .replace(/\s+<\/(p|li|h3|h4|h5|h6|strong|em|a|figcaption)>/gi, '</$1>')
    .replace(/<(p|li|h3|h4|h5|h6|strong|em|a|figcaption)>\s+/gi, '<$1>')
    .trim();
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&(?!(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}
