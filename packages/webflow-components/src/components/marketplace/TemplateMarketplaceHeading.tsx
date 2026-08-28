import React, { useEffect, useMemo, useRef, useState } from 'react';
import { parseTemplateRoute, TemplatePathKind, TemplateScope } from './templateRoute';
import { TEMPLATE_MARKETPLACE_COMPONENT_VERSION } from './templateTelemetry';

type HeadingPageKind = TemplatePathKind;
type DescriptionMode = 'preserve_static' | 'dynamic';

export interface TemplateMarketplaceHeadingProps {
  /**
   * Base URL for taxonomy metadata fallback, no trailing slash.
   * Leave blank to use the production Cloud App proxy.
   */
  apiBase?: string;
  /** Page context used when the URL does not provide a more specific state. */
  pageKind?: HeadingPageKind;
  /** Designer preview category slug, e.g. "architecture-and-design-websites". */
  categorySlug?: string;
  /** Designer preview subcategory slug. */
  subcategorySlug?: string;
  /** Search query param key. Search V2 uses "q"; native search uses "query". */
  queryParam?: string;
  /**
   * Static route path used for server-rendered/no-JS fallback markup.
   * Example: /templates/category/technology-websites
   */
  staticRoutePath?: string;
  /** Static title used when no route/filter state is available. */
  fallbackTitle?: string;
  /** Static description used before the user applies a filter. */
  fallbackDescription?: string;
  /** Preserve live Webflow/Airtable SEO copy on route-owned category/subcategory pages. */
  descriptionMode?: DescriptionMode;
  /** Show visible breadcrumb links above the headline. */
  showBreadcrumbs?: boolean;
  /** Show visible supporting description below the headline. */
  showDescription?: boolean;
  /** First breadcrumb label. */
  templatesLabel?: string;
  /** First breadcrumb URL. */
  templatesUrl?: string;
  /** Update document.title after client-side filter changes. Keep off for SEO pages. */
  updateDocumentTitle?: boolean;
}

interface HeadingState {
  q: string;
  scope: TemplateScope;
  categorySlug: string | null;
  subcategorySlug: string | null;
  categoryIsRoute: boolean;
  subcategoryIsRoute: boolean;
  styles: string[];
  types: string[];
  freeOnly: boolean;
  pathKind: HeadingPageKind;
}

interface HeadingContent {
  title: string;
  description: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
  hasDynamicFilter: boolean;
}

interface TaxonomyMetadataPayload {
  title: string | null;
  description: string;
  category_group?: {
    name: string;
  } | null;
  child_category?: {
    name: string;
  } | null;
}

interface TaxonomyDescriptionState {
  key: string;
  title: string;
  description: string;
  categoryLabel: string;
  childCategoryLabel: string;
}

const HEADING_STYLES = `
.tmheading,
.tmheading * {
  box-sizing: border-box;
}

.tmheading {
  width: 100%;
  min-width: 0;
  color: #080808;
  font-family: "WF Visual Sans Variable", "WF Visual Sans", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tmheading-breadcrumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  color: #757575;
  font-variation-settings: "wght" 470, "opsz" 14;
  font-size: 14px;
  line-height: 22.4px;
}

.tmheading-breadcrumb-link {
  color: #146ef5;
  text-decoration: none;
}

.tmheading-breadcrumb-link:hover {
  text-decoration: underline;
}

.tmheading-breadcrumb-separator {
  color: #b3b3b3;
}

.tmheading-title {
  font-variation-settings: "wght" 600, "opsz" 48;
  margin: 0;
  color: #080808;
  font-size: 2rem;
  font-weight: 600;
  line-height: 1.04;
  letter-spacing: 0;
}

.tmheading-description {
  max-width: 920px;
  margin: 0;
  color: #5a5a5a;
  font-size: 14px;
  line-height: 20px;
  letter-spacing: 0;
}

@media (max-width: 767px) {
  .tmheading-breadcrumbs {
    font-size: 13px;
    line-height: 18px;
  }

  .tmheading-title {
    font-size: 1.625rem;
    line-height: 1.04;
  }

  .tmheading-description {
    font-size: 15px;
    line-height: 1.5;
  }
}

@media (max-width: 479px) {
  .tmheading-title {
    font-size: 1.4rem;
  }
}
`;

const SCOPE_LABELS: Record<TemplateScope, string> = {
  all: 'All Website Templates',
  featured: 'Featured Website Templates',
  free: 'Free Website Templates',
  landing_pages: 'Landing Page Website Templates',
};

const BREADCRUMB_LABELS: Record<TemplateScope, string> = {
  all: 'All',
  featured: 'Featured',
  free: 'Free',
  landing_pages: 'Landing Pages',
};

const GENERIC_FALLBACK_DESCRIPTION = 'Explore Webflow templates by category, style, type, price, and popularity.';
const DEFAULT_API_BASE = 'https://templates.webflow.com/templates-api';
const WORKER_ORIGIN = 'https://webflow-template-search.webflow-inc.workers.dev';
const CLOUD_APP_PREVIEW_ORIGIN = 'https://webflow-template-marketplace.webflow.io';

function titleCase(value: string): string {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === 'and') return '&';
      if (lower === 'ui') return 'UI';
      if (lower === 'hr') return 'HR';
      if (lower === 'it') return 'IT';
      if (lower === 'ai') return 'AI';
      if (lower === 'nft') return 'NFT';
      if (lower === 'nfts') return 'NFTs';
      if (lower === 'saas') return 'SaaS';
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ')
    .replace(/\s+&\s+/g, ' & ');
}

function humanizeSlug(slug: string): string {
  return titleCase(
    slug
      .replace(/-websites?$/i, '')
      .replace(/-templates?$/i, '')
      .replace(/-/g, ' '),
  );
}

function normalizeStaticRoutePath(path: string): string | undefined {
  const trimmed = path.trim();
  if (!trimmed) return undefined;

  try {
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `https://webflow.com${normalizedPath}`;
  } catch {
    return undefined;
  }
}

function readHeadingState(
  pageKind: HeadingPageKind,
  queryParam: string,
  categorySlugOverride?: string,
  subcategorySlugOverride?: string,
  staticRoutePath?: string,
  useWindow = true,
): HeadingState {
  const staticHref = useWindow ? undefined : normalizeStaticRoutePath(staticRoutePath ?? '');
  const route = parseTemplateRoute({
    href: staticHref,
    useWindow,
    pageKind,
    queryParam,
    categorySlugOverride,
    childCategorySlugOverride: subcategorySlugOverride,
  });
  return {
    q: route.q,
    scope: route.scope,
    categorySlug: route.categoryGroupSlug,
    subcategorySlug: route.childCategorySlug,
    categoryIsRoute: route.categoryIsRoute,
    subcategoryIsRoute: route.childCategoryIsRoute,
    styles: route.styles,
    types: route.types,
    freeOnly: route.freeOnly,
    pathKind: route.pathKind as HeadingPageKind,
  };
}

function buildBaseTitle(state: HeadingState, fallbackTitle: string, activeTaxonomyTitle: string): string {
  const trimmedFallbackTitle = fallbackTitle.trim();
  const trimmedTaxonomyTitle = activeTaxonomyTitle.trim();
  if (state.pathKind === 'auto' && trimmedFallbackTitle) return trimmedFallbackTitle;

  const categoryLabel = state.subcategorySlug || state.categorySlug;
  const resolvedCategoryLabel = trimmedTaxonomyTitle || (categoryLabel ? humanizeSlug(categoryLabel) : '');
  if (categoryLabel && state.scope !== 'all') return `${resolvedCategoryLabel} ${SCOPE_LABELS[state.scope]}`;
  if (categoryLabel) return `${resolvedCategoryLabel} Website Templates`;
  if (state.pathKind === 'style' && state.styles[0]) return `${humanizeSlug(state.styles[0])} Website Templates`;
  if (state.scope !== 'all') return SCOPE_LABELS[state.scope];
  if (state.pathKind === 'search') return fallbackTitle || 'Search Webflow templates';
  if (state.pathKind === 'all') return SCOPE_LABELS.all;
  return fallbackTitle || SCOPE_LABELS.all;
}

function buildDescriptorPrefix(state: HeadingState): string {
  const descriptors: string[] = [];
  if (state.freeOnly && state.scope !== 'free') descriptors.push('Free');
  if (state.styles[0]) descriptors.push(humanizeSlug(state.styles[0]));
  if (state.types[0]) descriptors.push(humanizeSlug(state.types[0]));
  return Array.from(new Set(descriptors)).join(' ');
}

function isGenericDescription(description: string): boolean {
  return description.trim().toLowerCase() === GENERIC_FALLBACK_DESCRIPTION.toLowerCase();
}

function hasRouteOwnedDescription(state: HeadingState): boolean {
  return Boolean(
    state.categoryIsRoute ||
      state.subcategoryIsRoute ||
      state.pathKind === 'all' ||
      state.pathKind === 'featured' ||
      state.pathKind === 'free' ||
      state.pathKind === 'landing_pages' ||
      state.pathKind === 'style' ||
      state.pathKind === 'tag',
  );
}

function resolveApiBase(apiBase?: string): string {
  const rawBase = apiBase || DEFAULT_API_BASE;
  return rawBase.startsWith(WORKER_ORIGIN) || rawBase.startsWith(CLOUD_APP_PREVIEW_ORIGIN)
    ? DEFAULT_API_BASE
    : rawBase.replace(/\/+$/, '');
}

function shouldUseTaxonomyApi(apiBaseProp: string): boolean {
  return Boolean(apiBaseProp.trim());
}

function taxonomyDescriptionKey(state: HeadingState): string {
  return `${state.categorySlug ?? ''}:${state.subcategorySlug ?? ''}`;
}

function shouldFetchTaxonomyDescription(
  state: HeadingState,
  fallbackDescription: string,
  descriptionMode: DescriptionMode,
): boolean {
  if (descriptionMode !== 'preserve_static') return false;
  if (!hasRouteOwnedDescription(state)) return false;
  if (fallbackDescription.trim() && !isGenericDescription(fallbackDescription)) return false;
  return Boolean(state.categorySlug || state.subcategorySlug);
}

function buildTaxonomyApiUrl(apiBase: string, state: HeadingState): string {
  const absolute = apiBase.startsWith('/') && typeof window !== 'undefined'
    ? `${window.location.origin}${apiBase}`
    : apiBase;
  const url = new URL(`${absolute.replace(/\/+$/, '')}/api/templates/taxonomy`);
  if (state.categorySlug) url.searchParams.set('category_group_slug', state.categorySlug);
  if (state.subcategorySlug) url.searchParams.set('child_category_slug', state.subcategorySlug);
  return url.toString();
}

function buildDescription(
  title: string,
  state: HeadingState,
  fallbackDescription: string,
  hasDynamicFilter: boolean,
  descriptionMode: DescriptionMode,
  taxonomyDescription: string,
): string {
  const staticDescription = fallbackDescription.trim();
  const syncedTaxonomyDescription = taxonomyDescription.trim();

  if (descriptionMode === 'preserve_static' && hasRouteOwnedDescription(state)) {
    if (staticDescription && !isGenericDescription(staticDescription)) return staticDescription;
    return syncedTaxonomyDescription;
  }

  if (!hasDynamicFilter && staticDescription) return staticDescription;
  if (state.q) {
    return `Browse Webflow templates matching "${state.q}" with filters for category, style, type, price, and popularity.`;
  }
  return `Browse ${title.toLowerCase()} and refine results by category, style, type, price, and popularity.`;
}

function buildContent(
  state: HeadingState,
  fallbackTitle: string,
  fallbackDescription: string,
  descriptionMode: DescriptionMode,
  templatesLabel: string,
  templatesUrl: string,
  taxonomyDescription: string,
  taxonomyTitle: string,
  categoryLabel: string,
  childCategoryLabel: string,
): HeadingContent {
  const baseTitle = buildBaseTitle(state, fallbackTitle, taxonomyTitle);
  const prefix = buildDescriptorPrefix(state);
  const hasFilterPrefix = Boolean(prefix);
  const hasDynamicFilter = Boolean(
    state.q ||
      (state.categorySlug && !state.categoryIsRoute) ||
      (state.subcategorySlug && !state.subcategoryIsRoute) ||
      state.styles.length ||
      state.types.length ||
      (state.freeOnly && state.scope !== 'free') ||
      state.scope !== (state.pathKind === 'landing_pages' ? 'landing_pages' : state.pathKind === 'free' ? 'free' : state.pathKind === 'featured' ? 'featured' : 'all'),
  );

  let title = baseTitle;
  if (state.q) {
    const isGenericSearchBase =
      state.pathKind === 'search' ||
      baseTitle === SCOPE_LABELS.all ||
      baseTitle === fallbackTitle ||
      /search webflow templates/i.test(baseTitle);
    title = isGenericSearchBase
      ? `Search results for "${state.q}"`
      : `Results for "${state.q}" in ${baseTitle}`;
  } else if (hasFilterPrefix && !baseTitle.toLowerCase().startsWith(prefix.toLowerCase())) {
    title = `${prefix} ${baseTitle}`;
  }

  const breadcrumbs: HeadingContent['breadcrumbs'] = [{ label: templatesLabel, href: templatesUrl }];
  if (state.pathKind === 'search') {
    if (state.categorySlug || state.subcategorySlug || state.scope !== 'all') {
      breadcrumbs.push({ label: 'Search', href: '/templates/search-v2' });
    } else {
      breadcrumbs.push({ label: 'Search' });
    }
    if (state.scope !== 'all') {
      breadcrumbs.push({ label: BREADCRUMB_LABELS[state.scope] });
    }
  } else if (state.categoryIsRoute || state.subcategoryIsRoute) {
    breadcrumbs.push({ label: 'Categories', href: '/templates/categories' });
  } else if (state.pathKind === 'all') {
    breadcrumbs.push({ label: 'Categories', href: '/templates/categories' });
    breadcrumbs.push({ label: 'All' });
  } else {
    breadcrumbs.push({ label: BREADCRUMB_LABELS[state.scope] ?? 'Templates' });
  }

  if (state.categorySlug && (state.pathKind === 'search' || state.categoryIsRoute)) {
    breadcrumbs.push({ label: categoryLabel || humanizeSlug(state.categorySlug) });
  }
  if (state.subcategorySlug && (state.pathKind === 'search' || state.subcategoryIsRoute || state.categoryIsRoute)) {
    breadcrumbs.push({ label: childCategoryLabel || humanizeSlug(state.subcategorySlug) });
  }
  if (state.pathKind === 'style' && state.styles[0]) {
    breadcrumbs.push({ label: humanizeSlug(state.styles[0]) });
  }

  return {
    title,
    description: buildDescription(title, state, fallbackDescription, hasDynamicFilter, descriptionMode, taxonomyDescription),
    breadcrumbs,
    hasDynamicFilter,
  };
}

export const TemplateMarketplaceHeading: React.FC<TemplateMarketplaceHeadingProps> = ({
  apiBase: apiBaseProp = '',
  pageKind = 'auto',
  categorySlug = '',
  subcategorySlug = '',
  queryParam = 'q',
  staticRoutePath = '',
  fallbackTitle = 'Search Webflow templates',
  fallbackDescription = GENERIC_FALLBACK_DESCRIPTION,
  descriptionMode = 'preserve_static',
  showBreadcrumbs = true,
  showDescription = true,
  templatesLabel = 'Templates',
  templatesUrl = '/templates',
  updateDocumentTitle = false,
}) => {
  const [version, setVersion] = useState(0);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [taxonomyDescription, setTaxonomyDescription] = useState<TaxonomyDescriptionState | null>(null);
  const lastHrefRef = useRef('');

  useEffect(() => {
    setHasHydrated(true);
    lastHrefRef.current = window.location.href;
    const bump = () => {
      lastHrefRef.current = window.location.href;
      setVersion((value) => value + 1);
    };
    window.addEventListener('popstate', bump);
    window.addEventListener('templateFiltersChanged', bump);
    window.addEventListener('template-search-query', bump);
    document.addEventListener('templateFiltersChanged', bump);
    document.addEventListener('template-search-query', bump);
    document.addEventListener('categoryFilterUpdated', bump);
    const id = window.setInterval(() => {
      const href = window.location.href;
      if (href === lastHrefRef.current) return;
      lastHrefRef.current = href;
      setVersion((value) => value + 1);
    }, 250);
    return () => {
      window.removeEventListener('popstate', bump);
      window.removeEventListener('templateFiltersChanged', bump);
      window.removeEventListener('template-search-query', bump);
      document.removeEventListener('templateFiltersChanged', bump);
      document.removeEventListener('template-search-query', bump);
      document.removeEventListener('categoryFilterUpdated', bump);
      window.clearInterval(id);
    };
  }, []);

  const apiBase = useMemo(() => resolveApiBase(apiBaseProp), [apiBaseProp]);
  const headingState = useMemo(
    () =>
      readHeadingState(
        pageKind,
        queryParam,
        categorySlug || undefined,
        subcategorySlug || undefined,
        staticRoutePath,
        hasHydrated,
      ),
    [categorySlug, hasHydrated, pageKind, queryParam, staticRoutePath, subcategorySlug, version],
  );
  const currentTaxonomyKey = taxonomyDescriptionKey(headingState);

  useEffect(() => {
    if (!hasHydrated || !shouldUseTaxonomyApi(apiBaseProp)) {
      setTaxonomyDescription(null);
      return;
    }

    if (!shouldFetchTaxonomyDescription(headingState, fallbackDescription, descriptionMode)) {
      setTaxonomyDescription(null);
      return;
    }

    const key = taxonomyDescriptionKey(headingState);
    const controller = new AbortController();

    async function fetchTaxonomyDescription() {
      try {
        const response = await fetch(buildTaxonomyApiUrl(apiBase, headingState), {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json()) as TaxonomyMetadataPayload;
        if (controller.signal.aborted) return;
        setTaxonomyDescription({
          key,
          title: payload.title || '',
          description: payload.description || '',
          categoryLabel: payload.category_group?.name || '',
          childCategoryLabel: payload.child_category?.name || '',
        });
      } catch {
        if (!controller.signal.aborted) {
          setTaxonomyDescription({ key, title: '', description: '', categoryLabel: '', childCategoryLabel: '' });
        }
      }
    }

    fetchTaxonomyDescription();
    return () => controller.abort();
  }, [
    apiBase,
    apiBaseProp,
    descriptionMode,
    fallbackDescription,
    headingState.categorySlug,
    headingState.subcategorySlug,
    headingState.categoryIsRoute,
    headingState.subcategoryIsRoute,
    headingState.pathKind,
    hasHydrated,
    currentTaxonomyKey,
  ]);

  const content = useMemo(() => {
    const hasCurrentTaxonomy = taxonomyDescription?.key === currentTaxonomyKey;
    const syncedDescription = hasCurrentTaxonomy ? taxonomyDescription.description : '';
    const syncedTitle = hasCurrentTaxonomy ? taxonomyDescription.title : '';
    const syncedCategoryLabel = hasCurrentTaxonomy ? taxonomyDescription.categoryLabel : '';
    const syncedChildCategoryLabel = hasCurrentTaxonomy ? taxonomyDescription.childCategoryLabel : '';
    return buildContent(
      headingState,
      fallbackTitle,
      fallbackDescription,
      descriptionMode,
      templatesLabel,
      templatesUrl,
      syncedDescription,
      syncedTitle,
      syncedCategoryLabel,
      syncedChildCategoryLabel,
    );
  }, [
    currentTaxonomyKey,
    descriptionMode,
    fallbackDescription,
    fallbackTitle,
    headingState,
    taxonomyDescription,
    templatesLabel,
    templatesUrl,
  ]);

  useEffect(() => {
    if (!updateDocumentTitle || typeof document === 'undefined') return;
    document.title = `${content.title} | Webflow`;
  }, [content.title, updateDocumentTitle]);

  return (
    <header
      className="tmheading"
      data-template-marketplace-heading=""
      data-template-component="TemplateMarketplaceHeading"
      data-template-component-version={TEMPLATE_MARKETPLACE_COMPONENT_VERSION}
    >
      <style dangerouslySetInnerHTML={{ __html: HEADING_STYLES }} />
      {showBreadcrumbs && (
        <nav className="tmheading-breadcrumbs" aria-label="Breadcrumb">
          {content.breadcrumbs.map((item, index) => (
            <React.Fragment key={`${item.label}-${index}`}>
              {index > 0 && <span className="tmheading-breadcrumb-separator" aria-hidden="true">›</span>}
              {item.href && index < content.breadcrumbs.length - 1 ? (
                <a className="tmheading-breadcrumb-link" href={item.href}>{item.label}</a>
              ) : (
                <span>{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <h1 className="tmheading-title">{content.title}</h1>
      {showDescription && content.description && <p className="tmheading-description">{content.description}</p>}
    </header>
  );
};

export default TemplateMarketplaceHeading;
