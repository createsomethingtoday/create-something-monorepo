import React, { useEffect, useMemo, useRef, useState } from 'react';
import { parseTemplateRoute, TemplatePathKind, TemplateScope } from './templateRoute';
import { TEMPLATE_MARKETPLACE_COMPONENT_VERSION } from './templateTelemetry';

type HeadingPageKind = TemplatePathKind;
type DescriptionMode = 'preserve_static' | 'dynamic';

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

function readHeadingState(
  pageKind: HeadingPageKind,
  queryParam: string,
  categorySlugOverride?: string,
  subcategorySlugOverride?: string,
): HeadingState {
  const route = parseTemplateRoute({
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

function buildBaseTitle(state: HeadingState, fallbackTitle: string): string {
  const categoryLabel = state.subcategorySlug || state.categorySlug;
  if (categoryLabel && state.scope !== 'all') return `${humanizeSlug(categoryLabel)} ${SCOPE_LABELS[state.scope]}`;
  if (categoryLabel) return `${humanizeSlug(categoryLabel)} Website Templates`;
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

function buildDescription(
  title: string,
  state: HeadingState,
  fallbackDescription: string,
  hasDynamicFilter: boolean,
  descriptionMode: DescriptionMode,
): string {
  const staticDescription = fallbackDescription.trim();

  if (descriptionMode === 'preserve_static' && hasRouteOwnedDescription(state)) {
    return staticDescription && !isGenericDescription(staticDescription) ? staticDescription : '';
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
  } else if (state.pathKind === 'all') {
    breadcrumbs.push({ label: 'Categories', href: '/templates/categories' });
    breadcrumbs.push({ label: 'All' });
  } else {
    breadcrumbs.push({ label: BREADCRUMB_LABELS[state.scope] ?? 'Templates' });
  }

  if (state.categorySlug && (state.pathKind === 'search' || state.categoryIsRoute)) {
    breadcrumbs.push({ label: humanizeSlug(state.categorySlug) });
  }
  if (state.subcategorySlug && (state.pathKind === 'search' || state.subcategoryIsRoute)) {
    breadcrumbs.push({ label: humanizeSlug(state.subcategorySlug) });
  }
  if (state.pathKind === 'style' && state.styles[0]) {
    breadcrumbs.push({ label: humanizeSlug(state.styles[0]) });
  }

  return {
    title,
    description: buildDescription(title, state, fallbackDescription, hasDynamicFilter, descriptionMode),
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
  fallbackDescription = GENERIC_FALLBACK_DESCRIPTION,
  descriptionMode = 'preserve_static',
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
    return buildContent(state, fallbackTitle, fallbackDescription, descriptionMode, templatesLabel, templatesUrl);
  }, [categorySlug, descriptionMode, fallbackDescription, fallbackTitle, pageKind, queryParam, subcategorySlug, templatesLabel, templatesUrl, version]);

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
