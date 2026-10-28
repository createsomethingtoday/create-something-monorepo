import { afterEach, describe, expect, it, vi } from 'vitest';

import { applyPopularShuffle, popularShuffleFor, popularShuffleWindow } from '../src/popular-shuffle.js';
import { parseSearchParams } from '../src/query.js';
import { searchTemplates } from '../src/search.js';
import type { Env } from '../src/types.js';
import { createTestEnv } from './support/worker.js';

const DAY_ONE = new Date('2026-10-21T12:00:00Z');
const DAY_TWO = new Date('2026-10-22T12:00:00Z');

function params(query: string) {
  return parseSearchParams(new URL(`https://templates.test/api/templates/search?${query}`), 24);
}

function rows(count: number) {
  return Array.from({ length: count }, (_, index) => ({ id: `rec${String(index).padStart(3, '0')}` }));
}

describe('popularShuffleFor', () => {
  const env = { POPULAR_SHUFFLE_BANDS: '3' } as Env;

  it('is off unless bands are configured', () => {
    expect(popularShuffleFor({} as Env, params('sort=popular'))).toBeNull();
    expect(popularShuffleFor({ POPULAR_SHUFFLE_BANDS: '0' } as Env, params('sort=popular'))).toBeNull();
  });

  it('only applies to popular browse, never to text search or other sorts', () => {
    expect(popularShuffleFor(env, params('sort=popular'), DAY_ONE)).toEqual({ seed: '2026-10-21', bandSize: 24, limit: 72 });
    expect(popularShuffleFor(env, params(''), DAY_ONE)?.seed).toBe('2026-10-21');
    expect(popularShuffleFor(env, params('sort=popular&q=agency'))).toBeNull();
    expect(popularShuffleFor(env, params('sort=newest'))).toBeNull();
    expect(popularShuffleFor(env, params('sort=best_selling'))).toBeNull();
  });
});

describe('popularShuffleWindow', () => {
  const shuffle = { seed: '2026-10-21', bandSize: 24, limit: 72 };

  it('reads exactly one page for band-aligned pages', () => {
    expect(popularShuffleWindow(shuffle, 0, 24)).toEqual({ offset: 0, limit: 24 });
    expect(popularShuffleWindow(shuffle, 48, 24)).toEqual({ offset: 48, limit: 24 });
  });

  it('widens unaligned pages to whole bands', () => {
    expect(popularShuffleWindow(shuffle, 0, 8)).toEqual({ offset: 0, limit: 24 });
    expect(popularShuffleWindow(shuffle, 12, 12)).toEqual({ offset: 0, limit: 24 });
    expect(popularShuffleWindow(shuffle, 60, 24)).toEqual({ offset: 48, limit: 36 });
  });

  it('leaves pages past the last band alone', () => {
    expect(popularShuffleWindow(shuffle, 72, 24)).toBeNull();
  });
});

describe('applyPopularShuffle', () => {
  const shuffle = { seed: '2026-10-21', bandSize: 24, limit: 72 };

  it('keeps band membership, changes order, and is stable for a seed', () => {
    const input = rows(96);
    const first = applyPopularShuffle(shuffle, input, 0);
    const again = applyPopularShuffle(shuffle, input, 0);
    expect(first).toEqual(again);
    for (const start of [0, 24, 48]) {
      const band = first.slice(start, start + 24).map((row) => row.id).sort();
      expect(band).toEqual(input.slice(start, start + 24).map((row) => row.id));
    }
    expect(first.slice(0, 24)).not.toEqual(input.slice(0, 24));
    expect(first.slice(72)).toEqual(input.slice(72));
  });

  it('changes order across days', () => {
    const input = rows(24);
    const nextDay = applyPopularShuffle({ ...shuffle, seed: '2026-10-22' }, input, 0);
    expect(nextDay).not.toEqual(applyPopularShuffle(shuffle, input, 0));
  });
});

describe('searchTemplates popular shuffle', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  async function seed(env: Env, count: number) {
    const values = Array.from({ length: count }, (_, index) =>
      `('rec${String(index).padStart(3, '0')}', 'template-${index}', 'Template ${index}', ${count - index}, '2026-10-01T00:00:00Z')`,
    ).join(',');
    await env.DB.prepare(
      `INSERT INTO template_documents (id, template_slug, name, popularity_score, synced_at) VALUES ${values}`,
    ).run();
  }

  async function names(env: Env, query: string) {
    const payload = await searchTemplates(env, params(query));
    return payload.items.map((item) => item.name);
  }

  it('pages through every template exactly once in daily-shuffled bands', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(DAY_ONE);
    const { env, close } = createTestEnv();
    env.POPULAR_SHUFFLE_BANDS = '3';
    env.POPULAR_SHUFFLE_BAND_SIZE = '4';
    try {
      await seed(env, 16);
      const strict = Array.from({ length: 16 }, (_, index) => `Template ${index}`);

      const pages = [];
      for (let page = 1; page <= 4; page += 1) pages.push(...(await names(env, `sort=popular&page=${page}&page_size=4`)));
      expect(new Set(pages).size).toBe(16);
      for (const start of [0, 4, 8]) {
        expect(pages.slice(start, start + 4).sort()).toEqual(strict.slice(start, start + 4).sort());
      }
      expect(pages.slice(0, 12)).not.toEqual(strict.slice(0, 12));
      expect(pages.slice(12)).toEqual(strict.slice(12));

      // Odd page sizes see the same order as the grid.
      const carousel = await names(env, 'sort=popular&page=1&page_size=3');
      expect(carousel).toEqual(pages.slice(0, 3));
      const unaligned = await names(env, 'sort=popular&page=2&page_size=6');
      expect(unaligned).toEqual(pages.slice(6, 12));

      vi.setSystemTime(DAY_TWO);
      const nextDay = [];
      for (let page = 1; page <= 3; page += 1) nextDay.push(...(await names(env, `sort=popular&page=${page}&page_size=4`)));
      expect(nextDay).not.toEqual(pages.slice(0, 12));

      // Other sorts keep their strict order.
      expect(await names(env, 'sort=newest&page=1&page_size=4')).toHaveLength(4);
      env.POPULAR_SHUFFLE_BANDS = '0';
      expect(await names(env, 'sort=popular&page=1&page_size=4')).toEqual(strict.slice(0, 4));
    } finally {
      close();
    }
  });
});
