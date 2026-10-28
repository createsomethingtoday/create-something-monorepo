import { parse, parseFragment } from 'parse5';

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

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

// Embed checks walk the tree an HTML5 parser builds, so comments, raw-text elements, quoted
// attributes, and SVG breakout tags are handled the way the browser handles them.
function attribute(node, name) {
  return node.attrs?.find((attr) => attr.name === name)?.value;
}

function classList(node) {
  return (attribute(node, 'class') || '').split(/\s+/).filter(Boolean);
}

function children(node) {
  return node.content?.childNodes || node.childNodes || [];
}

function isVideoProviderIframe(node) {
  const src = attribute(node, 'src');
  // srcdoc wins over src in the browser, so the provider URL would not be what renders.
  if (!src || attribute(node, 'srcdoc') !== undefined) return false;
  try {
    return VIDEO_PROVIDER_IFRAME_HOSTS.has(new URL(src, 'https://published-site.invalid').hostname.toLowerCase());
  } catch {
    return false;
  }
}

// GSAP custom code is the only script exception in the submission guidelines, so an external
// script in an embed must load GSAP (core or plugins) from Webflow's GSAP host or a public npm CDN.
const GSAP_SCRIPT_SOURCES = [
  { hosts: ['cdn.prod.website-files.com', 'unpkg.com'], path: /^\/gsap(?:@[^/]+)?\//i },
  { hosts: ['cdn.jsdelivr.net'], path: /^\/(?:npm\/gsap(?:@[^/]+)?|gh\/greensock\/gsap(?:@[^/]+)?)\//i },
  { hosts: ['cdnjs.cloudflare.com'], path: /^\/ajax\/libs\/gsap\//i }
];

function isGsapScriptSource(src) {
  try {
    const url = new URL(src, 'https://published-site.invalid');
    return GSAP_SCRIPT_SOURCES.some(
      (source) => source.hosts.includes(url.hostname.toLowerCase()) && source.path.test(url.pathname)
    );
  } catch {
    return false;
  }
}

// Structural wrappers creators leave around inline SVG icons. A wrapper is inert only when it
// holds permitted content and nothing else.
const INERT_WRAPPER_TAGS = new Set(['div', 'span']);

// Inline event handlers and javascript: URLs run code without a <script> element.
const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction', 'data', 'to', 'from', 'values']);

function inlineCodeAttributes(node) {
  return (node.attrs || [])
    .filter(
      (attr) =>
        /^on/i.test(attr.name) ||
        (URL_ATTRIBUTES.has(attr.name.toLowerCase()) && /^\s*javascript:/i.test(attr.value.replace(/[\u0000-\u001f]/g, '')))
    )
    .map((attr) => `${node.tagName}[${attr.prefix ? `${attr.prefix}:` : ''}${attr.name}]`);
}

function collectInlineCode(node, result) {
  for (const label of inlineCodeAttributes(node)) result.add(label);
  for (const child of children(node)) collectInlineCode(child, result);
}

function analyseNodes(nodes, result) {
  let permitted = false;
  for (const node of nodes) {
    if (node.tagName) collectInlineCode(node, result);
    if (node.nodeName === '#comment') continue;
    if (node.nodeName === '#text') {
      if (node.value.replace(/ /g, '').trim()) result.add('#text');
      continue;
    }
    if (!node.tagName) continue;
    if (node.namespaceURI === SVG_NAMESPACE) {
      permitted = true;
      inspectSvg(node, result);
      continue;
    }
    const name = node.tagName.toLowerCase();
    if (name === 'style') permitted = true;
    else if (name === 'script') {
      const src = attribute(node, 'src');
      if (src !== undefined && !isGsapScriptSource(src)) {
        result.add(`script src="${src}"`);
        continue;
      }
      permitted = true;
      if (attribute(node, 'type')?.toLowerCase() !== 'application/ld+json') {
        result.scripts.push(src || 'inline script');
      }
    } else if (name === 'iframe' && isVideoProviderIframe(node)) permitted = true;
    else if (INERT_WRAPPER_TAGS.has(name)) {
      if (analyseNodes(children(node), result)) permitted = true;
      else result.add(name);
    } else result.add(name);
  }
  return permitted;
}

// foreignObject re-enters HTML parsing inside SVG, so its content is not inert SVG. SVG
// <script> elements run like HTML ones and are reported with them.
function inspectSvg(node, result) {
  for (const child of children(node)) {
    if (child.tagName === 'foreignObject') result.add('foreignObject');
    else if (child.tagName === 'script') {
      const href = attribute(child, 'href');
      if (href !== undefined && !isGsapScriptSource(href)) result.add(`script src="${href}"`);
      else result.scripts.push(href || 'inline SVG script');
    }
    if (child.tagName && child.tagName !== 'foreignObject') inspectSvg(child, result);
  }
}

function analyseEmbed(nodes) {
  const tags = [];
  const result = {
    scripts: [],
    add(name) {
      if (!tags.includes(name)) tags.push(name);
    }
  };
  analyseNodes(nodes, result);
  return { tags, scripts: result.scripts };
}

export function disallowedEmbedTags(embedHtml) {
  return analyseEmbed(parseFragment(embedHtml).childNodes).tags;
}

function* creatorEmbeds(html) {
  const stack = [parse(html)];
  while (stack.length > 0) {
    const node = stack.pop();
    const kids = children(node);
    for (let index = kids.length - 1; index >= 0; index -= 1) stack.push(kids[index]);
    if (node.tagName !== 'div' || node.namespaceURI === SVG_NAMESPACE) continue;
    const classes = classList(node);
    if (!classes.includes('w-embed')) continue;
    if (classes.some((name) => NATIVE_EMBED_CLASSES.has(name))) continue;
    const label = classes.filter((name) => !name.startsWith('w-')).join('.');
    yield { label: label ? `.${label}` : 'div.w-embed', ...analyseEmbed(kids) };
  }
}

export function findProhibitedHtmlEmbeds(html) {
  if (typeof html !== 'string' || html === '') return [];

  const findings = [];
  for (const embed of creatorEmbeds(html)) {
    if (embed.tags.length === 0) continue;
    findings.push({
      kind: 'html-embed-markup',
      source: `${embed.label}: ${embed.tags.map((name) => (name === '#text' ? 'text' : `<${name}>`)).join(', ')}`,
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
    for (const script of embed.scripts) {
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
