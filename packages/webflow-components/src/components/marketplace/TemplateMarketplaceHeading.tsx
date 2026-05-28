import React, { useEffect, useMemo, useRef, useState } from 'react';

type HeadingPageKind = 'auto' | 'search' | 'all' | 'featured' | 'free' | 'landing_pages' | 'category';
type TemplateScope = 'all' | 'featured' | 'free' | 'landing_pages';

export interface TemplateMarketplaceHeadingProps {
  /** Page context used when the URL does not provide a more specific state. */
  pageKind?: HeadingPageKind;
  /** Designer preview category slug, e.g. "architecture-and-design-websites". */
  categorySlug?: string;
  /** Designer preview subcategory slug. */
  subcategorySlug?: string;
  /** Search query param key. Search V2 uses "q"; native search uses "query". */
  queryParam?: string;
  /** Static title used when no route/filter state is available. */
  fallbackTitle?: string;
  /** Static description used before the user applies a filter. */
  fallbackDescription?: string;
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
  all: 'Webflow Website Templates',
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

function titleCase(value: string): string {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === 'and') return '&';
      if (lower === 'ui') return 'UI';
      if (lower === 'hr') return 'HR';
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

function normalizeScope(value: string | null | undefined): TemplateScope | null {
  switch (value) {
    case 'all':
    case 'featured':
    case 'free':
    case 'landing_pages':
      return value;
    default:
      return null;
  }
}

function inferPathKind(pathname: string): HeadingPageKind {
  const path = pathname.replace(/\/+$/, '');
  if (path === '/templates/search' || path === '/templates/search-v2') return 'search';
  if (path === '/templates/featured') return 'featured';
  if (path === '/templates/free' || path === '/templates/free-website-templates') return 'free';
  if (/\/templates\/landing-page(s)?($|\/)/.test(path)) return 'landing_pages';
  if (/\/templates\/category\/([^/?#]+)/.test(path)) return 'category';
  if (path === '/templates' || path === '/templates/all') return 'all';
  return 'auto';
}

function readArrayParam(params: URLSearchParams, key: string): string[] {
  return params.getAll(key).flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean);
}

function readHeadingState(
  pageKind: HeadingPageKind,
  queryParam: string,
  categorySlugOverride?: string,
  subcategorySlugOverride?: string,
): HeadingState {
  if (typeof window === 'undefined') {
    const fallbackScope = normalizeScope(pageKind === 'category' ? null : pageKind) ?? 'all';
    return {
      q: '',
      scope: fallbackScope,
      categorySlug: categorySlugOverride || null,
      subcategorySlug: subcategorySlugOverride || null,
      categoryIsRoute: Boolean(categorySlugOverride && pageKind === 'category'),
      subcategoryIsRoute: Boolean(subcategorySlugOverride && pageKind === 'category'),
      styles: [],
      types: [],
      freeOnly: fallbackScope === 'free',
      pathKind: pageKind,
    };
  }

  const url = new URL(window.location.href);
  const params = url.searchParams;
  const pathKind = inferPathKind(url.pathname);
  const effectiveKind = pageKind !== 'auto' ? pageKind : pathKind;
  const categoryMatch = url.pathname.match(/\/templates\/category\/([^/?#]+)/);
  const subcategoryMatch = url.pathname.match(/\/templates\/subcategory\/([^/?#]+)/);
  const queryCategorySlug = params.get('category') || params.get('category_group_slug') || null;
  const querySubcategorySlug = params.get('subcategory') || params.get('child_category_slug') || null;
  const queryValue =
    params.get(queryParam) ?? params.get('q') ?? params.get('query') ?? params.get('search') ?? '';

  let scope = normalizeScope(params.get('scope')) ?? normalizeScope(effectiveKind) ?? 'all';
  if (params.get('pricing') === 'free') scope = 'free';

  return {
    q: queryValue.trim(),
    scope,
    categorySlug:
      categorySlugOverride ||
      (categoryMatch ? categoryMatch[1] : queryCategorySlug),
    subcategorySlug:
      subcategorySlugOverride ||
      (subcategoryMatch ? subcategoryMatch[1] : querySubcategorySlug),
    categoryIsRoute: Boolean(categorySlugOverride ? effectiveKind === 'category' : categoryMatch),
    subcategoryIsRoute: Boolean(subcategorySlugOverride ? effectiveKind === 'category' : subcategoryMatch),
    styles: readArrayParam(params, 'styles').concat(readArrayParam(params, 'style_slug')),
    types: readArrayParam(params, 'types'),
    freeOnly: ['1', 'true', 'yes', 'on'].includes((params.get('free_only') ?? '').toLowerCase()) || scope === 'free',
    pathKind: effectiveKind,
  };
}

function buildBaseTitle(state: HeadingState, fallbackTitle: string): string {
  const categoryLabel = state.subcategorySlug || state.categorySlug;
  if (categoryLabel && state.scope !== 'all') return `${humanizeSlug(categoryLabel)} ${SCOPE_LABELS[state.scope]}`;
  if (categoryLabel) return `${humanizeSlug(categoryLabel)} Website Templates`;
  if (state.scope !== 'all') return SCOPE_LABELS[state.scope];
  if (state.pathKind === 'search') return fallbackTitle || 'Search Webflow templates';
  return fallbackTitle || SCOPE_LABELS.all;
}

function buildDescriptorPrefix(state: HeadingState): string {
  const descriptors: string[] = [];
  if (state.freeOnly && state.scope !== 'free') descriptors.push('Free');
  if (state.styles[0]) descriptors.push(humanizeSlug(state.styles[0]));
  if (state.types[0]) descriptors.push(humanizeSlug(state.types[0]));
  return Array.from(new Set(descriptors)).join(' ');
}

function buildDescription(title: string, state: HeadingState, fallbackDescription: string, hasDynamicFilter: boolean): string {
  if (!hasDynamicFilter && fallbackDescription) return fallbackDescription;
  if (state.q) {
    return `Browse Webflow templates matching "${state.q}" with filters for category, style, type, price, and popularity.`;
  }
  return `Browse ${title.toLowerCase()} and refine results by category, style, type, price, and popularity.`;
}

function buildContent(
  state: HeadingState,
  fallbackTitle: string,
  fallbackDescription: string,
  templatesLabel: string,
  templatesUrl: string,
): HeadingContent {
  const baseTitle = buildBaseTitle(state, fallbackTitle);
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
    title = baseTitle === SCOPE_LABELS.all || baseTitle === fallbackTitle
      ? `Results for "${state.q}"`
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
  } else {
    breadcrumbs.push({ label: BREADCRUMB_LABELS[state.scope] ?? 'Templates' });
  }

  if (state.categorySlug && (state.pathKind === 'search' || state.categoryIsRoute)) {
    breadcrumbs.push({ label: humanizeSlug(state.categorySlug) });
  }
  if (state.subcategorySlug && (state.pathKind === 'search' || state.subcategoryIsRoute)) {
    breadcrumbs.push({ label: humanizeSlug(state.subcategorySlug) });
  }

  return {
    title,
    description: buildDescription(title, state, fallbackDescription, hasDynamicFilter),
    breadcrumbs,
    hasDynamicFilter,
  };
}

export const TemplateMarketplaceHeading: React.FC<TemplateMarketplaceHeadingProps> = ({
  pageKind = 'auto',
  categorySlug = '',
  subcategorySlug = '',
  queryParam = 'q',
  fallbackTitle = 'Search Webflow templates',
  fallbackDescription = 'Explore Webflow templates by category, style, type, price, and popularity.',
  showBreadcrumbs = true,
  showDescription = true,
  templatesLabel = 'Templates',
  templatesUrl = '/templates',
  updateDocumentTitle = false,
}) => {
  const [version, setVersion] = useState(0);
  const lastHrefRef = useRef(typeof window === 'undefined' ? '' : window.location.href);

  useEffect(() => {
    const bump = () => {
      if (typeof window !== 'undefined') lastHrefRef.current = window.location.href;
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

  const content = useMemo(() => {
    const state = readHeadingState(pageKind, queryParam, categorySlug || undefined, subcategorySlug || undefined);
    return buildContent(state, fallbackTitle, fallbackDescription, templatesLabel, templatesUrl);
  }, [categorySlug, fallbackDescription, fallbackTitle, pageKind, queryParam, subcategorySlug, templatesLabel, templatesUrl, version]);

  useEffect(() => {
    if (!updateDocumentTitle || typeof document === 'undefined') return;
    document.title = `${content.title} | Webflow`;
  }, [content.title, updateDocumentTitle]);

  return (
    <header className="tmheading" data-template-marketplace-heading="">
      <style>{HEADING_STYLES}</style>
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
