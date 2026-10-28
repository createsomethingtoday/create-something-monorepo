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

export const HTML_EMBED_SCRIPT_POLICY = 'custom-code-html-embed-script-unverified';
export const HTML_EMBED_SCRIPT_MESSAGE =
  'This HTML Embed contains a script. Only approved scripts are allowed in HTML Embeds, and this check cannot verify script contents. A reviewer will check it against the custom-code policy; remove it if it is not an approved GSAP script.';

function classList(tag) {
  return (readHtmlAttribute(tag, 'class') || '').split(/\s+/).filter(Boolean);
}

// Elements whose content the HTML parser treats as raw text: tag-like text inside them is not markup.
const RAW_TEXT_TAGS = new Set(['script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript']);
const TAG_PATTERN = /<(\/?)([a-z][a-z0-9:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/iy;

// Yields comment, text, and tag tokens from `start`, skipping raw-text element content the way
// the browser does. Each raw-text tag token carries its `content`.
function* htmlTokens(html, start = 0) {
  let index = start;
  while (index < html.length) {
    const lt = html.indexOf('<', index);
    if (lt === -1) {
      yield { type: 'text', text: html.slice(index), start: index, end: html.length };
      return;
    }
    if (lt > index) yield { type: 'text', text: html.slice(index, lt), start: index, end: lt };
    if (html.startsWith('<!--', lt)) {
      const close = html.indexOf('-->', lt + 4);
      const end = close === -1 ? html.length : close + 3;
      yield { type: 'comment', start: lt, end };
      index = end;
      continue;
    }
    TAG_PATTERN.lastIndex = lt;
    const match = TAG_PATTERN.exec(html);
    if (!match) {
      yield { type: 'text', text: '<', start: lt, end: lt + 1 };
      index = lt + 1;
      continue;
    }
    const name = match[2].toLowerCase();
    const token = {
      type: match[1] ? 'close' : 'open',
      name,
      raw: match[0],
      selfClosing: match[4] === '/',
      start: lt,
      end: lt + match[0].length
    };
    if (token.type === 'open' && RAW_TEXT_TAGS.has(name)) {
      const closePattern = new RegExp(`</${name}\\b[^>]*>`, 'ig');
      closePattern.lastIndex = token.end;
      const close = closePattern.exec(html);
      token.content = html.slice(token.end, close ? close.index : html.length);
      token.end = close ? close.index + close[0].length : html.length;
    }
    yield token;
    index = token.end;
  }
}

// Returns the inner HTML of the div whose opening tag ends at `openEnd`.
function innerDivHtml(html, openEnd) {
  let depth = 1;
  for (const token of htmlTokens(html, openEnd)) {
    // <div/> still opens a div in HTML, so the self-closing slash is ignored.
    if (token.name !== 'div') continue;
    depth += token.type === 'close' ? -1 : 1;
    if (depth === 0) return html.slice(openEnd, token.start);
  }
  return html.slice(openEnd);
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

// Structural wrappers creators leave around inline SVG icons. They are only inert when the
// embed actually holds permitted content.
const INERT_WRAPPER_TAGS = new Set(['div', 'span']);

function analyseEmbed(embedHtml) {
  const tags = [];
  const scripts = [];
  let permitted = 0;
  const wrappers = [];
  let svgDepth = 0;
  const add = (name) => {
    if (!tags.includes(name)) tags.push(name);
  };
  for (const token of htmlTokens(embedHtml)) {
    if (token.type === 'comment') continue;
    if (token.type === 'text') {
      if (svgDepth === 0 && token.text.replace(/&nbsp;|&#160;/gi, '').trim()) add('#text');
      continue;
    }
    if (token.name === 'svg' && !token.selfClosing) {
      if (token.type === 'open') {
        svgDepth += 1;
        permitted += 1;
      } else if (svgDepth > 0) svgDepth -= 1;
      continue;
    }
    if (token.type === 'close') continue;
    if (svgDepth > 0) {
      // foreignObject re-enters HTML parsing inside SVG, so its content is not inert SVG.
      if (token.name === 'foreignobject') add('foreignObject');
      continue;
    }
    if (token.name === 'style') permitted += 1;
    else if (token.name === 'script') {
      permitted += 1;
      if (readHtmlAttribute(token.raw, 'type')?.toLowerCase() !== 'application/ld+json') {
        scripts.push(readHtmlAttribute(token.raw, 'src') || 'inline script');
      }
    } else if (token.name === 'iframe' && isVideoProviderIframe(token.raw)) permitted += 1;
    else if (INERT_WRAPPER_TAGS.has(token.name)) {
      if (!wrappers.includes(token.name)) wrappers.push(token.name);
    }
    else add(token.name);
  }
  if (permitted === 0) wrappers.forEach(add);
  return { tags, scripts };
}

export function disallowedEmbedTags(embedHtml) {
  return analyseEmbed(embedHtml).tags;
}

function* creatorEmbeds(html) {
  const divPattern = /<div\b[^>]*>/gi;
  let match;
  while ((match = divPattern.exec(html)) !== null) {
    const classes = classList(match[0]);
    if (!classes.includes('w-embed')) continue;
    if (classes.some((name) => NATIVE_EMBED_CLASSES.has(name))) continue;
    const label = classes.filter((name) => !name.startsWith('w-')).join('.');
    yield { label: label ? `.${label}` : 'div.w-embed', inner: innerDivHtml(html, match.index + match[0].length) };
  }
}

export function findProhibitedHtmlEmbeds(html) {
  if (typeof html !== 'string' || html === '') return [];

  const findings = [];
  for (const embed of creatorEmbeds(html)) {
    const { tags } = analyseEmbed(embed.inner);
    if (tags.length === 0) continue;
    findings.push({
      kind: 'html-embed-markup',
      source: `${embed.label}: ${tags.map((name) => (name === '#text' ? 'text' : `<${name}>`)).join(', ')}`,
      policy: HTML_EMBED_POLICY,
      message: HTML_EMBED_MESSAGE
    });
  }

  return findings;
}

// Scripts inside HTML Embeds. The GSAP worker validates script contents itself; consumers
// without that check must surface these for review instead of treating them as allowed.
export function findHtmlEmbedScripts(html) {
  if (typeof html !== 'string' || html === '') return [];

  const findings = [];
  for (const embed of creatorEmbeds(html)) {
    for (const script of analyseEmbed(embed.inner).scripts) {
      findings.push({
        kind: 'html-embed-script',
        source: `${embed.label}: ${script}`,
        policy: HTML_EMBED_SCRIPT_POLICY,
        message: HTML_EMBED_SCRIPT_MESSAGE
      });
    }
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
