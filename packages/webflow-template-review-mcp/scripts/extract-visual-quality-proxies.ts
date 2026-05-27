import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type VisualBucket =
  | 'outdated_visual_style'
  | 'basic_or_default_layout'
  | 'weak_visual_hierarchy'
  | 'poor_typography_quality'
  | 'poor_color_palette_or_contrast'
  | 'incohesive_assets'
  | 'low_layout_variety'
  | 'saturated_category_no_differentiation'
  | 'poor_interaction_polish';

type CliOptions = {
  url: string;
  outDir: string;
  maxStylesheets: number;
  maxSections: number;
};

type ProxySignal = {
  id: string;
  value: boolean | number | string;
  source: 'published_html' | 'published_css' | 'section_fingerprint';
  supports: VisualBucket[];
  evidence: Record<string, unknown>;
};

type VisualProxyFinding = {
  rule_id: string;
  finding_bucket: 'visual_quality';
  sub_buckets: VisualBucket[];
  status: 'manual';
  severity: 'minor' | 'major';
  coverage: 'partial';
  confidence: number;
  proxy_signals: ProxySignal[];
  manual_prompt: string;
};

type SectionFingerprint = {
  index: number;
  hash: string;
  tag_sequence: string[];
  heading_levels: number[];
  image_count: number;
  link_count: number;
  form_count: number;
  class_families: string[];
};

type PageFeatures = {
  url: string;
  html_bytes: number;
  css_bytes: number;
  stylesheet_count: number;
  inline_style_count: number;
  class_count: number;
  unknown_class_count: number;
  dominant_class_scheme?: string;
  dominant_class_scheme_ratio: number;
  combo_class_violation_count: number;
  body_font_defined: boolean;
  css_variable_count: number;
  baseline_tag_coverage: number;
  line_height_percent_count: number;
  line_height_other_count: number;
  small_font_size_count: number;
  h1_count: number;
  skipped_heading_count: number;
  image_count: number;
  missing_alt_count: number;
  hover_state_count: number;
  focus_state_count: number;
  active_state_count: number;
  section_count: number;
  unique_section_fingerprint_count: number;
  repeated_section_ratio: number;
  content_section_count: number;
  unique_content_section_fingerprint_count: number;
  repeated_content_section_ratio: number;
  section_fingerprints: SectionFingerprint[];
};

const BASELINE_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a'];

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    outDir: '/tmp/webflow-template-review-visual-proxies',
    maxStylesheets: 6,
    maxSections: 40,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--url' && next) {
      options.url = next;
      i += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      i += 1;
      continue;
    }
    if (arg === '--max-stylesheets' && next) {
      options.maxStylesheets = Math.max(0, Number.parseInt(next, 10));
      i += 1;
      continue;
    }
    if (arg === '--max-sections' && next) {
      options.maxSections = Math.max(1, Number.parseInt(next, 10));
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.url) throw new Error('Missing required --url <published-url>');
  return {
    url: normalizePublicHttpsUrl(options.url),
    outDir: options.outDir ?? '/tmp/webflow-template-review-visual-proxies',
    maxStylesheets: options.maxStylesheets ?? 6,
    maxSections: options.maxSections ?? 40,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp visual-quality:extract-proxies -- [options]

Options:
  --url <published-url>       Public https URL to inspect. Required.
  --out <dir>                 Output directory. Default: /tmp/webflow-template-review-visual-proxies
  --max-stylesheets <n>       Max linked stylesheets to fetch. Default: 6
  --max-sections <n>          Max section fingerprints to include. Default: 40
  --help                      Show this help.

Behavior:
  Emits evidence-only visual-quality proxy features.
  Does not write to Airtable, D1, or review recommendations.
`);
}

function normalizePublicHttpsUrl(value: string): string {
  const parsed = new URL(value.trim());
  if (parsed.protocol !== 'https:') throw new Error('Visual proxy extraction requires a public https URL.');
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  ) {
    throw new Error('Visual proxy extraction only accepts public https URLs.');
  }
  parsed.hash = '';
  return parsed.toString();
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'CREATE SOMETHING Template Review Visual Proxy Extractor',
    },
  });
  if (!response.ok) throw new Error(`Fetch failed for ${url} (${response.status})`);
  return response.text();
}

function absoluteUrl(href: string, baseUrl: string): string | undefined {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function attributeValue(tag: string, attribute: string): string | undefined {
  const pattern = new RegExp(`${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = tag.match(pattern);
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

function stripTags(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLinkedStylesheets(html: string, baseUrl: string): string[] {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  return links
    .filter((tag) => /\brel\s*=\s*(?:"[^"]*stylesheet[^"]*"|'[^']*stylesheet[^']*'|[^\s>]*stylesheet[^\s>]*)/i.test(tag))
    .map((tag) => attributeValue(tag, 'href'))
    .filter((href): href is string => Boolean(href))
    .map((href) => absoluteUrl(href, baseUrl))
    .filter((href): href is string => Boolean(href));
}

function extractInlineStyles(html: string): string[] {
  const styles: string[] = [];
  const pattern = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const css = match[1]?.trim();
    if (css) styles.push(css);
  }
  return styles;
}

async function fetchCssTexts(html: string, baseUrl: string, maxStylesheets: number) {
  const stylesheetUrls = extractLinkedStylesheets(html, baseUrl).slice(0, maxStylesheets);
  const inlineStyles = extractInlineStyles(html);
  const fetched = await Promise.allSettled(stylesheetUrls.map((url) => fetchText(url)));
  return {
    stylesheetUrls,
    inlineStyles,
    cssTexts: [
      ...inlineStyles,
      ...fetched.flatMap((result) => (result.status === 'fulfilled' && result.value.trim() ? [result.value] : [])),
    ],
  };
}

const CLASS_SCHEMES: Array<[string, RegExp]> = [
  ['bem', /^[a-z0-9]+(?:-[a-z0-9]+)*(?:__(?:[a-z0-9]+(?:-[a-z0-9]+)*))?(?:--(?:[a-z0-9]+(?:-[a-z0-9]+)*))?$/],
  ['kebab', /^[a-z0-9]+(?:-[a-z0-9]+)+$/],
  ['snake', /^[a-z0-9]+(?:_[a-z0-9]+)+$/],
  ['camel', /^[a-z]+(?:[A-Z][A-Za-z0-9]*)+$/],
  ['pascal', /^[A-Z][A-Za-z0-9]+$/],
];

function classScheme(className: string): string {
  for (const [name, pattern] of CLASS_SCHEMES) {
    if (pattern.test(className)) return name;
  }
  return 'unknown';
}

function classFamilies(classes: string[]): string[] {
  return [
    ...new Set(
      classes
        .map((className) => className.toLowerCase().split(/[-_\s/]+/)[0])
        .filter(Boolean)
        .slice(0, 12),
    ),
  ].sort();
}

function extractClassLists(html: string): string[][] {
  const lists: string[][] = [];
  const pattern = /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const value = match[1] ?? match[2] ?? '';
    const classes = value.split(/\s+/).map((item) => item.trim()).filter(Boolean);
    if (classes.length > 0) lists.push(classes);
  }
  return lists;
}

function headingLevels(html: string): Array<{ level: number; text: string }> {
  const headings: Array<{ level: number; text: string }> = [];
  const pattern = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    headings.push({
      level: Number.parseInt(match[1], 10),
      text: stripTags(match[2]).slice(0, 80),
    });
  }
  return headings;
}

function skippedHeadingCount(headings: Array<{ level: number }>): number {
  let count = 0;
  let previous = 0;
  for (const heading of headings) {
    if (previous > 0 && heading.level > previous + 1) count += 1;
    previous = heading.level;
  }
  return count;
}

function countMatches(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

function cssDeclarationValues(css: string, property: string): string[] {
  const values: string[] = [];
  const pattern = new RegExp(`${property}\\s*:\\s*([^;}{]+)`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css))) {
    values.push(match[1].trim());
  }
  return values;
}

function baselineTagCoverage(css: string): number {
  if (!css.trim()) return 0;
  const present = BASELINE_TAGS.filter((tag) => new RegExp(`(^|[{}\\s,])${tag}\\b`, 'i').test(css)).length;
  return Number((present / BASELINE_TAGS.length).toFixed(3));
}

function smallFontSizeCount(css: string): number {
  return cssDeclarationValues(css, 'font-size').filter((value) => {
    const match = value.match(/^(\d+(?:\.\d+)?)px$/i);
    return match ? Number.parseFloat(match[1]) < 14 : false;
  }).length;
}

function extractImages(html: string): Array<{ tag: string; alt?: string; src?: string }> {
  const images = html.match(/<img\b[^>]*>/gi) ?? [];
  return images.map((tag) => ({
    tag,
    alt: attributeValue(tag, 'alt'),
    src: attributeValue(tag, 'src'),
  }));
}

function extractSections(html: string, maxSections: number): string[] {
  const sections: string[] = [];
  const sectionPattern = /<section\b[^>]*>[\s\S]*?<\/section>/gi;
  let match: RegExpExecArray | null;
  while ((match = sectionPattern.exec(html)) && sections.length < maxSections) {
    sections.push(match[0]);
  }
  if (sections.length > 0) return sections;

  const fallbackPattern = /<(?:main|header|footer|article|aside)\b[^>]*>[\s\S]*?<\/(?:main|header|footer|article|aside)>/gi;
  while ((match = fallbackPattern.exec(html)) && sections.length < maxSections) {
    sections.push(match[0]);
  }
  return sections;
}

function sectionFingerprint(sectionHtml: string, index: number): SectionFingerprint {
  const tags = [...sectionHtml.matchAll(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi)]
    .map((match) => match[1].toLowerCase())
    .filter((tag) => !['div', 'span'].includes(tag))
    .slice(0, 30);
  const headings = headingLevels(sectionHtml).map((heading) => heading.level);
  const classList = extractClassLists(sectionHtml).flat();
  const fingerprintInput = JSON.stringify({
    tags,
    headings,
    images: countMatches(sectionHtml, /<img\b/gi),
    links: countMatches(sectionHtml, /<a\b/gi),
    forms: countMatches(sectionHtml, /<form\b/gi),
    families: classFamilies(classList),
  });

  return {
    index,
    hash: createHash('sha256').update(fingerprintInput).digest('hex').slice(0, 16),
    tag_sequence: tags.slice(0, 16),
    heading_levels: headings,
    image_count: countMatches(sectionHtml, /<img\b/gi),
    link_count: countMatches(sectionHtml, /<a\b/gi),
    form_count: countMatches(sectionHtml, /<form\b/gi),
    class_families: classFamilies(classList),
  };
}

function hasContentWeight(fingerprint: SectionFingerprint): boolean {
  return (
    fingerprint.heading_levels.length > 0 ||
    fingerprint.image_count > 0 ||
    fingerprint.link_count > 0 ||
    fingerprint.form_count > 0
  );
}

function signal(
  id: string,
  value: boolean | number | string,
  source: ProxySignal['source'],
  supports: VisualBucket[],
  evidence: Record<string, unknown>,
): ProxySignal {
  return { id, value, source, supports, evidence };
}

function analyzePage(url: string, html: string, cssTexts: string[], stylesheetCount: number, inlineStyleCount: number, maxSections: number) {
  const css = cssTexts.join('\n');
  const classLists = extractClassLists(html);
  const classes = [...new Set(classLists.flat())];
  const schemeCounts = new Map<string, number>();
  for (const className of classes) {
    const scheme = classScheme(className);
    schemeCounts.set(scheme, (schemeCounts.get(scheme) ?? 0) + 1);
  }
  const sortedSchemes = [...schemeCounts.entries()].filter(([name]) => name !== 'unknown').sort((a, b) => b[1] - a[1]);
  const dominantScheme = sortedSchemes[0]?.[0];
  const dominantSchemeCount = sortedSchemes[0]?.[1] ?? 0;
  const headings = headingLevels(html);
  const images = extractImages(html);
  const lineHeights = cssDeclarationValues(css, 'line-height');
  const sections = extractSections(html, maxSections);
  const sectionFingerprints = sections.map((section, index) => sectionFingerprint(section, index));
  const uniqueSectionHashes = new Set(sectionFingerprints.map((item) => item.hash));
  const contentSectionFingerprints = sectionFingerprints.filter(hasContentWeight);
  const uniqueContentSectionHashes = new Set(contentSectionFingerprints.map((item) => item.hash));

  const features: PageFeatures = {
    url,
    html_bytes: Buffer.byteLength(html),
    css_bytes: Buffer.byteLength(css),
    stylesheet_count: stylesheetCount,
    inline_style_count: inlineStyleCount,
    class_count: classes.length,
    unknown_class_count: schemeCounts.get('unknown') ?? 0,
    dominant_class_scheme: dominantScheme,
    dominant_class_scheme_ratio: classes.length > 0 ? Number((dominantSchemeCount / classes.length).toFixed(3)) : 0,
    combo_class_violation_count: classLists.filter((list) => list.length > 4).length,
    body_font_defined: /(^|[{}\s,])body\s*{[^}]*font-family\s*:/i.test(css),
    css_variable_count: countMatches(css, /var\s*\(/gi),
    baseline_tag_coverage: baselineTagCoverage(css),
    line_height_percent_count: lineHeights.filter((value) => value.endsWith('%')).length,
    line_height_other_count: lineHeights.filter((value) => !value.endsWith('%')).length,
    small_font_size_count: smallFontSizeCount(css),
    h1_count: headings.filter((heading) => heading.level === 1).length,
    skipped_heading_count: skippedHeadingCount(headings),
    image_count: images.length,
    missing_alt_count: images.filter((image) => !image.alt?.trim()).length,
    hover_state_count: countMatches(css, /:hover\b/gi),
    focus_state_count: countMatches(css, /:focus(?:-|,|\s|{|:|\b)/gi),
    active_state_count: countMatches(css, /:active\b/gi),
    section_count: sectionFingerprints.length,
    unique_section_fingerprint_count: uniqueSectionHashes.size,
    repeated_section_ratio:
      sectionFingerprints.length > 0 ? Number((1 - uniqueSectionHashes.size / sectionFingerprints.length).toFixed(3)) : 0,
    content_section_count: contentSectionFingerprints.length,
    unique_content_section_fingerprint_count: uniqueContentSectionHashes.size,
    repeated_content_section_ratio:
      contentSectionFingerprints.length > 0
        ? Number((1 - uniqueContentSectionHashes.size / contentSectionFingerprints.length).toFixed(3))
        : 0,
    section_fingerprints: sectionFingerprints,
  };

  return features;
}

function buildProxySignals(features: PageFeatures): ProxySignal[] {
  const signals: ProxySignal[] = [];
  const missingAltRate = features.image_count > 0 ? features.missing_alt_count / features.image_count : 0;

  if (features.css_variable_count === 0) {
    signals.push(signal('css.variables_absent', true, 'published_css', ['outdated_visual_style', 'poor_typography_quality', 'poor_color_palette_or_contrast'], {
      css_variable_count: features.css_variable_count,
    }));
  }
  if (features.baseline_tag_coverage < 0.6) {
    signals.push(signal('css.base_tag_coverage_low', features.baseline_tag_coverage, 'published_css', ['weak_visual_hierarchy', 'poor_typography_quality'], {
      baseline_tag_coverage: features.baseline_tag_coverage,
      required_tags: BASELINE_TAGS,
    }));
  }
  if (!features.body_font_defined) {
    signals.push(signal('typography.body_font_missing', true, 'published_css', ['poor_typography_quality', 'outdated_visual_style'], {}));
  }
  if (features.small_font_size_count > 0) {
    signals.push(signal('typography.small_font_sizes_detected', features.small_font_size_count, 'published_css', ['poor_typography_quality', 'weak_visual_hierarchy'], {
      small_font_size_count: features.small_font_size_count,
    }));
  }
  if (features.line_height_percent_count > features.line_height_other_count && features.line_height_percent_count >= 4) {
    signals.push(signal('typography.percent_line_height_dominant', features.line_height_percent_count, 'published_css', ['poor_typography_quality'], {
      percent_count: features.line_height_percent_count,
      other_count: features.line_height_other_count,
    }));
  }
  if (features.h1_count !== 1) {
    signals.push(signal('headings.h1_count_not_one', features.h1_count, 'published_html', ['weak_visual_hierarchy'], { h1_count: features.h1_count }));
  }
  if (features.skipped_heading_count > 0) {
    signals.push(signal('headings.skipped_levels', features.skipped_heading_count, 'published_html', ['weak_visual_hierarchy'], {
      skipped_heading_count: features.skipped_heading_count,
    }));
  }
  if (missingAltRate >= 0.25 && features.missing_alt_count >= 3) {
    signals.push(signal('images.missing_alt_rate_high', Number(missingAltRate.toFixed(3)), 'published_html', ['incohesive_assets'], {
      image_count: features.image_count,
      missing_alt_count: features.missing_alt_count,
    }));
  }
  if (features.hover_state_count === 0 && features.focus_state_count === 0 && features.active_state_count === 0) {
    signals.push(signal('css.interaction_states_absent', true, 'published_css', ['poor_interaction_polish', 'outdated_visual_style'], {
      hover_state_count: features.hover_state_count,
      focus_state_count: features.focus_state_count,
      active_state_count: features.active_state_count,
    }));
  }
  if (features.dominant_class_scheme_ratio > 0 && features.dominant_class_scheme_ratio < 0.7 && features.class_count >= 20) {
    signals.push(signal('classes.naming_consistency_weak', features.dominant_class_scheme_ratio, 'published_html', ['basic_or_default_layout', 'weak_visual_hierarchy'], {
      class_count: features.class_count,
      unknown_class_count: features.unknown_class_count,
      dominant_class_scheme: features.dominant_class_scheme,
    }));
  }
  if (features.combo_class_violation_count > 0) {
    signals.push(signal('classes.combo_class_depth_high', features.combo_class_violation_count, 'published_html', ['basic_or_default_layout', 'weak_visual_hierarchy'], {
      combo_class_violation_count: features.combo_class_violation_count,
    }));
  }
  if (features.repeated_content_section_ratio >= 0.25 && features.content_section_count >= 6) {
    signals.push(signal('layout.repeated_content_section_ratio_high', features.repeated_content_section_ratio, 'section_fingerprint', ['low_layout_variety', 'basic_or_default_layout'], {
      section_count: features.section_count,
      content_section_count: features.content_section_count,
      unique_content_section_fingerprint_count: features.unique_content_section_fingerprint_count,
      repeated_section_ratio: features.repeated_section_ratio,
    }));
  }

  return signals;
}

function buildFindings(signals: ProxySignal[]): VisualProxyFinding[] {
  const byBucket = new Map<VisualBucket, ProxySignal[]>();
  for (const item of signals) {
    for (const bucket of item.supports) {
      const current = byBucket.get(bucket) ?? [];
      current.push(item);
      byBucket.set(bucket, current);
    }
  }

  return [...byBucket.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([bucket, bucketSignals]) => ({
      rule_id: `wf.template.visual.proxy.${bucket}`,
      finding_bucket: 'visual_quality' as const,
      sub_buckets: [bucket],
      status: 'manual' as const,
      severity: bucketSignals.length >= 3 ? ('major' as const) : ('minor' as const),
      coverage: 'partial' as const,
      confidence: Number(Math.min(0.85, 0.35 + bucketSignals.length * 0.12).toFixed(2)),
      proxy_signals: bucketSignals,
      manual_prompt:
        'Compare this proxy evidence against approved Good and Exceptional examples before using it in reviewer-facing quality language.',
    }));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const html = await fetchText(options.url);
  const css = await fetchCssTexts(html, options.url, options.maxStylesheets);
  const page = analyzePage(options.url, html, css.cssTexts, css.stylesheetUrls.length, css.inlineStyles.length, options.maxSections);
  const proxySignals = buildProxySignals(page);
  const findings = buildFindings(proxySignals);
  const output = {
    generated_at: new Date().toISOString(),
    source_url: options.url,
    extraction_version: 'visual_proxy_features.v0.1',
    extraction_mode: 'published_html_css',
    review_posture: 'evidence_only_manual_quality_review',
    page,
    proxy_signals: proxySignals,
    findings,
    notes: [
      'This artifact is evidence only and must not update review recommendations by itself.',
      'Screenshots should be captured separately for rendered-state verification and human comparison.',
      'Saturated category differentiation is intentionally excluded until similarity/category context is available.',
    ],
  };

  await mkdir(options.outDir, { recursive: true });
  const filePath = path.join(options.outDir, 'visual-proxy-features.json');
  await writeFile(filePath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({ file: filePath, signal_count: proxySignals.length, finding_count: findings.length }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
