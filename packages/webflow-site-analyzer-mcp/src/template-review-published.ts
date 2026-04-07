import type {
  DesignerChecklistReport,
  PublishedSnippetCrawlResult,
  PublishedSnippetExample,
  PublishedSnippetIssueCounts,
  PublishedSnippetIssueExamples,
  PublishedSnippetPageResult,
  UnifiedReviewRow,
  UnifiedReviewStatus,
} from './types.js';

type PageAuditSummary = NonNullable<PublishedSnippetPageResult['summary']>;

const PRESERVED_EXAMPLE_LIMIT = 5;
const EVIDENCE_EXAMPLE_LIMIT = 3;
const REQUIRED_SNIPPET_TOOLS = ['audit_webflow_way', 'get_sitemap_urls', 'audit_404'] as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function asFiniteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeExamples(
  value: unknown,
  limit = PRESERVED_EXAMPLE_LIMIT,
): PublishedSnippetExample[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, limit)
    .map((item) => {
      if (item && typeof item === 'object') return item as PublishedSnippetExample;
      return { value: item };
    });
}

function buildExampleMap(entries: Array<[string, unknown]>): PublishedSnippetIssueExamples {
  const examples: PublishedSnippetIssueExamples = {};
  for (const [issueName, value] of entries) {
    examples[issueName] = normalizeExamples(value);
  }
  return examples;
}

function truncateText(value: string, maxLength = 180): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function formatExampleValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return truncateText(value.replace(/\s+/g, ' ').trim(), 140);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return truncateText(JSON.stringify(value), 140);
  } catch {
    return String(value);
  }
}

function formatExample(example: PublishedSnippetExample): string {
  const preferredKeys = [
    'field',
    'code',
    'length',
    'value',
    'selector',
    'text',
    'href',
    'src',
    'alt',
    'loading',
    'fieldTag',
    'fieldType',
    'name',
    'placeholder',
    'target',
    'rel',
    'interactionId',
    'timelineId',
    'actionListId',
  ];

  const preferredParts = preferredKeys
    .filter((key) => example[key] !== undefined && example[key] !== null && example[key] !== '')
    .map((key) => `${key}=${formatExampleValue(example[key])}`);

  if (preferredParts.length > 0) {
    return preferredParts.join(' | ');
  }

  const fallbackParts = Object.entries(example)
    .slice(0, 4)
    .map(([key, value]) => `${key}=${formatExampleValue(value)}`);
  return fallbackParts.join(' | ');
}

function collectExampleEvidence(
  pages: PublishedSnippetPageResult[],
  label: string,
  selectExamples: (summary: PageAuditSummary) => PublishedSnippetExample[],
  maxExamples = EVIDENCE_EXAMPLE_LIMIT,
): string[] {
  const evidence: string[] = [];

  for (const page of pages) {
    if (evidence.length >= maxExamples) break;
    if (!page.summary) continue;

    const examples = selectExamples(page.summary).slice(0, maxExamples - evidence.length);
    for (const example of examples) {
      evidence.push(`${label}Example=${page.url} :: ${formatExample(example)}`);
    }
  }

  return evidence;
}

function collectStatusEvidence(
  pages: PublishedSnippetPageResult[],
  maxExamples = EVIDENCE_EXAMPLE_LIMIT,
): string[] {
  return pages
    .filter((page) => page.statusCode === null || page.statusCode >= 400)
    .slice(0, maxExamples)
    .map(
      (page) =>
        `pageStatus=${page.url} :: status=${page.statusCode ?? 'unknown'} | auditSource=${page.auditSource}`,
    );
}

function mapDesignerStatus(
  designer: DesignerChecklistReport,
  id: string,
): { status: UnifiedReviewStatus; evidence: string[]; confidence: number } {
  const check = designer.checks.find((item) => item.id === id);
  if (!check) {
    return {
      status: 'manual',
      evidence: [`Designer check not found: ${id}`],
      confidence: 0.2,
    };
  }
  if (check.result === 'pass') return { status: 'pass', evidence: check.evidence, confidence: 0.93 };
  if (check.result === 'fail') return { status: 'fail', evidence: check.evidence, confidence: 0.93 };
  return { status: 'manual', evidence: check.evidence, confidence: 0.2 };
}

function buildSnippetEvidence(published: PublishedSnippetCrawlResult): string[] {
  const reviewApiTools = published.reviewApiTools ?? published.snippetTools;
  const missingRequiredTools = REQUIRED_SNIPPET_TOOLS.filter(
    (toolName) => !reviewApiTools.includes(toolName),
  );
  const runtimeInjectionPages =
    published.pagesWithRuntimeInjection ??
    published.pages.filter(
      (page) => page.runtimeInjectionSucceeded || page.auditSource === 'runtime-injected' || page.auditSource === 'snippet',
    ).length;
  const installedSnippetPages =
    published.pagesWithInstalledSnippet ??
    published.pagesWithSnippet ??
    published.pages.filter((page) => page.hasInstalledSnippet === true || page.hasSnippet === true)
      .length;
  const installedFallbackAuditPages =
    published.pagesWithInstalledFallback ??
    published.pages.filter((page) => page.auditSource === 'installed-fallback').length;
  const reviewApiAuditPages = published.pages.filter(
    (page) =>
      page.auditSource === 'runtime-injected' ||
      page.auditSource === 'installed-fallback' ||
      page.auditSource === 'snippet',
  ).length;
  const domFallbackAuditPages = published.pages.filter(
    (page) => page.auditSource === 'dom-fallback',
  ).length;
  const noAuditPages = published.pages.filter((page) => page.auditSource === 'none').length;
  const runtimeInjectionFailures =
    published.runtimeInjectionFailures ??
    published.pages.filter(
      (page) => typeof page.runtimeInjectionError === 'string' && page.runtimeInjectionError.length > 0,
    ).length;
  const runtimeInjectionErrorEvidence = published.pages
    .filter(
      (page) => typeof page.runtimeInjectionError === 'string' && page.runtimeInjectionError.length > 0,
    )
    .slice(0, EVIDENCE_EXAMPLE_LIMIT)
    .map(
      (page) =>
        `runtimeInjectionError=${page.url} :: ${truncateText(page.runtimeInjectionError as string, 140)}`,
    );

  return [
    `runtimeInjectionPages=${runtimeInjectionPages}/${published.visitedPages}`,
    `installedFallbackPages=${installedFallbackAuditPages}`,
    `installedSnippetPages=${installedSnippetPages}/${published.visitedPages}`,
    `reviewApiAuditPages=${reviewApiAuditPages}`,
    `domFallbackAuditPages=${domFallbackAuditPages}`,
    `noAuditPages=${noAuditPages}`,
    `auditedPages=${published.auditedPages}`,
    `runtimeInjectionFailures=${runtimeInjectionFailures}`,
    `reviewApiVersion=${published.reviewApiVersion || published.snippetVersion || 'unknown'}`,
    `reviewApiTools=${reviewApiTools.join(',') || 'none'}`,
    `missingRequiredTools=${missingRequiredTools.join(',') || 'none'}`,
    ...runtimeInjectionErrorEvidence,
  ];
}

export function summarizePublishedPageAudit(audit: unknown): PageAuditSummary {
  const root = asRecord(audit);
  const meta = asRecord(root.meta);
  const metaTitle = asRecord(meta.title);
  const metaDescription = asRecord(meta.description);
  const metaCanonical = asRecord(meta.canonical);
  const metaRobots = asRecord(meta.robots);
  const metaOpenGraph = asRecord(meta.openGraph);
  const headingsRoot = asRecord(root.headings);
  const headings = asRecord(headingsRoot.summary);
  const linksRoot = asRecord(root.links);
  const links = asRecord(linksRoot.summary);
  const imagesRoot = asRecord(root.images);
  const images = asRecord(imagesRoot.summary);
  const formsRoot = asRecord(root.forms);
  const forms = asRecord(formsRoot.summary);
  const controlsRoot = asRecord(root.controls);
  const controls = asRecord(controlsRoot.summary);
  const mediaRoot = asRecord(root.media);
  const media = asRecord(mediaRoot.summary);
  const structuredDataRoot = asRecord(root.structuredData);
  const structuredData = asRecord(structuredDataRoot.summary);
  const interactions = asRecord(root.interactions);
  const ix2 = asRecord(interactions.ix2);
  const ix3 = asRecord(interactions.ix3);
  const ix2Summary = asRecord(ix2.summary);
  const ix3Summary = asRecord(ix3.summary);
  const imageFormats = asRecord(imagesRoot.formats);
  const structuredDataTypes = asStringArray(structuredData.types);

  const metaMissing = asStringArray(meta.missing);
  const metaWarnings = normalizeExamples(meta.warnings);
  const canonicalPresent = Boolean(metaCanonical.present);
  const robotsPresent = Boolean(metaRobots.present);
  const failReasons: string[] = [];

  if (metaMissing.length > 0) failReasons.push(`meta_missing:${metaMissing.join(',')}`);
  if (Boolean(headings.missingH1)) failReasons.push('missing_h1');
  if (Boolean(headings.multipleH1)) failReasons.push('multiple_h1');
  if (asFiniteNumber(headings.skippedHeadingLevels) > 0) {
    failReasons.push(`skipped_heading_levels:${asFiniteNumber(headings.skippedHeadingLevels)}`);
  }
  if (asFiniteNumber(headings.emptyHeadings) > 0) {
    failReasons.push(`empty_headings:${asFiniteNumber(headings.emptyHeadings)}`);
  }
  if (asFiniteNumber(images.images) > 0 && asFiniteNumber(images.missingAlt) > 0) {
    failReasons.push(`images_missing_alt:${asFiniteNumber(images.missingAlt)}`);
  }
  if (asFiniteNumber(links.blankTargetMissingRel) > 0) {
    failReasons.push(`blank_target_missing_rel:${asFiniteNumber(links.blankTargetMissingRel)}`);
  }
  if (asFiniteNumber(links.missingAccessibleName) > 0) {
    failReasons.push(`links_missing_accessible_name:${asFiniteNumber(links.missingAccessibleName)}`);
  }
  if (asFiniteNumber(links.emptyHref) > 0) {
    failReasons.push(`links_empty_href:${asFiniteNumber(links.emptyHref)}`);
  }
  if (asFiniteNumber(links.placeholderHref) > 0) {
    failReasons.push(`links_placeholder_href:${asFiniteNumber(links.placeholderHref)}`);
  }
  if (asFiniteNumber(images.missingDimensions) > 0) {
    failReasons.push(`images_missing_dimensions:${asFiniteNumber(images.missingDimensions)}`);
  }
  if (asFiniteNumber(images.aboveFoldLazy) > 0) {
    failReasons.push(`images_above_fold_lazy:${asFiniteNumber(images.aboveFoldLazy)}`);
  }
  if (asFiniteNumber(images.belowFoldNotLazy) > 0) {
    failReasons.push(`images_below_fold_not_lazy:${asFiniteNumber(images.belowFoldNotLazy)}`);
  }
  if (asFiniteNumber(forms.missingLabels) > 0) {
    failReasons.push(`forms_missing_labels:${asFiniteNumber(forms.missingLabels)}`);
  }
  if (asFiniteNumber(controls.missingAccessibleName) > 0) {
    failReasons.push(
      `controls_missing_accessible_name:${asFiniteNumber(controls.missingAccessibleName)}`,
    );
  }
  if (asFiniteNumber(controls.roleButtonMissingKeyboardAccess) > 0) {
    failReasons.push(
      `controls_missing_keyboard_access:${asFiniteNumber(
        controls.roleButtonMissingKeyboardAccess,
      )}`,
    );
  }
  if (asFiniteNumber(media.autoplayWithoutControls) > 0) {
    failReasons.push(`media_autoplay_without_controls:${asFiniteNumber(media.autoplayWithoutControls)}`);
  }
  if (asFiniteNumber(media.backgroundVideosMissingControl) > 0) {
    failReasons.push(
      `bg_video_missing_controls:${asFiniteNumber(media.backgroundVideosMissingControl)}`,
    );
  }
  if (asFiniteNumber(structuredData.parseErrors) > 0) {
    failReasons.push(`structured_data_parse_errors:${asFiniteNumber(structuredData.parseErrors)}`);
  }

  return {
    failCount: failReasons.length,
    failReasons,
    metaMissing,
    meta: {
      missing: metaMissing,
      titlePresent: Boolean(metaTitle.present),
      titleLength: asFiniteNumber(metaTitle.length),
      descriptionPresent: Boolean(metaDescription.present),
      descriptionLength: asFiniteNumber(metaDescription.length),
      canonicalPresent,
      canonicalHref:
        typeof metaCanonical.href === 'string' && metaCanonical.href.length > 0
          ? metaCanonical.href
          : null,
      robotsPresent,
      robotsContent:
        typeof metaRobots.content === 'string' && metaRobots.content.length > 0
          ? metaRobots.content
          : null,
      openGraph: {
        titlePresent:
          typeof metaOpenGraph.title === 'string' && metaOpenGraph.title.length > 0,
        descriptionPresent:
          typeof metaOpenGraph.description === 'string' && metaOpenGraph.description.length > 0,
        imagePresent:
          typeof metaOpenGraph.image === 'string' && metaOpenGraph.image.length > 0,
        urlPresent: typeof metaOpenGraph.url === 'string' && metaOpenGraph.url.length > 0,
        typePresent: typeof metaOpenGraph.type === 'string' && metaOpenGraph.type.length > 0,
      },
      warnings: metaWarnings,
      examples: buildExampleMap([
        ['missing', metaMissing.map((field) => ({ field }))],
        ['warnings', metaWarnings],
        ['canonicalMissing', canonicalPresent ? [] : [{ href: null }]],
      ]),
    },
    headings: {
      headings: asFiniteNumber(headings.headings),
      h1: asFiniteNumber(headings.h1),
      missingH1: Boolean(headings.missingH1),
      multipleH1: Boolean(headings.multipleH1),
      skippedHeadingLevels: asFiniteNumber(headings.skippedHeadingLevels),
      emptyHeadings: asFiniteNumber(headings.emptyHeadings),
      examples: buildExampleMap([
        ['skippedHeadingLevels', headingsRoot.skippedHeadingLevels],
        ['emptyHeadings', headingsRoot.emptyHeadings],
      ]),
    },
    links: {
      links: asFiniteNumber(links.links),
      emptyHref: asFiniteNumber(links.emptyHref),
      placeholderHref: asFiniteNumber(links.placeholderHref),
      blankTargetMissingRel: asFiniteNumber(links.blankTargetMissingRel),
      missingAccessibleName: asFiniteNumber(links.missingAccessibleName),
      examples: buildExampleMap([
        ['emptyHref', linksRoot.emptyHref],
        ['placeholderHref', linksRoot.placeholderHref],
        ['blankTargetMissingRel', linksRoot.blankTargetMissingRel],
        ['missingAccessibleName', linksRoot.missingAccessibleName],
      ]),
    },
    images: {
      images: asFiniteNumber(images.images),
      missingAlt: asFiniteNumber(images.missingAlt),
      missingDimensions: asFiniteNumber(images.missingDimensions),
      aboveFoldLazy: asFiniteNumber(images.aboveFoldLazy),
      belowFoldNotLazy: asFiniteNumber(images.belowFoldNotLazy),
      examples: buildExampleMap([
        ['missingAlt', imagesRoot.missingAlt],
        ['missingDimensions', imagesRoot.missingDimensions],
        ['aboveFoldLazy', imagesRoot.aboveFoldLazy],
        ['belowFoldNotLazy', imagesRoot.belowFoldNotLazy],
      ]),
    },
    imageFormats: Object.fromEntries(
      Object.entries(imageFormats).map(([key, value]) => [key, asFiniteNumber(value)]),
    ),
    forms: {
      fields: asFiniteNumber(forms.fields),
      missingLabels: asFiniteNumber(forms.missingLabels),
      examples: buildExampleMap([['missingLabels', formsRoot.missingLabels]]),
    },
    controls: {
      controls: asFiniteNumber(controls.controls),
      missingAccessibleName: asFiniteNumber(controls.missingAccessibleName),
      roleButtonMissingKeyboardAccess: asFiniteNumber(
        controls.roleButtonMissingKeyboardAccess,
      ),
      examples: buildExampleMap([
        ['missingAccessibleName', controlsRoot.missingAccessibleName],
        ['roleButtonMissingKeyboardAccess', controlsRoot.roleButtonMissingKeyboardAccess],
      ]),
    },
    media: {
      videos: asFiniteNumber(media.videos),
      autoplayWithoutControls: asFiniteNumber(media.autoplayWithoutControls),
      backgroundVideosMissingControl: asFiniteNumber(media.backgroundVideosMissingControl),
      examples: buildExampleMap([
        ['autoplayWithoutControls', mediaRoot.autoplayWithoutControls],
        ['backgroundVideosMissingControl', mediaRoot.backgroundVideosMissingControl],
      ]),
    },
    structuredData: {
      scripts: asFiniteNumber(structuredData.scripts),
      validScripts: asFiniteNumber(structuredData.validScripts),
      parseErrors: asFiniteNumber(structuredData.parseErrors),
      nodes: asFiniteNumber(structuredData.nodes),
      types: structuredDataTypes,
      examples: buildExampleMap([
        ['parseErrors', structuredDataRoot.parseErrors],
        ['types', structuredDataRoot.itemTypes],
      ]),
    },
    ix2: {
      events: asFiniteNumber(ix2Summary.events),
      actionLists: asFiniteNumber(ix2Summary.actionLists),
      usedActionLists: asFiniteNumber(ix2Summary.usedActionLists),
      unusedActionLists: asFiniteNumber(ix2Summary.unusedActionLists),
      missingTargets: asFiniteNumber(ix2Summary.missingTargets),
      missingActionLists: asFiniteNumber(ix2Summary.missingActionLists),
      examples: buildExampleMap([
        ['unusedActionLists', ix2.unusedActionLists],
        ['missingTargets', ix2.missingTargets],
        ['missingActionLists', ix2.missingActionLists],
      ]),
    },
    ix3: {
      interactions: asFiniteNumber(ix3Summary.interactions),
      timelines: asFiniteNumber(ix3Summary.timelines),
      missingTimelines: asFiniteNumber(ix3Summary.missingTimelines),
      deletedInteractions: asFiniteNumber(ix3Summary.deletedInteractions),
      missingTargetSelectors: asFiniteNumber(ix3Summary.missingTargetSelectors),
      examples: buildExampleMap([
        ['missingTimelines', ix3.missingTimelines],
        ['deletedInteractions', ix3.deletedInteractions],
        ['missingTargetSelectors', ix3.missingTargetSelectors],
      ]),
    },
  };
}

export function emptyIssueCounts(): PublishedSnippetIssueCounts {
  return {
    metaMissing: 0,
    missingH1: 0,
    multipleH1: 0,
    skippedHeadingLevels: 0,
    imagesMissingAlt: 0,
    linksMissingRel: 0,
    linksMissingAccessibleName: 0,
    linksEmptyHref: 0,
    linksPlaceholderHref: 0,
    imagesMissingDimensions: 0,
    imagesAboveFoldLazy: 0,
    imagesBelowFoldNotLazy: 0,
    formsMissingLabels: 0,
    controlsMissingAccessibleName: 0,
    controlsRoleButtonMissingKeyboardAccess: 0,
    autoplayWithoutControls: 0,
    backgroundVideosMissingControl: 0,
    structuredDataParseErrors: 0,
  };
}

export function unifyRows(
  designer: DesignerChecklistReport,
  published: PublishedSnippetCrawlResult,
  includeManual: boolean,
): UnifiedReviewRow[] {
  const home = published.pages.find((page) => page.url === published.startUrl) || published.pages[0] || null;
  const homeTitle = home?.title || '';
  const homeMeta = home?.summary?.meta ?? null;
  const formatKeys = Array.from(
    new Set(
      published.pages.flatMap((page) =>
        Object.keys(page.summary?.imageFormats || {}).map((key) => key.toLowerCase()),
      ),
    ),
  ).sort();

  const hasLicensePage = published.pages.some((page) => page.url.toLowerCase().includes('/license'));
  const licensePages = published.pages.filter((page) => page.url.toLowerCase().includes('/license'));
  const hasKnownLicenseTextResult = licensePages.some(
    (page) => typeof page.hasRequiredLicenseText === 'boolean',
  );
  const hasRequiredLicenseText = licensePages.some((page) => page.hasRequiredLicenseText === true);
  const snippetEvidence = buildSnippetEvidence(published);

  const rows: UnifiedReviewRow[] = [];
  const pushRow = (
    id: string,
    section: string,
    requirement: string,
    status: UnifiedReviewStatus,
    evidence: string[],
    source: string[],
    confidence: number,
    fixHint?: string,
  ) => {
    rows.push({ id, section, requirement, status, evidence, source, confidence, fixHint });
  };

  const dNavFooter = mapDesignerStatus(designer, 'components.nav_footer_cta');
  const dComponentNames = mapDesignerStatus(designer, 'components.title_case_naming');
  const dVarReusable = mapDesignerStatus(designer, 'variables.defined_reusable');
  const dVarTitle = mapDesignerStatus(designer, 'variables.title_case_naming');
  const dVarBreakpoints = mapDesignerStatus(designer, 'variables.breakpoint_modes');
  const dStylesUnused = mapDesignerStatus(designer, 'styles.unused_classes_cleaned');
  const dStylesBase = mapDesignerStatus(designer, 'styles.base_tag_selectors');
  const dComboDepth = mapDesignerStatus(designer, 'styles.combo_class_depth');
  const dCmsRel = mapDesignerStatus(designer, 'cms.collection_pages_present');

  const reviewApiTools = published.reviewApiTools ?? published.snippetTools;
  const missingRequiredSnippetTools = REQUIRED_SNIPPET_TOOLS.filter(
    (toolName) => !reviewApiTools.includes(toolName),
  );
  const pagesWithMissingCanonical = published.pages.filter(
    (page) => page.summary?.meta && !page.summary.meta.canonicalPresent,
  ).length;
  const pagesWithTitleLengthWarnings = published.pages.filter((page) =>
    page.summary?.meta?.warnings.some((warning) => warning.code === 'title_too_long'),
  ).length;
  const pagesWithDescriptionLengthWarnings = published.pages.filter((page) =>
    page.summary?.meta?.warnings.some(
      (warning) => warning.code === 'description_length_out_of_range',
    ),
  ).length;
  const runtimeInjectionPages =
    published.pagesWithRuntimeInjection ??
    published.pages.filter(
      (page) => page.runtimeInjectionSucceeded || page.auditSource === 'runtime-injected' || page.auditSource === 'snippet',
    ).length;
  const installedFallbackPages =
    published.pagesWithInstalledFallback ??
    published.pages.filter((page) => page.auditSource === 'installed-fallback').length;
  const snippetStatus: UnifiedReviewStatus =
    (runtimeInjectionPages === 0 && installedFallbackPages === 0) ||
    missingRequiredSnippetTools.includes('audit_webflow_way')
      ? 'fail'
      : runtimeInjectionPages < published.visitedPages ||
          installedFallbackPages > 0 ||
          missingRequiredSnippetTools.length > 0
        ? 'partial'
        : 'pass';
  const metaStaticStatus: UnifiedReviewStatus =
    published.issueCounts.metaMissing > 0
      ? 'fail'
      : pagesWithMissingCanonical > 0 ||
          pagesWithTitleLengthWarnings > 0 ||
          pagesWithDescriptionLengthWarnings > 0
        ? 'partial'
        : 'pass';

  pushRow(
    'webflow_audit.snippet_operational',
    'Webflow Audit Panel',
    'Runtime-injected review API loads and exposes required published audit tools',
    snippetStatus,
    snippetEvidence,
    ['published-webmcp-crawl'],
    snippetStatus === 'pass' ? 0.92 : snippetStatus === 'partial' ? 0.72 : 0.86,
    'Runtime injection is the primary path. If it fails, investigate CSP or page-runtime errors; only use a site-installed review snippet as fallback, and verify audit_webflow_way, get_sitemap_urls, and audit_404 are available.',
  );

  pushRow(
    'webflow_audit.h1_hierarchy',
    'Webflow Audit Panel',
    'One H1 per page; no skipped heading levels',
    published.issueCounts.missingH1 > 0 ||
      published.issueCounts.multipleH1 > 0 ||
      published.issueCounts.skippedHeadingLevels > 0
      ? 'fail'
      : 'pass',
    [
      `missingH1Pages=${published.issueCounts.missingH1}`,
      `multipleH1Pages=${published.issueCounts.multipleH1}`,
      `skippedHeadingLevelsPages=${published.issueCounts.skippedHeadingLevels}`,
    ],
    ['published-webmcp-crawl'],
    0.9,
    'Fix heading hierarchy per page and keep a single primary H1.',
  );

  pushRow(
    'webflow_audit.alt_text',
    'Webflow Audit Panel',
    'No missing alt texts',
    published.issueCounts.imagesMissingAlt > 0 ? 'fail' : 'pass',
    [
      `pagesWithMissingAlt=${published.issueCounts.imagesMissingAlt}`,
      ...collectExampleEvidence(
        published.pages,
        'missingAlt',
        (summary) => summary.images?.examples?.missingAlt ?? [],
        2,
      ),
    ],
    ['published-webmcp-crawl'],
    0.9,
    'Add descriptive alt text for informative images and mark decorative images appropriately.',
  );

  const linkIssueCount =
    published.issueCounts.linksMissingRel +
    published.issueCounts.linksMissingAccessibleName +
    published.issueCounts.linksEmptyHref +
    published.issueCounts.linksPlaceholderHref;
  pushRow(
    'webflow_audit.link_hygiene',
    'Webflow Audit Panel',
    'Links have valid hrefs, accessible names, and noopener on new-tab links',
    linkIssueCount > 0 ? 'fail' : 'pass',
    [
      `pagesWithBlankTargetMissingRel=${published.issueCounts.linksMissingRel}`,
      `pagesWithMissingAccessibleName=${published.issueCounts.linksMissingAccessibleName}`,
      `pagesWithEmptyHref=${published.issueCounts.linksEmptyHref}`,
      `pagesWithPlaceholderHref=${published.issueCounts.linksPlaceholderHref}`,
      ...collectExampleEvidence(
        published.pages,
        'blankTargetMissingRel',
        (summary) => summary.links?.examples?.blankTargetMissingRel ?? [],
        1,
      ),
      ...collectExampleEvidence(
        published.pages,
        'missingAccessibleName',
        (summary) => summary.links?.examples?.missingAccessibleName ?? [],
        1,
      ),
      ...collectExampleEvidence(
        published.pages,
        'emptyHref',
        (summary) => summary.links?.examples?.emptyHref ?? [],
        1,
      ),
      ...collectExampleEvidence(
        published.pages,
        'placeholderHref',
        (summary) => summary.links?.examples?.placeholderHref ?? [],
        1,
      ),
    ],
    ['published-webmcp-crawl'],
    0.88,
    'Give links accessible names, remove empty or placeholder hrefs, and add rel="noopener" to target=_blank links.',
  );

  pushRow(
    'webflow_audit.form_labels',
    'Webflow Audit Panel',
    'Form fields have labels or accessible names',
    published.issueCounts.formsMissingLabels > 0 ? 'fail' : 'pass',
    [
      `pagesWithMissingFieldLabels=${published.issueCounts.formsMissingLabels}`,
      ...collectExampleEvidence(
        published.pages,
        'missingFieldLabel',
        (summary) => summary.forms?.examples?.missingLabels ?? [],
        2,
      ),
    ],
    ['published-webmcp-crawl'],
    0.88,
    'Add visible labels or aria-label/aria-labelledby attributes to every form field.',
  );

  const controlIssueCount =
    published.issueCounts.controlsMissingAccessibleName +
    published.issueCounts.controlsRoleButtonMissingKeyboardAccess;
  pushRow(
    'webflow_audit.controls_accessible',
    'Webflow Audit Panel',
    'Buttons and button-like controls have accessible names and keyboard access',
    controlIssueCount > 0 ? 'fail' : 'pass',
    [
      `pagesWithControlMissingAccessibleName=${published.issueCounts.controlsMissingAccessibleName}`,
      `pagesWithRoleButtonMissingKeyboardAccess=${published.issueCounts.controlsRoleButtonMissingKeyboardAccess}`,
      ...collectExampleEvidence(
        published.pages,
        'controlMissingAccessibleName',
        (summary) => summary.controls?.examples?.missingAccessibleName ?? [],
        1,
      ),
      ...collectExampleEvidence(
        published.pages,
        'roleButtonMissingKeyboardAccess',
        (summary) => summary.controls?.examples?.roleButtonMissingKeyboardAccess ?? [],
        1,
      ),
    ],
    ['published-webmcp-crawl'],
    0.87,
    'Give icon-only or custom controls an accessible name, and ensure custom role=button controls are keyboard focusable.',
  );

  pushRow(
    'components.nav_footer_cta',
    'Components Panel',
    'Nav, Footer and CTAs are Components',
    dNavFooter.status,
    dNavFooter.evidence,
    ['designer-mcp'],
    dNavFooter.confidence,
  );

  pushRow(
    'components.title_case_names',
    'Components Panel',
    'Components use title casing in names',
    dComponentNames.status,
    dComponentNames.evidence,
    ['designer-mcp'],
    dComponentNames.confidence,
    'Rename components/variants to Title Case with concise human-readable labels.',
  );

  const ix2UnusedPages = published.pages.filter(
    (page) => (page.summary?.ix2?.unusedActionLists ?? 0) > 0,
  ).length;
  const ix2MissingTargetPages = published.pages.filter(
    (page) => (page.summary?.ix2?.missingTargets ?? 0) > 0,
  ).length;
  const ix2MissingActionListPages = published.pages.filter(
    (page) => (page.summary?.ix2?.missingActionLists ?? 0) > 0,
  ).length;
  const ix3MissingTimelinePages = published.pages.filter(
    (page) => (page.summary?.ix3?.missingTimelines ?? 0) > 0,
  ).length;
  const ix3DeletedInteractionPages = published.pages.filter(
    (page) => (page.summary?.ix3?.deletedInteractions ?? 0) > 0,
  ).length;
  const ix3MissingSelectorPages = published.pages.filter(
    (page) => (page.summary?.ix3?.missingTargetSelectors ?? 0) > 0,
  ).length;
  const interactionsStatus: UnifiedReviewStatus =
    ix2UnusedPages > 0 ||
    ix2MissingActionListPages > 0 ||
    ix3MissingTimelinePages > 0 ||
    ix3DeletedInteractionPages > 0
      ? 'fail'
      : ix2MissingTargetPages > 0 || ix3MissingSelectorPages > 0
        ? 'partial'
        : 'pass';
  pushRow(
    'interactions.unused_cleaned',
    'Interactions Panel',
    'Interactions are cleaned of unused animations',
    interactionsStatus,
    [
      `pagesWithIx2UnusedActionLists=${ix2UnusedPages}`,
      `pagesWithIx2MissingTargets=${ix2MissingTargetPages}`,
      `pagesWithIx2MissingActionLists=${ix2MissingActionListPages}`,
      `pagesWithIx3MissingTimelines=${ix3MissingTimelinePages}`,
      `pagesWithIx3DeletedInteractions=${ix3DeletedInteractionPages}`,
      `pagesWithIx3MissingTargetSelectors=${ix3MissingSelectorPages}`,
      ...collectExampleEvidence(
        published.pages,
        'ix2UnusedActionList',
        (summary) => summary.ix2?.examples?.unusedActionLists ?? [],
        1,
      ),
      ...collectExampleEvidence(
        published.pages,
        'ix2MissingActionList',
        (summary) => summary.ix2?.examples?.missingActionLists ?? [],
        1,
      ),
      ...collectExampleEvidence(
        published.pages,
        'ix2MissingTarget',
        (summary) => summary.ix2?.examples?.missingTargets ?? [],
        1,
      ),
      ...collectExampleEvidence(
        published.pages,
        'ix3MissingTimeline',
        (summary) => summary.ix3?.examples?.missingTimelines ?? [],
        1,
      ),
      ...collectExampleEvidence(
        published.pages,
        'ix3DeletedInteraction',
        (summary) => summary.ix3?.examples?.deletedInteractions ?? [],
        1,
      ),
      ...collectExampleEvidence(
        published.pages,
        'ix3MissingTargetSelector',
        (summary) => summary.ix3?.examples?.missingTargetSelectors ?? [],
        1,
      ),
      'Strict unused/deleted state still needs Designer panel confirmation.',
    ],
    ['published-webmcp-crawl', 'designer-mcp'],
    interactionsStatus === 'pass' ? 0.82 : interactionsStatus === 'partial' ? 0.6 : 0.84,
    'Remove orphaned targets/action lists and verify in Designer Interactions panel.',
  );

  pushRow(
    'variables.defined_reusable',
    'Variables Panel',
    'Color, typography, and spacing variables are defined and reusable',
    dVarReusable.status,
    dVarReusable.evidence,
    ['designer-mcp'],
    dVarReusable.confidence,
  );
  pushRow(
    'variables.title_case',
    'Variables Panel',
    'Variables use Title Case, human readable naming',
    dVarTitle.status,
    dVarTitle.evidence,
    ['designer-mcp'],
    dVarTitle.confidence,
  );
  pushRow(
    'variables.breakpoint_modes',
    'Variables Panel',
    'Variable Modes exist for tablet, mobile landscape, portrait breakpoints',
    dVarBreakpoints.status,
    dVarBreakpoints.evidence,
    ['designer-mcp'],
    dVarBreakpoints.confidence,
  );

  pushRow(
    'styles.unused_classes',
    'Styles Selector',
    'Unused styles/classes are cleaned up',
    dStylesUnused.status,
    dStylesUnused.evidence,
    ['designer-mcp'],
    dStylesUnused.confidence,
  );
  pushRow(
    'styles.base_tag_styles',
    'Styles Selector',
    'Base styles applied to HTML tags',
    dStylesBase.status,
    dStylesBase.evidence,
    ['designer-mcp'],
    dStylesBase.confidence,
  );
  pushRow(
    'styles.base_uses_variables',
    'Styles Selector',
    'Variables are used to define base tag styles',
    'manual',
    ['Variable linkage is not currently extracted by this MCP pipeline.'],
    ['designer-mcp'],
    0.2,
  );
  pushRow(
    'styles.combo_depth',
    'Styles Selector',
    'No more than 3-4 combo classes stacked per element',
    dComboDepth.status,
    dComboDepth.evidence,
    ['designer-mcp'],
    dComboDepth.confidence,
  );

  const htmlSuffix = ' - Webflow HTML website template';
  const ecomSuffix = ' - Webflow Ecommerce website template';
  const hasSuffix = homeTitle.includes(htmlSuffix) || homeTitle.includes(ecomSuffix);
  const siteName = designer.metadataSummary.siteName || '';
  const titlePrefix = homeTitle.includes(htmlSuffix)
    ? homeTitle.split(htmlSuffix)[0]?.trim()
    : homeTitle.includes(ecomSuffix)
      ? homeTitle.split(ecomSuffix)[0]?.trim()
      : '';
  const nameMatchesSite =
    !siteName || !titlePrefix ? false : titlePrefix.toLowerCase() === siteName.toLowerCase();
  const homeTitleCompliant = hasSuffix && (nameMatchesSite || !siteName);
  const homeTitleEvidence = [
    `homeTitle=${homeTitle || 'n/a'}`,
    `siteName=${siteName || 'n/a'}`,
    `hasSuffix=${hasSuffix}`,
    `titlePrefix=${titlePrefix || 'n/a'}`,
    `nameMatchesSite=${nameMatchesSite}`,
  ];
  pushRow(
    'pages.home_seo_title_formula',
    'Page Level Checks',
    'Home SEO title matches required naming formula',
    homeTitleCompliant ? 'pass' : hasSuffix && !nameMatchesSite ? 'partial' : 'fail',
    homeTitleEvidence,
    ['published-webmcp-crawl'],
    homeTitleCompliant ? 0.92 : hasSuffix ? 0.7 : 0.85,
    'Set homepage title to "{Template Name} - Webflow HTML website template" (or Ecommerce variant). The prefix must match the template name.',
  );

  pushRow(
    'pages.license_text_exact',
    'Page Level Checks',
    'License page includes the exact required opening text',
    !hasLicensePage
      ? 'fail'
      : hasKnownLicenseTextResult
        ? hasRequiredLicenseText
          ? 'pass'
          : 'fail'
        : 'partial',
    [
      `licensePageFound=${hasLicensePage}`,
      `hasKnownLicenseTextResult=${hasKnownLicenseTextResult}`,
      `hasRequiredLicenseText=${hasRequiredLicenseText}`,
    ],
    ['published-webmcp-crawl', 'designer-mcp'],
    hasKnownLicenseTextResult ? 0.85 : 0.5,
    'Ensure /licenses page exists and starts with the required exact text.',
  );

  const pagesWithHttpErrors = published.pages.filter((page) => (page.statusCode ?? 0) >= 400).length;
  const pagesWithUnknownStatus = published.pages.filter((page) => page.statusCode === null).length;
  const httpStatusRowStatus: UnifiedReviewStatus =
    pagesWithHttpErrors > 0 ? 'fail' : pagesWithUnknownStatus > 0 ? 'partial' : 'pass';
  pushRow(
    'pages.http_status_ok',
    'Page Level Checks',
    'Crawled published pages resolve without 4xx/5xx responses',
    httpStatusRowStatus,
    [
      `pagesWithHttpErrors=${pagesWithHttpErrors}`,
      `pagesWithUnknownStatus=${pagesWithUnknownStatus}`,
      ...collectStatusEvidence(published.pages, 3),
    ],
    ['published-webmcp-crawl'],
    httpStatusRowStatus === 'pass' ? 0.92 : httpStatusRowStatus === 'partial' ? 0.6 : 0.9,
    'Publish or relink broken pages so crawled template routes return successful responses.',
  );

  pushRow(
    'pages.image_loading_strategy',
    'Page Level Checks',
    'Below-the-fold images are lazy-loaded and above-the-fold essentials are eager',
    published.issueCounts.imagesAboveFoldLazy > 0 || published.issueCounts.imagesBelowFoldNotLazy > 0
      ? 'fail'
      : 'pass',
    [
      `pagesWithAboveFoldLazy=${published.issueCounts.imagesAboveFoldLazy}`,
      `pagesWithBelowFoldNotLazy=${published.issueCounts.imagesBelowFoldNotLazy}`,
      ...collectExampleEvidence(
        published.pages,
        'aboveFoldLazy',
        (summary) => summary.images?.examples?.aboveFoldLazy ?? [],
        1,
      ),
      ...collectExampleEvidence(
        published.pages,
        'belowFoldNotLazy',
        (summary) => summary.images?.examples?.belowFoldNotLazy ?? [],
        1,
      ),
    ],
    ['published-webmcp-crawl'],
    0.87,
    'Set hero/critical images to eager and keep below-fold images lazy.',
  );

  const videoControlsFail =
    published.issueCounts.autoplayWithoutControls > 0 ||
    published.issueCounts.backgroundVideosMissingControl > 0;
  pushRow(
    'pages.videos_controls',
    'Page Level Checks',
    'No autoplay without controls; background videos have pause/skip controls',
    videoControlsFail ? 'fail' : 'pass',
    [
      `pagesWithAutoplayWithoutControls=${published.issueCounts.autoplayWithoutControls}`,
      `pagesWithBackgroundVideoMissingControl=${published.issueCounts.backgroundVideosMissingControl}`,
      ...collectExampleEvidence(
        published.pages,
        'autoplayWithoutControls',
        (summary) => summary.media?.examples?.autoplayWithoutControls ?? [],
        1,
      ),
      ...collectExampleEvidence(
        published.pages,
        'backgroundVideoMissingControl',
        (summary) => summary.media?.examples?.backgroundVideosMissingControl ?? [],
        1,
      ),
    ],
    ['published-webmcp-crawl'],
    0.86,
  );

  pushRow(
    'pages.meta_tags_static',
    'Page Level Checks',
    'Each static page has complete title, description, Open Graph, and canonical metadata',
    metaStaticStatus,
    [
      `pagesWithMissingMeta=${published.issueCounts.metaMissing}`,
      `pagesWithMissingCanonical=${pagesWithMissingCanonical}`,
      `pagesWithTitleLengthWarnings=${pagesWithTitleLengthWarnings}`,
      `pagesWithDescriptionLengthWarnings=${pagesWithDescriptionLengthWarnings}`,
      `homeCanonicalPresent=${homeMeta?.canonicalPresent ?? false}`,
      `homeRobotsPresent=${homeMeta?.robotsPresent ?? false}`,
      `homeOgUrlPresent=${homeMeta?.openGraph.urlPresent ?? false}`,
      `homeOgTypePresent=${homeMeta?.openGraph.typePresent ?? false}`,
      ...collectExampleEvidence(
        published.pages,
        'missingMeta',
        (summary) => summary.meta?.examples?.missing ?? [],
        2,
      ),
      ...collectExampleEvidence(
        published.pages,
        'metaWarning',
        (summary) => summary.meta?.examples?.warnings ?? [],
        2,
      ),
      ...collectExampleEvidence(
        published.pages,
        'missingCanonical',
        (summary) => summary.meta?.examples?.canonicalMissing ?? [],
        1,
      ),
    ],
    ['published-webmcp-crawl'],
    metaStaticStatus === 'pass' ? 0.9 : metaStaticStatus === 'partial' ? 0.78 : 0.9,
    'Add missing Open Graph/meta tags per page, add canonicals, and tighten title/description length where warnings exist.',
  );

  const homeStructuredData = home?.summary?.structuredData ?? null;
  const pagesWithStructuredData = published.pages.filter(
    (page) => (page.summary?.structuredData?.scripts ?? 0) > 0,
  ).length;
  const structuredDataStatus: UnifiedReviewStatus =
    published.issueCounts.structuredDataParseErrors > 0
      ? 'fail'
      : (homeStructuredData?.scripts ?? 0) > 0
        ? 'pass'
        : 'partial';
  pushRow(
    'pages.structured_data',
    'Page Level Checks',
    'Homepage structured data is present and JSON-LD is parseable',
    structuredDataStatus,
    [
      `homeStructuredDataScripts=${homeStructuredData?.scripts ?? 0}`,
      `homeStructuredDataTypes=${homeStructuredData?.types.join(',') || 'none'}`,
      `pagesWithStructuredData=${pagesWithStructuredData}`,
      `pagesWithStructuredDataParseErrors=${published.issueCounts.structuredDataParseErrors}`,
      ...collectExampleEvidence(
        published.pages,
        'structuredDataParseError',
        (summary) => summary.structuredData?.examples?.parseErrors ?? [],
        1,
      ),
    ],
    ['published-webmcp-crawl'],
    structuredDataStatus === 'pass' ? 0.8 : structuredDataStatus === 'partial' ? 0.62 : 0.86,
    'Add valid homepage JSON-LD structured data and fix any malformed schema blocks.',
  );

  pushRow(
    'pages.meta_tags_cms_dynamic',
    'Page Level Checks',
    'CMS pages use dynamic SEO tags',
    'partial',
    [
      `cmsCollectionsDetected=${designer.metadataSummary.totalCMSCollections}`,
      'Dynamic field binding cannot be confirmed from current payloads.',
    ],
    ['designer-mcp', 'published-webmcp-crawl'],
    0.55,
  );

  const a404 = published.audit404;
  const a404Status = asFiniteNumber((a404 as Record<string, unknown>).status);
  const a404NavCount = asFiniteNumber((a404 as Record<string, unknown>).navCount);
  const a404LinkCount = asFiniteNumber((a404 as Record<string, unknown>).linkCount);
  const crawled404Page =
    published.pages.find((page) => page.url.replace(/\/+$/, '').endsWith('/404')) ??
    published.pages.find((page) => page.title?.toLowerCase().includes('404'));
  const hasHealthy404 =
    a404.ok === true &&
    a404Status === 404 &&
    a404NavCount > 0 &&
    a404LinkCount > 0;
  const custom404Status: UnifiedReviewStatus =
    a404.ok === true ? (hasHealthy404 ? 'pass' : 'fail') : 'manual';
  const custom404FallbackError = 'error' in a404 ? a404.error : 'unknown';
  pushRow(
    'pages.custom_404',
    'Page Level Checks',
    'Custom branded 404 page exists with nav and CTAs',
    custom404Status,
    a404.ok === true
      ? [
          `status=${a404Status || 'n/a'}`,
          `navCount=${a404NavCount || 'n/a'}`,
          `linkCount=${a404LinkCount || 'n/a'}`,
        ]
      : [
          `audit404Available=false`,
          `error=${custom404FallbackError}`,
          `crawled404Page=${crawled404Page?.url || 'none'}`,
          `crawled404Title=${crawled404Page?.title || 'n/a'}`,
        ],
    ['published-webmcp-crawl'],
    a404.ok === true ? 0.92 : 0.45,
    'Confirm the branded 404 route manually, or restore the runtime-injected review API so audit_404 can verify nav and CTA structure. Use a site-installed snippet only as fallback.',
  );

  pushRow(
    'pages.image_dimensions',
    'Page Level Checks',
    'Images have explicit width/height or aspect-ratio hints',
    published.issueCounts.imagesMissingDimensions > 0 ? 'fail' : 'pass',
    [
      `pagesWithMissingImageDimensions=${published.issueCounts.imagesMissingDimensions}`,
      ...collectExampleEvidence(
        published.pages,
        'missingImageDimensions',
        (summary) => summary.images?.examples?.missingDimensions ?? [],
        2,
      ),
    ],
    ['published-webmcp-crawl'],
    0.9,
    'Add width/height attributes or explicit aspect-ratio to image elements.',
  );

  pushRow(
    'pages.transition_simple',
    'Page Level Checks',
    'Simple CSS transitions are used for hover/press states',
    'manual',
    ['Transition-property linting is not included in this tool yet.'],
    ['published-webmcp-crawl'],
    0.2,
  );

  pushRow(
    'pages.wcag_contrast',
    'Page Level Checks',
    'WCAG contrast is met for default/hover/focus/active states',
    'manual',
    ['Color contrast computation is not included in this tool yet.'],
    ['published-webmcp-crawl'],
    0.2,
  );

  pushRow(
    'pages.cms_used_relational',
    'Page Level Checks',
    'CMS is used for repeatable/relational content',
    dCmsRel.status,
    dCmsRel.evidence,
    ['designer-mcp'],
    dCmsRel.confidence,
  );

  const modernFormats = ['webp', 'avif', 'jpg', 'jpeg', 'png'];
  pushRow(
    'assets.modern_formats',
    'Page Level Checks',
    'Modern image formats are used (WebP, AVIF, JPEG, PNG)',
    formatKeys.some((format) => modernFormats.includes(format)) ? 'pass' : 'fail',
    [`detectedFormats=${formatKeys.join(',') || 'none'}`],
    ['published-webmcp-crawl'],
    0.86,
  );

  pushRow(
    'responsive.multi_breakpoint_check',
    'Page Level Checks',
    'Responsive checks have been run on homepage and at least one additional page',
    'manual',
    ['This run does not include multi-viewport screenshot assertions.'],
    ['published-webmcp-crawl'],
    0.2,
  );

  const policy = published.policyChecks;
  pushRow(
    'policy.powered_by_webflow',
    'Submission Policy',
    '"Powered by Webflow" badge is present and visible',
    policy.hasPoweredByWebflow ? 'pass' : 'fail',
    [
      `hasPoweredByWebflow=${policy.hasPoweredByWebflow}`,
      ...(policy.poweredByExamples && policy.poweredByExamples.length > 0
        ? [`example=${formatExample(policy.poweredByExamples[0])}`]
        : []),
    ],
    ['published-webmcp-crawl'],
    0.9,
    'Do not remove the "Powered by Webflow" badge. It must remain visible on the published site.',
  );
  pushRow(
    'policy.no_affiliate_links',
    'Submission Policy',
    'No affiliate or referral links found',
    policy.affiliateLinkCount === 0 ? 'pass' : 'fail',
    [
      `affiliateLinkCount=${policy.affiliateLinkCount}`,
      ...(policy.affiliateLinks.length > 0
        ? [`examples=${policy.affiliateLinks.slice(0, 5).join(' | ')}`]
        : []),
    ],
    ['published-webmcp-crawl'],
    0.85,
    'Remove all affiliate and referral links before submission.',
  );
  pushRow(
    'policy.gsap_detected',
    'Submission Policy',
    'GSAP/ScrollTrigger usage detected (requires instructions page and library attachment)',
    policy.hasGsap ? 'partial' : 'pass',
    [
      `hasGsap=${policy.hasGsap}`,
      ...(policy.gsapEvidence && policy.gsapEvidence.length > 0
        ? [`gsapEvidence=${policy.gsapEvidence.join(' | ')}`]
        : []),
      ...(policy.hasGsap
        ? ['GSAP detected: ensure an Instructions page explains setup and GSAP is attached as a library.']
        : []),
    ],
    ['published-webmcp-crawl'],
    policy.hasGsap ? 0.75 : 0.85,
  );
  pushRow(
    'policy.custom_code_detected',
    'Submission Policy',
    'Custom code is present (requires instructions page)',
    policy.hasCustomCode ? 'partial' : 'pass',
    [
      `hasCustomCode=${policy.hasCustomCode}`,
      ...(policy.customCodeExamples && policy.customCodeExamples.length > 0
        ? policy.customCodeExamples.map((example, index) => `customCodeExample${index + 1}=${formatExample(example)}`)
        : []),
      ...(policy.hasCustomCode
        ? ['Custom code detected: ensure an Instructions page documents custom code usage.']
        : []),
    ],
    ['published-webmcp-crawl'],
    policy.hasCustomCode ? 0.7 : 0.85,
  );

  return includeManual ? rows : rows.filter((row) => row.status !== 'manual');
}
