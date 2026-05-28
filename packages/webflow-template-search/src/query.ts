import type { SearchParams, TemplateScope } from './types.js';
import { clamp, ensureStringArray, normalizeSort } from './utils.js';

const VALID_TYPES = new Set(['One Page', 'Multi Page', 'Multi Layout']);
const VALID_SCOPES = new Set<TemplateScope>(['all', 'featured', 'free', 'landing_pages']);
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

function parseList(params: URLSearchParams, key: string): string[] {
  const values = params.getAll(key).flatMap((value) => value.split(','));
  return ensureStringArray(values);
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseStyleList(params: URLSearchParams): string[] {
  const values = ['styles', 'style_slug', 'style'].flatMap((key) => parseList(params, key));
  return Array.from(new Set(values.map((value) => {
    const slug = normalizeSlug(value);
    return STYLE_SLUG_ALIASES[slug] ?? slug;
  }).filter(Boolean)));
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

export function parseSearchParams(url: URL, defaultPageSize = 24): SearchParams {
  const params = url.searchParams;
  const q = params.get('q') ?? params.get('query') ?? params.get('search');

  return {
    q: q?.trim() ? q.trim() : null,
    scope: parseScope(params),
    categoryGroupSlug: params.get('category_group_slug')?.trim() || null,
    childCategorySlug: params.get('child_category_slug')?.trim() || null,
    styles: parseStyleList(params),
    types: parseList(params, 'types').filter((value) => VALID_TYPES.has(value)),
    freeOnly: toBoolean(params.get('free_only')) || toBoolean(params.get('free')) || (params.get('pricing') ?? '') === 'free',
    sort: normalizeSort(params.get('sort')),
    page: clamp(Number(params.get('page') ?? 1) || 1, 1, 500),
    pageSize: clamp(Number(params.get('page_size') ?? defaultPageSize) || defaultPageSize, 1, 100),
  };
}
