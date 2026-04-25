import type {
  AnalyzeOptions,
  BrowserProvider,
  PublishedResponsivePageProbe,
  PublishedResponsiveProbeResult,
  PublishedResponsiveViewportProbe
} from '../types.js';

type ResponsiveViewportDefinition = {
  label: PublishedResponsiveViewportProbe['label'];
  width: number;
  height: number;
};

type ResponsiveProbeEval = {
  horizontalOverflow?: boolean;
  overflowElements?: number;
  clippedTextElements?: number;
  tinyTapTargets?: number;
  sampleOverflowSelectors?: string[];
  sampleClippedText?: string[];
  sampleTinyTapSelectors?: string[];
};

const RESPONSIVE_VIEWPORTS: ResponsiveViewportDefinition[] = [
  { label: 'tablet', width: 991, height: 900 },
  { label: 'mobile-landscape', width: 767, height: 900 },
  { label: 'mobile-portrait', width: 479, height: 900 }
];

export const PUBLISHED_RESPONSIVE_PROBE_SCRIPT = `
(() => {
  const selectorForElement = (element) => {
    if (!element) return 'unknown';
    const tag = (element.tagName || 'div').toLowerCase();
    const id = element.id ? '#' + element.id : '';
    const classes = Array.from(element.classList || []).slice(0, 3).map((name) => '.' + name).join('');
    return tag + id + classes;
  };

  const isVisible = (element) => {
    const style = window.getComputedStyle(element);
    if (style.display === 'none') return false;
    if (style.visibility === 'hidden') return false;
    if (style.opacity === '0') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const overflowCandidates = [];
  for (const element of Array.from(document.querySelectorAll('body *')).slice(0, 1200)) {
    if (!(element instanceof HTMLElement)) continue;
    if (!isVisible(element)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.right > window.innerWidth + 2 || rect.left < -2) {
      overflowCandidates.push(selectorForElement(element));
    }
  }

  const clippedText = [];
  const textSelectors = 'h1, h2, h3, h4, h5, h6, p, a, button, label, span, li';
  for (const element of Array.from(document.querySelectorAll(textSelectors)).slice(0, 250)) {
    if (!(element instanceof HTMLElement)) continue;
    if (!isVisible(element)) continue;
    const text = (element.textContent || '').trim().replace(/\\s+/g, ' ');
    if (text.length < 12) continue;
    if (element.scrollWidth <= element.clientWidth + 2) continue;
    const style = window.getComputedStyle(element);
    const constrained =
      style.overflow === 'hidden' ||
      style.textOverflow === 'ellipsis' ||
      style.whiteSpace === 'nowrap';
    if (!constrained) continue;
    clippedText.push(text.slice(0, 48));
  }

  const tinyTapTargets = [];
  const interactiveSelectors = 'a, button, [role="button"], input, select, textarea, .w-button';
  for (const element of Array.from(document.querySelectorAll(interactiveSelectors)).slice(0, 250)) {
    if (!(element instanceof HTMLElement)) continue;
    if (!isVisible(element)) continue;
    const style = window.getComputedStyle(element);
    const isAnchor = element.tagName.toLowerCase() === 'a';
    const anchorIsButtonLike =
      !isAnchor ||
      element.classList.contains('w-button') ||
      element.getAttribute('role') === 'button' ||
      Boolean(element.closest('nav')) ||
      ['inline-block', 'block', 'flex', 'inline-flex'].includes(style.display);
    if (!anchorIsButtonLike) continue;
    const rect = element.getBoundingClientRect();
    const text = (
      element.textContent ||
      element.getAttribute('aria-label') ||
      element.getAttribute('value') ||
      ''
    ).trim().replace(/\\s+/g, ' ');
    const hasText = text.length > 0;
    if (!hasText && !element.querySelector('img, svg')) continue;
    if (rect.width >= 40 && rect.height >= 40) continue;
    tinyTapTargets.push(selectorForElement(element));
  }

  return {
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    overflowElements: overflowCandidates.length,
    clippedTextElements: clippedText.length,
    tinyTapTargets: tinyTapTargets.length,
    sampleOverflowSelectors: overflowCandidates.slice(0, 5),
    sampleClippedText: clippedText.slice(0, 5),
    sampleTinyTapSelectors: tinyTapTargets.slice(0, 5)
  };
})()
`;

export async function runPublishedResponsiveProbe(
  provider: BrowserProvider,
  pageUrls: string[],
  options: {
    timeout?: number;
    viewports?: ResponsiveViewportDefinition[];
  } = {}
): Promise<PublishedResponsiveProbeResult> {
  const timeout = options.timeout ?? 45000;
  const viewports = options.viewports ?? RESPONSIVE_VIEWPORTS;
  const pages: PublishedResponsivePageProbe[] = [];

  for (const url of pageUrls) {
    const pageProbe: PublishedResponsivePageProbe = {
      url,
      viewports: []
    };

    for (const viewport of viewports) {
      let raw: ResponsiveProbeEval | null = null;
      try {
        raw = await provider.analyze<ResponsiveProbeEval>(
          url,
          PUBLISHED_RESPONSIVE_PROBE_SCRIPT,
          {
            timeout,
            waitForNavigation: false,
            viewport: {
              width: viewport.width,
              height: viewport.height
            }
          } satisfies AnalyzeOptions
        );
      } catch {
        raw = null;
      }

      pageProbe.viewports.push({
        label: viewport.label,
        width: viewport.width,
        height: viewport.height,
        horizontalOverflow: Boolean(raw?.horizontalOverflow),
        overflowElements: typeof raw?.overflowElements === 'number' ? raw.overflowElements : 0,
        clippedTextElements: typeof raw?.clippedTextElements === 'number' ? raw.clippedTextElements : 0,
        tinyTapTargets: typeof raw?.tinyTapTargets === 'number' ? raw.tinyTapTargets : 0,
        sampleOverflowSelectors: Array.isArray(raw?.sampleOverflowSelectors)
          ? raw.sampleOverflowSelectors.map((value) => String(value)).filter(Boolean)
          : [],
        sampleClippedText: Array.isArray(raw?.sampleClippedText)
          ? raw.sampleClippedText.map((value) => String(value)).filter(Boolean)
          : [],
        sampleTinyTapSelectors: Array.isArray(raw?.sampleTinyTapSelectors)
          ? raw.sampleTinyTapSelectors.map((value) => String(value)).filter(Boolean)
          : []
      });
    }

    pages.push(pageProbe);
  }

  return {
    pagesSampled: pages.length,
    totalViewportChecks: pages.reduce((sum, page) => sum + page.viewports.length, 0),
    pages
  };
}
