/** Keep legacy free/style deep links consistent with the visible controls. */
export function isFreeBrowse(params: URLSearchParams) {
  return params.get('scope') === 'free' || params.get('free_only') === 'true';
}
export function updateBrowseParams(params: URLSearchParams, key: string, value: string) {
  const next = new URLSearchParams(params);
  next.delete('page');
  if (key === 'category_group_slug') next.delete('child_category_slug');
  if (key === 'styles') next.delete('style_slug');
  if (key === 'scope') next.delete('free_only');
  if (key === 'free_only' && !value && next.get('scope') === 'free') next.delete('scope');
  if (key === 'free_only' && value && next.get('scope') === 'free') next.delete('scope');
  value ? next.set(key, value) : next.delete(key);
  return next;
}
