import React, { useEffect, useMemo, useState } from 'react';
import { TemplateSearchBox } from './TemplateSearchBox';
import { TemplateSearchResults } from './TemplateSearchResults';
import { TemplateSearchSidebar } from './TemplateSearchSidebar';

type TemplateSort = 'popular' | 'newest' | 'price_asc' | 'price_desc';
type TemplateScope = 'all' | 'featured' | 'free' | 'landing_pages';

interface SearchFilters {
  q: string;
  categoryGroupSlug: string | null;
  childCategorySlug: string | null;
  styles: string[];
  tags: string[];
  types: string[];
  freeOnly: boolean;
  sort: TemplateSort;
}

interface QuickSearch {
  label: string;
  query: string;
}

export interface TemplateSearchPageProps {
  /** Base URL for the template search API, no trailing slash. */
  apiBase?: string;
  /** Eyebrow label above the page title. */
  eyebrow?: string;
  /** Page title. */
  title?: string;
  /** Body copy below the title. */
  description?: string;
  /** Search input placeholder. */
  searchPlaceholder?: string;
  /** JSON array of strings or {label, query} objects rendered as quick searches. */
  quickSearches?: string;
  /** Show quick-search chips below the search form. */
  showQuickSearches?: boolean;
  /** Designer preview scope. Production can still infer scope from the URL. */
  scopeOverride?: TemplateScope;
  /** Designer preview category slug. */
  categorySlug?: string;
  /** Designer preview style slug. */
  styleSlug?: string;
  /** Designer preview tag slug. */
  tagSlug?: string;
  /** Default sort for filters and grid. */
  defaultSort?: TemplateSort;
  /** Items per grid page. */
  pageSize?: number;
  /** Show recommended templates when the current search returns no results. */
  showEmptyRecommendations?: boolean;
  /** Heading for the no-results recommendation grid. */
  emptyRecommendationsTitle?: string;
  /** Add a noindex,follow robots meta tag while the standalone page is an experiment. */
  noindex?: boolean;
  /** Dispatch DOM/wf_analytics search experience events. */
  enableAnalytics?: boolean;
  /** Show category/subcategory metadata below card creator names. */
  showCategoryMeta?: boolean;
  /** Show template type alongside category metadata. */
  showTemplateType?: boolean;
  /** Show preview links on cards when available. */
  showPreviewLink?: boolean;
  /** Show Featured badges on API-featured templates. */
  showFeaturedBadge?: boolean;
  /** Show compact social-proof signals from the search API on result cards. */
  showMarketplaceSignals?: boolean;
}

const DEFAULT_QUICK_SEARCHES = JSON.stringify([
  'Business',
  'Portfolio',
  'SaaS',
  'Ecommerce',
  'Landing page',
  'Blog',
]);

const SEARCH_PAGE_STYLES = `
.tmsearch-page,
.tmsearch-page * {
  box-sizing: border-box;
}

.tmsearch-page {
  width: 100%;
  color: #080808;
  font-family: "WF Visual Sans Variable", "WF Visual Sans", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.tmsearch-header {
  max-width: 920px;
  margin: 0 auto 44px;
  text-align: center;
}

.tmsearch-eyebrow {
  margin: 0 0 12px;
  color: #146ef5;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.2;
}

.tmsearch-title {
  max-width: 780px;
  margin: 0 auto;
  color: #080808;
  font-size: 52px;
  font-weight: 650;
  letter-spacing: 0;
  line-height: 1.04;
}

.tmsearch-description {
  max-width: 720px;
  margin: 18px auto 0;
  color: #4a4a4a;
  font-size: 17px;
  line-height: 1.5;
}

.tmsearch-form {
  max-width: 760px;
  margin: 28px auto 0;
}

.tmsearch-input-wrap {
  display: flex;
  align-items: stretch;
  width: 100%;
  min-height: 56px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

.tmsearch-input {
  appearance: none;
  min-width: 0;
  flex: 1 1 auto;
  border: 0;
  background: transparent;
  color: #080808;
  font: inherit;
  font-size: 16px;
  padding: 0 18px;
  outline: none;
}

.tmsearch-input::placeholder {
  color: #757575;
}

.tmsearch-submit {
  appearance: none;
  flex: 0 0 auto;
  border: 0;
  border-left: 1px solid #d9d9d9;
  background: #080808;
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 15px;
  font-weight: 650;
  padding: 0 24px;
}

.tmsearch-submit:hover {
  background: #2b2b2b;
}

.tmsearch-quick {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 18px auto 0;
  padding: 0;
  list-style: none;
}

.tmsearch-quick-button,
.tmsearch-chip,
.tmsearch-clear,
.tmsearch-mobile-filter,
.tmsearch-drawer-close {
  appearance: none;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  color: #080808;
  cursor: pointer;
  font: inherit;
  letter-spacing: 0;
}

.tmsearch-quick-button {
  min-height: 34px;
  padding: 7px 11px;
  font-size: 13px;
  font-weight: 600;
}

.tmsearch-quick-button:hover,
.tmsearch-chip:hover,
.tmsearch-clear:hover,
.tmsearch-mobile-filter:hover,
.tmsearch-drawer-close:hover {
  border-color: #146ef5;
}

.tmsearch-body {
  display: grid;
  grid-template-columns: minmax(220px, 292px) minmax(0, 1fr);
  align-items: start;
  gap: 32px;
  width: 100%;
}

.tmsearch-sidebar {
  position: sticky;
  top: 24px;
  z-index: 15;
  min-width: 0;
}

.tmsearch-sidebar-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.tmsearch-sidebar-title {
  margin: 0;
  color: #080808;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.2;
}

.tmsearch-results {
  min-width: 0;
}

.tmsearch-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.tmsearch-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.tmsearch-chip {
  min-height: 32px;
  padding: 6px 10px;
  font-size: 13px;
  line-height: 1.2;
}

.tmsearch-clear {
  min-height: 32px;
  padding: 6px 10px;
  color: #4a4a4a;
  font-size: 13px;
}

.tmsearch-mobile-filter {
  display: none;
  min-height: 36px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 650;
}

.tmsearch-drawer-close {
  display: none;
  width: 32px;
  height: 32px;
  padding: 0;
  font-size: 18px;
  line-height: 1;
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
}

.tmsearch-overlay {
  display: none;
}

@media (max-width: 991px) {
  .tmsearch-title {
    font-size: 42px;
  }

  .tmsearch-body {
    grid-template-columns: 1fr;
  }

  .tmsearch-mobile-filter {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .tmsearch-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 10001;
    width: min(88vw, 360px);
    max-width: 360px;
    overflow: auto;
    border-radius: 0;
    transform: translateX(100%);
    transition: transform 180ms ease;
    box-shadow: -20px 0 48px rgba(0, 0, 0, 0.18);
  }

  .tmsearch-page[data-drawer-open="true"] .tmsearch-sidebar {
    transform: translateX(0);
  }

  .tmsearch-sidebar .tmsidebar {
    min-height: 100%;
    border: 0;
    border-radius: 0;
    padding-top: 58px;
  }

  .tmsearch-drawer-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .tmsearch-overlay {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: rgba(0, 0, 0, 0.28);
    opacity: 0;
    pointer-events: none;
    transition: opacity 180ms ease;
  }

  .tmsearch-page[data-drawer-open="true"] .tmsearch-overlay {
    opacity: 1;
    pointer-events: auto;
  }
}

@media (max-width: 767px) {
  .tmsearch-header {
    margin-bottom: 30px;
    text-align: left;
  }

  .tmsearch-title {
    font-size: 34px;
  }

  .tmsearch-description {
    font-size: 15px;
  }

  .tmsearch-input-wrap {
    min-height: 50px;
  }

  .tmsearch-submit {
    padding: 0 16px;
  }

  .tmsearch-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 479px) {
  .tmsearch-input-wrap {
    flex-direction: column;
  }

  .tmsearch-input {
    min-height: 50px;
  }

  .tmsearch-submit {
    min-height: 46px;
    border-left: 0;
    border-top: 1px solid #d9d9d9;
  }
}
`;

const SORT_LABELS: Record<TemplateSort, string> = {
  popular: 'Popular',
  newest: 'Newest',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
};

function normalizeSort(value: string | null | undefined, fallback: TemplateSort = 'popular'): TemplateSort {
  switch ((value ?? '').trim()) {
    case 'newest':
    case 'approval-date':
    case 'approval-date-desc':
      return 'newest';
    case 'price_asc':
    case 'price-asc':
      return 'price_asc';
    case 'price_desc':
    case 'price-desc':
      return 'price_desc';
    case 'popular':
    case 'popularity-score':
    case 'popularity-score-desc':
      return 'popular';
    default:
      return fallback;
  }
}

function toFilterSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function displaySlug(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseList(params: URLSearchParams, key: string): string[] {
  return params.getAll(key).flatMap((value) => value.split(',')).map(toFilterSlug).filter(Boolean);
}

function defaultFilters(defaultSort: TemplateSort): SearchFilters {
  return {
    q: '',
    categoryGroupSlug: null,
    childCategorySlug: null,
    styles: [],
    tags: [],
    types: [],
    freeOnly: false,
    sort: defaultSort,
  };
}

function readFilters(defaultSort: TemplateSort): SearchFilters {
  if (typeof window === 'undefined') {
    return defaultFilters(defaultSort);
  }
  const params = new URL(window.location.href).searchParams;
  return {
    q: (params.get('q') ?? params.get('query') ?? params.get('search') ?? '').trim(),
    categoryGroupSlug: params.get('category') || params.get('category_group_slug'),
    childCategorySlug: params.get('subcategory') || params.get('child_category_slug'),
    styles: parseList(params, 'styles'),
    tags: parseList(params, 'tags'),
    types: params.getAll('types').flatMap((value) => value.split(',')).filter(Boolean),
    freeOnly: ['1', 'true', 'yes', 'on'].includes((params.get('free_only') ?? '').toLowerCase()),
    sort: normalizeSort(params.get('sort'), defaultSort),
  };
}

function writeFilters(filters: SearchFilters, defaultSort: TemplateSort): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  ['q', 'query', 'search', 'category', 'category_group_slug', 'subcategory', 'child_category_slug', 'styles', 'tags', 'types', 'free_only', 'sort', 'page'].forEach((key) => {
    url.searchParams.delete(key);
  });
  if (filters.q) url.searchParams.set('q', filters.q);
  if (filters.categoryGroupSlug) url.searchParams.set('category', filters.categoryGroupSlug);
  if (filters.childCategorySlug) url.searchParams.set('subcategory', filters.childCategorySlug);
  if (filters.sort !== defaultSort) url.searchParams.set('sort', filters.sort);
  if (filters.freeOnly) url.searchParams.set('free_only', 'true');
  filters.styles.forEach((style) => url.searchParams.append('styles', style));
  filters.tags.forEach((tag) => url.searchParams.append('tags', tag));
  filters.types.forEach((type) => url.searchParams.append('types', type));
  window.history.replaceState({}, '', url.toString());
  return url.toString();
}

function parseQuickSearches(raw?: string): QuickSearch[] {
  try {
    const parsed = JSON.parse(raw || DEFAULT_QUICK_SEARCHES) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): QuickSearch | null => {
        if (typeof item === 'string') {
          const query = item.trim();
          return query ? { label: query, query } : null;
        }
        if (!item || typeof item !== 'object') return null;
        const candidate = item as Partial<QuickSearch>;
        const query = typeof candidate.query === 'string' ? candidate.query.trim() : '';
        const label = typeof candidate.label === 'string' ? candidate.label.trim() : query;
        return query ? { label: label || query, query } : null;
      })
      .filter((item): item is QuickSearch => Boolean(item))
      .slice(0, 10);
  } catch {
    return [];
  }
}

function trackSearchEvent(name: string, detail: Record<string, unknown>, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return;
  const payload = {
    component: 'TemplateSearchPage',
    ...detail,
    path: window.location.pathname,
    href: window.location.href,
  };
  const analytics = (window as unknown as { wf_analytics?: { track?: (event: string, data: Record<string, unknown>) => void } }).wf_analytics;
  if (typeof analytics?.track === 'function') {
    analytics.track(name, payload);
  }
  window.dispatchEvent(new CustomEvent('templateSearchExperienceAnalytics', { detail: { event: name, ...payload } }));
}

function notifyFiltersChanged(filters: SearchFilters, source: string): void {
  if (typeof window === 'undefined') return;
  const detail = {
    ...filters,
    categoryGroupSlug: filters.categoryGroupSlug,
    childCategorySlug: filters.childCategorySlug,
    styles: [...filters.styles],
    tags: [...filters.tags],
    types: [...filters.types],
    href: window.location.href,
    source,
    updatedAt: Date.now(),
  };
  (window as unknown as Record<string, unknown>).__templateMarketplaceFilters = detail;
  window.dispatchEvent(new CustomEvent('templateFiltersChanged', { detail }));
  document.dispatchEvent(new CustomEvent('templateFiltersChanged', { detail }));
}

function useExperimentNoindex(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return undefined;
    const selector = 'meta[name="robots"][data-template-search-page="true"]';
    let meta = document.querySelector<HTMLMetaElement>(selector);
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      meta.setAttribute('data-template-search-page', 'true');
      document.head.appendChild(meta);
    }
    meta.content = 'noindex, follow';
    return () => {
      if (created) meta?.remove();
    };
  }, [enabled]);
}

export const TemplateSearchPage: React.FC<TemplateSearchPageProps> = ({
  apiBase = '',
  eyebrow = 'Template marketplace search',
  title = 'Find the right Webflow template faster',
  description = 'Search the template catalog, refine by style, type, and price, then keep browsing without leaving the marketplace experience.',
  searchPlaceholder = 'Search templates, categories, styles, or use cases',
  quickSearches = DEFAULT_QUICK_SEARCHES,
  showQuickSearches = true,
  scopeOverride = 'all',
  categorySlug = '',
  styleSlug = '',
  tagSlug = '',
  defaultSort = 'popular',
  pageSize = 24,
  showEmptyRecommendations = true,
  emptyRecommendationsTitle = 'Recently featured templates',
  noindex = true,
  enableAnalytics = true,
  showCategoryMeta = false,
  showTemplateType = false,
  showPreviewLink = false,
  showFeaturedBadge = false,
  showMarketplaceSignals = false,
}) => {
  useExperimentNoindex(noindex);

  const [filters, setFilters] = useState<SearchFilters>(() => defaultFilters(defaultSort));
  const [searchInput, setSearchInput] = useState('');
  const [filterVersion, setFilterVersion] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const quickSearchItems = useMemo(() => parseQuickSearches(quickSearches), [quickSearches]);

  const syncFromUrl = (shouldRemountFilters: boolean) => {
    const next = readFilters(defaultSort);
    setFilters(next);
    setSearchInput(next.q);
    if (shouldRemountFilters) setFilterVersion((value) => value + 1);
  };

  useEffect(() => {
    syncFromUrl(true);

    const onPop = () => syncFromUrl(true);
    const onFiltersChanged = (event: Event) => {
      const source = (event as CustomEvent).detail?.source;
      syncFromUrl(source !== 'TemplateFilterBar');
      if (source === 'TemplateFilterBar') setDrawerOpen(false);
      trackSearchEvent('Template Search Page - Filters Changed', { source: source || 'unknown' }, enableAnalytics);
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('templateFiltersChanged', onFiltersChanged);
    document.addEventListener('templateFiltersChanged', onFiltersChanged);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('templateFiltersChanged', onFiltersChanged);
      document.removeEventListener('templateFiltersChanged', onFiltersChanged);
    };
  }, [defaultSort, enableAnalytics]);

  const commitFilters = (next: SearchFilters, analyticsEvent: string, analyticsDetail: Record<string, unknown> = {}) => {
    writeFilters(next, defaultSort);
    setFilters(next);
    setSearchInput(next.q);
    setFilterVersion((value) => value + 1);
    notifyFiltersChanged(next, 'TemplateSearchPage');
    trackSearchEvent(analyticsEvent, { filters: next, ...analyticsDetail }, enableAnalytics);
  };

  const submitSearch = (query: string) => {
    commitFilters({ ...filters, q: query }, 'Template Search Page - Search Submitted', { query });
  };

  const runQuickSearch = (quickSearch: QuickSearch) => {
    commitFilters(
      { ...filters, q: quickSearch.query },
      'Template Search Page - Quick Search Clicked',
      { query: quickSearch.query, label: quickSearch.label },
    );
  };

  const removeFilter = (kind: 'q' | 'category' | 'subcategory' | 'style' | 'type' | 'free' | 'sort', value?: string) => {
    const next: SearchFilters = {
      ...filters,
      q: kind === 'q' ? '' : filters.q,
      categoryGroupSlug: kind === 'category' ? null : filters.categoryGroupSlug,
      childCategorySlug: kind === 'category' || kind === 'subcategory' ? null : filters.childCategorySlug,
      styles: kind === 'style' && value ? filters.styles.filter((item) => item !== value) : filters.styles,
      types: kind === 'type' && value ? filters.types.filter((item) => item !== value) : filters.types,
      freeOnly: kind === 'free' ? false : filters.freeOnly,
      sort: kind === 'sort' ? defaultSort : filters.sort,
    };
    commitFilters(next, 'Template Search Page - Filter Removed', { kind, value });
  };

  const clearAll = () => {
    commitFilters(
      { q: '', categoryGroupSlug: null, childCategorySlug: null, styles: [], tags: [], types: [], freeOnly: false, sort: defaultSort },
      'Template Search Page - Filters Cleared',
    );
  };

  const activeChipCount =
    (filters.q ? 1 : 0) +
    (filters.categoryGroupSlug ? 1 : 0) +
    (filters.childCategorySlug ? 1 : 0) +
    filters.styles.length +
    filters.types.length +
    (filters.freeOnly ? 1 : 0) +
    (filters.sort !== defaultSort ? 1 : 0);

  return (
    <section className="tmsearch-page" data-drawer-open={drawerOpen ? 'true' : undefined}>
      <style dangerouslySetInnerHTML={{ __html: SEARCH_PAGE_STYLES }} />
      <div className="tmsearch-header">
        {eyebrow ? <p className="tmsearch-eyebrow">{eyebrow}</p> : null}
        <h1 className="tmsearch-title">{title}</h1>
        {description ? <p className="tmsearch-description">{description}</p> : null}
        <TemplateSearchBox
          mode="filter"
          variant="hero"
          value={searchInput}
          onValueChange={setSearchInput}
          onSearch={submitSearch}
          placeholder={searchPlaceholder}
          allowEmptySubmit
          enableAnalytics={false}
          source="TemplateSearchPage"
        />

        {showQuickSearches && quickSearchItems.length > 0 ? (
          <ul className="tmsearch-quick" aria-label="Popular template searches">
            {quickSearchItems.map((item) => (
              <li key={`${item.label}:${item.query}`}>
                <button className="tmsearch-quick-button" type="button" onClick={() => runQuickSearch(item)}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="tmsearch-body">
        <aside className="tmsearch-sidebar" aria-label="Template search filters">
          <button className="tmsearch-drawer-close" type="button" onClick={() => setDrawerOpen(false)} aria-label="Close filters">
            x
          </button>
          <TemplateSearchSidebar
            key={`template-search-filters-${filterVersion}`}
            apiBase={apiBase}
            title="Categories"
            scopeOverride={scopeOverride}
            categorySlug={categorySlug}
            styleSlug={styleSlug}
            tagSlug={tagSlug}
            interactionMode="navigate"
            countMode="contextual"
            showSearch={false}
            collapseOnMobile={false}
            enableAnalytics={enableAnalytics}
          />
        </aside>

        <div className="tmsearch-overlay" aria-hidden="true" onClick={() => setDrawerOpen(false)} />

        <main className="tmsearch-results">
          <div className="tmsearch-toolbar">
            <div className="tmsearch-chips" aria-label="Active filters">
              {filters.q ? (
                <button className="tmsearch-chip" type="button" onClick={() => removeFilter('q')}>
                  Search: {filters.q} x
                </button>
              ) : null}
              {filters.categoryGroupSlug ? (
                <button className="tmsearch-chip" type="button" onClick={() => removeFilter('category')}>
                  Category: {displaySlug(filters.categoryGroupSlug)} x
                </button>
              ) : null}
              {filters.childCategorySlug ? (
                <button className="tmsearch-chip" type="button" onClick={() => removeFilter('subcategory')}>
                  Subcategory: {displaySlug(filters.childCategorySlug)} x
                </button>
              ) : null}
              {filters.styles.map((style) => (
                <button className="tmsearch-chip" type="button" key={`style-${style}`} onClick={() => removeFilter('style', style)}>
                  Style: {displaySlug(style)} x
                </button>
              ))}
              {filters.types.map((type) => (
                <button className="tmsearch-chip" type="button" key={`type-${type}`} onClick={() => removeFilter('type', type)}>
                  Type: {type} x
                </button>
              ))}
              {filters.freeOnly ? (
                <button className="tmsearch-chip" type="button" onClick={() => removeFilter('free')}>
                  Free only x
                </button>
              ) : null}
              {filters.sort !== defaultSort ? (
                <button className="tmsearch-chip" type="button" onClick={() => removeFilter('sort')}>
                  Sort: {SORT_LABELS[filters.sort]} x
                </button>
              ) : null}
              {activeChipCount > 0 ? (
                <button className="tmsearch-clear" type="button" onClick={clearAll}>
                  Clear all
                </button>
              ) : null}
            </div>
            <button className="tmsearch-mobile-filter" type="button" onClick={() => setDrawerOpen(true)}>
              Filters
            </button>
          </div>

          <TemplateSearchResults
            apiBase={apiBase}
            scopeOverride={scopeOverride}
            categorySlug={categorySlug}
            styleSlug={styleSlug}
            tagSlug={tagSlug}
            defaultSort={defaultSort}
            pageSize={pageSize}
            emptyTitle="No matching templates"
            emptyDescription="Try a broader search, remove a filter, or start from a recent template below."
            emptyActionLabel="Clear filters"
            showEmptyRecommendations={showEmptyRecommendations}
            emptyRecommendationsTitle={emptyRecommendationsTitle}
            showCategoryMeta={showCategoryMeta}
            showTemplateType={showTemplateType}
            showPreviewLink={showPreviewLink}
            showFeaturedBadge={showFeaturedBadge}
            showMarketplaceSignals={showMarketplaceSignals}
            enableAnalytics={enableAnalytics}
          />
        </main>
      </div>
    </section>
  );
};

export { DEFAULT_QUICK_SEARCHES };
export default TemplateSearchPage;
