import { describe, expect, it } from 'vitest';

import { discoverPages, indexStatus, processBatch } from '../src/ingest.js';
import { searchDocs } from '../src/search.js';
import type { IndexDeps } from '../src/types.js';
import { createLocalSql, createMemoryVectors, createWordHashEmbedder } from './support/local.js';
import { defaultPages, docsSite } from './support/site.js';

const GUIDELINES = 'https://developers.webflow.com/apps/docs/marketplace-guidelines';
const BETA_GUIDELINES = 'https://developers.webflow.com/data/v2.0.0-beta/apps/docs/marketplace-guidelines';

function setup(pages = defaultPages()) {
  const site = docsSite(pages);
  const sql = createLocalSql();
  const vectors = createMemoryVectors();
  const embedder = createWordHashEmbedder();
  let clock = Date.parse('2026-11-27T12:00:00Z');
  const deps: IndexDeps = { sql, embedder, vectors, fetchFn: site.fetchFn, now: () => new Date((clock += 1000)) };
  const pageRows = () => sql.all<{ url: string; alias_of: string | null; chunk_count: number; error: string | null }>('SELECT url, alias_of, chunk_count, error FROM pages ORDER BY url');
  return { site, sql, vectors, embedder, deps, pageRows };
}

describe('discoverPages', () => {
  it('lists the pages of the llms.txt tree without the v1 docs', async () => {
    const { deps, pageRows } = setup();
    expect(await discoverPages(deps)).toEqual({ listed: 5, added: 5, removed: 0, removalSkipped: false });
    expect((await pageRows()).map((row) => row.url)).toEqual([
      GUIDELINES,
      'https://developers.webflow.com/data/reference/scopes',
      BETA_GUIDELINES,
      'https://developers.webflow.com/data/v2.0.0-beta/reference/branches',
      'https://developers.webflow.com/designer/reference/resize-extension',
    ]);
  });

  it('removes a page the docs no longer list, with its chunks and vectors', async () => {
    const { site, deps, vectors, sql } = setup();
    await discoverPages(deps);
    await processBatch(deps, { limit: 50 });
    site.pages['/llms.txt'] = site.pages['/llms.txt'].split('\n').filter((line) => !line.includes('/designer/')).join('\n');
    expect(await discoverPages(deps)).toMatchObject({ listed: 4, removed: 1, removalSkipped: false });
    expect(await sql.all("SELECT 1 FROM chunks WHERE page_url LIKE '%resize-extension'")).toEqual([]);
    expect(await sql.all("SELECT 1 FROM chunks_fts WHERE chunks_fts MATCH 'setExtensionSize'")).toEqual([]);
    const { passages } = await searchDocs(deps, { query: 'setExtensionSize', topK: 20 });
    expect(passages.some((passage) => passage.url.includes('resize-extension'))).toBe(false);
    expect([...vectors.records.keys()]).toHaveLength((await indexStatus(deps)).chunks);
  });

  it('removes nothing when the crawl lists far fewer pages than it knows', async () => {
    const { site, deps } = setup();
    await discoverPages(deps);
    site.pages['/llms.txt'] = site.pages['/llms.txt'].split('\n')[0];
    expect(await discoverPages(deps)).toMatchObject({ listed: 1, removed: 0, removalSkipped: true });
    expect((await indexStatus(deps)).pages).toBe(5);
  });

  it('removes nothing when a section index fails or comes back empty', async () => {
    const { site, deps, vectors } = setup();
    await discoverPages(deps);
    await processBatch(deps, { limit: 50 });
    const vectorCount = vectors.records.size;

    const designerIndex = site.pages['/designer/llms.txt'];
    delete site.pages['/designer/llms.txt'];
    expect(await discoverPages(deps)).toMatchObject({ listed: 4, removed: 0, removalSkipped: true });
    site.pages['/designer/llms.txt'] = '';
    expect(await discoverPages(deps)).toMatchObject({ listed: 4, removed: 0, removalSkipped: true });
    expect((await indexStatus(deps)).pages).toBe(5);
    expect(vectors.records.size).toBe(vectorCount);

    site.pages['/designer/llms.txt'] = designerIndex;
    expect(await discoverPages(deps)).toMatchObject({ listed: 5, removed: 0, removalSkipped: false });
  });

  it('fails when the root index is not served', async () => {
    const { site, deps } = setup();
    delete site.pages['/llms.txt'];
    await expect(discoverPages(deps)).rejects.toThrow('HTTP 404');
  });
});

describe('processBatch', () => {
  it('indexes each body once: the beta copy of a page points at the current page', async () => {
    const { deps, pageRows } = setup();
    await discoverPages(deps);
    expect(await processBatch(deps, { limit: 50 })).toEqual({ checked: 5, indexed: 4, unchanged: 0, aliased: 1, failed: 0, neverChecked: 0 });
    const rows = await pageRows();
    expect(rows.find((row) => row.url === GUIDELINES)).toMatchObject({ alias_of: null, chunk_count: 3 });
    expect(rows.find((row) => row.url === BETA_GUIDELINES)).toMatchObject({ alias_of: GUIDELINES, chunk_count: 0 });
  });

  it('does not embed again when nothing changed', async () => {
    const { deps, embedder } = setup();
    await discoverPages(deps);
    await processBatch(deps, { limit: 50 });
    const calls = embedder.calls;
    expect(await processBatch(deps, { limit: 50 })).toMatchObject({ checked: 5, indexed: 0, unchanged: 5 });
    expect(embedder.calls).toBe(calls);
  });

  it('replaces the passages of a page that changed and drops the vectors it no longer needs', async () => {
    const { site, deps, vectors, sql } = setup();
    await discoverPages(deps);
    await processBatch(deps, { limit: 50 });
    site.pages['/apps/docs/marketplace-guidelines.md'] = '# Marketplace Guidelines\n\n## Token security\n\n1. Encrypt OAuth tokens at rest.';
    // The beta copy still has the old body, so it is indexed on its own in the same batch.
    expect(await processBatch(deps, { limit: 50 })).toMatchObject({ indexed: 2, unchanged: 3 });

    const { passages } = await searchDocs(deps, { query: 'OAuth tokens' });
    expect(passages[0].text).toBe('1. Encrypt OAuth tokens at rest.');
    const ads = await searchDocs(deps, { query: 'display ads', topK: 20 });
    expect(ads.passages.some((passage) => passage.text.includes('ads'))).toBe(false);
    const chunks = await sql.all<{ vector_id: string }>('SELECT vector_id FROM chunks');
    expect([...vectors.records.keys()].sort()).toEqual(chunks.map((chunk) => chunk.vector_id).sort());
  });

  it('indexes the beta copy on its own after the current page diverges from it', async () => {
    const { site, deps, pageRows } = setup();
    await discoverPages(deps);
    await processBatch(deps, { limit: 50 });
    site.pages['/apps/docs/marketplace-guidelines.md'] = '# Marketplace Guidelines\n\n## Token security\n\n1. Encrypt OAuth tokens at rest.';
    expect(await processBatch(deps, { limit: 50 })).toMatchObject({ indexed: 2, unchanged: 3 });
    // The change released the beta copy, and the same batch indexed it on its own.
    expect((await pageRows()).find((row) => row.url === BETA_GUIDELINES)).toMatchObject({ alias_of: null, chunk_count: 3 });
    const withBeta = await searchDocs(deps, { query: 'display ads to users', includeBeta: true });
    expect(withBeta.passages[0]).toMatchObject({ version: 'beta', url: `${BETA_GUIDELINES}#advertising` });
  });

  it('lets the preferred copy take over when it is indexed after the other copy', async () => {
    const pages = defaultPages();
    const currentBody = pages['/apps/docs/marketplace-guidelines.md'];
    pages['/apps/docs/marketplace-guidelines.md'] = '# Marketplace Guidelines\n\nPlaceholder.';
    const { site, deps, pageRows, vectors, sql } = setup(pages);
    await discoverPages(deps);
    await processBatch(deps, { limit: 50 });
    expect((await pageRows()).find((row) => row.url === BETA_GUIDELINES)).toMatchObject({ alias_of: null, chunk_count: 3 });

    site.pages['/apps/docs/marketplace-guidelines.md'] = currentBody;
    await processBatch(deps, { limit: 50 });
    const rows = await pageRows();
    expect(rows.find((row) => row.url === GUIDELINES)).toMatchObject({ alias_of: null, chunk_count: 3 });
    expect(rows.find((row) => row.url === BETA_GUIDELINES)).toMatchObject({ alias_of: GUIDELINES, chunk_count: 0 });
    const chunks = await sql.all<{ vector_id: string }>('SELECT vector_id FROM chunks');
    expect([...vectors.records.keys()].sort()).toEqual(chunks.map((chunk) => chunk.vector_id).sort());
  });

  it('keeps the passages of a page whose fetch fails and records the reason', async () => {
    const { site, deps, pageRows } = setup();
    await discoverPages(deps);
    await processBatch(deps, { limit: 50 });
    delete site.pages['/designer/reference/resize-extension.md'];
    expect(await processBatch(deps, { limit: 50 })).toMatchObject({ failed: 1, unchanged: 4 });
    expect((await pageRows()).find((row) => row.url.endsWith('resize-extension'))).toMatchObject({ chunk_count: 1, error: 'HTTP 404' });
    expect((await searchDocs(deps, { query: 'setExtensionSize' })).passages[0].url).toContain('resize-extension');
  });

  it('keeps the passages when a page answers 200 with an empty or HTML body', async () => {
    const { site, deps, pageRows, vectors } = setup();
    await discoverPages(deps);
    await processBatch(deps, { limit: 50 });
    const vectorCount = vectors.records.size;
    site.pages['/designer/reference/resize-extension.md'] = '';
    site.pages['/apps/docs/marketplace-guidelines.md'] = '<!doctype html><html><body>Not found</body></html>';
    expect(await processBatch(deps, { limit: 50 })).toMatchObject({ failed: 2, indexed: 0 });
    const rows = await pageRows();
    expect(rows.find((row) => row.url === GUIDELINES)).toMatchObject({ chunk_count: 3, error: 'no Markdown title in the response' });
    expect(rows.find((row) => row.url.endsWith('resize-extension'))).toMatchObject({ chunk_count: 1 });
    expect(vectors.records.size).toBe(vectorCount);
  });

  it('does not delete the vectors of the other copy when the take-over write fails', async () => {
    const pages = defaultPages();
    const currentBody = pages['/apps/docs/marketplace-guidelines.md'];
    pages['/apps/docs/marketplace-guidelines.md'] = '# Marketplace Guidelines\n\nPlaceholder.';
    const { site, deps, pageRows, vectors, sql } = setup(pages);
    await discoverPages(deps);
    await processBatch(deps, { limit: 50 });

    site.pages['/apps/docs/marketplace-guidelines.md'] = currentBody;
    const failing: IndexDeps = { ...deps, embedder: { embed: async () => Promise.reject(new Error('model down')) } };
    expect(await processBatch(failing, { limit: 50 })).toMatchObject({ failed: 1 });
    // The beta copy still holds its chunks and every one of them still has its vector.
    expect((await pageRows()).find((row) => row.url === BETA_GUIDELINES)).toMatchObject({ alias_of: null, chunk_count: 3 });
    const chunks = await sql.all<{ vector_id: string }>('SELECT vector_id FROM chunks');
    expect(chunks.every((chunk) => vectors.records.has(chunk.vector_id))).toBe(true);

    // The next pass, with the model back, completes the take-over.
    await processBatch(deps, { limit: 50 });
    expect((await pageRows()).find((row) => row.url === BETA_GUIDELINES)).toMatchObject({ alias_of: GUIDELINES, chunk_count: 0 });
  });

  it('checks never-fetched pages first, then the pages checked longest ago', async () => {
    const { site, deps } = setup();
    await discoverPages(deps);
    expect(await processBatch(deps, { limit: 2 })).toMatchObject({ checked: 2, neverChecked: 3 });
    expect(await processBatch(deps, { limit: 3 })).toMatchObject({ checked: 3, neverChecked: 0 });
    site.requests.length = 0;
    await processBatch(deps, { limit: 2 });
    // Shortest URLs were fetched first in the first batch, so they are the oldest checks now.
    expect(site.requests).toEqual(['/data/v2.0.0/reference/scopes.md', '/apps/docs/marketplace-guidelines.md']);
  });
});
