export const FONT_CUSTOM_CODE_POLICY = 'custom-code-font-loading';

export const FONT_CUSTOM_CODE_MESSAGE =
  'Font files must be added through Webflow Site settings > Fonts. Remove manually inserted font <link>, @import, or @font-face code, publish the site again, and rerun validation.';

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

function finding(kind, source) {
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
      findings.push(finding('font-stylesheet-link', href));
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
        findings.push(finding('font-import', source));
      }
    }

    if (/@font-face\s*\{/i.test(css)) {
      findings.push(finding('inline-font-face', '@font-face'));
    }
  }

  return findings;
}
