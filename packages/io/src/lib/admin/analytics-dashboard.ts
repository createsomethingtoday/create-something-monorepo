export const SUPPORTED_ANALYTICS_PROPERTIES = ['agency', 'io', 'space', 'ltd', 'lms'] as const;
export type AnalyticsProperty = (typeof SUPPORTED_ANALYTICS_PROPERTIES)[number];
export type AnalyticsDays = 7 | 30 | 90;

export function normalizeAnalyticsDays(value: string | null): AnalyticsDays {
  const days = Number(value);
  return days === 7 || days === 30 || days === 90 ? days : 7;
}

/** Strip queries and conservatively redact private or opaque path segments. */
export function normalizeAnalyticsPath(value: unknown): string {
  if (typeof value !== 'string' || !value) return '/';
  try {
    let path = value.split(/[?#]/, 1)[0];
    for (let i = 0; i < 3; i++) {
      const decoded = decodeURIComponent(path);
      if (decoded === path) break;
      path = decoded;
    }
    if (!path.startsWith('/')) path = `/${path}`;
    if (
      /%|[\\\\@]|[^a-zA-Z0-9/_ .-]/.test(path) ||
      /(?:^|\/)(?:admin|api|auth|login|logout|account|dashboard|profile|progress|preferences|billing|settings|oauth|callback|confirm|unsubscribe|reset|verify|token|share|workspace|customer|portal|room|join|manage|delivery|prospects|mcp-access)(?:\/|$)/i.test(
        path
      ) ||
      /(?:^|\/)map\/subscribe(?:\/|$)/i.test(path) ||
      /(?:^|\/)[a-zA-Z0-9_]{32,}(?:\/|$)/.test(path) ||
      /(?:^|\/)[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:\/|$)/i.test(path)
    )
      return '/[redacted]';
    return path;
  } catch {
    return '/[redacted]';
  }
}
