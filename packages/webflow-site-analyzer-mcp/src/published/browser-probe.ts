import type { PublishedBrowserProbeMode, PublishedProbeSurface } from '../types.js';

export type PublishedPageEval = {
  url?: string;
  title?: string | null;
  hasSnippet?: boolean;
  snippetVersion?: string | null;
  tools?: string[];
  links?: string[];
  metaDiagnostics?: {
    missing?: string[];
  };
  hasRequiredLicenseText?: boolean | null;
  audit?: unknown;
  auditError?: string | null;
  sitemap?: unknown;
  audit404?: unknown;
  policyChecks?: {
    hasPoweredByWebflow?: boolean;
    affiliateLinks?: string[];
    hasGsap?: boolean;
    hasCustomCode?: boolean;
  };
  siteSettings?: {
    hasCustomFavicon?: boolean;
    hasCustomWebclip?: boolean;
    hasCustomFonts?: boolean;
    customFontSources?: string[];
    detectedApps?: string[];
  };
  styleSignals?: {
    accessibleStyleSheets?: number;
    blockedStyleSheets?: number;
    mediaRules?: number;
    breakpointHints?: string[];
    definedVariables?: number;
    usedVariables?: number;
    variableCategories?: string[];
    baseTagRules?: number;
    baseTagVariableRules?: number;
    componentVariantSelectors?: number;
    sampleVariables?: string[];
    sampleBaseTagSelectors?: string[];
    sampleComponentVariantSelectors?: string[];
  };
  structureSignals?: {
    hasNav?: boolean;
    hasFooter?: boolean;
    ctaCount?: number;
  };
  stateSignals?: {
    hoverSelectors?: number;
    focusSelectors?: number;
    focusVisibleSelectors?: number;
    activeSelectors?: number;
    interactiveElements?: number;
    interactiveWithTransition?: number;
    interactiveWithSpecificTransition?: number;
    interactiveWithTransitionAll?: number;
    interactiveGpuFriendlyTransitions?: number;
    interactiveExpensiveTransitions?: number;
    maxTransitionDurationMs?: number;
    averageTransitionDurationMs?: number;
  };
  accessibilitySignals?: {
    hasMainLandmark?: boolean;
    hasNavLandmark?: boolean;
    hasSkipLink?: boolean;
    genericLinkLabels?: number;
    sampleGenericLinkLabels?: string[];
  };
  assetSignals?: {
    responsiveImages?: number;
    imagesWithSrcset?: number;
    imagesWithSizes?: number;
    navLogoImages?: number;
  };
  formSignals?: {
    wrongFieldTypes?: number;
    sampleWrongFieldTypes?: string[];
  };
  contentQuality?: {
    hasLoremIpsum?: boolean;
    hasPlaceholderText?: boolean;
  };
};

export function getPublishedBrowserProbeMode(
  raw: Pick<PublishedPageEval, 'hasSnippet'>
): PublishedBrowserProbeMode {
  return raw.hasSnippet ? 'wf-review-snippet' : 'dom-fallback';
}

export function getPublishedBrowserProbeSources(
  mode: PublishedBrowserProbeMode
): PublishedProbeSurface[] {
  return mode === 'wf-review-snippet'
    ? ['browser-dom', 'browser-wf-review']
    : ['browser-dom'];
}

export const PUBLISHED_BROWSER_PROBE_SCRIPT = `
(async () => {
  const REQUIRED_LICENSE_TEXT =
    "All graphical assets in this template are licensed for personal and commercial use. If you'd like to use a specific asset, please check the license below.";

  const toInternalAbsolute = (href) => {
    try {
      if (!href) return null;
      const u = new URL(href, window.location.origin);
      if (u.origin !== window.location.origin) return null;
      if (u.protocol === 'mailto:' || u.protocol === 'tel:' || u.protocol === 'javascript:') return null;
      u.hash = '';
      return u.toString();
    } catch {
      return null;
    }
  };

  const titleText = (document.title || '').trim();
  const title = titleText || null;
  const getMetaContent = (selector) => {
    const el = document.querySelector(selector);
    return (el?.getAttribute('content') || '').trim();
  };
  const metaDiagnosticsMissing = [];
  if (!titleText) metaDiagnosticsMissing.push('title');
  if (!getMetaContent('meta[name="description"]')) metaDiagnosticsMissing.push('description');
  if (!getMetaContent('meta[property="og:title"]')) metaDiagnosticsMissing.push('og:title');
  if (!getMetaContent('meta[property="og:description"]')) metaDiagnosticsMissing.push('og:description');
  if (!getMetaContent('meta[property="og:image"]')) metaDiagnosticsMissing.push('og:image');
  const links = Array.from(document.querySelectorAll('a[href]'))
    .map((a) => a.getAttribute('href') || a.href || '')
    .map((href) => toInternalAbsolute(href))
    .filter(Boolean);

  const dedupedLinks = Array.from(new Set(links)).slice(0, 250);
  const pathname = window.location.pathname.toLowerCase();
  const bodyText = (document.body?.textContent || '').replace(/\\s+/g, ' ').slice(0, 8000);
  const hasRequiredLicenseText = pathname.includes('license')
    ? bodyText.includes(REQUIRED_LICENSE_TEXT)
    : null;

  const poweredByBadge = document.querySelector('.w-webflow-badge') ||
    document.querySelector('a[href*="webflow.com"][class*="badge"]') ||
    document.querySelector('a[href*="webflow.com"]');
  const hasPoweredByWebflow = Boolean(
    poweredByBadge &&
    (poweredByBadge.textContent || '').toLowerCase().includes('webflow')
  );

  const allHrefs = Array.from(document.querySelectorAll('a[href]'))
    .map(a => (a.getAttribute('href') || '').toLowerCase());
  const affiliatePatterns = [
    'ref=', 'affiliate', 'aff=', 'partner=', 'referral',
    'utm_source=affiliate', 'tap_a=', 'idev_id=', 'click_id='
  ];
  const affiliateLinks = allHrefs.filter(href =>
    affiliatePatterns.some(p => href.includes(p))
  );

  const scriptEls = Array.from(document.querySelectorAll('script'));
  const scriptSrcs = scriptEls.map(s => s.src || '').filter(Boolean);
  const inlineCode = scriptEls.map(s => (s.textContent || '').slice(0, 2000)).join(' ');
  const hasGsap = scriptSrcs.some(src => src.toLowerCase().includes('gsap')) ||
    inlineCode.includes('gsap') || inlineCode.includes('ScrollTrigger') ||
    inlineCode.includes('ScrollSmoother');
  const hasCustomCode = scriptEls.some(s =>
    !s.src && (s.textContent || '').trim().length > 50 &&
    !s.getAttribute('data-wf-domain')
  );

  const faviconLink = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
  const hasCustomFavicon = Boolean(faviconLink && !((faviconLink.getAttribute('href') || '').includes('webflow')));
  const webclipLink = document.querySelector('link[rel="apple-touch-icon"]');
  const hasCustomWebclip = Boolean(
    webclipLink && !((webclipLink.getAttribute('href') || '').includes('webflow'))
  );

  const fontLinks = Array.from(document.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"], link[href*="use.typekit.net"]'));
  const customFontStyles = Array.from(document.querySelectorAll('style')).filter(s =>
    (s.textContent || '').includes('@font-face')
  );
  const hasCustomFonts = fontLinks.length > 0 || customFontStyles.length > 0;
  const customFontSources = fontLinks.map(l => l.getAttribute('href') || '').filter(Boolean);
  const linkEls = Array.from(document.querySelectorAll('a'));
  const imgEls = Array.from(document.querySelectorAll('img'));
  const formFields = Array.from(document.querySelectorAll('input, textarea, select'));
  const videoEls = Array.from(document.querySelectorAll('video'));

  const connectedAppPatterns = [
    { name: 'Google Analytics', pattern: /google-analytics\\.com|googletagmanager\\.com|gtag/ },
    { name: 'Facebook Pixel', pattern: /connect\\.facebook\\.net|fbevents\\.js/ },
    { name: 'Hotjar', pattern: /hotjar\\.com|static\\.hotjar/ },
    { name: 'Intercom', pattern: /intercom\\.io|widget\\.intercom/ },
    { name: 'Drift', pattern: /drift\\.com|js\\.driftt/ },
    { name: 'Crisp', pattern: /crisp\\.chat/ },
    { name: 'HubSpot', pattern: /hubspot\\.com|hs-scripts/ },
    { name: 'Mailchimp', pattern: /mailchimp\\.com|chimpstatic/ },
  ];
  const allScriptSrcsAndInline = [
    ...scriptSrcs,
    ...scriptEls.map(s => (s.textContent || '').slice(0, 500))
  ].join(' ');
  const detectedApps = connectedAppPatterns
    .filter(app => app.pattern.test(allScriptSrcsAndInline))
    .map(app => app.name);

  const styleSignals = (() => {
    const definedVariables = new Set();
    const usedVariables = new Set();
    const variableCategories = new Set();
    const breakpointHints = new Set();
    const baseTagSelectors = new Set();
    const baseTagVariableSelectors = new Set();
    const componentVariantSelectors = new Set();
    const baseTagPattern = /(^|[\\s,>+~])(body|h1|h2|h3|h4|h5|h6|p|a|button|label|input|textarea|select)(?=$|[\\s,.:#\\[>+~])/i;
    let accessibleStyleSheets = 0;
    let blockedStyleSheets = 0;
    let mediaRules = 0;

    const categorizeVariable = (name) => {
      const lower = String(name || '').toLowerCase();
      if (!lower) return null;
      if (
        lower.includes('color') ||
        lower.includes('text') ||
        lower.includes('bg') ||
        lower.includes('background') ||
        lower.includes('border')
      ) {
        return 'color';
      }
      if (
        lower.includes('font') ||
        lower.includes('type') ||
        lower.includes('heading') ||
        lower.includes('line') ||
        lower.includes('letter')
      ) {
        return 'typography';
      }
      if (
        lower.includes('space') ||
        lower.includes('gap') ||
        lower.includes('pad') ||
        lower.includes('margin') ||
        lower.includes('radius') ||
        lower.includes('size') ||
        lower.includes('width') ||
        lower.includes('height')
      ) {
        return 'spacing';
      }
      return null;
    };

    const collectStyleDeclaration = (style) => {
      if (!style) return;
      for (let index = 0; index < style.length; index++) {
        const property = style[index];
        if (!property) continue;
        if (property.startsWith('--')) {
          definedVariables.add(property);
          const category = categorizeVariable(property);
          if (category) variableCategories.add(category);
        }
        const value = style.getPropertyValue(property) || '';
        const matches = value.match(/var\\(\\s*(--[A-Za-z0-9_-]+)/g) || [];
        for (const match of matches) {
          const name = match.replace(/var\\(\\s*/, '');
          usedVariables.add(name);
          const category = categorizeVariable(name);
          if (category) variableCategories.add(category);
        }
      }
    };

    const recordBreakpointHints = (mediaText) => {
      const text = String(mediaText || '');
      if (!text) return;
      if (text.includes('991px')) breakpointHints.add('991');
      if (text.includes('767px') || text.includes('768px')) breakpointHints.add('767');
      if (text.includes('479px') || text.includes('480px')) breakpointHints.add('479');
    };

    const processRules = (rules) => {
      if (!rules) return;
      for (const rule of Array.from(rules)) {
        try {
          if (rule.type === CSSRule.STYLE_RULE) {
            const selector = rule.selectorText || '';
            collectStyleDeclaration(rule.style);
            const componentVariantMatches = selector.match(/\\.w-variant-[A-Za-z0-9-]+/g) || [];
            for (const match of componentVariantMatches) {
              componentVariantSelectors.add(match);
            }
            if (baseTagPattern.test(selector)) {
              baseTagSelectors.add(selector);
              const cssText = rule.cssText || '';
              const hasVariableUsage = cssText.includes('var(--');
              if (hasVariableUsage) {
                baseTagVariableSelectors.add(selector);
              }
            }
          } else if (rule.type === CSSRule.MEDIA_RULE) {
            mediaRules += 1;
            const text = rule.conditionText || rule.media?.mediaText || '';
            recordBreakpointHints(text);
            processRules(rule.cssRules);
          } else if (rule.cssRules) {
            processRules(rule.cssRules);
          }
        } catch {}
      }
    };

    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = sheet.cssRules;
        accessibleStyleSheets += 1;
        processRules(rules);
      } catch {
        blockedStyleSheets += 1;
      }
    }

    return {
      accessibleStyleSheets,
      blockedStyleSheets,
      mediaRules,
      breakpointHints: Array.from(breakpointHints).sort(),
      definedVariables: definedVariables.size,
      usedVariables: usedVariables.size,
      variableCategories: Array.from(variableCategories).sort(),
      baseTagRules: baseTagSelectors.size,
      baseTagVariableRules: baseTagVariableSelectors.size,
      componentVariantSelectors: componentVariantSelectors.size,
      sampleVariables: Array.from(definedVariables).slice(0, 8),
      sampleBaseTagSelectors: Array.from(baseTagVariableSelectors).slice(0, 5),
      sampleComponentVariantSelectors: Array.from(componentVariantSelectors).slice(0, 8)
    };
  })();

  const stateSignals = (() => {
    const hoverSelectors = new Set();
    const focusSelectors = new Set();
    const focusVisibleSelectors = new Set();
    const activeSelectors = new Set();

    const trackSelectorStates = (selector) => {
      const text = String(selector || '');
      if (!text) return;
      if (text.includes(':hover')) hoverSelectors.add(text);
      if (text.includes(':focus')) focusSelectors.add(text);
      if (text.includes(':focus-visible')) focusVisibleSelectors.add(text);
      if (text.includes(':active')) activeSelectors.add(text);
    };

    const walkRules = (rules) => {
      if (!rules) return;
      for (const rule of Array.from(rules)) {
        try {
          if (rule.type === CSSRule.STYLE_RULE) {
            trackSelectorStates(rule.selectorText || '');
          } else if (rule.cssRules) {
            walkRules(rule.cssRules);
          }
        } catch {}
      }
    };

    for (const sheet of Array.from(document.styleSheets)) {
      try {
        walkRules(sheet.cssRules);
      } catch {}
    }

    const interactiveEls = Array.from(
      document.querySelectorAll('a, button, [role="button"], .w-button, input[type="submit"], input[type="button"]')
    );
    let interactiveWithTransition = 0;
    let interactiveWithSpecificTransition = 0;
    let interactiveWithTransitionAll = 0;
    let interactiveGpuFriendlyTransitions = 0;
    let interactiveExpensiveTransitions = 0;
    let totalDurationMs = 0;
    let maxDurationMs = 0;
    let durationSamples = 0;

    const expensiveTransitionProps = new Set([
      'top',
      'left',
      'right',
      'bottom',
      'width',
      'height',
      'filter',
      'backdrop-filter',
      'box-shadow'
    ]);

    const durationToMs = (value) => {
      const trimmed = String(value || '').trim();
      if (!trimmed) return 0;
      if (trimmed.endsWith('ms')) return parseFloat(trimmed) || 0;
      if (trimmed.endsWith('s')) return (parseFloat(trimmed) || 0) * 1000;
      return parseFloat(trimmed) || 0;
    };

    for (const el of interactiveEls) {
      const style = window.getComputedStyle(el);
      const properties = (style.transitionProperty || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      const durations = (style.transitionDuration || '')
        .split(',')
        .map((value) => durationToMs(value));
      const hasTransition = durations.some((duration) => duration > 0);
      if (!hasTransition) continue;

      interactiveWithTransition += 1;
      const hasAll = properties.includes('all');
      const hasSpecific = properties.length > 0 && !hasAll;
      const hasExpensive = properties.some((property) => expensiveTransitionProps.has(property));
      const hasGpuFriendly = properties.some((property) => property === 'transform' || property === 'opacity');
      if (hasAll) interactiveWithTransitionAll += 1;
      if (hasSpecific) interactiveWithSpecificTransition += 1;
      if (hasGpuFriendly && !hasAll && !hasExpensive) interactiveGpuFriendlyTransitions += 1;
      if (hasExpensive) interactiveExpensiveTransitions += 1;

      for (const duration of durations) {
        if (duration <= 0) continue;
        totalDurationMs += duration;
        durationSamples += 1;
        if (duration > maxDurationMs) maxDurationMs = duration;
      }
    }

    return {
      hoverSelectors: hoverSelectors.size,
      focusSelectors: focusSelectors.size,
      focusVisibleSelectors: focusVisibleSelectors.size,
      activeSelectors: activeSelectors.size,
      interactiveElements: interactiveEls.length,
      interactiveWithTransition,
      interactiveWithSpecificTransition,
      interactiveWithTransitionAll,
      interactiveGpuFriendlyTransitions,
      interactiveExpensiveTransitions,
      maxTransitionDurationMs: maxDurationMs,
      averageTransitionDurationMs: durationSamples > 0 ? totalDurationMs / durationSamples : 0
    };
  })();

  const accessibilitySignals = (() => {
    const genericLinkPatterns = [
      'learn more',
      'read more',
      'click here',
      'see more',
      'view more',
      'discover more',
      'more'
    ];
    const genericLinkLabels = [];
    for (const link of linkEls) {
      const label = (
        link.textContent ||
        link.getAttribute('aria-label') ||
        ''
      ).trim().replace(/\\s+/g, ' ').toLowerCase();
      if (!label) continue;
      if (genericLinkPatterns.includes(label)) {
        genericLinkLabels.push(label);
      }
    }

    const hasMainLandmark = Boolean(document.querySelector('main, [role="main"]'));
    const hasNavLandmark = Boolean(document.querySelector('nav, [role="navigation"]'));
    const hasSkipLink = linkEls.some((link) => {
      const href = (link.getAttribute('href') || '').toLowerCase();
      if (!href.startsWith('#')) return false;
      const label = (
        link.textContent ||
        link.getAttribute('aria-label') ||
        ''
      ).trim().toLowerCase();
      return label.includes('skip') && (
        label.includes('content') ||
        label.includes('main') ||
        href.includes('content') ||
        href.includes('main')
      );
    });

    return {
      hasMainLandmark,
      hasNavLandmark,
      hasSkipLink,
      genericLinkLabels: genericLinkLabels.length,
      sampleGenericLinkLabels: Array.from(new Set(genericLinkLabels)).slice(0, 5)
    };
  })();

  const assetSignals = (() => {
    const imagesWithSrcset = imgEls.filter((img) => Boolean(img.getAttribute('srcset'))).length;
    const imagesWithSizes = imgEls.filter((img) => Boolean(img.getAttribute('sizes'))).length;
    const responsiveImages = imgEls.filter((img) =>
      Boolean(img.getAttribute('srcset')) ||
      Boolean(img.getAttribute('sizes')) ||
      Boolean(img.closest('picture'))
    ).length;
    const navLogoImages = document.querySelectorAll(
      'nav img, .w-nav-brand img, header img[alt], header a img'
    ).length;

    return {
      responsiveImages,
      imagesWithSrcset,
      imagesWithSizes,
      navLogoImages
    };
  })();

  const formSignals = (() => {
    const mismatched = [];
    for (const field of formFields) {
      const type = (field.getAttribute('type') || '').toLowerCase();
      if (
        type === 'hidden' ||
        type === 'submit' ||
        type === 'button' ||
        type === 'checkbox' ||
        type === 'radio'
      ) {
        continue;
      }

      const descriptor = [
        field.getAttribute('name') || '',
        field.getAttribute('id') || '',
        field.getAttribute('placeholder') || '',
        field.getAttribute('aria-label') || ''
      ].join(' ').toLowerCase();
      if (!descriptor) continue;

      const sampleName = field.getAttribute('name') || field.getAttribute('id') || field.tagName.toLowerCase();
      if (descriptor.includes('email') && type && type !== 'email') {
        mismatched.push(sampleName + ':' + type + '->email');
      } else if ((descriptor.includes('phone') || descriptor.includes('tel')) && type && type !== 'tel') {
        mismatched.push(sampleName + ':' + type + '->tel');
      } else if ((descriptor.includes('website') || descriptor.includes('url')) && type && type !== 'url') {
        mismatched.push(sampleName + ':' + type + '->url');
      }
    }

    return {
      wrongFieldTypes: mismatched.length,
      sampleWrongFieldTypes: mismatched.slice(0, 5)
    };
  })();

  const bodyTextForPlaceholder = (document.body?.textContent || '').toLowerCase();
  const loremIpsumPatterns = ['lorem ipsum', 'dolor sit amet', 'consectetur adipiscing', 'sed do eiusmod'];
  const hasLoremIpsum = loremIpsumPatterns.some(p => bodyTextForPlaceholder.includes(p));
  const placeholderPatterns = ['your text here', 'placeholder text', 'insert text', 'add your', 'example text', 'sample text'];
  const hasPlaceholderText = placeholderPatterns.some(p => bodyTextForPlaceholder.includes(p));
  const ctaPatterns = [
    'book', 'contact', 'start', 'get started', 'subscribe', 'signup',
    'sign up', 'register', 'learn more', 'see more', 'buy', 'shop', 'appointment'
  ];
  const interactiveTextEls = Array.from(
    document.querySelectorAll('a, button, input[type="submit"], input[type="button"]')
  );
  const ctaCount = interactiveTextEls.filter((el) => {
    const text = (
      el.textContent ||
      el.getAttribute('value') ||
      el.getAttribute('aria-label') ||
      ''
    ).trim().toLowerCase();
    if (!text) return false;
    return ctaPatterns.some((pattern) => text.includes(pattern));
  }).length;
  const hasNav = Boolean(
    document.querySelector('nav, [role="navigation"], header .w-nav, .w-nav, .navbar, .nav-menu')
  );
  const hasFooter = Boolean(
    document.querySelector('footer, [role="contentinfo"], .footer')
  );

  const api = window.__wfReview;
  if (!api) {
    const headingEls = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const headingLevels = Array.from(headingEls).map(el => parseInt(el.tagName[1], 10));
    const h1Count = headingLevels.filter(l => l === 1).length;
    let skippedLevels = 0;
    const seenLevels = new Set();
    for (const level of headingLevels) {
      if (level > 1 && !seenLevels.has(level - 1) && level - 1 !== 0) {
        if (!headingLevels.includes(level - 1)) skippedLevels++;
      }
      seenLevels.add(level);
    }
    const emptyHeadings = Array.from(headingEls).filter(el => !(el.textContent || '').trim()).length;

    const missingAlt = imgEls.filter(img => !img.hasAttribute('alt') || img.alt === '').length;
    const missingDimensions = imgEls.filter(img =>
      !img.hasAttribute('width') && !img.hasAttribute('height') &&
      !img.style.aspectRatio && !(img.getAttribute('style') || '').includes('aspect-ratio')
    ).length;
    const aboveFoldLazy = imgEls.filter(img => {
      const rect = img.getBoundingClientRect();
      return rect.top < window.innerHeight && img.loading === 'lazy';
    }).length;
    const imgFormats = {};
    for (const img of imgEls) {
      const src = img.currentSrc || img.src || '';
      const ext = src.split('?')[0].split('.').pop()?.toLowerCase() || 'unknown';
      imgFormats[ext] = (imgFormats[ext] || 0) + 1;
    }

    const emptyHref = linkEls.filter(a => {
      const href = a.getAttribute('href');
      return href === '' || href === null;
    }).length;
    const placeholderHref = linkEls.filter(a => {
      const href = a.getAttribute('href') || '';
      if (!href.startsWith('#')) return false;
      if (/^#w-tabs-/.test(href) || /^#w-dropdown-/.test(href) || /^#w--/.test(href)) return false;
      if (href === '#' && (
        a.classList.contains('w-lightbox') ||
        a.closest('.w-lightbox') ||
        a.hasAttribute('data-lightbox')
      )) return false;
      return true;
    }).length;
    const blankTargetMissingRel = linkEls.filter(a =>
      a.target === '_blank' && !(a.getAttribute('rel') || '').includes('noopener')
    ).length;
    const missingAccessibleName = linkEls.filter(a =>
      !(a.textContent || '').trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]')
    ).length;

    const metaMissing = [...metaDiagnosticsMissing];
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    const hasCanonical = Boolean(canonicalLink && canonicalLink.getAttribute('href'));
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    const hasStructuredData = jsonLdScripts.length > 0;
    const hasAriaLandmarks =
      Boolean(accessibilitySignals.hasMainLandmark) &&
      Boolean(accessibilitySignals.hasNavLandmark);

    const missingLabels = Array.from(formFields).filter(field => {
      if (field.type === 'hidden' || field.type === 'submit') return false;
      const id = field.id;
      const hasLabel = id && document.querySelector('label[for="' + id + '"]');
      const parentLabel = field.closest('label');
      const ariaLabel = field.getAttribute('aria-label') || field.getAttribute('aria-labelledby');
      return !hasLabel && !parentLabel && !ariaLabel;
    }).length;
    const autoplayNoControls = videoEls.filter(v => v.autoplay && !v.controls).length;
    const bgVideoMissing = videoEls.filter(v =>
      v.muted && v.autoplay && v.loop && !v.controls
    ).length;

    const belowFoldNotLazy = imgEls.filter(img => {
      const rect = img.getBoundingClientRect();
      return rect.top >= window.innerHeight && img.loading !== 'lazy';
    }).length;
    const ix2Scripts = Array.from(document.querySelectorAll('script'))
      .filter(s => (s.textContent || '').includes('Webflow.require(\\'ix2\\')'));
    const ix2Data = ix2Scripts.length > 0;
    let ix2Events = 0;
    let ix2ActionLists = 0;
    if (ix2Data) {
      try {
        const wfData = window.Webflow?.require?.('ix2')?.store?.getState?.();
        if (wfData?.ixData) {
          ix2Events = Object.keys(wfData.ixData.events || {}).length;
          ix2ActionLists = Object.keys(wfData.ixData.actionLists || {}).length;
        }
      } catch {}
    }

    const domAudit = {
      meta: { missing: metaMissing, hasCanonical, hasStructuredData, hasAriaLandmarks },
      headings: {
        summary: {
          headings: headingEls.length,
          h1: h1Count,
          missingH1: h1Count === 0,
          multipleH1: h1Count > 1,
          skippedHeadingLevels: skippedLevels,
          emptyHeadings
        }
      },
      links: {
        summary: {
          links: linkEls.length,
          emptyHref,
          placeholderHref,
          blankTargetMissingRel,
          missingAccessibleName
        }
      },
      images: {
        summary: {
          images: imgEls.length,
          missingAlt,
          missingDimensions,
          aboveFoldLazy,
          belowFoldNotLazy
        },
        formats: imgFormats
      },
      forms: {
        summary: {
          fields: formFields.length,
          missingLabels,
          wrongFieldTypes: formSignals.wrongFieldTypes,
          sampleWrongFieldTypes: formSignals.sampleWrongFieldTypes
        }
      },
      structure: {
        summary: {
          hasNav,
          hasFooter,
          ctaCount
        }
      },
      media: {
        summary: {
          videos: videoEls.length,
          autoplayWithoutControls: autoplayNoControls,
          backgroundVideosMissingControl: bgVideoMissing
        }
      },
      interactions: {
        ix2: { summary: { events: ix2Events, actionLists: ix2ActionLists } },
        ix3: { summary: {} }
      },
      transitions: (() => {
        const interactiveEls = document.querySelectorAll('a, button, [role="button"], .w-button, input[type="submit"]');
        let withTransition = 0;
        let withoutTransition = 0;
        for (const el of Array.from(interactiveEls)) {
          const style = window.getComputedStyle(el);
          const transition = style.transition || style.getPropertyValue('transition');
          if (transition && transition !== 'all 0s ease 0s' && transition !== 'none') {
            withTransition++;
          } else {
            withoutTransition++;
          }
        }
        return {
          totalInteractive: interactiveEls.length,
          withTransition,
          withoutTransition,
          ratio: interactiveEls.length > 0 ? withTransition / interactiveEls.length : 0,
          withSpecificTransition: stateSignals.interactiveWithSpecificTransition || 0,
          withTransitionAll: stateSignals.interactiveWithTransitionAll || 0,
          gpuFriendlyTransitions: stateSignals.interactiveGpuFriendlyTransitions || 0,
          expensiveTransitions: stateSignals.interactiveExpensiveTransitions || 0,
          maxDurationMs: stateSignals.maxTransitionDurationMs || 0,
          averageDurationMs: stateSignals.averageTransitionDurationMs || 0
        };
      })(),
      comboClassDepth: (() => {
        const allEls = document.querySelectorAll('[class]');
        let maxDepth = 0;
        let maxDepthSelector = '';
        for (const el of Array.from(allEls).slice(0, 500)) {
          const classCount = el.classList.length;
          if (classCount > maxDepth) {
            maxDepth = classCount;
            maxDepthSelector = el.tagName.toLowerCase() + '.' + Array.from(el.classList).slice(0, 3).join('.');
          }
        }
        return { maxDepth, maxDepthSelector, sampled: Math.min(allEls.length, 500) };
      })(),
      contrast: (() => {
        const textEls = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, span, li, td, th, label, button');
        let checked = 0;
        let passCount = 0;
        let failCount = 0;
        const failures = [];

        function luminance(r, g, b) {
          const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        }

        function parseColor(color) {
          const m = (color || '').match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
          if (!m) return null;
          return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) };
        }

        function isTransparent(color) {
          return !color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent';
        }

        function findEffectiveBg(el) {
          let current = el;
          let depth = 0;
          while (current && current !== document.documentElement && depth < 20) {
            const style = window.getComputedStyle(current);
            if (!isTransparent(style.backgroundColor)) {
              return parseColor(style.backgroundColor);
            }
            current = current.parentElement;
            depth++;
          }
          const bodyBg = window.getComputedStyle(document.body).backgroundColor;
          const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
          const resolved = parseColor(bodyBg) || parseColor(htmlBg);
          return resolved || { r: 255, g: 255, b: 255 };
        }

        function contrastRatio(fg, bg) {
          const l1 = luminance(fg.r, fg.g, fg.b);
          const l2 = luminance(bg.r, bg.g, bg.b);
          const lighter = Math.max(l1, l2);
          const darker = Math.min(l1, l2);
          return (lighter + 0.05) / (darker + 0.05);
        }

        function isVisible(el) {
          const style = window.getComputedStyle(el);
          if (style.display === 'none') return false;
          if (style.visibility === 'hidden') return false;
          if (style.opacity === '0') return false;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return false;
          return true;
        }

        function getThreshold(style) {
          const fontSize = parseFloat(style.fontSize) || 16;
          const fontWeight = parseInt(style.fontWeight) || 400;
          const isBold = fontWeight >= 700;
          if (fontSize >= 24) return 3;
          if (fontSize >= 18.66 && isBold) return 3;
          return 4.5;
        }

        let sampled = 0;
        for (const el of Array.from(textEls)) {
          if (sampled >= 80) break;
          if (!isVisible(el)) continue;

          const text = (el.textContent || '').trim();
          if (!text || text.length === 0) continue;

          sampled++;
          const style = window.getComputedStyle(el);
          const fg = parseColor(style.color);
          if (!fg) continue;

          const bg = findEffectiveBg(el);
          if (!bg) continue;

          checked++;
          const ratio = contrastRatio(fg, bg);
          const threshold = getThreshold(style);

          if (ratio >= threshold) {
            passCount++;
          } else {
            failCount++;
            if (failures.length < 5) {
              const tag = el.tagName.toLowerCase();
              const snippet = text.slice(0, 30);
              failures.push({
                text: snippet,
                tag,
                ratio: Math.round(ratio * 100) / 100,
                required: threshold,
                fg: 'rgb(' + fg.r + ',' + fg.g + ',' + fg.b + ')',
                bg: 'rgb(' + bg.r + ',' + bg.g + ',' + bg.b + ')'
              });
            }
          }
        }

        return {
          checked,
          pass: passCount,
          fail: failCount,
          passRate: checked > 0 ? passCount / checked : 1,
          failures
        };
      })(),
      accessibility: {
        summary: {
          hasMainLandmark: accessibilitySignals.hasMainLandmark,
          hasNavLandmark: accessibilitySignals.hasNavLandmark,
          hasSkipLink: accessibilitySignals.hasSkipLink,
          genericLinkLabels: accessibilitySignals.genericLinkLabels,
          sampleGenericLinkLabels: accessibilitySignals.sampleGenericLinkLabels
        }
      },
      assets: {
        summary: {
          responsiveImages: assetSignals.responsiveImages,
          imagesWithSrcset: assetSignals.imagesWithSrcset,
          imagesWithSizes: assetSignals.imagesWithSizes,
          navLogoImages: assetSignals.navLogoImages
        }
      }
    };

    return {
      url: window.location.href,
      title,
      hasSnippet: false,
      snippetVersion: null,
      tools: [],
      links: dedupedLinks,
      metaDiagnostics: {
        missing: metaDiagnosticsMissing
      },
      hasRequiredLicenseText,
      audit: domAudit,
      auditError: null,
      sitemap: null,
      audit404: null,
      policyChecks: {
        hasPoweredByWebflow,
        affiliateLinks,
        hasGsap,
        hasCustomCode
      },
      siteSettings: {
        hasCustomFavicon,
        hasCustomWebclip,
        hasCustomFonts,
        customFontSources,
        detectedApps
      },
      styleSignals,
      structureSignals: {
        hasNav,
        hasFooter,
        ctaCount
      },
      stateSignals,
      accessibilitySignals,
      assetSignals,
      formSignals,
      contentQuality: {
        hasLoremIpsum,
        hasPlaceholderText
      }
    };
  }

  const tools = typeof api.listTools === 'function' ? api.listTools().map((t) => t.name) : [];

  let audit = null;
  let auditError = null;
  try {
    audit = await api.callTool('audit_webflow_way', { maxExamples: 20, includeSitemap: false });
  } catch (err) {
    auditError = err instanceof Error ? err.message : String(err);
  }

  let sitemap = null;
  try {
    sitemap = await api.callTool('get_sitemap_urls', { sitemapPath: '/sitemap.xml', maxUrls: 200 });
  } catch (err) {
    sitemap = { error: err instanceof Error ? err.message : String(err) };
  }

  let audit404 = null;
  try {
    audit404 = await api.callTool('audit_404', {});
  } catch (err) {
    audit404 = { error: err instanceof Error ? err.message : String(err) };
  }

  return {
    url: window.location.href,
    title,
    hasSnippet: true,
    snippetVersion: api.version ?? null,
    tools,
    links: dedupedLinks,
    metaDiagnostics: {
      missing: metaDiagnosticsMissing
    },
    hasRequiredLicenseText,
    audit,
    auditError,
    sitemap,
    audit404,
    siteSettings: {
      hasCustomFavicon,
      hasCustomWebclip,
      hasCustomFonts,
      customFontSources,
      detectedApps
    },
    styleSignals,
    structureSignals: {
      hasNav,
      hasFooter,
      ctaCount
    },
    stateSignals,
    accessibilitySignals,
    assetSignals,
    formSignals,
    policyChecks: {
      hasPoweredByWebflow,
      affiliateLinks,
      hasGsap,
      hasCustomCode
    }
  };
})()
`;
