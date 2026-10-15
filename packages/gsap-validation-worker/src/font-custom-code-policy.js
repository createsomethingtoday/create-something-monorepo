export const FONT_CUSTOM_CODE_POLICY = 'custom-code-font-loading';
export const SCHEMA_MARKUP_POLICY = 'custom-code-schema-markup-not-allowed';
export const HTML_EMBED_POLICY = 'custom-code-html-embed-not-allowed';

export const FONT_CUSTOM_CODE_MESSAGE =
  'Font files must be added through Webflow Site settings > Fonts. Remove manually inserted font <link>, @import, or @font-face code, publish the site again, and rerun validation.';
export const SCHEMA_MARKUP_MESSAGE =
  'Schema markup (JSON-LD) is not allowed in new Marketplace template submissions. Remove the schema markup, publish the site again, and rerun validation.';
export const HTML_EMBED_MESSAGE =
  'HTML Embed elements may only contain inline SVG (documented on the Instructions page), CSS, or approved scripts. Other custom markup such as <video>, <iframe>, or <img> is not allowed in new Marketplace template submissions. Rebuild it with native Webflow elements (for video, use the Video element or a YouTube/Vimeo iframe), publish the site again, and rerun validation.';

const FONT_STYLESHEET_HOSTS = new Set([
  'api.fontshare.com',
  'cloud.typography.com',
  'fonts.bunny.net',
  'fonts.cdnfonts.com',
  'fonts.googleapis.com',
  'p.typekit.net',
  'use.typekit.net'
]);

function readHtmlAttribute(tag, attribute) {
  const quoted = tag.match(
    new RegExp(`\\b${attribute}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i')
  );
  if (quoted) return quoted[2].trim();

  const unquoted = tag.match(new RegExp(`\\b${attribute}\\s*=\\s*([^\\s>]+)`, 'i'));
  return unquoted?.[1]?.trim();
}

function isStylesheetLink(tag) {
  const rel = readHtmlAttribute(tag, 'rel');
  return rel?.split(/\s+/).some((value) => value.toLowerCase() === 'stylesheet') === true;
}

export function isKnownFontStylesheetUrl(value) {
  if (!value) return false;

  try {
    const parsed = new URL(value, 'https://published-site.invalid');
    return FONT_STYLESHEET_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function fontFinding(kind, source) {
  return {
    kind,
    source,
    policy: FONT_CUSTOM_CODE_POLICY,
    message: FONT_CUSTOM_CODE_MESSAGE
  };
}

export function findProhibitedFontCustomCode(html) {
  if (typeof html !== 'string' || html === '') return [];

  const findings = [];
  const linkTags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of linkTags) {
    const href = readHtmlAttribute(tag, 'href');
    if (isStylesheetLink(tag) && isKnownFontStylesheetUrl(href)) {
      findings.push(fontFinding('font-stylesheet-link', href));
    }
  }

  const stylePattern = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  while ((styleMatch = stylePattern.exec(html)) !== null) {
    const css = styleMatch[1];
    const importPattern = /@import\s+(?:url\(\s*)?(?:(["'])(.*?)\1|([^\s);]+))/gi;
    let importMatch;
    while ((importMatch = importPattern.exec(css)) !== null) {
      const source = (importMatch[2] || importMatch[3] || '').trim();
      if (isKnownFontStylesheetUrl(source)) {
        findings.push(fontFinding('font-import', source));
      }
    }

    if (/@font-face\s*\{/i.test(css)) {
      findings.push(fontFinding('inline-font-face', '@font-face'));
    }
  }

  return findings;
}

export function findProhibitedSchemaMarkup(html) {
  if (typeof html !== 'string' || html === '') return [];

  const findings = [];
  const scriptTags = html.match(/<script\b[^>]*>/gi) || [];
  for (const tag of scriptTags) {
    const type = readHtmlAttribute(tag, 'type')?.toLowerCase();
    if (type === 'application/ld+json') {
      findings.push({
        kind: 'schema-markup',
        source: 'script[type="application/ld+json"]',
        policy: SCHEMA_MARKUP_POLICY,
        message: SCHEMA_MARKUP_MESSAGE
      });
    }
  }

  return findings;
}

// Webflow-generated wrappers that also carry the w-embed class and are not creator custom code.
const NATIVE_EMBED_CLASSES = new Set(['w-video', 'w-password-page']);

// Video providers the Video element itself renders through Embedly; an iframe from these hosts
// is the embed reviewers recommend instead of self-hosted <video> markup.
const VIDEO_PROVIDER_IFRAME_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
  'player.vimeo.com'
]);

function classList(tag) {
  return (readHtmlAttribute(tag, 'class') || '').split(/\s+/).filter(Boolean);
}

// Returns the inner HTML of the element whose opening tag ends at `openEnd`, using depth
// counting on the given tag name so nested elements of the same name are kept intact.
function innerHtmlOf(html, tagName, openEnd) {
  const token = new RegExp(`<(\\/?)${tagName}\\b[^>]*>`, 'gi');
  token.lastIndex = openEnd;
  let depth = 1;
  let match;
  while ((match = token.exec(html)) !== null) {
    if (match[0].endsWith('/>')) continue;
    depth += match[1] === '/' ? -1 : 1;
    if (depth === 0) return html.slice(openEnd, match.index);
  }
  return html.slice(openEnd);
}

function stripBalanced(html, tagName) {
  const open = new RegExp(`<${tagName}\\b[^>]*>`, 'i');
  let result = html;
  let match;
  while ((match = open.exec(result)) !== null) {
    const openEnd = match.index + match[0].length;
    const inner = innerHtmlOf(result, tagName, openEnd);
    const closeToken = result.slice(openEnd + inner.length).match(new RegExp(`^<\\/${tagName}\\b[^>]*>`, 'i'));
    const end = openEnd + inner.length + (closeToken ? closeToken[0].length : 0);
    result = result.slice(0, match.index) + result.slice(end);
  }
  return result;
}

function isVideoProviderIframe(tag) {
  const src = readHtmlAttribute(tag, 'src');
  if (!src) return false;
  try {
    return VIDEO_PROVIDER_IFRAME_HOSTS.has(new URL(src, 'https://published-site.invalid').hostname.toLowerCase());
  } catch {
    return false;
  }
}

// Structural wrappers creators leave around inline SVG icons; they carry no foreign content.
const INERT_WRAPPER_TAGS = new Set(['div', 'span']);

export function disallowedEmbedTags(embedHtml) {
  let markup = embedHtml.replace(/<!--[\s\S]*?-->/g, '');
  for (const tagName of ['script', 'style', 'svg']) {
    markup = stripBalanced(markup, tagName);
  }
  markup = markup.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, (tag) => (isVideoProviderIframe(tag) ? '' : tag));

  const tags = [];
  const tagPattern = /<([a-z][a-z0-9:-]*)\b/gi;
  let match;
  while ((match = tagPattern.exec(markup)) !== null) {
    const name = match[1].toLowerCase();
    if (INERT_WRAPPER_TAGS.has(name)) continue;
    if (!tags.includes(name)) tags.push(name);
  }
  return tags;
}

export function findProhibitedHtmlEmbeds(html) {
  if (typeof html !== 'string' || html === '') return [];

  const findings = [];
  const divPattern = /<div\b[^>]*>/gi;
  let match;
  while ((match = divPattern.exec(html)) !== null) {
    const classes = classList(match[0]);
    if (!classes.includes('w-embed')) continue;
    if (classes.some((name) => NATIVE_EMBED_CLASSES.has(name))) continue;

    const openEnd = match.index + match[0].length;
    const tags = disallowedEmbedTags(innerHtmlOf(html, 'div', openEnd));
    if (tags.length === 0) continue;

    const label = classes.filter((name) => !name.startsWith('w-')).join('.');
    findings.push({
      kind: 'html-embed-markup',
      source: `${label ? `.${label}` : 'div.w-embed'}: ${tags.map((name) => `<${name}>`).join(', ')}`,
      policy: HTML_EMBED_POLICY,
      message: HTML_EMBED_MESSAGE
    });
  }

  return findings;
}

export function findProhibitedMarketplaceCustomCode(html) {
  return [
    ...findProhibitedFontCustomCode(html),
    ...findProhibitedSchemaMarkup(html),
    ...findProhibitedHtmlEmbeds(html)
  ];
}
