import { chunkPage } from './chunk.js';
import { pageBody, parseIndex, ROOT_INDEX_URL, toPageRef } from './pages.js';
import type { Chunk, DocsVersion, IndexDeps, PageRef, SqlStatement, VectorRecord } from './types.js';

/** Bump when the chunk rules or the embedding model change: every page is then indexed again. */
export const INDEX_VERSION = 1;

const USER_AGENT = 'webflow-docs-index/1.0 (+app review docs search)';
const MAX_INDEX_FILES = 80;
const FETCH_CONCURRENCY = 6;
const EMBED_BATCH_SIZE = 32;
const VECTOR_BATCH_SIZE = 100;
const SQL_BATCH_SIZE = 80;
/** A crawl that lists under this share of the known pages removes nothing. */
const MIN_LISTED_SHARE_FOR_REMOVAL = 0.6;

interface PageRow {
  url: string;
  source_url: string;
  version: DocsVersion;
  rank: number;
  body_hash: string | null;
  alias_of: string | null;
  index_version: number;
  chunk_count: number;
}

const PAGE_COLUMNS = 'url, source_url, version, rank, body_hash, alias_of, index_version, chunk_count';

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function vectorIds(pageUrl: string, count: number): Promise<string[]> {
  const pageKey = (await sha256Hex(pageUrl)).slice(0, 24);
  return Array.from({ length: count }, (_, ordinal) => `${pageKey}:${ordinal}`);
}

function inBatches<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let start = 0; start < items.length; start += size) batches.push(items.slice(start, start + size));
  return batches;
}

async function fetchText(deps: Pick<IndexDeps, 'fetchFn'>, url: string): Promise<{ status: number; text: string }> {
  const response = await deps.fetchFn(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/markdown, text/plain' } });
  return { status: response.status, text: response.ok ? await response.text() : '' };
}

function deleteChunkRows(pageUrl: string): SqlStatement[] {
  return [
    { sql: 'DELETE FROM chunks_fts WHERE rowid IN (SELECT id FROM chunks WHERE page_url = ?)', params: [pageUrl] },
    { sql: 'DELETE FROM chunks WHERE page_url = ?', params: [pageUrl] },
  ];
}

/**
 * Delete the vectors of a page. Call it after the database commit that removed
 * the chunk rows: a vector without a row is dropped by the search, but a row
 * without its vector would be lost to the vector leg until the page changes.
 */
async function deleteVectors(deps: Pick<IndexDeps, 'vectors'>, pageUrl: string, chunkCount: number): Promise<void> {
  if (chunkCount === 0) return;
  try {
    await deps.vectors.deleteByIds(await vectorIds(pageUrl, chunkCount));
  } catch (error) {
    console.error(`docs index: vectors of ${pageUrl} were not deleted`, error);
  }
}

/** Pages that pointed at `canonicalUrl` are fetched again on the next batch and find their own place. */
function releaseAliases(canonicalUrl: string): SqlStatement {
  return {
    sql: 'UPDATE pages SET alias_of = NULL, body_hash = NULL, checked_at = NULL WHERE alias_of = ?',
    params: [canonicalUrl],
  };
}

export interface DiscoverResult {
  listed: number;
  added: number;
  removed: number;
  /** True when pages looked removed but the crawl was incomplete or listed too few pages to trust it. */
  removalSkipped: boolean;
}

/** Read the llms.txt tree, add new pages, and remove pages the docs no longer list. */
export async function discoverPages(deps: IndexDeps): Promise<DiscoverResult> {
  const queue = [ROOT_INDEX_URL];
  const visited = new Set<string>();
  const refs = new Map<string, PageRef>();
  // A section index that fails, is empty, or is not reached must not make its pages look removed.
  let complete = true;
  while (queue.length > 0) {
    if (visited.size >= MAX_INDEX_FILES) {
      complete = false;
      break;
    }
    const indexUrl = queue.shift() as string;
    if (visited.has(indexUrl)) continue;
    visited.add(indexUrl);
    const { status, text } = await fetchText(deps, indexUrl);
    if (status !== 200) {
      if (indexUrl === ROOT_INDEX_URL) throw new Error(`The docs index ${ROOT_INDEX_URL} returned HTTP ${status}.`);
      console.error(`docs index: ${indexUrl} returned HTTP ${status}`);
      complete = false;
      continue;
    }
    const listing = parseIndex(text);
    if (listing.indexes.length === 0 && listing.pages.length === 0) complete = false;
    queue.push(...listing.indexes);
    for (const page of listing.pages) {
      const ref = toPageRef(page.sourceUrl, page.title);
      if (ref && !refs.has(ref.url)) refs.set(ref.url, ref);
    }
  }

  const seenAt = deps.now().toISOString();
  const known = await deps.sql.all<{ url: string; chunk_count: number }>('SELECT url, chunk_count FROM pages');
  const knownUrls = new Set(known.map((row) => row.url));
  const upserts: SqlStatement[] = [...refs.values()].map((ref) => ({
    sql: `INSERT INTO pages (url, source_url, title, product, version, rank, seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(url) DO UPDATE SET source_url = excluded.source_url, title = excluded.title, rank = excluded.rank,
            seen_at = excluded.seen_at`,
    params: [ref.url, ref.sourceUrl, ref.title, ref.product, ref.version, ref.rank, seenAt],
  }));
  for (const batch of inBatches(upserts, SQL_BATCH_SIZE)) await deps.sql.batch(batch);

  const gone = known.filter((row) => !refs.has(row.url));
  const removalSkipped = gone.length > 0 && (!complete || refs.size < known.length * MIN_LISTED_SHARE_FOR_REMOVAL);
  if (!removalSkipped) {
    for (const row of gone) {
      await deps.sql.batch([...deleteChunkRows(row.url), releaseAliases(row.url), { sql: 'DELETE FROM pages WHERE url = ?', params: [row.url] }]);
      await deleteVectors(deps, row.url, row.chunk_count);
    }
  }

  return {
    listed: refs.size,
    added: [...refs.keys()].filter((url) => !knownUrls.has(url)).length,
    removed: removalSkipped ? 0 : gone.length,
    removalSkipped,
  };
}

async function writeChunks(deps: IndexDeps, page: PageRow, chunks: Chunk[], bodyHash: string, extra: SqlStatement[]): Promise<void> {
  const ids = await vectorIds(page.url, Math.max(chunks.length, page.chunk_count));
  const records: VectorRecord[] = [];
  for (const batch of inBatches(chunks, EMBED_BATCH_SIZE)) {
    const embeddings = await deps.embedder.embed(
      batch.map((chunk) => `${chunk.headingPath}\n\n${chunk.text}`),
      'passage',
    );
    batch.forEach((chunk, index) => records.push({ id: ids[chunk.ordinal], values: embeddings[index], version: page.version }));
  }
  // Vectors first: when the commit below fails, the body hash stays old and the next check writes the page again.
  for (const batch of inBatches(records, VECTOR_BATCH_SIZE)) await deps.vectors.upsert(batch);

  const now = deps.now().toISOString();
  const inserts: SqlStatement[] = [];
  for (const chunk of chunks) {
    inserts.push({
      sql: `INSERT INTO chunks (vector_id, page_url, ordinal, heading_path, anchor, text, text_hash, version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [ids[chunk.ordinal], page.url, chunk.ordinal, chunk.headingPath, chunk.anchor, chunk.text, await sha256Hex(chunk.text), page.version],
    });
  }
  await deps.sql.batch([
    { sql: 'DELETE FROM chunks_fts WHERE rowid IN (SELECT id FROM chunks WHERE page_url = ?)', params: [page.url] },
    { sql: 'DELETE FROM chunks WHERE page_url = ?', params: [page.url] },
    ...inserts,
    {
      sql: 'INSERT INTO chunks_fts (rowid, heading_path, text) SELECT id, heading_path, text FROM chunks WHERE page_url = ?',
      params: [page.url],
    },
    {
      sql: `UPDATE pages SET body_hash = ?, alias_of = NULL, index_version = ?, chunk_count = ?, checked_at = ?, indexed_at = ?, error = NULL
             WHERE url = ?`,
      params: [bodyHash, INDEX_VERSION, chunks.length, now, now, page.url],
    },
    ...extra,
  ]);
  if (page.chunk_count > chunks.length) {
    await deps.vectors.deleteByIds(ids.slice(chunks.length)).catch((error) => console.error(`docs index: old vectors of ${page.url} were not deleted`, error));
  }
}

type PageOutcome = 'indexed' | 'unchanged' | 'aliased' | 'failed';

async function processPage(deps: IndexDeps, page: PageRow, fetched: { status: number; text: string } | Error): Promise<PageOutcome> {
  const now = deps.now().toISOString();
  if (fetched instanceof Error || fetched.status !== 200) {
    const reason = fetched instanceof Error ? fetched.message : `HTTP ${fetched.status}`;
    // The chunks stay: a page that fails one fetch is still the best copy we have.
    await deps.sql.batch([{ sql: 'UPDATE pages SET checked_at = ?, error = ? WHERE url = ?', params: [now, reason.slice(0, 300), page.url] }]);
    return 'failed';
  }

  const body = pageBody(fetched.text);
  if (!body.startsWith('# ')) {
    // Every docs page starts with its title. An empty or HTML answer with status 200 must not replace the passages.
    await deps.sql.batch([{ sql: 'UPDATE pages SET checked_at = ?, error = ? WHERE url = ?', params: [now, 'no Markdown title in the response', page.url] }]);
    return 'failed';
  }
  const bodyHash = await sha256Hex(body);
  if (page.body_hash === bodyHash && page.index_version === INDEX_VERSION) {
    await deps.sql.batch([{ sql: 'UPDATE pages SET checked_at = ?, error = NULL WHERE url = ?', params: [now, page.url] }]);
    return 'unchanged';
  }

  // The same body under another URL (the docs repeat app pages in each product): one copy holds the chunks.
  const [twin] = await deps.sql.all<PageRow>(
    `SELECT ${PAGE_COLUMNS}
       FROM pages
      WHERE body_hash = ? AND alias_of IS NULL AND index_version = ? AND url != ?
      ORDER BY rank LIMIT 1`,
    [bodyHash, INDEX_VERSION, page.url],
  );

  if (twin && twin.rank <= page.rank) {
    await deps.sql.batch([
      ...deleteChunkRows(page.url),
      releaseAliases(page.url),
      {
        sql: `UPDATE pages SET body_hash = ?, alias_of = ?, index_version = ?, chunk_count = 0, checked_at = ?, indexed_at = ?, error = NULL
               WHERE url = ?`,
        params: [bodyHash, twin.url, INDEX_VERSION, now, now, page.url],
      },
    ]);
    await deleteVectors(deps, page.url, page.chunk_count);
    return 'aliased';
  }

  const extra: SqlStatement[] = [];
  // This page's body changed, so pages that were copies of the old body must find their place again.
  if (page.body_hash !== null && page.body_hash !== bodyHash) extra.push(releaseAliases(page.url));
  if (twin) {
    // This page is the preferred copy: it takes over from the twin.
    extra.push(...deleteChunkRows(twin.url));
    extra.push({ sql: 'UPDATE pages SET alias_of = ? WHERE alias_of = ?', params: [page.url, twin.url] });
    extra.push({ sql: 'UPDATE pages SET alias_of = ?, chunk_count = 0 WHERE url = ?', params: [page.url, twin.url] });
  }
  await writeChunks(deps, page, chunkPage(body).chunks, bodyHash, extra);
  if (twin) await deleteVectors(deps, twin.url, twin.chunk_count);
  return 'indexed';
}

export interface BatchResult {
  checked: number;
  indexed: number;
  unchanged: number;
  aliased: number;
  failed: number;
  /** Pages that were never fetched. 0 = the first load is complete. */
  neverChecked: number;
}

/**
 * Fetch the pages that were checked longest ago (never-checked pages first)
 * and index the ones whose body changed. Stops early at `deadline`.
 */
export async function processBatch(deps: IndexDeps, options: { limit: number; deadline?: number }): Promise<BatchResult> {
  const pages = await deps.sql.all<PageRow>(
    `SELECT ${PAGE_COLUMNS}
       FROM pages
      ORDER BY (checked_at IS NOT NULL), checked_at, rank
      LIMIT ?`,
    [options.limit],
  );

  const result: BatchResult = { checked: 0, indexed: 0, unchanged: 0, aliased: 0, failed: 0, neverChecked: 0 };
  for (const group of inBatches(pages, FETCH_CONCURRENCY)) {
    if (options.deadline !== undefined && deps.now().getTime() >= options.deadline) break;
    const fetched = await Promise.all(
      group.map((page) => fetchText(deps, page.source_url).catch((error) => (error instanceof Error ? error : new Error(String(error))))),
    );
    // Writes run one page at a time: two copies of one body must not both become the holder of the chunks.
    for (const [index, listed] of group.entries()) {
      // Read the row again: an earlier page of this batch can have released or replaced this one.
      const [page] = await deps.sql.all<PageRow>(`SELECT ${PAGE_COLUMNS} FROM pages WHERE url = ?`, [listed.url]);
      if (!page) continue;
      let outcome: PageOutcome;
      try {
        outcome = await processPage(deps, page, fetched[index]);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.error(`docs index: ${page.url} failed`, error);
        await deps.sql.batch([
          { sql: 'UPDATE pages SET checked_at = ?, error = ? WHERE url = ?', params: [deps.now().toISOString(), reason.slice(0, 300), page.url] },
        ]);
        outcome = 'failed';
      }
      result.checked += 1;
      result[outcome] += 1;
    }
  }

  const [counts] = await deps.sql.all<{ n: number }>('SELECT COUNT(*) AS n FROM pages WHERE checked_at IS NULL');
  result.neverChecked = Number(counts?.n ?? 0);
  return result;
}

export interface IndexStatus {
  pages: number;
  chunks: number;
  neverChecked: number;
  withError: number;
  oldestCheck: string | null;
  indexVersion: number;
}

export async function indexStatus(deps: Pick<IndexDeps, 'sql'>): Promise<IndexStatus> {
  const [row] = await deps.sql.all<{ pages: number; never_checked: number; with_error: number; oldest_check: string | null }>(
    `SELECT COUNT(*) AS pages,
            SUM(checked_at IS NULL) AS never_checked,
            SUM(error IS NOT NULL) AS with_error,
            MIN(checked_at) AS oldest_check
       FROM pages`,
  );
  const [chunkRow] = await deps.sql.all<{ n: number }>('SELECT COUNT(*) AS n FROM chunks');
  return {
    pages: Number(row?.pages ?? 0),
    chunks: Number(chunkRow?.n ?? 0),
    neverChecked: Number(row?.never_checked ?? 0),
    withError: Number(row?.with_error ?? 0),
    oldestCheck: row?.oldest_check ?? null,
    indexVersion: INDEX_VERSION,
  };
}
