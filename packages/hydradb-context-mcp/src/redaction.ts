const REDACTIONS: Array<[RegExp, string]> = [
  [/\bsk_live_[A-Za-z0-9_.-]{8,}\b/g, 'sk_live_[REDACTED]'],
  [/\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g, 'xox[REDACTED]'],
  [/\bAKIA[0-9A-Z]{16}\b/g, 'AKIA[REDACTED]'],
  [/\bBearer\s+[A-Za-z0-9._-]{24,}\b/gi, 'Bearer [REDACTED]'],
  [/\b(HYDRA_DB_API_KEY|OPENAI_API_KEY|LINEAR_API_KEY)\s*=\s*["']?[^"'\s]+/gi, '$1=[REDACTED]']
];

export function redactSecrets(value: string): string {
  return REDACTIONS.reduce(
    (next, [pattern, replacement]) => next.replace(pattern, replacement),
    value
  );
}

export function redactJson(value: unknown): unknown {
  if (typeof value === 'string') return redactSecrets(value);
  if (Array.isArray(value)) return value.map((item) => redactJson(item));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      redactJson(nested)
    ])
  );
}
