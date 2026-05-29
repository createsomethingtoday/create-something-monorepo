import type { SearchParams, TemplateScope } from './types.js';
import { clamp, ensureStringArray, normalizeSort } from './utils.js';

const VALID_TYPES = new Set(['One Page', 'Multi Page', 'Multi Layout']);
const VALID_SCOPES = new Set<TemplateScope>(['all', 'featured', 'free', 'landing_pages']);
const VALID_INCLUDES = new Set(['items', 'facets', 'pills']);

function parseList(params: URLSearchParams, key: string): string[] {
  const values = params.getAll(key).flatMap((value) => value.split(','));
  return ensureStringArray(values);
}

function firstParam(params: URLSearchParams, keys: string[]): string | null {
  for (const key of keys) {
    const value = params.get(key)?.trim();
    if (value) return value;
  }
  return null;
}

function toBoolean(value: string | null): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function parseScope(params: URLSearchParams): TemplateScope {
  const rawScope = params.get('scope');
  if (rawScope && VALID_SCOPES.has(rawScope as TemplateScope)) {
    return rawScope as TemplateScope;
  }

  if (toBoolean(params.get('featured'))) return 'featured';
  if ((params.get('pricing') ?? '').toLowerCase() === 'free') return 'free';

  return 'all';
}

function parseIncludes(params: URLSearchParams): SearchParams['include'] {
  const rawIncludes = params
    .getAll('include')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (rawIncludes.length === 0 || rawIncludes.includes('all')) {
    return { items: true, facets: true, pills: true };
  }

  const includes = rawIncludes.filter((value) => VALID_INCLUDES.has(value));
  if (includes.length === 0) {
    return { items: true, facets: true, pills: true };
  }

  return {
    items: includes.includes('items'),
    facets: includes.includes('facets'),
    pills: includes.includes('pills'),
  };
}

export function parseSearchParams(url: URL, defaultPageSize = 24): SearchParams {
  const params = url.searchParams;
  const q = params.get('q') ?? params.get('query') ?? params.get('search');

  return {
    q: q?.trim() ? q.trim() : null,
    scope: parseScope(params),
    categoryGroupSlug: params.get('category_group_slug')?.trim() || null,
    childCategorySlug: params.get('child_category_slug')?.trim() || null,
    styleSlug: firstParam(params, ['style_slug', 'style']),
    tagSlug: firstParam(params, ['tag_slug', 'tag']),
    styles: parseList(params, 'styles'),
    tags: parseList(params, 'tags'),
    types: parseList(params, 'types').filter((value) => VALID_TYPES.has(value)),
    freeOnly: toBoolean(params.get('free_only')) || toBoolean(params.get('free')) || (params.get('pricing') ?? '') === 'free',
    sort: normalizeSort(params.get('sort')),
    page: clamp(Number(params.get('page') ?? 1) || 1, 1, 500),
    pageSize: clamp(Number(params.get('page_size') ?? defaultPageSize) || defaultPageSize, 1, 100),
    include: parseIncludes(params),
  };
}
