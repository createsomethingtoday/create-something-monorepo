export function normalizeCustomerId(value: string): string {
  const trimmed = value.trim();
  const lowercase = trimmed.toLowerCase();
  const normalized = lowercase.replace(/[^a-z0-9]+/g, '-');
  return normalized.replace(/^-|-$/g, '');
}
