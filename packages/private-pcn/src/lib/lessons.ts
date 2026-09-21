export function libraryReturnPath(slug: string | undefined, search: URLSearchParams) {
  const base = slug && slug !== 'create-something' ? `/n/${encodeURIComponent(slug)}` : '/library';
  const params = new URLSearchParams();
  for (const key of ['q', 'series']) {
    const value = search.get(key)?.slice(0, 200);
    if (value) params.set(key, value);
  }
  return base + (params.size ? `?${params}` : '');
}
export function lessonPath(id: string, slug?: string, query = '', series = '') {
  const base = slug ? `/n/${encodeURIComponent(slug)}` : '';
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (series) params.set('series', series);
  return `${base}/lessons/${encodeURIComponent(id)}${params.size ? `?${params}` : ''}`;
}
