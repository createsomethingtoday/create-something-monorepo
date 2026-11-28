import { describe, expect, it } from 'vitest';

import { buildKeywordQuery, fuseRankings, searchDocs } from '../src/search.js';
import { discoverPages, processBatch } from '../src/ingest.js';
import type { IndexDeps } from '../src/types.js';
import { createLocalSql, createMemoryVectors, createWordHashEmbedder } from './support/local.js';
import { docsSite } from './support/site.js';

describe('buildKeywordQuery', () => {
  it('keeps an identifier together as a phrase, drops filler words, and adds the other number of a word', () => {
    expect(buildKeywordQuery('Is the custom_code:write scope needed for ads?')).toBe(
      '"custom code write" OR "custom" OR "customs" OR "code" OR "codes" OR "write" OR "writes" OR "scope" OR "scopes" OR "needed" OR "neededs" OR "ads" OR "ad"',
    );
  });

  it('adds a word form to letters-only words and not to tokens with digits', () => {
    expect(buildKeywordQuery('setExtensionSize 1200x800 v2')).toBe('"setextensionsize" OR "setextensionsizes" OR "1200x800" OR "v2"');
  });

  it('cannot be broken by FTS syntax in the question', () => {
    expect(buildKeywordQuery('scope" OR NEAR(* -token')).toBe('"scope" OR "scopes" OR "near" OR "nears" OR "token" OR "tokens"');
    expect(buildKeywordQuery('the of and')).toBeNull();
    expect(buildKeywordQuery('"" ** ::')).toBeNull();
  });
});

describe('fuseRankings', () => {
  it('ranks a passage found by both legs above one found by a single leg', () => {
    const fused = fuseRankings({ keyword: ['a', 'b'], semantic: ['c', 'b'] });
    expect(fused[0]).toMatchObject({ id: 'b', matched: ['keyword', 'semantic'] });
    expect(fused.map((entry) => entry.id).sort()).toEqual(['a', 'b', 'c']);
  });
});

async function indexedSite(): Promise<IndexDeps> {
  const deps: IndexDeps = {
    sql: createLocalSql(),
    embedder: createWordHashEmbedder(),
    vectors: createMemoryVectors(),
    fetchFn: docsSite().fetchFn,
    now: () => new Date('2026-11-27T12:00:00Z'),
  };
  await discoverPages(deps);
  await processBatch(deps, { limit: 50 });
  return deps;
}

describe('searchDocs', () => {
  it('returns the exact passage with its section URL', async () => {
    const deps = await indexedSite();
    const { passages, degraded } = await searchDocs(deps, { query: 'Where must the app store OAuth tokens?' });
    expect(degraded).toEqual([]);
    expect(passages[0]).toMatchObject({
      url: 'https://developers.webflow.com/apps/docs/marketplace-guidelines#token-security',
      headingPath: 'Marketplace Guidelines > Token security',
      text: '1. Store OAuth tokens in secure, server-side storage. Tokens must never be stored in browser local storage.',
      version: 'current',
      checkedAt: '2026-11-27T12:00:00.000Z',
    });
  });

  it('finds an exact identifier through the keyword leg', async () => {
    const deps = await indexedSite();
    const { passages } = await searchDocs(deps, { query: 'custom_code:write' });
    expect(passages[0].url).toBe('https://developers.webflow.com/data/reference/scopes');
    expect(passages[0].matched).toContain('keyword');
  });

  it('searches the current docs unless beta is asked for, and returns a repeated passage once', async () => {
    const deps = await indexedSite();
    const current = await searchDocs(deps, { query: 'beta only endpoint for branch merge', topK: 10 });
    expect(current.passages.some((passage) => passage.version === 'beta')).toBe(false);

    const withBeta = await searchDocs(deps, { query: 'beta only endpoint for branch merge', topK: 10, includeBeta: true });
    expect(withBeta.passages[0]).toMatchObject({ version: 'beta', url: 'https://developers.webflow.com/data/v2.0.0-beta/reference/branches' });
    const texts = withBeta.passages.map((passage) => passage.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('still answers from the keyword leg when the embedding model fails', async () => {
    const deps = await indexedSite();
    const failing: IndexDeps = { ...deps, embedder: { embed: async () => Promise.reject(new Error('model down')) } };
    const { passages, degraded } = await searchDocs(failing, { query: 'setExtensionSize' });
    expect(degraded).toEqual(['semantic']);
    expect(passages[0].url).toBe('https://developers.webflow.com/designer/reference/resize-extension#webflowsetextensionsizesize');
  });

  it('orders the candidates by the reranker when there is one', async () => {
    const deps = await indexedSite();
    const seen: string[][] = [];
    const reranker = {
      rerank: async (_query: string, texts: string[]) => {
        seen.push(texts);
        return texts.map((text) => (text.includes('Do not display ads') ? 0.9 : 0.1));
      },
    };
    const { passages, degraded } = await searchDocs({ ...deps, reranker }, { query: 'Where must the app store OAuth tokens?' });
    expect(degraded).toEqual([]);
    expect(passages[0]).toMatchObject({ url: 'https://developers.webflow.com/apps/docs/marketplace-guidelines#advertising', score: 0.9 });
    // The reranker reads the heading path with the passage.
    expect(seen[0]).toContain('Marketplace Guidelines > Advertising\n\n1. Do not display ads to users.');
  });

  it('keeps the merged order and names the stage when the reranker fails', async () => {
    const deps = await indexedSite();
    const plain = await searchDocs(deps, { query: 'Where must the app store OAuth tokens?' });
    const reranker = { rerank: async () => Promise.reject(new Error('model down')) };
    const { passages, degraded } = await searchDocs({ ...deps, reranker }, { query: 'Where must the app store OAuth tokens?' });
    expect(degraded).toEqual(['rerank']);
    expect(passages).toEqual(plain.passages);
  });

  it('returns nothing for an empty question', async () => {
    const deps = await indexedSite();
    expect(await searchDocs(deps, { query: '   ' })).toEqual({ passages: [], degraded: [] });
  });
});
