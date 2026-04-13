import type {
  ChecklistResult,
  DesignerChecklistCheck,
  DesignerChecklistReport,
  DesignerMetadata
} from '../types.js';

type ScoreOptions = {
  includeManual?: boolean;
  source?: 'live-extraction' | 'provided-metadata';
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

export function scoreDesignerChecklist(
  metadata: DesignerMetadata,
  options: ScoreOptions = {}
): DesignerChecklistReport {
  const includeManual = options.includeManual !== false;
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
  checks.push(
    check(
      'components.nav_footer_cta',
      'Components',
      'Nav, Footer, and CTA are set up as Components',
      hasNavOrHeader && hasFooter && hasCta ? 'pass' : 'fail',
      [
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
  checks.push(
    check(
      'components.title_case_naming',
      'Components',
      'Component names use title-casing and human-readable naming',
      invalidComponentNames.length === 0 ? 'pass' : 'fail',
      invalidComponentNames.length === 0
        ? ['all component names passed title-case heuristic']
        : [
            `invalidCount=${invalidComponentNames.length}`,
            `examples=${invalidComponentNames.slice(0, 8).join(' | ')}`
          ]
    )
  );

  checks.push(
    check(
      'components.unused_cleaned',
      'Components',
      'Unused Components are cleaned up',
      metadata.unusedComponents === 0 ? 'pass' : 'fail',
      [`unusedComponents=${metadata.unusedComponents}`]
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
  checks.push(
    check(
      'variables.breakpoint_modes',
      'Variables',
      'Variable modes exist for Tablet, Mobile Landscape, and Mobile Portrait',
      hasTablet && hasMobileLandscape && hasMobilePortrait ? 'pass' : 'fail',
      [
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
    missingCritical.length > 0 ? 'fail' : missingOptional.length > 0 ? 'pass' : 'pass';
  const baseTagEvidence =
    missingCritical.length === 0 && missingOptional.length === 0
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
  checks.push(
    check(
      'styles.class_naming_consistency',
      'Styles Selector',
      'Class naming follows one consistent format',
      patternRatio >= 0.7 ? 'pass' : 'fail',
      [
        `dominantPattern=${dominantPattern}`,
        `dominantRatio=${patternRatio.toFixed(2)}`,
        `sampleSize=${candidateCustomClasses.length}`
      ]
    )
  );

  const invalidPageNames = pageNames.filter((name) => !isTitleCaseLike(name));
  checks.push(
    check(
      'pages.title_case_naming',
      'Required Pages',
      'Page names use Title Case',
      invalidPageNames.length === 0 ? 'pass' : 'fail',
      invalidPageNames.length === 0
        ? ['all page names passed title-case heuristic']
        : [
            `invalidCount=${invalidPageNames.length}`,
            `examples=${invalidPageNames.slice(0, 6).join(' | ')}`
          ]
    )
  );

  const pageNamesLower = toLowerList(pageNames);
  const hasStyleGuidePage = pageNamesLower.some((name) => name.includes('style guide'));
  const hasInstructionsPage = pageNamesLower.some(
    (name) => name.includes('instruction') || name.includes('instructions')
  );
  const hasLicensePage = pageNamesLower.some(
    (name) => name.includes('license') || name.includes('licenses')
  );
  checks.push(
    check(
      'pages.style_guide_exists',
      'Required Pages',
      'Style Guide page exists',
      hasStyleGuidePage ? 'pass' : 'fail',
      [`found=${hasStyleGuidePage}`]
    )
  );
  const hasAdvancedInteractions = metadata.totalInteractions > 0;
  const instructionsStatus: ChecklistResult = hasAdvancedInteractions
    ? hasInstructionsPage
      ? 'pass'
      : 'fail'
    : 'pass'; // Not required when no advanced interactions/components are used
  checks.push(
    check(
      'pages.instructions_exists',
      'Required Pages',
      'Instructions page exists when advanced interactions/components are used',
      instructionsStatus,
      [
        `found=${hasInstructionsPage}`,
        `hasAdvancedInteractions=${hasAdvancedInteractions}`,
        `totalInteractions=${metadata.totalInteractions}`
      ]
    )
  );
  checks.push(
    check(
      'pages.licenses_exists',
      'Required Pages',
      'Licenses page exists',
      hasLicensePage ? 'pass' : 'fail',
      [`found=${hasLicensePage}`]
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
        ? cmsTemplatePages > 0 ? 'pass' : 'fail'
        : 'pass',
      hasCmsCollections
        ? [`cmsTemplatePages=${cmsTemplatePages}`, `cmsCollections=${metadata.cmsCollections.length}`]
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

  checks.push(
    check(
      'responsive.breakpoints_present',
      'Responsive Behaviour',
      'Desktop, tablet, mobile landscape, and mobile portrait breakpoints are configured',
      hasTablet && hasMobileLandscape && hasMobilePortrait ? 'pass' : 'fail',
      [`breakpoints=${metadata.breakpoints.join(' | ')}`]
    )
  );

  const modernImageFormats = ['.webp', '.avif', '.jpg', '.jpeg', '.png'];
  const hasModernFormats = assetNamesLower.some((name) =>
    modernImageFormats.some((format) => name.endsWith(format))
  );
  checks.push(
    check(
      'assets.modern_image_formats',
      'Images and Assets',
      'Modern image formats are used (WebP/AVIF/JPEG/PNG)',
      hasModernFormats ? 'pass' : 'fail',
      [`assets=${metadata.totalAssets}`, `hasModernFormats=${hasModernFormats}`]
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
