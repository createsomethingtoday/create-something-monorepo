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

export function withoutWebsitesSuffixes(value: string): string {
  return value.replace(/(?:-websites)+$/i, '');
}

export function canonicalizeCategoryGroupSlug(value: string): string {
  return withWebsitesSuffix(slugifySegment(withoutWebsitesSuffixes(value)));
}

export function deriveChildCategorySlug(displayName: string): string {
  return withWebsitesSuffix(slugifySegment(displayName));
}

export function slugAliasCandidates(canonicalSlug: string): string[] {
  const canonical = slugifySegment(canonicalSlug);
  const base = withoutWebsitesSuffixes(canonical);
  return Array.from(new Set([canonical, base, `${canonical}-websites`].filter(Boolean)));
}

export function normalizeStyleSlug(name: string, providedSlug?: string | null): string {
  return (providedSlug && providedSlug.trim().length > 0 ? providedSlug : slugifySegment(name)).trim();
}

export function normalizeTagSlug(name: string, providedSlug?: string | null): string {
  return (providedSlug && providedSlug.trim().length > 0 ? providedSlug : slugifySegment(name)).trim();
}
