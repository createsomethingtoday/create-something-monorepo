// Per-site keys for state the panel keeps in localStorage.
//
// The extension iframe shares one origin across every site a creator opens,
// so a global key leaks the last report (and its URL) from one site into the
// next. Every persisted run is keyed by site ID and carries the site ID it was
// generated for; a restore only succeeds when both agree.

const LAST_RUN_KEY_PREFIX = 'webflow_validator_last_run';
const FIX_LIST_KEY_PREFIX = 'webflow_validator_submission_fix_list';

// Global keys used before 1.3.8. Removed on first load so a stale cross-site
// report can never be restored again.
export const LEGACY_STORAGE_KEYS = [LAST_RUN_KEY_PREFIX, FIX_LIST_KEY_PREFIX] as const;

export interface StoredValidationRun<TData = unknown> {
  siteId: string;
  data: TData;
  correlationId: string | null;
  generatedAt: string;
}

export function getLastRunStorageKey(siteId: string): string {
  return `${LAST_RUN_KEY_PREFIX}:${siteId}`;
}

export function getFixListStorageKey(siteId: string): string {
  return `${FIX_LIST_KEY_PREFIX}:${siteId}`;
}

// Returns the stored run only when it was generated for `siteId` and still
// looks like a report. Anything else is treated as absent.
export function parseStoredValidationRun<TData extends { categories?: unknown; url?: unknown }>(
  raw: string | null,
  siteId: string
): StoredValidationRun<TData> | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const candidate = parsed as Partial<StoredValidationRun<TData>>;
  if (candidate.siteId !== siteId) return null;
  if (!candidate.data || typeof candidate.data !== 'object') return null;
  if (!Array.isArray((candidate.data as { categories?: unknown }).categories)) return null;
  if (typeof candidate.generatedAt !== 'string') return null;
  return {
    siteId,
    data: candidate.data,
    correlationId: typeof candidate.correlationId === 'string' ? candidate.correlationId : null,
    generatedAt: candidate.generatedAt,
  };
}

export function pruneLegacyRunStorage(storage: Pick<Storage, 'removeItem'>): void {
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      // Storage may be unavailable; nothing to prune then.
    }
  }
}

// Short, user-safe description of why a Worker request failed, so the panel
// message says what actually happened instead of a generic "try again".
export function describeRequestFailure(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') return 'request timed out';
  if (typeof error === 'object' && error !== null) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number') return `server responded ${status}`;
  }
  if (error instanceof TypeError) return 'network request blocked or offline';
  if (error instanceof Error && error.message) return error.message.slice(0, 120);
  return 'unknown error';
}
