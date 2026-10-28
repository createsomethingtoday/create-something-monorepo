// Keep the Identity enrollment allowlist in sync. No hosts, queries or fragments.
export function safeReturnPath(value: unknown, fallback = '/start'): string {
  return typeof value === 'string' &&
    /^\/(?:start|dashboard|collection|library|apply|review|support-session|support(?:\/(?:partner|[a-f0-9-]{36}))?|impact|field-engineering|n\/[a-z0-9-]{3,48}(?:\/(?:studio|settings|seller|impact|field-notes|assets(?:\/[a-z0-9-]{1,64})?))?)$/.test(
      value
    )
    ? value
    : fallback;
}

// Existing-account sign-in may return to learning routes. This only selects a
// local navigation destination; each destination still checks current access.
// Enrollment/recovery continue using the separate, synchronized allowlist above.
export function safeLoginReturnPath(value: unknown): string {
  const existing = safeReturnPath(value, '');
  if (existing) return existing;
  if (typeof value !== 'string' || value.length > 1200 || value.includes('#')) return '/start';
  const [pathname, query = ''] = value.split('?');
  if (
    value.split('?').length > 2 ||
    !/^\/(?:n\/[a-z0-9-]{3,48}\/)?(?:lessons\/[a-z0-9-]{1,64}|paths(?:\/[a-z0-9-]{1,64})?)$/.test(
      pathname
    )
  )
    return '/start';
  const params = new URLSearchParams(query);
  for (const [key, entry] of params) {
    if (params.getAll(key).length !== 1) return '/start';
    if (key === 'path' && /^[a-z0-9-]{1,64}$/.test(entry)) continue;
    if (
      (key === 'q' || key === 'series') &&
      entry.length <= 200 &&
      !/[\u0000-\u001f\u007f]/.test(entry)
    )
      continue;
    return '/start';
  }
  return pathname + (params.size ? `?${params.toString()}` : '');
}
