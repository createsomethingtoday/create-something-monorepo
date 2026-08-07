export const FONT_CUSTOM_CODE_POLICY = 'custom-code-font-loading';
export const SCHEMA_MARKUP_POLICY = 'custom-code-schema-markup-not-allowed';

export const FONT_CUSTOM_CODE_MESSAGE =
  'Font files must be added through Webflow Site settings > Fonts. Remove manually inserted font <link>, @import, or @font-face code, publish the site again, and rerun validation.';
export const SCHEMA_MARKUP_MESSAGE =
  'Schema markup (JSON-LD) is not allowed in new Marketplace template submissions. Remove the schema markup, publish the site again, and rerun validation.';

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

export function findProhibitedMarketplaceCustomCode(html) {
  return [...findProhibitedFontCustomCode(html), ...findProhibitedSchemaMarkup(html)];
}
