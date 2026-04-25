import type {
  ChecklistResult,
  DesignerChecklistCheck,
  DesignerChecklistReport,
  DesignerMetadata
} from '../types.js';

type ScoreOptions = {
  includeManual?: boolean;
  source?: DesignerChecklistReport['source'];
};

type PreviewExtractionAssessment = {
  likelySparse: boolean;
  pagesReliable: boolean;
  stylesReliable: boolean;
  breakpointsReliable: boolean;
  componentsReliable: boolean;
  assetsReliable: boolean;
  evidence: string[];
};

function normalize(value: string): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toLowerList(values: string[]): string[] {
  return values.map((value) => normalize(value).toLowerCase()).filter(Boolean);
}

function containsAny(values: string[], patterns: string[]): boolean {
  return values.some((value) => patterns.some((pattern) => value.includes(pattern)));
}

function isTitleCaseLike(name: string): boolean {
  const cleaned = normalize(name).replace(/[^\w\s/.-]/g, ' ');
  if (!cleaned) return false;
  const tokens = cleaned
    .split(/[\/\s._-]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return false;

  return tokens.every((token) => {
    if (/^\d+[A-Za-z]*$/.test(token)) return true;
    if (/^[A-Z]{2,}$/.test(token)) return true;
    if (/^[A-Z]{2,}(?:s|es)$/.test(token)) return true;
    if (/^[A-Z][a-z0-9]+$/.test(token)) return true;
    return false;
  });
}

function detectClassPattern(name: string): 'kebab' | 'snake' | 'pascal' | 'camel' | 'title' | 'slash' | 'other' {
  if (name.includes('/')) return 'slash';
  if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(name)) return 'kebab';
  if (/^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(name)) return 'snake';
  if (/^[A-Z][A-Za-z0-9]+(?:[A-Z][A-Za-z0-9]+)*$/.test(name)) return 'pascal';
  if (/^[a-z]+(?:[A-Z][A-Za-z0-9]*)+$/.test(name)) return 'camel';
  if (/^[A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*)+$/.test(name)) return 'title';
  return 'other';
}

function check(
  id: string,
  section: string,
  requirement: string,
  result: ChecklistResult,
  evidence: string[]
): DesignerChecklistCheck {
  return { id, section, requirement, result, evidence };
}

function assessPreviewExtraction(metadata: DesignerMetadata): PreviewExtractionAssessment {
  const pagesReliable = metadata.pages.length > 0;
  const stylesReliable = metadata.styleClasses.length > 0;
  const breakpointsReliable = metadata.breakpoints.length > 0;
  const componentsVisible = metadata.components.length > 0;
  const assetsVisible = metadata.assets.length > 0;
  const strongSignals = [
    pagesReliable,
    stylesReliable,
    breakpointsReliable,
    componentsVisible,
    metadata.interactions.length > 0,
    metadata.cmsCollections.length > 0,
    assetsVisible,
    Boolean(normalize(metadata.siteName)),
    normalize(metadata.sitePlan).toLowerCase() !== 'unknown'
  ].filter(Boolean).length;
  const likelySparse =
    !pagesReliable &&
    (!stylesReliable || !breakpointsReliable) &&
    strongSignals <= 3;

  return {
    likelySparse,
    pagesReliable,
    stylesReliable,
    breakpointsReliable,
    componentsReliable: componentsVisible || (pagesReliable && stylesReliable && !likelySparse),
    assetsReliable: assetsVisible || (pagesReliable && stylesReliable && breakpointsReliable && !likelySparse),
    evidence: [
      `previewExtractionLikelySparse=${likelySparse}`,
      `pages=${metadata.totalPages}`,
      `classes=${metadata.totalClasses}`,
      `components=${metadata.totalComponents}`,
      `interactions=${metadata.totalInteractions}`,
      `cmsCollections=${metadata.cmsCollections.length}`,
      `assets=${metadata.totalAssets}`,
      `breakpoints=${metadata.breakpoints.length}`
    ]
  };
}

function manualEvidence(
  surface: string,
  assessment: PreviewExtractionAssessment,
  extra: string[] = []
): string[] {
  return [
    `${surface} inventory was not captured reliably from Webflow Designer preview`,
    ...extra,
    ...assessment.evidence
  ];
}

function createEmptyDesignerMetadata(url?: string): DesignerMetadata {
  return {
    url: url || '',
    timestamp: new Date().toISOString(),
    siteName: '',
    sitePlan: 'unavailable',
    pages: [],
    totalPages: 0,
    styleClasses: [],
    totalClasses: 0,
    globalClasses: 0,
    customClasses: 0,
    components: [],
    totalComponents: 0,
    unusedComponents: 0,
    interactions: [],
    totalInteractions: 0,
    cmsCollections: [],
    totalCMSItems: 0,
    assets: [],
    totalAssets: 0,
    breakpoints: []
  };
}

export function createUnavailableDesignerChecklistReport(
  reason: string,
  options: {
    url?: string;
    includeManual?: boolean;
  } = {}
): DesignerChecklistReport {
  const includeManual = options.includeManual !== false;
  const baseReport = scoreDesignerChecklist(createEmptyDesignerMetadata(options.url), {
    includeManual: true,
    source: 'fallback-manual'
  });
  const notes = [reason, ...(options.url ? [`previewUrl=${options.url}`] : [])];
  const checks = baseReport.checks.map((item) => ({
    ...item,
    result: 'manual' as const,
    evidence: [...notes, ...item.evidence]
  }));
  const filteredChecks = includeManual ? checks : [];

  return {
    ...baseReport,
    source: 'fallback-manual',
    notes,
    summary: {
      pass: 0,
      fail: 0,
      manual: filteredChecks.length,
      scored: 0,
      passRate: 0
    },
    checks: filteredChecks
  };
}

export function scoreDesignerChecklist(
  metadata: DesignerMetadata,
  options: ScoreOptions = {}
): DesignerChecklistReport {
  const includeManual = options.includeManual !== false;
  const extractionAssessment = assessPreviewExtraction(metadata);
  const componentNames = metadata.components.map((component) => component.name);
  const componentNamesLower = toLowerList(componentNames);
  const pageNames = metadata.pages.map((page) => page.name);
  const styleClassNames = metadata.styleClasses.map((item) => item.name);
  const styleClassNamesLower = toLowerList(styleClassNames);
  const breakpointsLower = toLowerList(metadata.breakpoints);
  const cmsCollectionNames = metadata.cmsCollections.map((collection) => collection.name);
  const assetNamesLower = toLowerList(metadata.assets.map((asset) => asset.filename));

  const checks: DesignerChecklistCheck[] = [];

  const hasNavOrHeader = containsAny(componentNamesLower, ['nav', 'navbar', 'header']);
  const hasFooter = containsAny(componentNamesLower, ['footer']);
  // CTA components may be named "CTA", "Hero CTA", "Get Started", "Subscribe",
  // "Newsletter", "Contact Form", "Signup", "Book", "Register", etc.
  const hasCta = containsAny(componentNamesLower, [
    'cta', 'call to action', 'get started', 'subscribe', 'newsletter',
    'signup', 'sign up', 'register', 'book', 'contact form', 'hero button'
  ]);
  const navFooterCtaResult: ChecklistResult = !extractionAssessment.componentsReliable
    ? 'manual'
    : hasNavOrHeader && hasFooter && hasCta ? 'pass' : 'fail';
  checks.push(
    check(
      'components.nav_footer_cta',
      'Components',
      'Nav, Footer, and CTA are set up as Components',
      navFooterCtaResult,
      navFooterCtaResult === 'manual'
        ? manualEvidence('Components panel', extractionAssessment)
        : [
            `components=${metadata.totalComponents}`,
            `hasNavOrHeader=${hasNavOrHeader}`,
            `hasFooter=${hasFooter}`,
            `hasCTA=${hasCta}`
          ]
    )
  );

  // Common short lowercase component names that are acceptable Webflow conventions
  const acceptableLowercaseNames = new Set([
    'btn', 'cta', 'nav', 'navbar', 'header', 'footer', 'hero', 'modal',
    'popup', 'sidebar', 'banner', 'card', 'badge', 'tag', 'icon', 'logo',
    'form', 'input', 'dropdown', 'tabs', 'accordion', 'slider', 'carousel'
  ]);
  const invalidComponentNames = componentNames.filter(
    (name) => !isTitleCaseLike(name) && !acceptableLowercaseNames.has(name.toLowerCase().trim())
  );
  const componentNamingResult: ChecklistResult = !extractionAssessment.componentsReliable
    ? 'manual'
    : invalidComponentNames.length === 0 ? 'pass' : 'fail';
  checks.push(
    check(
      'components.title_case_naming',
      'Components',
      'Component names use title-casing and human-readable naming',
      componentNamingResult,
      componentNamingResult === 'manual'
        ? manualEvidence('Components panel', extractionAssessment)
        : invalidComponentNames.length === 0
          ? ['all component names passed title-case heuristic']
          : [
              `invalidCount=${invalidComponentNames.length}`,
              `examples=${invalidComponentNames.slice(0, 8).join(' | ')}`
            ]
    )
  );

  const unusedComponentsResult: ChecklistResult = !extractionAssessment.componentsReliable
    ? 'manual'
    : metadata.unusedComponents === 0 ? 'pass' : 'fail';
  checks.push(
    check(
      'components.unused_cleaned',
      'Components',
      'Unused Components are cleaned up',
      unusedComponentsResult,
      unusedComponentsResult === 'manual'
        ? manualEvidence('Components panel', extractionAssessment)
        : [`unusedComponents=${metadata.unusedComponents}`]
    )
  );

  checks.push(
    check(
      'interactions.cleaned_unused',
      'Interactions',
      'Interactions are cleaned of unused animations',
      'manual',
      [
        'Designer metadata currently returns interaction list but not explicit unused/deleted flags.'
      ]
    )
  );

  const hasTablet = breakpointsLower.some((value) => value.includes('991'));
  const hasMobileLandscape = breakpointsLower.some((value) => value.includes('767'));
  const hasMobilePortrait = breakpointsLower.some((value) => value.includes('479'));
  const breakpointModesResult: ChecklistResult = !extractionAssessment.breakpointsReliable
    ? 'manual'
    : hasTablet && hasMobileLandscape && hasMobilePortrait ? 'pass' : 'fail';
  checks.push(
    check(
      'variables.breakpoint_modes',
      'Variables',
      'Variable modes exist for Tablet, Mobile Landscape, and Mobile Portrait',
      breakpointModesResult,
      breakpointModesResult === 'manual'
        ? manualEvidence('Breakpoint controls', extractionAssessment)
        : [
            `breakpoints=${metadata.breakpoints.join(' | ')}`,
            `tablet=${hasTablet}`,
            `mobileLandscape=${hasMobileLandscape}`,
            `mobilePortrait=${hasMobilePortrait}`
          ]
    )
  );

  checks.push(
    check(
      'variables.defined_reusable',
      'Variables',
      'Color, typography, and spacing variables are defined and reusable',
      'manual',
      ['Variables panel data is not currently extracted by this MCP tool.']
    )
  );

  checks.push(
    check(
      'variables.title_case_naming',
      'Variables',
      'Variables use title case, human-readable naming',
      'manual',
      ['Variables panel data is not currently extracted by this MCP tool.']
    )
  );

  // Critical base tags that should always have styles defined
  const criticalBaseTagPatterns = [
    'all h1',
    'all h2',
    'all h3',
    'all h4',
    'all h5',
    'all h6',
    'all paragraphs',
    'all links'
  ];
  // Optional base tags — nice to have but not a failure if missing
  const optionalBaseTagPatterns = [
    'all unordered lists',
    'all ordered lists'
  ];
  const missingCritical = criticalBaseTagPatterns.filter(
    (pattern) => !styleClassNamesLower.some((name) => name.includes(pattern))
  );
  const missingOptional = optionalBaseTagPatterns.filter(
    (pattern) => !styleClassNamesLower.some((name) => name.includes(pattern))
  );
  const baseTagResult: ChecklistResult =
    !extractionAssessment.stylesReliable
      ? 'manual'
      : missingCritical.length > 0 ? 'fail' : missingOptional.length > 0 ? 'pass' : 'pass';
  const baseTagEvidence =
    baseTagResult === 'manual'
      ? manualEvidence('Style Selectors panel', extractionAssessment)
      : missingCritical.length === 0 && missingOptional.length === 0
        ? ['all required base tag selectors detected']
        : [
            ...(missingCritical.length > 0 ? [`missing=${missingCritical.join(', ')}`] : []),
            ...(missingOptional.length > 0
              ? [`optional_missing=${missingOptional.join(', ')}`]
              : [])
          ];
  checks.push(
    check(
      'styles.base_tag_selectors',
      'Styles Selector',
      'Base styles are applied to required HTML tags',
      baseTagResult,
      baseTagEvidence
    )
  );

  checks.push(
    check(
      'styles.unused_classes_cleaned',
      'Styles Selector',
      'Unused styles/classes are cleaned up',
      'manual',
      ['Class usage graph is not currently extracted from Designer metadata.']
    )
  );

  checks.push(
    check(
      'styles.combo_class_depth',
      'Styles Selector',
      'No more than 3-4 combo classes are stacked per element',
      'manual',
      ['Element-level combo stack depth is not extracted in current metadata payload.']
    )
  );

  const candidateCustomClasses = styleClassNames.filter((name) => !/^all\s/i.test(name));
  const patternCounts = new Map<string, number>();
  for (const name of candidateCustomClasses) {
    const pattern = detectClassPattern(name);
    patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
  }
  const sortedPatterns = Array.from(patternCounts.entries()).sort((a, b) => b[1] - a[1]);
  const dominantPattern = sortedPatterns[0]?.[0] || 'other';
  const dominantCount = sortedPatterns[0]?.[1] || 0;
  const patternRatio = candidateCustomClasses.length
    ? dominantCount / candidateCustomClasses.length
    : 0;
  const classNamingResult: ChecklistResult =
    !extractionAssessment.stylesReliable || candidateCustomClasses.length === 0
      ? 'manual'
      : patternRatio >= 0.7 ? 'pass' : 'fail';
  checks.push(
    check(
      'styles.class_naming_consistency',
      'Styles Selector',
      'Class naming follows one consistent format',
      classNamingResult,
      classNamingResult === 'manual'
        ? manualEvidence('Style Selectors panel', extractionAssessment, [
            `sampleSize=${candidateCustomClasses.length}`
          ])
        : [
            `dominantPattern=${dominantPattern}`,
            `dominantRatio=${patternRatio.toFixed(2)}`,
            `sampleSize=${candidateCustomClasses.length}`
          ]
    )
  );

  const invalidPageNames = pageNames.filter((name) => !isTitleCaseLike(name));
  const pageNamingResult: ChecklistResult = !extractionAssessment.pagesReliable
    ? 'manual'
    : invalidPageNames.length === 0 ? 'pass' : 'fail';
  checks.push(
    check(
      'pages.title_case_naming',
      'Required Pages',
      'Page names use Title Case',
      pageNamingResult,
      pageNamingResult === 'manual'
        ? manualEvidence('Pages panel', extractionAssessment)
        : invalidPageNames.length === 0
          ? ['all page names passed title-case heuristic']
          : [
              `invalidCount=${invalidPageNames.length}`,
              `examples=${invalidPageNames.slice(0, 6).join(' | ')}`
            ]
    )
  );

  const pageNamesLower = toLowerList(pageNames);
  const hasStyleGuidePage = pageNamesLower.some(
    (name) => name.includes('style guide') || name.includes('styleguide')
  );
  const hasInstructionsPage = pageNamesLower.some(
    (name) =>
      name.includes('instruction') ||
      name.includes('instructions') ||
      name.includes('start here') ||
      name.includes('getting started') ||
      name.includes('documentation') ||
      (name.includes('guide') && !name.includes('style guide') && !name.includes('styleguide'))
  );
  const hasLicensePage = pageNamesLower.some(
    (name) => name.includes('license') || name.includes('licenses')
  );
  const styleGuideResult: ChecklistResult = !extractionAssessment.pagesReliable
    ? 'manual'
    : hasStyleGuidePage ? 'pass' : 'fail';
  checks.push(
    check(
      'pages.style_guide_exists',
      'Required Pages',
      'Style Guide page exists',
      styleGuideResult,
      styleGuideResult === 'manual'
        ? manualEvidence('Pages panel', extractionAssessment)
        : [`found=${hasStyleGuidePage}`]
    )
  );
  const hasAdvancedInteractions = metadata.totalInteractions > 0;
  const advancedComponentKeywords = [
    'accordion',
    'tabs',
    'tab accordion',
    'slider',
    'carousel',
    'modal',
    'popup',
    'lightbox',
    'dropdown',
    'mega menu',
    'filter',
    'marquee',
    'countdown',
    'timeline',
    'comparison'
  ];
  const advancedComponentMatches = Array.from(
    new Set(
      componentNamesLower.flatMap((name) =>
        advancedComponentKeywords.filter((keyword) => name.includes(keyword))
      )
    )
  );
  const hasAdvancedComponents = advancedComponentMatches.length > 0;
  const strongInstructionsRequirement =
    metadata.totalInteractions >= 3 ||
    (hasAdvancedInteractions && hasAdvancedComponents) ||
    advancedComponentMatches.length >= 2;
  const instructionsStatus: ChecklistResult = !extractionAssessment.pagesReliable
    ? 'manual'
    : hasInstructionsPage
      ? 'pass'
      : strongInstructionsRequirement
        ? 'fail'
        : hasAdvancedInteractions || hasAdvancedComponents
          ? 'manual'
          : 'pass';
  checks.push(
    check(
      'pages.instructions_exists',
      'Required Pages',
      'Instructions page exists when advanced interactions/components are used',
      instructionsStatus,
      instructionsStatus === 'manual' && !extractionAssessment.pagesReliable
        ? manualEvidence('Pages panel', extractionAssessment, [
            `hasAdvancedInteractions=${hasAdvancedInteractions}`,
            `totalInteractions=${metadata.totalInteractions}`,
            `hasAdvancedComponents=${hasAdvancedComponents}`,
            `advancedComponentMatches=${advancedComponentMatches.join(', ') || 'none'}`
          ])
        : [
            `found=${hasInstructionsPage}`,
            `hasAdvancedInteractions=${hasAdvancedInteractions}`,
            `totalInteractions=${metadata.totalInteractions}`,
            `hasAdvancedComponents=${hasAdvancedComponents}`,
            `advancedComponentMatches=${advancedComponentMatches.join(', ') || 'none'}`,
            `signalStrength=${strongInstructionsRequirement ? 'strong' : hasAdvancedInteractions || hasAdvancedComponents ? 'weak' : 'none'}`
          ]
    )
  );
  const licenseResult: ChecklistResult = !extractionAssessment.pagesReliable
    ? 'manual'
    : hasLicensePage ? 'pass' : 'fail';
  checks.push(
    check(
      'pages.licenses_exists',
      'Required Pages',
      'Licenses page exists',
      licenseResult,
      licenseResult === 'manual'
        ? manualEvidence('Pages panel', extractionAssessment)
        : [`found=${hasLicensePage}`]
    )
  );

  // CMS checks are conditional: if the site has no CMS collections at all,
  // mark as 'not-applicable' instead of 'fail'. Many templates intentionally
  // don't use CMS (e.g. one-page event templates).
  const hasCmsCollections = metadata.cmsCollections.length > 0;
  const cmsTemplatePages = metadata.pages.filter((page) => page.type === 'cms-template').length;
  checks.push(
    check(
      'cms.collection_pages_present',
      'CMS Structure',
      'Collection pages are used for repeatable/relational content',
      hasCmsCollections
        ? !extractionAssessment.pagesReliable
          ? 'manual'
          : cmsTemplatePages > 0 ? 'pass' : 'fail'
        : 'pass',
      hasCmsCollections
        ? !extractionAssessment.pagesReliable
          ? manualEvidence('Pages panel', extractionAssessment, [
              `cmsCollections=${metadata.cmsCollections.length}`
            ])
          : [`cmsTemplatePages=${cmsTemplatePages}`, `cmsCollections=${metadata.cmsCollections.length}`]
        : [`cmsCollections=0`, 'Template does not use CMS — check not applicable']
    )
  );

  checks.push(
    check(
      'cms.collections_detected',
      'CMS Structure',
      'CMS collections are present and detectable',
      hasCmsCollections ? 'pass' : 'pass',
      hasCmsCollections
        ? [`collections=${metadata.cmsCollections.length}`]
        : [`collections=0`, 'Template does not use CMS — check not applicable']
    )
  );

  const cmsOutOfRange = metadata.cmsCollections.filter(
    (collection) => collection.itemCount < 3 || collection.itemCount > 7
  );
  checks.push(
    check(
      'cms.item_count_range',
      'CMS Structure',
      'Each collection has between 3 and 7 items',
      hasCmsCollections
        ? cmsOutOfRange.length === 0 ? 'pass' : 'fail'
        : 'pass',
      hasCmsCollections
        ? cmsOutOfRange.length === 0
          ? [`all collections in range (count=${metadata.cmsCollections.length})`]
          : [
              `outOfRange=${cmsOutOfRange
                .map((collection) => `${collection.name}:${collection.itemCount}`)
                .join(', ')}`
            ]
        : ['Template does not use CMS — check not applicable']
    )
  );

  const invalidCmsNames = cmsCollectionNames.filter((name) => !isTitleCaseLike(name));
  checks.push(
    check(
      'cms.collection_name_title_case',
      'CMS Naming',
      'Collection names use Title Case and readable naming',
      hasCmsCollections
        ? invalidCmsNames.length === 0 ? 'pass' : 'fail'
        : 'pass',
      hasCmsCollections
        ? invalidCmsNames.length === 0
          ? ['all collection names passed title-case heuristic']
          : [`invalid=${invalidCmsNames.slice(0, 8).join(' | ')}`]
        : ['Template does not use CMS — check not applicable']
    )
  );

  checks.push(
    check(
      'cms.collection_slug_singular',
      'CMS Naming',
      'Collection slugs are singular',
      'manual',
      ['Collection slug values are not returned in current Designer metadata payload.']
    )
  );

  const responsiveBreakpointsResult: ChecklistResult = !extractionAssessment.breakpointsReliable
    ? 'manual'
    : hasTablet && hasMobileLandscape && hasMobilePortrait ? 'pass' : 'fail';
  checks.push(
    check(
      'responsive.breakpoints_present',
      'Responsive Behaviour',
      'Desktop, tablet, mobile landscape, and mobile portrait breakpoints are configured',
      responsiveBreakpointsResult,
      responsiveBreakpointsResult === 'manual'
        ? manualEvidence('Breakpoint controls', extractionAssessment)
        : [`breakpoints=${metadata.breakpoints.join(' | ')}`]
    )
  );

  const modernImageFormats = ['.webp', '.avif', '.jpg', '.jpeg', '.png'];
  const hasModernFormats = assetNamesLower.some((name) =>
    modernImageFormats.some((format) => name.endsWith(format))
  );
  const modernFormatsResult: ChecklistResult = !extractionAssessment.assetsReliable || metadata.totalAssets === 0
    ? 'manual'
    : hasModernFormats ? 'pass' : 'fail';
  checks.push(
    check(
      'assets.modern_image_formats',
      'Images and Assets',
      'Modern image formats are used (WebP/AVIF/JPEG/PNG)',
      modernFormatsResult,
      modernFormatsResult === 'manual'
        ? manualEvidence('Assets panel', extractionAssessment)
        : [`assets=${metadata.totalAssets}`, `hasModernFormats=${hasModernFormats}`]
    )
  );

  checks.push(
    check(
      'ecommerce.settings_default',
      'Ecommerce Structure',
      'Ecommerce setup settings remain default (business address/shipping/tax/payment/hosting/checkout)',
      'manual',
      ['Ecommerce setup guide state is not exposed in current Designer metadata payload.']
    )
  );

  const filteredChecks = includeManual ? checks : checks.filter((item) => item.result !== 'manual');
  const pass = filteredChecks.filter((item) => item.result === 'pass').length;
  const fail = filteredChecks.filter((item) => item.result === 'fail').length;
  const manual = filteredChecks.filter((item) => item.result === 'manual').length;
  const scored = pass + fail;
  const passRate = scored > 0 ? pass / scored : 0;

  return {
    evaluatedAt: new Date().toISOString(),
    source: options.source || 'provided-metadata',
    metadataSummary: {
      siteName: metadata.siteName,
      sitePlan: metadata.sitePlan,
      totalPages: metadata.totalPages,
      totalComponents: metadata.totalComponents,
      unusedComponents: metadata.unusedComponents,
      totalInteractions: metadata.totalInteractions,
      totalCMSCollections: metadata.cmsCollections.length,
      totalCMSItems: metadata.totalCMSItems,
      totalAssets: metadata.totalAssets,
      breakpoints: metadata.breakpoints,
      pages: metadata.pages.map((page) => ({ name: page.name, type: page.type }))
    },
    summary: {
      pass,
      fail,
      manual,
      scored,
      passRate
    },
    checks: filteredChecks
  };
}
