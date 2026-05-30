export type TemplateSort = 'popular' | 'newest' | 'price_asc' | 'price_desc';

export interface CategoryQuery {
  q: string | null;
  sort: TemplateSort;
  page: number;
  pageSize: number;
  styles: string[];
  types: string[];
  freeOnly: boolean;
}

export interface CategoryMetadata {
  slug: string;
  name: string;
  title: string;
  description: string;
  canonical_url: string;
  total_items: number;
}

export interface SearchItem {
  id: string;
  template_slug: string;
  name: string;
  url: string | null;
  preview_url: string | null;
  website_url: string | null;
  creator_name: string | null;
  thumbnail_image_url: string | null;
  thumbnail_image_secondary_url: string | null;
  price: number | null;
  is_free: boolean;
  is_featured: boolean;
  template_type: string | null;
  popularity_score: number | null;
  unique_viewers: number | null;
  cumulative_purchases: number | null;
  published_date: string | null;
  category_groups: Array<{ name: string; slug: string; url: string }>;
  child_categories: Array<{ name: string; slug: string; url: string }>;
  styles: Array<{ name: string; slug: string }>;
  tags: Array<{ name: string; slug: string }>;
}

export interface SearchResponsePayload {
  items: SearchItem[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
  sort: TemplateSort;
  applied_filters: {
    q: string | null;
    scope: 'all' | 'featured' | 'free' | 'landing_pages';
    category_group_slug: string | null;
    child_category_slug: string | null;
    styles: string[];
    types: string[];
    free_only: boolean;
  };
  available_facets: {
    styles: Array<{ name: string; slug: string; count: number }>;
    types: Array<{ value: string; count: number }>;
  };
  subcategory_pills: Array<{ name: string; slug: string; url: string; count: number; active: boolean }>;
}

const DEFAULT_PAGE_SIZE = 24;
const VALID_TYPES = new Set(['One Page', 'Multi Page', 'Multi Layout']);
const VALID_SORTS = new Set<TemplateSort>(['popular', 'newest', 'price_asc', 'price_desc']);

function getSearchApiBase(): string {
  const baseUrl = process.env.TEMPLATE_SEARCH_API_BASE?.trim();
  if (!baseUrl) {
    throw new Error('TEMPLATE_SEARCH_API_BASE is required for the category Cloud app.');
  }
  return baseUrl.replace(/\/$/, '');
}

async function fetchSearchJson<T>(pathname: string): Promise<{ status: number; data: T }> {
  const response = await fetch(`${getSearchApiBase()}${pathname}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const data = (await response.json()) as T;
  return { status: response.status, data };
}

export function normalizeSort(value: string | null | undefined): TemplateSort {
  if (value === 'approval-date-desc') return 'newest';
  if (value === 'price-asc') return 'price_asc';
  if (value === 'price-desc') return 'price_desc';
  return VALID_SORTS.has(value as TemplateSort) ? (value as TemplateSort) : 'popular';
}

function normalizeList(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.flatMap((entry) => entry.split(',')).map((entry) => entry.trim()).filter(Boolean);
}

function normalizeBoolean(value: string | string[] | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return ['1', 'true', 'yes', 'on'].includes((raw ?? '').toLowerCase());
}

function normalizePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw ?? 1) || 1;
  return Math.max(1, Math.min(page, 500));
}

export function parseCategoryQuery(searchParams: Record<string, string | string[] | undefined>): CategoryQuery {
  const q = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  return {
    q: q?.trim() ? q.trim() : null,
    sort: normalizeSort(Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort),
    page: normalizePage(searchParams.page),
    pageSize: DEFAULT_PAGE_SIZE,
    styles: normalizeList(searchParams.styles),
    types: normalizeList(searchParams.types).filter((value) => VALID_TYPES.has(value)),
    freeOnly: normalizeBoolean(searchParams.free_only) || normalizeBoolean(searchParams.free),
  };
}

export function buildSearchParams(categorySlug: string, query: CategoryQuery, page = query.page): URLSearchParams {
  const params = new URLSearchParams();
  params.set('category_group_slug', categorySlug);
  params.set('page', String(page));
  params.set('page_size', String(query.pageSize));
  if (query.q) params.set('q', query.q);
  if (query.sort !== 'popular') params.set('sort', query.sort);
  if (query.freeOnly) params.set('free_only', 'true');
  query.styles.forEach((style) => params.append('styles', style));
  query.types.forEach((type) => params.append('types', type));
  return params;
}

export function buildPageHref(query: CategoryQuery, page: number): string {
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  if (query.q) params.set('q', query.q);
  if (query.sort !== 'popular') params.set('sort', query.sort);
  if (query.freeOnly) params.set('free_only', 'true');
  query.styles.forEach((style) => params.append('styles', style));
  query.types.forEach((type) => params.append('types', type));
  const rendered = params.toString();
  return rendered ? `?${rendered}` : '?';
}

function fallbackNameFromSlug(slug: string): string {
  return slug
    .replace(/-websites$/i, '')
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function buildCategoryTitle(name: string): string {
  return `${name} Website Templates & Page Designs | Webflow`;
}

function buildCategoryDescription(name: string): string {
  return `Get our HTML5 responsive ${name} website templates and easily customize your ${name} template with Webflow.`;
}

async function deriveCategoryMetadataFromSearch(slug: string): Promise<CategoryMetadata | null> {
  const params = new URLSearchParams({
    category_group_slug: slug,
    page: '1',
    page_size: '1',
  });
  const { status, data } = await fetchSearchJson<SearchResponsePayload | { error: string }>(
    `/api/templates/search?${params.toString()}`,
  );

  if (status < 200 || status >= 300) {
    throw new Error(`Template category metadata fallback request failed with status ${status}.`);
  }

  const payload = data as SearchResponsePayload;
  if (payload.pagination.total_items < 1) return null;

  const name =
    payload.items[0]?.category_groups.find((categoryGroup) => categoryGroup.slug === slug)?.name.trim() ||
    fallbackNameFromSlug(slug);

  return {
    slug,
    name,
    title: buildCategoryTitle(name),
    description: buildCategoryDescription(name),
    canonical_url: `${marketplaceBaseUrl()}/templates/category/${slug}`,
    total_items: payload.pagination.total_items,
  };
}

export async function getCategoryMetadata(slug: string): Promise<CategoryMetadata | null> {
  const { status, data } = await fetchSearchJson<CategoryMetadata | { error: string }>(
    `/api/templates/categories/${encodeURIComponent(slug)}`,
  );
  if (status === 404) return deriveCategoryMetadataFromSearch(slug);
  if (status < 200 || status >= 300) {
    throw new Error(`Template category metadata request failed with status ${status}.`);
  }
  return data as CategoryMetadata;
}

export async function searchTemplates(categorySlug: string, query: CategoryQuery): Promise<SearchResponsePayload> {
  const params = buildSearchParams(categorySlug, query);
  const { status, data } = await fetchSearchJson<SearchResponsePayload | { error: string }>(
    `/api/templates/search?${params.toString()}`,
  );
  if (status < 200 || status >= 300) {
    throw new Error(`Template search request failed with status ${status}.`);
  }
  return data as SearchResponsePayload;
}

export function marketplaceBaseUrl(): string {
  return (process.env.MARKETPLACE_BASE_URL?.trim() || 'https://webflow.com').replace(/\/$/, '');
}
