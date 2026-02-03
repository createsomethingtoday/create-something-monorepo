/**
 * Sanitizes a string to be URL-safe:
 * 1. Convert to lowercase
 * 2. Replace spaces and special characters with dashes
 * 3. Remove consecutive dashes
 * 4. Remove leading/trailing dashes
 */
export function sanitizeUrlSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Creates a URL parameter slug for category filtering
 */
export function createCategoryUrlParam(categoryName: string): string {
  return sanitizeUrlSlug(categoryName);
}
