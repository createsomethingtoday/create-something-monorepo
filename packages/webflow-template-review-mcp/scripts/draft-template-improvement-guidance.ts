import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type CliOptions = {
  title: string;
  url?: string;
  sandboxNormalized: string;
  htmlSnapshot?: string;
  visualProxies?: string;
  networkLog?: string;
  guidanceRuleCatalog?: string;
  outDir: string;
  fetchAssetSizes: boolean;
  maxAssetSizes: number;
};

type GuidanceRuleCatalog = {
  schema_version?: string;
  thresholds?: {
    large_asset_bytes?: number;
    clipped_text_candidate_count?: number;
    animation_class_count?: number;
  };
  copy_watchlist?: Array<{
    id: string;
    severity?: TextIssue['severity'];
    pattern: string;
    flags?: string;
    evidence?: string;
    suggestion: string;
  }>;
  link_label_expectations?: Array<{
    id: string;
    label_pattern: string;
    label_flags?: string;
    flag_href_patterns: string[];
    href_flags?: string;
    suggestion: string;
  }>;
};

type SandboxNormalized = {
  source_url?: string;
  evidence_status?: string;
  static_summary?: {
    page_count?: number;
    total_images?: number;
    total_missing_alt?: number;
    pages?: Array<{
      url?: string;
      title?: string;
      h1_count?: number;
      image_count?: number;
      missing_alt_count?: number;
    }>;
  };
  rendered_summary?: {
    status?: string;
    page_count?: number;
    viewport_count?: number;
    total_overflowing_element_candidates?: number;
    total_clipped_text_candidates?: number;
    screenshots?: string[];
  };
  findings?: Array<{
    rule_id?: string;
    severity?: string;
    finding_bucket?: string;
    page_url?: string;
    evidence?: Record<string, unknown>;
  }>;
  caveats?: string[];
};

type VisualProxyFile = {
  page?: {
    h1_count?: number;
    skipped_heading_count?: number;
    small_font_size_count?: number;
    combo_class_violation_count?: number;
    repeated_section_ratio?: number;
  };
  findings?: Array<{
    rule_id?: string;
    severity?: string;
    confidence?: number;
    sub_buckets?: string[];
    proxy_signals?: Array<{ id?: string; value?: unknown }>;
  }>;
};

type NetworkEntry = {
  url?: string;
  resource_type?: string;
};

type TextIssue = {
  id: string;
  severity: 'minor' | 'major';
  evidence: string;
  suggestion: string;
};

type DuplicateText = {
  text: string;
  count: number;
};

type AssetSize = {
  url: string;
  bytes?: number;
  mb?: number;
  content_type?: string;
  error?: string;
};

type GuidanceItem = {
  id: string;
  priority: 1 | 2 | 3;
  bucket:
    | 'content_copy'
    | 'visual_quality'
    | 'responsive_interaction'
    | 'seo_accessibility'
    | 'template_polish'
    | 'performance';
  creator_safe_guidance: string;
  rationale: string;
  evidence: string[];
  where_to_look: string[];
  reviewer_notes: string[];
};

type GuidanceDraft = {
  schema_version: 'template_improvement_guidance_draft.v0.3';
  generated_at: string;
  review_posture: 'draft_human_review_required';
  title: string;
  source_url: string;
  decision_boundary: {
    not_final_decision: true;
    no_external_writes: true;
    creator_facing_requires_reviewer_approval: true;
  };
  evidence_inputs: Record<string, string | undefined>;
  signal_sources: {
    programmatic_detectors: string[];
    catalog_configured_detectors: string[];
    artifact_backed_inputs: string[];
    human_review_required_for: string[];
    guidance_rule_catalog?: {
      path?: string;
      schema_version?: string;
      copy_watchlist_count: number;
      link_label_expectation_count: number;
      threshold_keys: string[];
    };
  };
  evidence_summary: {
    evidence_status?: string;
    page_count?: number;
    viewport_count?: number;
    total_images?: number;
    total_missing_alt?: number;
    total_overflowing_element_candidates?: number;
    total_clipped_text_candidates?: number;
    h1_missing_pages: string[];
    visual_proxy_rule_ids: string[];
    text_issue_count: number;
    duplicate_text_count: number;
    large_asset_count: number;
    animation_class_counts: Record<string, number>;
  };
  guidance_items: GuidanceItem[];
  creator_where_to_look: string[];
  creator_message_draft: string;
  reviewer_notes: string[];
};

const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-template-improvement-guidance';
const DEFAULT_RULE_CATALOG: GuidanceRuleCatalog = {
  schema_version: 'template_guidance_rule_catalog.default.v0.1',
  thresholds: {
    large_asset_bytes: 1_000_000,
    clipped_text_candidate_count: 30,
    animation_class_count: 10,
  },
  copy_watchlist: [],
  link_label_expectations: [],
};
const REPO_ROOT_FALLBACK = path.resolve(process.cwd(), '..', '..');

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    title: 'Template',
    outDir: DEFAULT_OUT_DIR,
    fetchAssetSizes: false,
    maxAssetSizes: 20,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--title' && next) {
      options.title = next;
      index += 1;
      continue;
    }
    if (arg === '--url' && next) {
      options.url = next;
      index += 1;
      continue;
    }
    if ((arg === '--sandbox-normalized' || arg === '--normalized') && next) {
      options.sandboxNormalized = next;
      index += 1;
      continue;
    }
    if ((arg === '--html' || arg === '--html-snapshot') && next) {
      options.htmlSnapshot = next;
      index += 1;
      continue;
    }
    if ((arg === '--visual-proxies' || arg === '--visual-proxy-features') && next) {
      options.visualProxies = next;
      index += 1;
      continue;
    }
    if (arg === '--network-log' && next) {
      options.networkLog = next;
      index += 1;
      continue;
    }
    if (arg === '--guidance-rule-catalog' && next) {
      options.guidanceRuleCatalog = next;
      index += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      index += 1;
      continue;
    }
    if (arg === '--fetch-asset-sizes') {
      options.fetchAssetSizes = true;
      continue;
    }
    if (arg === '--max-asset-sizes' && next) {
      options.maxAssetSizes = boundedInt(next, 1, 100, arg);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.sandboxNormalized) {
    throw new Error('Missing required --sandbox-normalized <file-or-dir>.');
  }

  return {
    title: options.title ?? 'Template',
    url: options.url,
    sandboxNormalized: options.sandboxNormalized,
    htmlSnapshot: options.htmlSnapshot,
    visualProxies: options.visualProxies,
    networkLog: options.networkLog,
    guidanceRuleCatalog: options.guidanceRuleCatalog,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    fetchAssetSizes: options.fetchAssetSizes ?? false,
    maxAssetSizes: options.maxAssetSizes ?? 20,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp guidance:draft -- [options]

Options:
  --title <name>                     Template name for the packet. Default: Template
  --url <url>                        Published URL override. Defaults to normalized source_url.
  --sandbox-normalized <file|dir>    Normalized sandbox JSON or its containing directory. Required.
  --html <file>                      Optional published HTML snapshot for copy/repetition checks.
  --visual-proxies <file>            Optional visual-proxy-features.json.
  --network-log <file>               Optional sandbox network-log.json for asset-size checks.
  --guidance-rule-catalog <file>     Optional versioned JSON catalog for thresholds, copy watchlist, and link-label checks.
  --fetch-asset-sizes                Fetch HEAD metadata for image requests in --network-log.
  --max-asset-sizes <n>              Max image URLs to size-check. Default: 20
  --out <dir>                        Output directory. Default: ${DEFAULT_OUT_DIR}
  --help                             Show this help.

Behavior:
  Produces a reviewer-safe creator guidance draft from evidence artifacts.
  It does not emit a final approval, rejection, quality band, or external write.
`);
}

function boundedInt(value: string, min: number, max: number, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${flag} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function normalizedFilePath(value: string): string {
  return value.endsWith('.json') ? value : path.join(value, 'published-site-sandbox-normalized.json');
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function candidateInputPaths(value: string): string[] {
  if (path.isAbsolute(value)) return [value];
  return uniqueStrings([
    path.resolve(process.cwd(), value),
    process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD, value) : '',
    path.resolve(REPO_ROOT_FALLBACK, value),
  ]);
}

async function resolveReadablePath(value: string, label: string): Promise<string> {
  const candidates = candidateInputPaths(value);
  for (const candidate of candidates) {
    if (await pathExists(candidate)) return candidate;
  }
  throw new Error(`${label} was not found. Tried: ${candidates.join(', ')}`);
}

async function resolveOptionalReadablePath(value: string | undefined, label: string): Promise<string | undefined> {
  return value ? resolveReadablePath(value, label) : undefined;
}

function resolveOutputDir(value: string): string {
  if (path.isAbsolute(value)) return value;
  return path.resolve(process.env.INIT_CWD ?? process.cwd(), value);
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

async function optionalRead(filePath: string | undefined): Promise<string | undefined> {
  if (!filePath) return undefined;
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return undefined;
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function htmlToTextChunks(html: string): string[] {
  const text = decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|section|h1|h2|h3|h4|h5|h6|li|a)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  );
  return text
    .split(/\n+/)
    .map((chunk) => chunk.replace(/\s+/g, ' ').trim())
    .filter((chunk) => chunk.length > 2);
}

function safeRegex(pattern: string, flags = 'i'): RegExp | undefined {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return undefined;
  }
}

function textIssueMatches(text: string, catalog: GuidanceRuleCatalog): TextIssue[] {
  const matches = new Map<string, TextIssue>();

  for (const match of text.matchAll(/\b[A-Za-z]{2,},[A-Za-z]{2,}\b/g)) {
    const evidence = match[0];
    matches.set(`copy.syntax.comma_inside_word.${evidence.toLowerCase()}`, {
      id: 'copy.syntax.comma_inside_word',
      severity: 'major',
      evidence,
      suggestion: 'Review this word for an accidental comma or typo.',
    });
  }

  for (const match of text.matchAll(/\b([A-Za-z]{3,})\s+\1\b/gi)) {
    const evidence = match[0];
    matches.set(`copy.syntax.repeated_word.${evidence.toLowerCase()}`, {
      id: 'copy.syntax.repeated_word',
      severity: 'minor',
      evidence,
      suggestion: 'Remove the duplicated word if it is not intentional.',
    });
  }

  for (const check of catalog.copy_watchlist ?? []) {
    const pattern = safeRegex(check.pattern, check.flags ?? 'i');
    if (!pattern) continue;
    const match = text.match(pattern);
    if (!match) continue;
    const evidence = check.evidence ?? match?.[0] ?? check.pattern;
    matches.set(check.id, {
      id: check.id,
      severity: check.severity ?? 'minor',
      evidence,
      suggestion: check.suggestion,
    });
  }
  return [...matches.values()];
}

function duplicateText(chunks: string[]): DuplicateText[] {
  const ignore = new Set([
    'Home',
    'Solutions',
    'Pricing',
    'Contact',
    'Templates',
    'Licenses',
    'LinkedIn',
    'Twitter',
    'Instagram',
    'Get Started',
    'Start a Project',
  ]);
  const counts = new Map<string, { text: string; count: number }>();
  for (const chunk of chunks) {
    if (ignore.has(chunk) || chunk.length < 18) continue;
    const key = chunk.toLowerCase().replace(/\s+/g, ' ');
    const current = counts.get(key) ?? { text: chunk, count: 0 };
    current.count += 1;
    counts.set(key, current);
  }
  return [...counts.values()]
    .filter((entry) => entry.count > 1)
    .sort((a, b) => b.count - a.count || b.text.length - a.text.length)
    .slice(0, 12);
}

function countPattern(source: string | undefined, pattern: RegExp): number {
  if (!source) return 0;
  return [...source.matchAll(pattern)].length;
}

function extractAnchors(html: string | undefined): Array<{ href: string; text: string }> {
  if (!html) return [];
  return [...html.matchAll(/<a\b[^>]*href=(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi)].map((match) => ({
    href: match[1] ?? match[2] ?? match[3] ?? '',
    text: decodeHtmlEntities((match[4] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()),
  }));
}

function detectMisdirectedLinks(anchors: Array<{ href: string; text: string }>, catalog: GuidanceRuleCatalog): string[] {
  const findings: string[] = [];
  for (const expectation of catalog.link_label_expectations ?? []) {
    const labelPattern = safeRegex(expectation.label_pattern, expectation.label_flags ?? 'i');
    if (!labelPattern) continue;
    const hrefPatterns = expectation.flag_href_patterns
      .map((pattern) => safeRegex(pattern, expectation.href_flags ?? 'i'))
      .filter((pattern): pattern is RegExp => Boolean(pattern));
    for (const anchor of anchors) {
      if (!labelPattern.test(anchor.text)) continue;
      if (!hrefPatterns.some((pattern) => pattern.test(anchor.href))) continue;
      findings.push(`"${anchor.text}" links to ${anchor.href}. ${expectation.suggestion}`);
    }
  }
  return uniqueStrings(findings);
}

function mergeRuleCatalog(catalog: GuidanceRuleCatalog | undefined): GuidanceRuleCatalog {
  return {
    ...DEFAULT_RULE_CATALOG,
    ...(catalog ?? {}),
    thresholds: {
      ...DEFAULT_RULE_CATALOG.thresholds,
      ...(catalog?.thresholds ?? {}),
    },
    copy_watchlist: catalog?.copy_watchlist ?? DEFAULT_RULE_CATALOG.copy_watchlist,
    link_label_expectations: catalog?.link_label_expectations ?? DEFAULT_RULE_CATALOG.link_label_expectations,
  };
}

function buildSignalSources(params: { options: CliOptions; ruleCatalog: GuidanceRuleCatalog }): GuidanceDraft['signal_sources'] {
  const { options, ruleCatalog } = params;
  return {
    programmatic_detectors: [
      'html_text_extraction',
      'duplicate_text_grouping',
      'comma_inside_word_detection',
      'repeated_word_detection',
      'anchor_label_href_matching',
      'animation_hook_counting',
      'sandbox_static_h1_findings',
      'sandbox_rendered_clipped_text_count',
      'network_image_head_size_check',
      'visual_proxy_rule_ids',
    ],
    catalog_configured_detectors: [
      ruleCatalog.copy_watchlist?.length ? 'copy_watchlist_patterns' : '',
      ruleCatalog.link_label_expectations?.length ? 'link_label_expectations' : '',
      ruleCatalog.thresholds ? 'thresholds' : '',
    ].filter(Boolean),
    artifact_backed_inputs: [
      options.sandboxNormalized ? 'sandbox_normalized' : '',
      options.htmlSnapshot ? 'html_snapshot' : '',
      options.visualProxies ? 'visual_proxies' : '',
      options.networkLog ? 'network_log' : '',
    ].filter(Boolean),
    human_review_required_for: [
      'final marketplace decision',
      'visual quality/outdated-style language',
      'clipped text false-positive review',
      'scroll-animation fallback validation',
      'creator-facing final wording',
    ],
    guidance_rule_catalog: options.guidanceRuleCatalog
      ? {
          path: options.guidanceRuleCatalog,
          schema_version: ruleCatalog.schema_version,
          copy_watchlist_count: ruleCatalog.copy_watchlist?.length ?? 0,
          link_label_expectation_count: ruleCatalog.link_label_expectations?.length ?? 0,
          threshold_keys: Object.keys(ruleCatalog.thresholds ?? {}),
        }
      : undefined,
  };
}

async function fetchAssetSizes(networkLogFile: string | undefined, maxCount: number, enabled: boolean): Promise<AssetSize[]> {
  if (!networkLogFile || !enabled) return [];
  const entries = await readJson<NetworkEntry[]>(networkLogFile);
  const imageUrls = [
    ...new Set(
      entries
        .filter((entry) => entry.resource_type === 'image' && typeof entry.url === 'string')
        .map((entry) => entry.url as string),
    ),
  ].slice(0, maxCount);

  const rows: AssetSize[] = [];
  for (const url of imageUrls) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const bytes = Number(response.headers.get('content-length') || 0) || undefined;
      rows.push({
        url,
        bytes,
        mb: bytes ? Number((bytes / 1024 / 1024).toFixed(3)) : undefined,
        content_type: response.headers.get('content-type') ?? undefined,
      });
    } catch (error) {
      rows.push({ url, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return rows.sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0));
}

function addGuidance(items: GuidanceItem[], item: GuidanceItem) {
  if (items.some((existing) => existing.id === item.id)) return;
  items.push(item);
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    unique.push(trimmed);
  }
  return unique;
}

function ellipsis(value: string, maxLength = 120): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function assetFileName(url: string): string {
  try {
    return path.basename(new URL(url).pathname);
  } catch {
    return url;
  }
}

function buildContentWhereToLook(textIssues: TextIssue[], duplicates: DuplicateText[]): string[] {
  const typoTargets = textIssues.map((issue) => `"${issue.evidence}"`);
  const duplicateTargets = duplicates
    .slice(0, 4)
    .map((entry) => `Repeated ${entry.count}x: "${ellipsis(entry.text.replace(/^"+|"+$/g, '').trim())}"`);
  return uniqueStrings([
    typoTargets.length > 0 ? `Copy polish: search the site for ${typoTargets.join(', ')} and correct the surrounding sentence.` : '',
    duplicateTargets.length > 0 ? 'Repeated content: review testimonials, process steps, FAQs, metrics, and case-study descriptions for reused placeholder copy.' : '',
    ...duplicateTargets,
  ]);
}

function buildCreatorWhereToLook(items: GuidanceItem[]): string[] {
  return uniqueStrings(
    [...items]
      .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))
      .flatMap((item) => item.where_to_look),
  );
}

function buildCreatorMessagePointers(items: GuidanceItem[]): string[] {
  return uniqueStrings(
    items.flatMap((item) => {
      if (item.id === 'guidance.content.copy_polish') return item.where_to_look.slice(0, 4);
      if (item.id === 'guidance.seo.heading_structure') return item.where_to_look.slice(0, 4);
      return item.where_to_look.slice(0, 2);
    }),
  ).slice(0, 20);
}

function buildGuidance(params: {
  options: CliOptions;
  normalized: SandboxNormalized;
  html?: string;
  visualProxies?: VisualProxyFile;
  assetSizes: AssetSize[];
  ruleCatalog: GuidanceRuleCatalog;
}): GuidanceDraft {
  const { options, normalized, html, visualProxies, assetSizes, ruleCatalog } = params;
  const sourceUrl = options.url ?? normalized.source_url ?? '';
  const thresholds = { ...DEFAULT_RULE_CATALOG.thresholds, ...(ruleCatalog.thresholds ?? {}) };
  const chunks = htmlToTextChunks(html ?? '');
  const textIssues = textIssueMatches(chunks.join('\n'), ruleCatalog);
  const duplicates = duplicateText(chunks);
  const anchors = extractAnchors(html);
  const misdirectedLinks = detectMisdirectedLinks(anchors, ruleCatalog);
  const animationClassCounts = {
    opacity_scroll: countPattern(html, /\bopacityanimat[a-z]*onscroll\b/gi),
    line_animation: countPattern(html, /\blinesanimation\b/gi),
    scroll_trigger: countPattern(html, /\bScrollTrigger\b/g),
    split_text: countPattern(html, /\bSplitText\b/g),
    lenis: countPattern(html, /\blenis\b/gi),
  };
  const h1MissingPages =
    normalized.findings
      ?.filter((finding) => finding.rule_id === 'published_site.static.h1_missing')
      .map((finding) => finding.page_url)
      .filter((value): value is string => Boolean(value)) ?? [];
  const visualRuleIds = visualProxies?.findings?.map((finding) => finding.rule_id).filter((value): value is string => Boolean(value)) ?? [];
  const largeAssets = assetSizes.filter((asset) => (asset.bytes ?? 0) >= (thresholds.large_asset_bytes ?? 1_000_000));
  const items: GuidanceItem[] = [];

  if (textIssues.length > 0 || duplicates.length > 0) {
    addGuidance(items, {
      id: 'guidance.content.copy_polish',
      priority: 1,
      bucket: 'content_copy',
      creator_safe_guidance:
        'Replace placeholder and repeated copy with polished, buyer-ready copy. Each testimonial, case study, process step, FAQ, and metric should be distinct, grammatically correct, and aligned to the AI/SaaS use case.',
      rationale:
        'Template buyers should be able to use the demo content as a credible starting point. Repeated testimonials, repeated process text, and visible typos make the template feel unfinished even when the layout is responsive.',
      evidence: [
        ...textIssues.map((issue) => `${issue.id}: ${issue.evidence} (${issue.suggestion})`),
        ...duplicates.slice(0, 6).map((entry) => `Repeated ${entry.count}x: "${entry.text}"`),
      ],
      where_to_look: buildContentWhereToLook(textIssues, duplicates),
      reviewer_notes: ['This is the strongest current evidence-backed improvement area and is safe to explain to the creator.'],
    });
  }

  if (visualRuleIds.length > 0) {
    addGuidance(items, {
      id: 'guidance.visual.refresh_and_differentiate',
      priority: 1,
      bucket: 'visual_quality',
      creator_safe_guidance:
        'Strengthen the visual system so the template feels less like a generic dark AI landing page. Refresh the typography scale, spacing rhythm, section composition, and red/black AI motif with more distinctive art direction and more varied content sections.',
      rationale:
        'The visual-quality proxy does not make a final style judgment, but it does flag weak hierarchy and typography signals that should be compared against recently approved high-quality AI/SaaS templates.',
      evidence: [
        `Visual proxy findings: ${visualRuleIds.join(', ')}`,
        ...(visualProxies?.findings ?? []).flatMap((finding) =>
          (finding.proxy_signals ?? []).map((signal) => `${finding.rule_id}: ${signal.id}=${String(signal.value)}`),
        ),
      ],
      where_to_look: [
        'Primary visual system: review the home page and main AI/SaaS sections for typography hierarchy, spacing rhythm, section composition, and the red/black AI motif.',
        `Differentiation pass: compare the design against current high-quality AI/SaaS Marketplace templates and make the art direction feel more specific to ${options.title}.`,
        'Section variety: make hero, feature, process, testimonial, pricing, and case-study areas feel intentionally distinct rather than variations of the same dark-panel pattern.',
      ],
      reviewer_notes: [
        'Use current good/exceptional examples before calling this outdated in final feedback.',
        'The stable creator-facing phrasing is "strengthen and modernize the visual system" rather than "your design is outdated."',
      ],
    });
  }

  if (
    animationClassCounts.opacity_scroll >= (thresholds.animation_class_count ?? 10) ||
    animationClassCounts.line_animation >= (thresholds.animation_class_count ?? 10)
  ) {
    addGuidance(items, {
      id: 'guidance.interaction.animation_fallback',
      priority: 2,
      bucket: 'responsive_interaction',
      creator_safe_guidance:
        'Review the scroll-triggered animation setup and make sure important sections are visible with a safe fallback. Core content should not depend on animation timing to appear complete in automated, slow, or reduced-motion contexts.',
      rationale:
        'The page uses many scroll/line animation hooks. In sandbox full-page screenshots, this can produce large blank regions until scroll activation is simulated, so reviewers should verify the real scrolling experience and reduced-motion behavior.',
      evidence: [
        `opacity/scroll animation class count: ${animationClassCounts.opacity_scroll}`,
        `line animation class count: ${animationClassCounts.line_animation}`,
        `ScrollTrigger references: ${animationClassCounts.scroll_trigger}`,
        `SplitText references: ${animationClassCounts.split_text}`,
      ],
      where_to_look: [
        'Scroll interactions: inspect sections using opacity/scroll animation classes, line animation classes, ScrollTrigger, SplitText, or Lenis.',
        'Fallback behavior: confirm important text and sections remain visible during slow loads, automated screenshots, and reduced-motion conditions.',
      ],
      reviewer_notes: [
        'This is a manual validation item. It should not be treated as a rejection on its own unless the live scrolling experience is actually broken.',
      ],
    });
  }

  if (h1MissingPages.length > 0) {
    addGuidance(items, {
      id: 'guidance.seo.heading_structure',
      priority: 2,
      bucket: 'seo_accessibility',
      creator_safe_guidance:
        'Add one clear H1 to each major page and use lower heading levels for section structure. The visible page title should also be represented semantically.',
      rationale:
        'Multiple internal pages render without an H1, which weakens SEO/accessibility structure and makes the template feel less production-ready.',
      evidence: h1MissingPages.map((pageUrl) => `Missing H1: ${pageUrl}`),
      where_to_look: h1MissingPages.map((pageUrl) => `Heading structure: add one clear visible and semantic H1 on ${pageUrl}.`),
      reviewer_notes: ['The home page has an H1; this feedback applies to the sampled secondary pages.'],
    });
  }

  if ((normalized.rendered_summary?.total_clipped_text_candidates ?? 0) > (thresholds.clipped_text_candidate_count ?? 30)) {
    addGuidance(items, {
      id: 'guidance.responsive.clipped_text_review',
      priority: 2,
      bucket: 'responsive_interaction',
      creator_safe_guidance:
        'Recheck text containers across desktop, tablet, and mobile. Any label, nav item, button, or card text should fit naturally without clipping or relying on overflow-hidden.',
      rationale:
        'The rendered sandbox found a high number of clipped-text candidates across sampled pages and viewports. These need visual confirmation, but they are a useful review checklist item.',
      evidence: [
        `Clipped text candidates across sampled render states: ${normalized.rendered_summary?.total_clipped_text_candidates}`,
        `Sampled viewports: ${normalized.rendered_summary?.viewport_count}`,
      ],
      where_to_look: [
        'Responsive text containers: inspect desktop, tablet, and mobile states for nav labels, buttons, cards, headings, and metric labels.',
        'Overflow-hidden usage: check any tight text wrapper where content might be clipped rather than wrapping naturally.',
      ],
      reviewer_notes: ['Treat this as a review checklist item because automated clipped-text heuristics can include false positives.'],
    });
  }

  if (misdirectedLinks.length > 0) {
    addGuidance(items, {
      id: 'guidance.polish.link_targets',
      priority: 3,
      bucket: 'template_polish',
      creator_safe_guidance:
        'Audit the demo navigation and footer links. Link labels should match their destinations, and utility/legal paths should be spelled correctly.',
      rationale:
        'Misdirected or misspelled demo links make the template feel less finished and can confuse buyers during preview.',
      evidence: misdirectedLinks,
      where_to_look: misdirectedLinks.map((link) => `Navigation/footer links: ${link}`),
      reviewer_notes: ['Also manually check any utility pages that are not discovered from the home-page crawl.'],
    });
  }

  if (largeAssets.length > 0) {
    addGuidance(items, {
      id: 'guidance.performance.asset_optimization',
      priority: 3,
      bucket: 'performance',
      creator_safe_guidance:
        'Compress large imagery and prefer responsive WebP/AVIF assets where possible. Large PNG hero or section images should be resized to their rendered dimensions.',
      rationale:
        'Several image requests are above 1 MB, which can slow template previews and make the build feel less optimized.',
      evidence: largeAssets
        .slice(0, 6)
        .map((asset) => `${asset.mb} MB: ${assetFileName(asset.url)}`),
      where_to_look: largeAssets
        .slice(0, 6)
        .map((asset) => `Large asset: ${asset.mb} MB ${assetFileName(asset.url)} should be compressed or resized to its rendered dimensions.`),
      reviewer_notes: ['Asset-size evidence is live HEAD metadata from sampled image requests.'],
    });
  }

  const positives = [
    normalized.static_summary?.total_missing_alt === 0 ? 'No missing image alt text was found in the sampled static pages.' : undefined,
    normalized.rendered_summary?.total_overflowing_element_candidates === 0
      ? 'No horizontal overflow candidates were found in the sampled rendered viewports.'
      : undefined,
  ].filter((value): value is string => Boolean(value));

  const sortedItems = items.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  const creatorWhereToLook = buildCreatorWhereToLook(sortedItems);
  const creatorMessage = buildCreatorMessage(options.title, sortedItems, positives, buildCreatorMessagePointers(sortedItems));
  return {
    schema_version: 'template_improvement_guidance_draft.v0.3',
    generated_at: new Date().toISOString(),
    review_posture: 'draft_human_review_required',
    title: options.title,
    source_url: sourceUrl,
    decision_boundary: {
      not_final_decision: true,
      no_external_writes: true,
      creator_facing_requires_reviewer_approval: true,
    },
    evidence_inputs: {
      sandbox_normalized: normalizedFilePath(options.sandboxNormalized),
      html_snapshot: options.htmlSnapshot,
      visual_proxies: options.visualProxies,
      network_log: options.networkLog,
      guidance_rule_catalog: options.guidanceRuleCatalog,
    },
    signal_sources: buildSignalSources({ options, ruleCatalog }),
    evidence_summary: {
      evidence_status: normalized.evidence_status,
      page_count: normalized.static_summary?.page_count,
      viewport_count: normalized.rendered_summary?.viewport_count,
      total_images: normalized.static_summary?.total_images,
      total_missing_alt: normalized.static_summary?.total_missing_alt,
      total_overflowing_element_candidates: normalized.rendered_summary?.total_overflowing_element_candidates,
      total_clipped_text_candidates: normalized.rendered_summary?.total_clipped_text_candidates,
      h1_missing_pages: h1MissingPages,
      visual_proxy_rule_ids: visualRuleIds,
      text_issue_count: textIssues.length,
      duplicate_text_count: duplicates.length,
      large_asset_count: largeAssets.length,
      animation_class_counts: animationClassCounts,
    },
    guidance_items: sortedItems,
    creator_where_to_look: creatorWhereToLook,
    creator_message_draft: creatorMessage,
    reviewer_notes: [
      'This packet is a draft guidance artifact for human review. It must not be used as an official appeal decision without reviewer approval.',
      'Visual-style guidance is intentionally phrased as improvement direction, not as a deterministic outdated-style verdict.',
      ...positives.map((positive) => `Positive sampled signal: ${positive}`),
    ],
  };
}

function buildCreatorMessage(title: string, items: GuidanceItem[], positives: string[], whereToLook: string[]): string {
  const topItems = items.filter((item) => item.priority <= 2);
  const bullets = topItems
    .map((item) => `- ${item.creator_safe_guidance}`)
    .join('\n');
  const whereText =
    whereToLook.length > 0
      ? `\n\nConcrete places to start:\n\n${whereToLook
          .slice(0, 20)
          .map((entry) => `- ${entry}`)
          .join('\n')}`
      : '';
  const positiveText = positives.length > 0 ? `\n\nThe sampled validation also showed some solid foundations: ${positives.join(' ')}` : '';
  return `Thanks for asking us to take another look at ${title}. Based on the current published preview, the strongest improvements would be:\n\n${bullets}${whereText}${positiveText}\n\nThis is guidance for revision, not a final marketplace decision. A reviewer should confirm the live scrolling experience and compare the visual direction against current approved templates before sending final feedback.`;
}

function markdown(draft: GuidanceDraft): string {
  const itemSections = draft.guidance_items
    .map(
      (item) => `### ${item.id}

Priority: ${item.priority}
Bucket: ${item.bucket}

Creator-safe guidance:
${item.creator_safe_guidance}

Rationale:
${item.rationale}

Where to look:
${item.where_to_look.map((entry) => `- ${entry}`).join('\n') || '- No specific location pointers generated.'}

Evidence:
${item.evidence.map((entry) => `- ${entry}`).join('\n')}

Reviewer notes:
${item.reviewer_notes.map((entry) => `- ${entry}`).join('\n')}`,
    )
    .join('\n\n');

  return `# ${draft.title} improvement guidance draft

Source: ${draft.source_url}
Generated: ${draft.generated_at}
Posture: ${draft.review_posture}

This is not a final approval, rejection, or quality band. Creator-facing use requires reviewer approval.

## Evidence summary

- Evidence status: ${draft.evidence_summary.evidence_status ?? 'unknown'}
- Pages sampled: ${draft.evidence_summary.page_count ?? 'unknown'}
- Viewports sampled: ${draft.evidence_summary.viewport_count ?? 'unknown'}
- Missing-alt count: ${draft.evidence_summary.total_missing_alt ?? 'unknown'}
- Horizontal overflow candidates: ${draft.evidence_summary.total_overflowing_element_candidates ?? 'unknown'}
- Clipped-text candidates: ${draft.evidence_summary.total_clipped_text_candidates ?? 'unknown'}
- H1-missing pages: ${draft.evidence_summary.h1_missing_pages.length}
- Visual proxy findings: ${draft.evidence_summary.visual_proxy_rule_ids.join(', ') || 'none'}
- Text issues: ${draft.evidence_summary.text_issue_count}
- Duplicate text groups: ${draft.evidence_summary.duplicate_text_count}
- Large assets checked: ${draft.evidence_summary.large_asset_count}

## Signal Sources

Programmatic detectors:
${draft.signal_sources.programmatic_detectors.map((entry) => `- ${entry}`).join('\n')}

Catalog-configured detectors:
${draft.signal_sources.catalog_configured_detectors.map((entry) => `- ${entry}`).join('\n') || '- none'}

Artifact-backed inputs:
${draft.signal_sources.artifact_backed_inputs.map((entry) => `- ${entry}`).join('\n') || '- none'}

Human review still required for:
${draft.signal_sources.human_review_required_for.map((entry) => `- ${entry}`).join('\n')}

## Creator Where To Look

${draft.creator_where_to_look.map((entry) => `- ${entry}`).join('\n') || 'No concrete location pointers generated.'}

## Creator Message Draft

${draft.creator_message_draft}

## Guidance Items

${itemSections || 'No guidance items generated from the provided evidence.'}

## Reviewer Notes

${draft.reviewer_notes.map((entry) => `- ${entry}`).join('\n')}
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const resolvedOptions: CliOptions = {
    ...options,
    sandboxNormalized: await resolveReadablePath(normalizedFilePath(options.sandboxNormalized), '--sandbox-normalized'),
    htmlSnapshot: await resolveOptionalReadablePath(options.htmlSnapshot, '--html'),
    visualProxies: await resolveOptionalReadablePath(options.visualProxies, '--visual-proxies'),
    networkLog: await resolveOptionalReadablePath(options.networkLog, '--network-log'),
    guidanceRuleCatalog: await resolveOptionalReadablePath(options.guidanceRuleCatalog, '--guidance-rule-catalog'),
    outDir: resolveOutputDir(options.outDir),
  };
  const [normalized, html, visualProxies] = await Promise.all([
    readJson<SandboxNormalized>(resolvedOptions.sandboxNormalized),
    optionalRead(resolvedOptions.htmlSnapshot),
    resolvedOptions.visualProxies ? readJson<VisualProxyFile>(resolvedOptions.visualProxies) : Promise.resolve(undefined),
  ]);
  const ruleCatalog = mergeRuleCatalog(
    resolvedOptions.guidanceRuleCatalog ? await readJson<GuidanceRuleCatalog>(resolvedOptions.guidanceRuleCatalog) : undefined,
  );
  const assetSizes = await fetchAssetSizes(resolvedOptions.networkLog, resolvedOptions.maxAssetSizes, resolvedOptions.fetchAssetSizes);
  const draft = buildGuidance({ options: resolvedOptions, normalized, html, visualProxies, assetSizes, ruleCatalog });

  await mkdir(resolvedOptions.outDir, { recursive: true });
  const jsonFile = path.join(resolvedOptions.outDir, 'creator-guidance-draft.json');
  const markdownFile = path.join(resolvedOptions.outDir, 'creator-guidance-draft.md');
  const summaryFile = path.join(resolvedOptions.outDir, 'creator-guidance-summary.json');
  await writeFile(jsonFile, `${JSON.stringify(draft, null, 2)}\n`);
  await writeFile(markdownFile, markdown(draft));
  await writeFile(
    summaryFile,
    `${JSON.stringify(
      {
        ok: true,
        out_dir: resolvedOptions.outDir,
        json_file: jsonFile,
        markdown_file: markdownFile,
        guidance_item_count: draft.guidance_items.length,
        creator_where_to_look_count: draft.creator_where_to_look.length,
        programmatic_detector_count: draft.signal_sources.programmatic_detectors.length,
        catalog_configured_detector_count: draft.signal_sources.catalog_configured_detectors.length,
        source_url: draft.source_url,
        review_posture: draft.review_posture,
      },
      null,
      2,
    )}\n`,
  );
  console.log(JSON.stringify({ ok: true, guidance_item_count: draft.guidance_items.length, out_dir: resolvedOptions.outDir }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
