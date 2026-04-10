import { defaultOverrides } from './default-overrides.js';
import type { Env, StoredOverride } from './types.js';

function cleanString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeOverridePath(value: string | null | undefined): string | null {
  if (!value) return null;

  let candidate = value.trim();
  if (!candidate) return null;

  if (/^https?:\/\//i.test(candidate)) {
    try {
      candidate = new URL(candidate).pathname;
    } catch {
      return null;
    }
  } else {
    candidate = candidate.split('?')[0]?.split('#')[0] ?? candidate;
  }

  if (!candidate.startsWith('/')) {
    candidate = `/${candidate}`;
  }

  candidate = candidate.replace(/\/{2,}/g, '/');
  if (candidate.length > 1) {
    candidate = candidate.replace(/\/+$/, '');
  }

  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    // Keep the raw path if it cannot be decoded.
  }

  return candidate.toLowerCase();
}

function normalizeStoredOverride(value: unknown): StoredOverride | null {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const path = normalizeOverridePath(cleanString(record.path));
  if (!path) return null;

  const seoTitle = cleanString(record.seoTitle);
  const seoDescription = cleanString(record.seoDescription);
  const openGraphTitle = cleanString(record.openGraphTitle);
  const openGraphDescription = cleanString(record.openGraphDescription);

  if (!seoTitle && !seoDescription && !openGraphTitle && !openGraphDescription) {
    return null;
  }

  return {
    path,
    label: cleanString(record.label),
    seoTitle,
    seoDescription,
    openGraphTitle,
    openGraphDescription,
    notes: cleanString(record.notes),
    updatedAt: cleanString(record.updatedAt) ?? new Date().toISOString(),
  };
}

function dedupeOverrides(overrides: StoredOverride[]): StoredOverride[] {
  const byPath = new Map<string, StoredOverride>();
  for (const entry of overrides) {
    byPath.set(entry.path, entry);
  }
  return Array.from(byPath.values()).sort((left, right) => left.path.localeCompare(right.path));
}

export function loadOverrides(env: Env): StoredOverride[] {
  if (!env.DEFAULT_OVERRIDES_JSON) {
    return dedupeOverrides(defaultOverrides);
  }

  try {
    const parsed = JSON.parse(env.DEFAULT_OVERRIDES_JSON) as unknown;
    if (!Array.isArray(parsed)) {
      return dedupeOverrides(defaultOverrides);
    }

    const collected = parsed
      .map((entry) => normalizeStoredOverride(entry))
      .filter((entry): entry is StoredOverride => Boolean(entry));

    return collected.length > 0 ? dedupeOverrides(collected) : dedupeOverrides(defaultOverrides);
  } catch {
    return dedupeOverrides(defaultOverrides);
  }
}
