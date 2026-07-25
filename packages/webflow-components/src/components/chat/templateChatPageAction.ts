import { resolveTemplateCategoryRouteSlug } from '../marketplace/templateRoute';
import {
  discoverOpenRoots,
  prefersReducedMotion,
  queryDiscoveredRoots,
  type HighlightMissState,
} from './templateChatRuntime';
import type { PageActionPayload } from './templateChatProtocol';

export function normalizePageActionPayload(payload: PageActionPayload): PageActionPayload {
  const normalized = { ...payload };
  const category = normalized.category_group_slug;
  if (typeof category === 'string' && category.trim()) {
    const resolved = resolveTemplateCategoryRouteSlug(category);
    if (resolved) normalized.category_group_slug = resolved;
    else delete normalized.category_group_slug;
  }
  return normalized;
}

// ── Page control (agent drives the host page grid/filters) ───────────────────
// Webflow mounts each code component in an isolated (open) shadow root. Build
// one bounded root inventory, then reuse it for every selector in the action.

const GRID_MARKER_SELECTOR = '[data-template-slug], .tmgrid-grid, .tmgrid-item, .tmsearch-page';

export function pageHasTemplateGrid(): boolean {
  if (typeof document === 'undefined') return false;
  const roots = discoverOpenRoots(document);
  return queryDiscoveredRoots(roots, GRID_MARKER_SELECTOR).length > 0;
}

export type PageActionTimers = Map<number, (() => void) | undefined>;

export function schedulePageAction(
  timers: PageActionTimers,
  callback: () => void,
  delay: number,
  onCancel?: () => void,
): void {
  const timer = window.setTimeout(() => {
    timers.delete(timer);
    callback();
  }, delay);
  timers.set(timer, onCancel);
}

export function clearPageActionTimers(timers: PageActionTimers): void {
  for (const [timer, onCancel] of timers) {
    window.clearTimeout(timer);
    onCancel?.();
  }
  timers.clear();
}

// Apply an agent page action through the marketplace components' shared
// contract: write URL params, then dispatch templateFiltersChanged so
// TemplateGrid / sidebar / heading re-read and re-fetch.
export function applyPageAction(
  payload: PageActionPayload,
  highlightMisses: HighlightMissState,
  timers: PageActionTimers,
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const roots = discoverOpenRoots(document);
  const hasFilterChange =
    Boolean(payload.clear_filters) ||
    payload.q != null ||
    payload.category_group_slug != null ||
    payload.styles != null ||
    payload.types != null ||
    payload.free_only != null ||
    payload.sort != null;

  if (hasFilterChange) {
    const url = new URL(window.location.href);
    if (payload.clear_filters) {
      for (const key of ['q', 'query', 'search', 'category', 'category_group_slug', 'subcategory', 'child_category_slug', 'styles', 'tags', 'types', 'free_only', 'sort', 'page']) {
        url.searchParams.delete(key);
      }
    }
    if (payload.q != null) {
      url.searchParams.delete('query');
      url.searchParams.delete('search');
      if (payload.q) url.searchParams.set('q', payload.q);
      else url.searchParams.delete('q');
    }
    if (payload.category_group_slug != null) {
      url.searchParams.delete('subcategory');
      url.searchParams.delete('child_category_slug');
      url.searchParams.delete('category_group_slug');
      if (payload.category_group_slug) url.searchParams.set('category', payload.category_group_slug);
      else url.searchParams.delete('category');
    }
    if (payload.styles != null) {
      url.searchParams.delete('styles');
      for (const style of payload.styles) url.searchParams.append('styles', style);
    }
    if (payload.types != null) {
      url.searchParams.delete('types');
      for (const type of payload.types) url.searchParams.append('types', type);
    }
    if (payload.free_only != null) {
      if (payload.free_only) url.searchParams.set('free_only', 'true');
      else url.searchParams.delete('free_only');
    }
    if (payload.sort) url.searchParams.set('sort', payload.sort);
    url.searchParams.delete('page');
    window.history.replaceState({}, '', url.toString());

    const params = url.searchParams;
    const splitList = (key: string) =>
      params.getAll(key).flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean);
    const detail = {
      q: (params.get('q') ?? '').trim(),
      categoryGroupSlug: params.get('category'),
      childCategorySlug: params.get('subcategory'),
      styles: splitList('styles'),
      tags: splitList('tags'),
      types: splitList('types'),
      freeOnly: (params.get('free_only') ?? '').toLowerCase() === 'true',
      sort: params.get('sort') ?? 'popular',
      href: url.toString(),
      source: 'TemplateChat',
      updatedAt: Date.now(),
    };
    (window as unknown as Record<string, unknown>).__templateMarketplaceFilters = detail;
    window.dispatchEvent(new CustomEvent('templateFiltersChanged', { detail }));
    document.dispatchEvent(new CustomEvent('templateFiltersChanged', { detail }));

    // Show the user which controls the agent just changed. Slight delay so
    // the filter bar has re-rendered its state before we point at it.
    schedulePageAction(timers, () => pulsePageControls(payload, roots, timers), 250);
  }

  if (payload.highlight_slugs?.length) {
    // The grid re-fetches after a filter change; retry until the cards exist.
    highlightPageTemplates(payload.highlight_slugs, 0, roots, highlightMisses, timers);
  }
}

export function highlightPageTemplates(
  slugs: string[],
  attempt: number,
  roots: readonly ParentNode[],
  highlightMisses: HighlightMissState,
  timers: PageActionTimers,
): void {
  if (typeof document === 'undefined' || slugs.length === 0) return;
  // Query the already-discovered roots; do not re-walk the whole host tree on
  // every retry while the grid re-renders.
  const bySlug = new Map<string, HTMLElement>();
  for (const el of queryDiscoveredRoots(roots, '[data-template-slug]')) {
    const slug = el.getAttribute('data-template-slug');
    if (slug && el instanceof HTMLElement && !bySlug.has(slug)) bySlug.set(slug, el);
  }
  const found = slugs
    .map((slug) => bySlug.get(slug))
    .filter((el): el is HTMLElement => Boolean(el));

  if (found.length === 0) {
    if (attempt < 7) {
      schedulePageAction(
        timers,
        () => highlightPageTemplates(slugs, attempt + 1, roots, highlightMisses, timers),
        500,
      );
    } else highlightMisses.add(slugs);
    return;
  }
  const foundSlugs = new Set(found.map((el) => el.getAttribute('data-template-slug')));
  highlightMisses.add(slugs.filter((slug) => !foundSlugs.has(slug)));

  const reduced = prefersReducedMotion();
  for (const el of found) {
    // Inline styles + WAAPI: chat styles can't reach the grid's isolated root.
    const previousOutline = el.style.outline;
    const previousOffset = el.style.outlineOffset;
    el.style.outline = '3px solid #146ef5';
    el.style.outlineOffset = '4px';
    const restore = () => {
      el.style.outline = previousOutline;
      el.style.outlineOffset = previousOffset;
    };
    schedulePageAction(timers, restore, 5200, restore);
    if (!reduced && typeof el.animate === 'function') {
      el.animate(
        [
          { boxShadow: '0 0 0 3px rgba(20,110,245,0.35), 0 0 0 6px rgba(20,110,245,0.18)' },
          { boxShadow: '0 0 0 3px rgba(20,110,245,0.35), 0 0 0 16px rgba(20,110,245,0)' },
        ],
        { duration: 1300, iterations: 4, easing: 'ease-out' },
      );
    }
  }
  found[0]?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
}

// ── Agent-action transparency ────────────────────────────────────────────────
// When the agent drives the page's filters/sort, pulse the controls it
// "touched" so the change is visible and attributable — the same trust
// language as the template-card highlight. Inline styles + WAAPI because the
// controls live in other components' isolated shadow roots.
const CONTROL_SELECTORS: Array<{ keys: Array<keyof PageActionPayload>; selector: string }> = [
  { keys: ['sort'], selector: '.tmfilter-sort-toggle, [data-template-search-sort], select[name="sort"]' },
  { keys: ['styles'], selector: '[data-template-search-style], select[name="styles"]' },
  { keys: ['types'], selector: '[data-template-search-type], select[name="types"]' },
  { keys: ['free_only'], selector: '[data-template-search-free], input[name="free_only"]' },
  { keys: ['q'], selector: '.tmfilter-search-wrap, [data-template-search-input], input[type="search"]' },
  // Fields without a precise control (category, clear) light up the bar shell.
  { keys: ['category_group_slug', 'clear_filters'], selector: '.tmfilter-shell' },
];

function pulseElements(elements: HTMLElement[], timers: PageActionTimers): void {
  const reduced = prefersReducedMotion();
  for (const el of elements) {
    const previousOutline = el.style.outline;
    const previousOffset = el.style.outlineOffset;
    const previousRadius = el.style.borderRadius;
    el.style.outline = '2px solid #146ef5';
    el.style.outlineOffset = '3px';
    if (!previousRadius) el.style.borderRadius = '8px';
    const restore = () => {
      el.style.outline = previousOutline;
      el.style.outlineOffset = previousOffset;
      el.style.borderRadius = previousRadius;
    };
    schedulePageAction(timers, restore, 2600, restore);
    if (!reduced && typeof el.animate === 'function') {
      el.animate(
        [
          { boxShadow: '0 0 0 2px rgba(20,110,245,0.3), 0 0 0 5px rgba(20,110,245,0.16)' },
          { boxShadow: '0 0 0 2px rgba(20,110,245,0.3), 0 0 0 12px rgba(20,110,245,0)' },
        ],
        { duration: 1200, iterations: 2, easing: 'ease-out' },
      );
    }
  }
}

function pulsePageControls(
  payload: PageActionPayload,
  roots: readonly ParentNode[],
  timers: PageActionTimers,
): void {
  if (typeof document === 'undefined') return;
  const targets = new Set<HTMLElement>();
  let matchedSpecific = false;
  for (const entry of CONTROL_SELECTORS) {
    if (!entry.keys.some((key) => payload[key] != null)) continue;
    const found = queryDiscoveredRoots(roots, entry.selector).filter(
      (el): el is HTMLElement => el instanceof HTMLElement,
    );
    if (found.length > 0 && entry.selector !== '.tmfilter-shell') matchedSpecific = true;
    for (const el of found.slice(0, 3)) targets.add(el);
  }
  // Nothing specific found (e.g. older filter bar markup): fall back to the bar.
  if (!matchedSpecific && targets.size === 0) {
    for (const el of queryDiscoveredRoots(roots, '.tmfilter-shell').slice(0, 1)) {
      if (el instanceof HTMLElement) targets.add(el);
    }
  }
  pulseElements(Array.from(targets), timers);
}
