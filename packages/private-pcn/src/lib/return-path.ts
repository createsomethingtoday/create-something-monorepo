// Keep the Identity enrollment allowlist in sync. No hosts, queries or fragments.
export function safeReturnPath(value: unknown, fallback = '/start'): string {
  return typeof value === 'string' &&
    /^\/(?:start|dashboard|collection|library|n\/[a-z0-9-]{3,48}(?:\/(?:studio|settings|assets(?:\/[a-z0-9-]{1,64})?))?)$/.test(
      value
    )
    ? value
    : fallback;
}
