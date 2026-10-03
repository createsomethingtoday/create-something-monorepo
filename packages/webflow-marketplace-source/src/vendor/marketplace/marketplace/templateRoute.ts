export type TemplateSort = 'popular' | 'best_selling' | 'newest' | 'price_asc' | 'price_desc';
export type TemplateScope = 'all' | 'featured' | 'free' | 'landing_pages';
export type TemplatePathKind =
  | 'auto'
  | 'search'
  | 'all'
  | 'featured'
  | 'free'
  | 'landing_pages'
  | 'category'
  | 'subcategory'
  | 'style'
  | 'tag';

export interface TemplateRouteState {
  q: string;
  scope: TemplateScope;
  categoryGroupSlug: string | null;
  childCategorySlug: string | null;
  styleSlug: string | null;
  tagSlug: string | null;
  styles: string[];
  types: string[];
  freeOnly: boolean;
  sort: TemplateSort;
  pathKind: TemplatePathKind;
  isSearchRoute: boolean;
  categoryIsRoute: boolean;
  childCategoryIsRoute: boolean;
}

export interface TemplateSortOption {
  value: TemplateSort;
  label: string;
}

export const TEMPLATE_SORT_OPTIONS: ReadonlyArray<TemplateSortOption> = [
  { value: 'popular', label: 'Popular' },
  { value: 'best_selling', label: 'Best Sellers' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

export const TEMPLATE_SORT_LABELS: Readonly<Record<TemplateSort, string>> = {
  popular: 'Popular',
  best_selling: 'Best Sellers',
  newest: 'Newest',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
};

export function getTemplateSortOptions(scope: TemplateScope): ReadonlyArray<TemplateSortOption> {
  if (scope !== 'free') return TEMPLATE_SORT_OPTIONS;
  return TEMPLATE_SORT_OPTIONS.filter(
    (option) => option.value === 'popular' || option.value === 'newest',
  );
}

interface ParseTemplateRouteOptions {
  href?: string;
  useWindow?: boolean;
  defaultSort?: TemplateSort;
  pageKind?: TemplatePathKind;
  queryParam?: string;
  scopeOverride?: TemplateScope | null;
  categorySlugOverride?: string | null;
  childCategorySlugOverride?: string | null;
  styleSlugOverride?: string | null;
  tagSlugOverride?: string | null;
  includeFilterParams?: boolean;
}

const STYLE_SLUG_ALIASES: Record<string, string> = {
  bold: 'bold-websites',
  casual: 'casual-websites',
  clean: 'clean-websites',
  corporate: 'corporate-websites',
  dark: 'dark-websites',
  elegant: 'elegant-websites',
  illustration: 'illustration-websites',
  light: 'light-websites',
  luxurious: 'luxury-websites',
  luxury: 'luxury-websites',
  minimal: 'minimal-websites',
  organic: 'organic-websites',
  retro: 'retro-websites',
  sidebar: 'sidebar-websites',
};

export const SUPPORTED_TEMPLATE_CATEGORY_ROUTE_SLUGS = new Set([
  'architecture-and-design-websites',
  'arts-and-entertainment-websites',
  'blog-and-editorial-websites',
  'community-and-nonprofit-websites',
  'documentation-websites',
  'education-websites',
  'environment-websites',
  'food-and-drink-websites',
  'government-websites',
  'hair-and-beauty-websites',
  'home-services-websites',
  'hr-and-hiring-websites',
  'launch-and-coming-soon-websites',
  'medical-websites',
  'music-and-audio-websites',
  'personal-websites',
  'portfolio-and-agency-websites',
  'professional-services-websites',
  'real-estate-websites',
  'retail-and-e-commerce-websites',
  'technology-websites',
  'transportation-websites',
  'travel-websites',
  'ui-kit-websites',
  'weddings-and-events-websites',
  'wellness-websites',
]);

export function normalizeTemplateSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const TEMPLATE_CATEGORY_INTENT_FILLER = new Set(['and', 'website', 'websites']);

function templateCategoryIntentKey(value: string): string {
  return normalizeTemplateSlug(value)
    .split('-')
    .filter((part) => part && !TEMPLATE_CATEGORY_INTENT_FILLER.has(part))
    .join('-');
}

export function resolveTemplateCategoryRouteSlug(value: string): string | null {
  const normalized = normalizeTemplateSlug(value);
  if (!normalized) return null;
  if (SUPPORTED_TEMPLATE_CATEGORY_ROUTE_SLUGS.has(normalized)) return normalized;

  const intentKey = templateCategoryIntentKey(normalized);
  const matches = Array.from(SUPPORTED_TEMPLATE_CATEGORY_ROUTE_SLUGS).filter(
    (candidate) => templateCategoryIntentKey(candidate) === intentKey,
  );
  return matches.length === 1 ? matches[0] : null;
}

export function toTemplateStyleSlug(name: string): string {
  const slug = normalizeTemplateSlug(name);
  return STYLE_SLUG_ALIASES[slug] ?? slug;
}

export function normalizeTemplateSort(
  value: string | null | undefined,
  fallback: TemplateSort = 'popular',
): TemplateSort {
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
    case 'best_selling':
    case 'best-selling':
    case 'best_sellers':
    case 'best-sellers':
      return 'best_selling';
    case 'popular':
    case 'popularity-score':
    case 'popularity-score-desc':
      return 'popular';
    default:
      return fallback;
  }
}

export function normalizeTemplateScope(value: string | null | undefined): TemplateScope | null {
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

export function inferTemplatePathKind(pathname: string): TemplatePathKind {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/templates/search' || path === '/templates/search-v2') return 'search';
  if (path === '/templates/featured') return 'featured';
  if (path === '/templates/free' || path === '/templates/free-website-templates') return 'free';
  if (/\/templates\/landing-page(s)?($|\/)/.test(path)) return 'landing_pages';
  if (/\/templates\/category\/([^/?#]+)/.test(path)) return 'category';
  if (/\/templates\/subcategory\/([^/?#]+)/.test(path)) return 'subcategory';
  if (/\/templates\/style\/([^/?#]+)/.test(path)) return 'style';
  if (/\/templates\/tag\/([^/?#]+)/.test(path)) return 'tag';
  if (path === '/templates' || path === '/templates/all') return 'all';
  return 'auto';
}

export function readTemplateListParams(params: URLSearchParams, keys: string[]): string[] {
  return keys
    .flatMap((key) => params.getAll(key).flatMap((value) => value.split(',')))
    .map((value) => value.trim())
    .filter(Boolean);
}

export function areTemplateStringArraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function readTemplateRouteHref(): string {
  if (typeof window === 'undefined') return 'https://webflow.com/templates';
  return window.location.href;
}

export function parseTemplateRoute(options: ParseTemplateRouteOptions = {}): TemplateRouteState {
  const {
    href,
    useWindow = true,
    defaultSort = 'popular',
    pageKind = 'auto',
    queryParam,
    scopeOverride,
    categorySlugOverride,
    childCategorySlugOverride,
    styleSlugOverride,
    tagSlugOverride,
    includeFilterParams = true,
  } = options;

  if ((!useWindow || typeof window === 'undefined') && !href) {
    const resolvedScope = scopeOverride && scopeOverride !== 'all' ? scopeOverride : 'all';
    const styleSlug = styleSlugOverride ? toTemplateStyleSlug(styleSlugOverride) : null;
    const tagSlug = tagSlugOverride ? normalizeTemplateSlug(tagSlugOverride) : null;
    return {
      q: '',
      scope: resolvedScope,
      categoryGroupSlug: categorySlugOverride || null,
      childCategorySlug: childCategorySlugOverride || null,
      styleSlug,
      tagSlug,
      styles: styleSlug ? [styleSlug] : [],
      types: [],
      freeOnly: resolvedScope === 'free',
      sort: defaultSort,
      pathKind: pageKind,
      isSearchRoute: pageKind === 'search',
      categoryIsRoute: Boolean(categorySlugOverride && pageKind === 'category'),
      childCategoryIsRoute: Boolean(childCategorySlugOverride && pageKind === 'subcategory'),
    };
  }

  const url = new URL(href ?? readTemplateRouteHref());
  const params = url.searchParams;
  const pathname = url.pathname.replace(/\/+$/, '');
  const inferredPathKind = inferTemplatePathKind(pathname);
  const pathKind = pageKind !== 'auto' ? pageKind : inferredPathKind;

  const categoryMatch = pathname.match(/\/templates\/category\/([^/?#]+)/);
  const childCategoryMatch = pathname.match(/\/templates\/subcategory\/([^/?#]+)/);
  const stylePathMatch = pathname.match(/\/templates\/style\/([^/?#]+)/);
  const tagPathMatch = pathname.match(/\/templates\/tag\/([^/?#]+)/);

  const queryScope = includeFilterParams ? normalizeTemplateScope(params.get('scope')) : null;
  const pathScope =
    inferredPathKind === 'featured' ||
    inferredPathKind === 'free' ||
    inferredPathKind === 'landing_pages' ||
    inferredPathKind === 'all'
      ? (inferredPathKind as TemplateScope)
      : null;
  let scope =
    (scopeOverride && scopeOverride !== 'all' ? scopeOverride : null) ??
    (pathScope && pathScope !== 'all' ? pathScope : null) ??
    queryScope ??
    pathScope ??
    'all';

  if ((params.get('pricing') ?? '').toLowerCase() === 'free') {
    scope = 'free';
  }

  const categoryFromParam = includeFilterParams
    ? params.get('category_group_slug') || params.get('category')
    : null;
  const childCategoryFromParam = includeFilterParams
    ? params.get('child_category_slug') || params.get('subcategory')
    : null;

  const styleFromPath = stylePathMatch ? toTemplateStyleSlug(stylePathMatch[1]) : null;
  const styleFromOverride = styleSlugOverride ? toTemplateStyleSlug(styleSlugOverride) : null;
  const stylesFromParams = includeFilterParams
    ? readTemplateListParams(params, ['styles', 'style_slug', 'style']).map(toTemplateStyleSlug)
    : [];
  const styles = Array.from(new Set([styleFromOverride, styleFromPath, ...stylesFromParams].filter(Boolean) as string[]));
  const styleSlug = styleFromOverride ?? styleFromPath ?? styles[0] ?? null;

  const tagFromPath = tagPathMatch ? normalizeTemplateSlug(tagPathMatch[1]) : null;
  const tagFromOverride = tagSlugOverride ? normalizeTemplateSlug(tagSlugOverride) : null;
  const tagFromParam = includeFilterParams
    ? params.get('tag_slug') || params.get('tag') || readTemplateListParams(params, ['tags'])[0] || null
    : null;
  const tagSlug = tagFromOverride ?? tagFromPath ?? (tagFromParam ? normalizeTemplateSlug(tagFromParam) : null);

  const queryValue =
    (queryParam ? params.get(queryParam) : null) ??
    params.get('q') ??
    params.get('query') ??
    params.get('search') ??
    '';
  const freeOnly =
    scope === 'free' ||
    ['1', 'true', 'yes', 'on'].includes((params.get('free_only') ?? '').toLowerCase()) ||
    ['1', 'true', 'yes', 'on'].includes((params.get('free') ?? '').toLowerCase()) ||
    (params.get('pricing') ?? '').toLowerCase() === 'free';

  return {
    q: queryValue.trim(),
    scope,
    categoryGroupSlug: categoryFromParam || categorySlugOverride || (categoryMatch ? categoryMatch[1] : null),
    childCategorySlug:
      childCategoryFromParam ||
      (categoryFromParam ? null : childCategorySlugOverride || (childCategoryMatch ? childCategoryMatch[1] : null)),
    styleSlug,
    tagSlug,
    styles,
    types: includeFilterParams ? readTemplateListParams(params, ['types']) : [],
    freeOnly,
    sort: normalizeTemplateSort(params.get('sort'), defaultSort),
    pathKind,
    isSearchRoute: inferredPathKind === 'search' || pathKind === 'search',
    categoryIsRoute: Boolean(!categoryFromParam && (categorySlugOverride ? pathKind === 'category' : categoryMatch)),
    childCategoryIsRoute: Boolean(
      !categoryFromParam &&
      !childCategoryFromParam &&
      (childCategorySlugOverride ? pathKind === 'subcategory' : childCategoryMatch),
    ),
  };
}
