export const CATALOG_ORIGIN = 'https://templates.webflow.com/templates-api/api/templates/search';
const allowed = new Set([
  'q',
  'template_slug',
  'scope',
  'category_group_slug',
  'styles',
  'child_category_slug',
  'creator_slug',
  'style_slug',
  'tag_slug',
  'tags',
  'types',
  'free_only',
  'sort',
  'page',
  'page_size'
]);
export function catalogUrl(params: URLSearchParams) {
  const target = new URL(CATALOG_ORIGIN);
  for (const [key, value] of params)
    if (allowed.has(key)) target.searchParams.append(key, value.slice(0, 200));
  const integer = (v: string | null, fallback: number, max: number) => {
    const n = Number(v);
    return String(Number.isFinite(n) && n >= 1 ? Math.min(max, Math.floor(n)) : fallback);
  };
  target.searchParams.set('page_size', integer(params.get('page_size'), 12, 48));
  target.searchParams.set('page', integer(params.get('page'), 1, 500));
  return target;
}
