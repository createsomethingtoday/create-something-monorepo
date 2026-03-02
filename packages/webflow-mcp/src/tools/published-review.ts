/**
 * Published URL review tools for Webflow templates.
 *
 * This intentionally uses lightweight HTML parsing so it can run in a plain
 * MCP stdio environment without browser dependencies.
 */

export type ReviewSeverity = 'critical' | 'warning' | 'info';

export interface ReviewFinding {
  severity: ReviewSeverity;
  check: string;
  code: string;
  message: string;
  evidence?: Record<string, unknown>;
}

export interface PublishedReviewInput {
  url: string;
  includeSitemap?: boolean;
  probe404?: boolean;
  maxExamples?: number;
  sitemapMaxUrls?: number;
  timeoutMs?: number;
}

export interface PublishedReviewResult {
  toolVersion: string;
  reviewedAt: string;
  url: string;
  host: string;
  checksRun: string[];
  environment: {
    isLikelyWebflowHost: boolean;
    snippetMarkerDetected: boolean;
    webflowRuntimeDetected: boolean;
  };
  summary: {
    score: number;
    totalFindings: number;
    bySeverity: Record<ReviewSeverity, number>;
    byCheck: Record<string, number>;
  };
  findings: ReviewFinding[];
  checks: Record<string, unknown>;
  limitations: string[];
}

interface ParsedTag {
  attrs: Record<string, string>;
  innerHtml?: string;
}

const TOOL_VERSION = '1.0.0';
const DEFAULT_MAX_EXAMPLES = 20;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_SITEMAP_MAX_URLS = 200;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripHtml(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  );
}

function parseAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRe = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const match of raw.matchAll(attrRe)) {
    const key = match[1]?.toLowerCase();
    if (!key) continue;
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attrs[key] = value;
  }
  return attrs;
}

function parseOpenTags(html: string, tagName: string): ParsedTag[] {
  const out: ParsedTag[] = [];
  const re = new RegExp(`<${tagName}\\b([^>]*)>`, 'gi');
  for (const match of html.matchAll(re)) {
    const rawAttrs = match[1] ?? '';
    out.push({ attrs: parseAttributes(rawAttrs) });
  }
  return out;
}

function parseElementTags(html: string, tagName: string): ParsedTag[] {
  const out: ParsedTag[] = [];
  const re = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  for (const match of html.matchAll(re)) {
    const rawAttrs = match[1] ?? '';
    const innerHtml = match[2] ?? '';
    out.push({
      attrs: parseAttributes(rawAttrs),
      innerHtml,
    });
  }
  return out;
}

function valueFromMeta(html: string, key: string, by: 'name' | 'property'): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `<meta\\b[^>]*${by}\\s*=\\s*(?:"${escaped}"|'${escaped}')[^>]*>`,
    'i',
  );
  const match = html.match(re);
  if (!match) return null;
  const attrs = parseAttributes(match[0]);
  const content = attrs.content ?? '';
  return content.trim() || null;
}

function canonicalHref(html: string): string | null {
  const re = /<link\b[^>]*rel\s*=\s*(?:"canonical"|'canonical')[^>]*>/i;
  const match = html.match(re);
  if (!match) return null;
  const attrs = parseAttributes(match[0]);
  const href = attrs.href ?? '';
  return href.trim() || null;
}

async function fetchText(url: string, timeoutMs: number): Promise<{ status: number; text: string; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'WebflowMCPTemplateReview/1.0',
      },
    });
    const text = await response.text();
    return { status: response.status, text, finalUrl: response.url || url };
  } finally {
    clearTimeout(timer);
  }
}

function truncateExamples<T>(items: T[], max: number): T[] {
  return items.slice(0, Math.max(1, max));
}

function scoreFindings(findings: ReviewFinding[]): number {
  let penalty = 0;
  for (const finding of findings) {
    if (finding.severity === 'critical') penalty += 10;
    else if (finding.severity === 'warning') penalty += 5;
    else penalty += 1;
  }
  return Math.max(0, Math.min(100, 100 - penalty));
}

function boolFlag(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function countMatches(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

export async function reviewPublishedTemplateUrl(input: PublishedReviewInput): Promise<PublishedReviewResult> {
  if (!input?.url || !isHttpUrl(input.url)) {
    throw new Error('template_review_published_url requires a valid http(s) URL.');
  }

  const maxExamples = Math.max(1, Math.min(100, input.maxExamples ?? DEFAULT_MAX_EXAMPLES));
  const timeoutMs = Math.max(1_000, Math.min(60_000, input.timeoutMs ?? DEFAULT_TIMEOUT_MS));
  const includeSitemap = input.includeSitemap ?? true;
  const probe404 = input.probe404 ?? true;
  const sitemapMaxUrls = Math.max(1, Math.min(1_000, input.sitemapMaxUrls ?? DEFAULT_SITEMAP_MAX_URLS));

  const primaryUrl = new URL(input.url).toString();
  const primary = await fetchText(primaryUrl, timeoutMs);
  const html = primary.text;
  const resolved = new URL(primary.finalUrl);

  const findings: ReviewFinding[] = [];
  const checks: Record<string, unknown> = {};
  const checksRun: string[] = [];

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = normalizeWhitespace(titleMatch?.[1] ?? '');
  const description = valueFromMeta(html, 'description', 'name');
  const canonical = canonicalHref(html);
  const robots = valueFromMeta(html, 'robots', 'name');

  const openGraph = {
    title: valueFromMeta(html, 'og:title', 'property'),
    description: valueFromMeta(html, 'og:description', 'property'),
    image: valueFromMeta(html, 'og:image', 'property'),
    url: valueFromMeta(html, 'og:url', 'property'),
    type: valueFromMeta(html, 'og:type', 'property'),
  };

  const metaMissing: string[] = [];
  if (!title) metaMissing.push('title');
  if (!description) metaMissing.push('description');
  if (!openGraph.title) metaMissing.push('og:title');
  if (!openGraph.description) metaMissing.push('og:description');
  if (!openGraph.image) metaMissing.push('og:image');

  if (!title) {
    findings.push({
      severity: 'critical',
      check: 'meta',
      code: 'missing_title',
      message: 'Missing <title> tag.',
    });
  } else if (title.length > 60) {
    findings.push({
      severity: 'warning',
      check: 'meta',
      code: 'title_too_long',
      message: `Title is long (${title.length} chars).`,
      evidence: { length: title.length },
    });
  }

  if (!description) {
    findings.push({
      severity: 'warning',
      check: 'meta',
      code: 'missing_meta_description',
      message: 'Missing meta description.',
    });
  } else if (description.length < 50 || description.length > 170) {
    findings.push({
      severity: 'info',
      check: 'meta',
      code: 'meta_description_length',
      message: `Meta description length is ${description.length} chars (recommended: 50-170).`,
      evidence: { length: description.length },
    });
  }

  if (!canonical) {
    findings.push({
      severity: 'info',
      check: 'meta',
      code: 'missing_canonical',
      message: 'Missing canonical URL.',
    });
  }

  if (!openGraph.image) {
    findings.push({
      severity: 'warning',
      check: 'meta',
      code: 'missing_og_image',
      message: 'Missing Open Graph image.',
    });
  }

  checks.meta = {
    title: title || null,
    description,
    canonical,
    robots,
    openGraph,
    missing: metaMissing,
  };
  checksRun.push('meta');

  const headings: Array<{ level: number; text: string }> = [];
  for (const match of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const level = Number(match[1]);
    const text = stripHtml(match[2] ?? '');
    headings.push({ level, text });
  }
  const h1Count = headings.filter((item) => item.level === 1).length;
  const emptyHeadings = headings.filter((item) => !item.text);
  const skippedHeadingLevels: Array<{ from: number; to: number; index: number }> = [];
  for (let i = 1; i < headings.length; i += 1) {
    const prev = headings[i - 1];
    const current = headings[i];
    if (current.level > prev.level + 1) {
      skippedHeadingLevels.push({ from: prev.level, to: current.level, index: i });
    }
  }

  if (h1Count === 0) {
    findings.push({
      severity: 'warning',
      check: 'headings',
      code: 'missing_h1',
      message: 'No H1 heading found.',
    });
  } else if (h1Count > 1) {
    findings.push({
      severity: 'info',
      check: 'headings',
      code: 'multiple_h1',
      message: `Multiple H1 headings found (${h1Count}).`,
      evidence: { h1Count },
    });
  }

  if (skippedHeadingLevels.length > 0) {
    findings.push({
      severity: 'warning',
      check: 'headings',
      code: 'skipped_heading_level',
      message: `${skippedHeadingLevels.length} skipped heading level transition(s).`,
      evidence: { examples: truncateExamples(skippedHeadingLevels, maxExamples) },
    });
  }

  if (emptyHeadings.length > 0) {
    findings.push({
      severity: 'warning',
      check: 'headings',
      code: 'empty_heading',
      message: `${emptyHeadings.length} heading(s) are empty.`,
      evidence: { examples: truncateExamples(emptyHeadings, maxExamples) },
    });
  }

  checks.headings = {
    total: headings.length,
    h1: h1Count,
    skippedHeadingLevels: skippedHeadingLevels.length,
    emptyHeadings: emptyHeadings.length,
    examples: truncateExamples(headings, maxExamples),
  };
  checksRun.push('headings');

  const anchors = parseElementTags(html, 'a');
  const emptyHref: Array<Record<string, unknown>> = [];
  const placeholderHref: Array<Record<string, unknown>> = [];
  const blankTargetMissingRel: Array<Record<string, unknown>> = [];
  const missingAccessibleName: Array<Record<string, unknown>> = [];

  let internalLinks = 0;
  let externalLinks = 0;

  for (const anchor of anchors) {
    const href = normalizeWhitespace(anchor.attrs.href ?? '');
    const target = normalizeWhitespace(anchor.attrs.target ?? '');
    const rel = normalizeWhitespace(anchor.attrs.rel ?? '');
    const text = stripHtml(anchor.innerHtml ?? '');
    const ariaLabel = normalizeWhitespace(anchor.attrs['aria-label'] ?? '');
    const titleAttr = normalizeWhitespace(anchor.attrs.title ?? '');
    const hasAccessibleName = Boolean(text || ariaLabel || titleAttr);

    let resolvedHref: URL | null = null;
    if (href) {
      try {
        resolvedHref = new URL(href, resolved.toString());
      } catch {
        resolvedHref = null;
      }
    }

    if (resolvedHref) {
      if (resolvedHref.host === resolved.host) internalLinks += 1;
      else externalLinks += 1;
    }

    const example = {
      href: href || null,
      text: text || null,
      target: target || null,
      rel: rel || null,
    };

    if (!href) emptyHref.push(example);
    if (href === '#' || href.toLowerCase().startsWith('javascript:')) placeholderHref.push(example);
    if (target === '_blank' && !/\bnoopener\b/i.test(rel)) blankTargetMissingRel.push(example);
    if (!hasAccessibleName) missingAccessibleName.push(example);
  }

  if (emptyHref.length > 0) {
    findings.push({
      severity: 'critical',
      check: 'links',
      code: 'link_missing_href',
      message: `${emptyHref.length} link(s) missing href.`,
      evidence: { examples: truncateExamples(emptyHref, maxExamples) },
    });
  }

  if (placeholderHref.length > 0) {
    findings.push({
      severity: 'warning',
      check: 'links',
      code: 'placeholder_link',
      message: `${placeholderHref.length} placeholder link(s) found (# or javascript:).`,
      evidence: { examples: truncateExamples(placeholderHref, maxExamples) },
    });
  }

  if (blankTargetMissingRel.length > 0) {
    findings.push({
      severity: 'warning',
      check: 'links',
      code: 'blank_target_missing_noopener',
      message: `${blankTargetMissingRel.length} _blank link(s) missing rel=noopener.`,
      evidence: { examples: truncateExamples(blankTargetMissingRel, maxExamples) },
    });
  }

  if (missingAccessibleName.length > 0) {
    findings.push({
      severity: 'warning',
      check: 'links',
      code: 'link_missing_accessible_name',
      message: `${missingAccessibleName.length} link(s) missing accessible name.`,
      evidence: { examples: truncateExamples(missingAccessibleName, maxExamples) },
    });
  }

  checks.links = {
    total: anchors.length,
    internalLinks,
    externalLinks,
    emptyHref: emptyHref.length,
    placeholderHref: placeholderHref.length,
    blankTargetMissingRel: blankTargetMissingRel.length,
    missingAccessibleName: missingAccessibleName.length,
  };
  checksRun.push('links');

  const images = parseOpenTags(html, 'img');
  const missingAlt: Array<Record<string, unknown>> = [];
  const missingDimensions: Array<Record<string, unknown>> = [];
  const formats: Record<string, number> = {};

  for (const image of images) {
    const src = normalizeWhitespace(image.attrs.src ?? '');
    const alt = normalizeWhitespace(image.attrs.alt ?? '');
    const width = normalizeWhitespace(image.attrs.width ?? '');
    const height = normalizeWhitespace(image.attrs.height ?? '');
    const loading = normalizeWhitespace(image.attrs.loading ?? '');

    let format = 'unknown';
    if (src) {
      if (src.startsWith('data:')) {
        format = 'data';
      } else {
        try {
          const ext = new URL(src, resolved.toString()).pathname.split('.').pop()?.toLowerCase();
          format = ext && ext.trim() ? ext : 'unknown';
        } catch {
          format = 'unknown';
        }
      }
    }
    formats[format] = (formats[format] ?? 0) + 1;

    const example = {
      src: src || null,
      alt: alt || null,
      width: width || null,
      height: height || null,
      loading: loading || null,
    };

    if (!alt) missingAlt.push(example);
    if (!(width && height)) missingDimensions.push(example);
  }

  if (missingAlt.length > 0) {
    findings.push({
      severity: 'warning',
      check: 'images',
      code: 'image_missing_alt',
      message: `${missingAlt.length} image(s) missing alt text.`,
      evidence: { examples: truncateExamples(missingAlt, maxExamples) },
    });
  }

  if (missingDimensions.length > 0) {
    findings.push({
      severity: 'info',
      check: 'images',
      code: 'image_missing_dimensions',
      message: `${missingDimensions.length} image(s) missing width/height attributes.`,
      evidence: { examples: truncateExamples(missingDimensions, maxExamples) },
    });
  }

  checks.images = {
    total: images.length,
    missingAlt: missingAlt.length,
    missingDimensions: missingDimensions.length,
    formats,
  };
  checksRun.push('images');

  const labels = parseElementTags(html, 'label');
  const labelForIds = new Set<string>();
  for (const label of labels) {
    const forId = normalizeWhitespace(label.attrs.for ?? '');
    if (forId) labelForIds.add(forId);
  }

  const formFieldsRaw = [
    ...parseOpenTags(html, 'input').map((item) => ({ tag: 'input', attrs: item.attrs })),
    ...parseOpenTags(html, 'select').map((item) => ({ tag: 'select', attrs: item.attrs })),
    ...parseOpenTags(html, 'textarea').map((item) => ({ tag: 'textarea', attrs: item.attrs })),
  ];

  const missingLabelFields: Array<Record<string, unknown>> = [];

  for (const field of formFieldsRaw) {
    const type = normalizeWhitespace(field.attrs.type ?? '').toLowerCase();
    if (field.tag === 'input' && type === 'hidden') continue;

    const id = normalizeWhitespace(field.attrs.id ?? '');
    const name = normalizeWhitespace(field.attrs.name ?? '');
    const ariaLabel = normalizeWhitespace(field.attrs['aria-label'] ?? '');
    const ariaLabelledBy = normalizeWhitespace(field.attrs['aria-labelledby'] ?? '');

    const hasLabel = Boolean(
      ariaLabel ||
      ariaLabelledBy ||
      (id && labelForIds.has(id)),
    );

    if (!hasLabel) {
      missingLabelFields.push({
        tag: field.tag,
        type: type || null,
        id: id || null,
        name: name || null,
      });
    }
  }

  if (missingLabelFields.length > 0) {
    findings.push({
      severity: 'warning',
      check: 'forms',
      code: 'form_field_missing_label',
      message: `${missingLabelFields.length} form field(s) missing label/aria-label association.`,
      evidence: { examples: truncateExamples(missingLabelFields, maxExamples) },
    });
  }

  checks.forms = {
    labels: labels.length,
    fields: formFieldsRaw.length,
    missingLabels: missingLabelFields.length,
  };
  checksRun.push('forms');

  const videos = parseOpenTags(html, 'video');
  const autoplayWithoutControls: Array<Record<string, unknown>> = [];

  for (const video of videos) {
    const autoplay = Object.prototype.hasOwnProperty.call(video.attrs, 'autoplay');
    const controls = Object.prototype.hasOwnProperty.call(video.attrs, 'controls');
    if (autoplay && !controls) {
      autoplayWithoutControls.push({
        src: normalizeWhitespace(video.attrs.src ?? '') || null,
        muted: Object.prototype.hasOwnProperty.call(video.attrs, 'muted'),
      });
    }
  }

  if (autoplayWithoutControls.length > 0) {
    findings.push({
      severity: 'warning',
      check: 'media',
      code: 'autoplay_video_without_controls',
      message: `${autoplayWithoutControls.length} autoplay video(s) missing controls.`,
      evidence: { examples: truncateExamples(autoplayWithoutControls, maxExamples) },
    });
  }

  checks.media = {
    videos: videos.length,
    autoplayWithoutControls: autoplayWithoutControls.length,
  };
  checksRun.push('media');

  const dataWIdCount = countMatches(html, /\bdata-w-id\s*=/gi);
  const ix2Mentions = countMatches(html, /\bix2\b/gi);
  const ix3Mentions = countMatches(html, /\bix3\b/gi);
  const webflowRequireIxMentions = countMatches(
    html,
    /Webflow\.require\((["'])ix[23]\1\)/gi,
  );

  const interactionsLikely =
    dataWIdCount > 0 ||
    webflowRequireIxMentions > 0 ||
    ix2Mentions > 0 ||
    ix3Mentions > 0;

  checks.interactionHints = {
    interactionsLikely,
    dataWIdCount,
    ix2Mentions,
    ix3Mentions,
    webflowRequireIxMentions,
  };
  checksRun.push('interaction_hints');

  if (includeSitemap) {
    const sitemapUrl = new URL('/sitemap.xml', resolved.origin).toString();
    try {
      const sitemap = await fetchText(sitemapUrl, timeoutMs);
      const urls: string[] = [];
      for (const match of sitemap.text.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)) {
        const value = normalizeWhitespace(stripHtml(match[1] ?? ''));
        if (!value) continue;
        urls.push(value);
        if (urls.length >= sitemapMaxUrls) break;
      }
      checks.sitemap = {
        sitemapUrl,
        status: sitemap.status,
        count: urls.length,
        urls: truncateExamples(urls, maxExamples),
      };
      if (urls.length === 0) {
        findings.push({
          severity: 'info',
          check: 'sitemap',
          code: 'sitemap_empty_or_unparseable',
          message: 'Sitemap found but no URLs parsed.',
        });
      }
    } catch (error) {
      checks.sitemap = {
        sitemapUrl,
        status: null,
        count: 0,
        error: error instanceof Error ? error.message : String(error),
      };
      findings.push({
        severity: 'info',
        check: 'sitemap',
        code: 'sitemap_unavailable',
        message: 'Could not fetch sitemap.xml.',
      });
    }
    checksRun.push('sitemap');
  }

  if (probe404) {
    const token = Math.random().toString(36).slice(2, 10);
    const probeUrl = new URL(`/__wf_mcp_404_probe_${token}__`, resolved.origin).toString();
    try {
      const probe = await fetchText(probeUrl, timeoutMs);
      const probeText = stripHtml(probe.text).toLowerCase();
      const semantic404 = /\b404\b|not found|page not found/.test(probeText);
      const ok = probe.status === 404 || (probe.status === 200 && semantic404);
      checks.notFound = {
        probeUrl,
        status: probe.status,
        semantic404,
        ok,
      };
      if (!ok) {
        findings.push({
          severity: 'warning',
          check: 'not_found',
          code: 'non_404_probe_response',
          message: `404 probe returned status ${probe.status} without clear 404 semantics.`,
          evidence: { probeUrl, status: probe.status },
        });
      }
    } catch (error) {
      checks.notFound = {
        probeUrl,
        status: null,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
      findings.push({
        severity: 'warning',
        check: 'not_found',
        code: '404_probe_failed',
        message: 'Failed to run 404 probe.',
      });
    }
    checksRun.push('not_found');
  }

  const snippetMarkerDetected = boolFlag(html, [
    /__wfReview/,
    /__wf_review_snippet_v1/,
    /audit_webflow_way/,
  ]);
  const webflowRuntimeDetected = boolFlag(html, [
    /webflow/i,
    /data-wf-site/i,
    /data-wf-page/i,
  ]);

  const bySeverity: Record<ReviewSeverity, number> = {
    critical: 0,
    warning: 0,
    info: 0,
  };
  const byCheck: Record<string, number> = {};
  for (const finding of findings) {
    bySeverity[finding.severity] += 1;
    byCheck[finding.check] = (byCheck[finding.check] ?? 0) + 1;
  }

  const score = scoreFindings(findings);

  return {
    toolVersion: TOOL_VERSION,
    reviewedAt: new Date().toISOString(),
    url: resolved.toString(),
    host: resolved.host,
    checksRun,
    environment: {
      isLikelyWebflowHost: resolved.hostname.endsWith('.webflow.io') || resolved.hostname.endsWith('.webflow.com'),
      snippetMarkerDetected,
      webflowRuntimeDetected,
    },
    summary: {
      score,
      totalFindings: findings.length,
      bySeverity,
      byCheck,
    },
    findings,
    checks,
    limitations: [
      'This tool audits fetched HTML only; it does not execute full browser interactions.',
      'IX2/IX3 interaction integrity requires in-page runtime instrumentation (snippet/extension path).',
      'Form label checks are static and can miss labels injected client-side.',
    ],
  };
}
