import type { Env, SearchParams } from './types.js';

// Popular browse order rotates once a day inside fixed rank bands (ranks 1–24,
// 25–48, …) so the top of the grid does not look frozen while proven templates
// stay on top. Bands are absolute ranks, so every page size sees the same band
// membership and paging never repeats or skips a template. Everything past the
// last band keeps the strict popularity order.

export interface PopularShuffle {
  seed: string;
  bandSize: number;
  limit: number;
}

const DEFAULT_BAND_SIZE = 24;

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Off unless POPULAR_SHUFFLE_BANDS is a positive integer. */
export function popularShuffleFor(env: Env, params: SearchParams, now: Date = new Date()): PopularShuffle | null {
  if (params.sort !== 'popular' || params.q || params.templateSlug) return null;
  const bands = positiveInt(env.POPULAR_SHUFFLE_BANDS, 0);
  if (bands === 0) return null;
  const bandSize = positiveInt(env.POPULAR_SHUFFLE_BAND_SIZE, DEFAULT_BAND_SIZE);
  return { seed: now.toISOString().slice(0, 10), bandSize, limit: bands * bandSize };
}

/** The strict-order row window a page needs so every band it touches is whole. */
export function popularShuffleWindow(shuffle: PopularShuffle, offset: number, pageSize: number): { offset: number; limit: number } | null {
  if (offset >= shuffle.limit) return null;
  const start = Math.floor(offset / shuffle.bandSize) * shuffle.bandSize;
  const pageEnd = offset + pageSize;
  const bandEnd = Math.min(Math.ceil(pageEnd / shuffle.bandSize) * shuffle.bandSize, shuffle.limit);
  return { offset: start, limit: Math.max(pageEnd, bandEnd) - start };
}

// FNV-1a: a stable per-template key, so a template entering or leaving a band
// does not reorder the others.
function shuffleKey(seed: string, id: string): number {
  let hash = 0x811c9dc5;
  const input = `${seed}:${id}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Reorders whole bands in `rows` (fetched in strict order from `windowOffset`). */
export function applyPopularShuffle<T extends { id: string }>(
  shuffle: PopularShuffle,
  rows: T[],
  windowOffset: number,
): T[] {
  const result: T[] = [];
  for (let index = 0; index < rows.length; ) {
    const rank = windowOffset + index;
    if (rank >= shuffle.limit) {
      result.push(...rows.slice(index));
      break;
    }
    const bandEnd = (Math.floor(rank / shuffle.bandSize) + 1) * shuffle.bandSize - windowOffset;
    const band = rows.slice(index, bandEnd);
    band.sort((a, b) => shuffleKey(shuffle.seed, a.id) - shuffleKey(shuffle.seed, b.id) || (a.id < b.id ? -1 : 1));
    result.push(...band);
    index += band.length;
  }
  return result;
}
