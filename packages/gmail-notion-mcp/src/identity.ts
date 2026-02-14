/**
 * Request identity normalization for security and storage safety.
 * Account IDs are client-supplied; normalize to prevent injection and abuse.
 */

const MAX_ACCOUNT_ID_LENGTH = 256;
/** Chars allowed in account_id (D1 key, Composio entityId). Others replaced with underscore. */
const SAFE_CHARS = /[a-zA-Z0-9._@-]/;

export const DEFAULT_ACCOUNT_ID = 'default';

/**
 * Normalize a raw account ID from headers (X-MCP-Account-Id or Bearer token).
 * Trims, length-caps, and replaces any character not in [a-zA-Z0-9._@-] with '_'.
 * Returns default if empty after trim.
 */
export function normalizeAccountId(raw: string | null | undefined): string {
  if (raw == null || typeof raw !== 'string') return DEFAULT_ACCOUNT_ID;
  let s = raw.trim().slice(0, MAX_ACCOUNT_ID_LENGTH);
  if (s.length === 0) return DEFAULT_ACCOUNT_ID;
  s = s.replace(/./g, (c) => (SAFE_CHARS.test(c) ? c : '_'));
  return s;
}
