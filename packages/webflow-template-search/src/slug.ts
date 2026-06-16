export function slugifySegment(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\//g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function withWebsitesSuffix(value: string): string {
  return value.endsWith('-websites') ? value : `${value}-websites`;
}

export function canonicalizeCategoryGroupSlug(value: string): string {
  return withWebsitesSuffix(slugifySegment(value.replace(/-websites$/i, '')));
}

export function deriveChildCategorySlug(displayName: string): string {
  return withWebsitesSuffix(slugifySegment(displayName));
}

export function normalizeChildCategorySlug(displayName: string, providedSlug?: string | null): string {
  const rawSlug = providedSlug?.trim();
  if (!rawSlug) return deriveChildCategorySlug(displayName);
  return withWebsitesSuffix(slugifySegment(rawSlug.replace(/-websites$/i, '')));
}

export function normalizeStyleSlug(name: string, providedSlug?: string | null): string {
  return (providedSlug && providedSlug.trim().length > 0 ? providedSlug : slugifySegment(name)).trim();
}

export function normalizeTagSlug(name: string, providedSlug?: string | null): string {
  return (providedSlug && providedSlug.trim().length > 0 ? providedSlug : slugifySegment(name)).trim();
}
