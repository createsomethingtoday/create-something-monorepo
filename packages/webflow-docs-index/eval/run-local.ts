/**
 * Option B, scored without a deploy: index the live docs with the real crawl,
 * chunk and search code, then score eval/questions.json.
 *
 * Stand-ins: SQLite in memory for D1, exact nearest-neighbour search in memory
 * for Vectorize. The embedding model is the real one, through `pnpm eval:embed-proxy`.
 *
 * Usage: pnpm eval:embed-proxy   (in a second terminal)
 *        pnpm eval:local [out.json]
 * Page bodies and embeddings are cached in .eval/ so a second run is fast.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { discoverPages, indexStatus, processBatch } from '../src/ingest.js';
import { searchDocs } from '../src/search.js';
import type { Embedder, IndexDeps, Passage, Reranker, SearchLeg } from '../src/types.js';
import { createLocalSql, createMemoryVectors } from '../test/support/local.js';

const EMBED_URL = process.env.EMBED_URL ?? 'http://127.0.0.1:8791/';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? '@cf/baai/bge-base-en-v1.5';
const CACHE_DIR = '.eval';
const PAGE_CACHE = `${CACHE_DIR}/pages.json`;
const EMBED_CACHE = `${CACHE_DIR}/embeddings-${EMBEDDING_MODEL.replace(/[^a-z0-9]+/gi, '-')}.json`;

interface Question {
  id: string;
  question: string;
  pages: string[];
  fact: string;
}

function readJson<T>(path: string, fallback: T): T {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : fallback;
}

mkdirSync(CACHE_DIR, { recursive: true });
const pageCache = readJson<Record<string, { status: number; text: string }>>(PAGE_CACHE, {});
const embedCache = new Map(Object.entries(readJson<Record<string, string>>(EMBED_CACHE, {})));

const cachedFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (!pageCache[url]) {
    const response = await fetch(url, init);
    pageCache[url] = { status: response.status, text: response.ok ? await response.text() : '' };
  }
  return new Response(pageCache[url].text, { status: pageCache[url].status });
}) as typeof fetch;

const embedder: Embedder = {
  async embed(texts, kind) {
    const keys = texts.map((text) => createHash('sha256').update(`${kind}\n${text}`).digest('hex'));
    const missing = texts.map((text, index) => ({ text, key: keys[index] })).filter((entry) => !embedCache.has(entry.key));
    if (missing.length > 0) {
      const response = await fetch(EMBED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: missing.map((entry) => entry.text), kind, model: EMBEDDING_MODEL }),
      });
      const body = (await response.json()) as { data?: number[][]; error?: string };
      if (!body.data) throw new Error(`Embed proxy at ${EMBED_URL}: ${body.error ?? response.status}. Is \`pnpm eval:embed-proxy\` running?`);
      missing.forEach((entry, index) => {
        embedCache.set(entry.key, Buffer.from(new Float32Array(body.data![index]).buffer).toString('base64'));
      });
    }
    return keys.map((key) => {
      const bytes = Buffer.from(embedCache.get(key)!, 'base64');
      return [...new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)];
    });
  },
};

const reranker: Reranker = {
  async rerank(query, texts) {
    const response = await fetch(EMBED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rerankQuery: query, texts }),
    });
    const body = (await response.json()) as { scores?: number[]; error?: string };
    if (!body.scores) throw new Error(`Rerank through ${EMBED_URL}: ${body.error ?? response.status}`);
    return body.scores;
  },
};

const deps: IndexDeps = {
  sql: createLocalSql(readFileSync('migrations/0001_init.sql', 'utf8')),
  embedder,
  vectors: createMemoryVectors(),
  reranker: process.env.EVAL_NO_RERANK ? undefined : reranker,
  fetchFn: cachedFetch,
  now: () => new Date(),
};

const started = Date.now();
console.log('discover:', JSON.stringify(await discoverPages(deps)));
for (;;) {
  const batch = await processBatch(deps, { limit: 60 });
  process.stdout.write(`\rindexing: ${batch.neverChecked} pages left   `);
  if (batch.neverChecked === 0) break;
}
writeFileSync(PAGE_CACHE, JSON.stringify(pageCache));
writeFileSync(EMBED_CACHE, JSON.stringify(Object.fromEntries(embedCache)));
const status = await indexStatus(deps);
const [aliases] = await deps.sql.all<{ n: number }>('SELECT COUNT(*) AS n FROM pages WHERE alias_of IS NOT NULL');
const [textSize] = await deps.sql.all<{ n: number }>('SELECT SUM(LENGTH(text)) AS n FROM chunks');
console.log(`\nindex: ${JSON.stringify(status)} copies=${aliases.n} chars=${textSize.n} in ${Math.round((Date.now() - started) / 1000)}s`);

for (const sql of (process.env.EVAL_SQL ?? '').split(';;').filter(Boolean)) console.log(sql, '\n', await deps.sql.all(sql));

const { questions } = JSON.parse(readFileSync('eval/questions.json', 'utf8')) as { questions: Question[] };

/** 1-based rank of the first passage that is on an expected page and states the fact; 0 = not in the result. */
function goldRank(question: Question, passages: Passage[]): number {
  const fact = new RegExp(question.fact, 'i');
  return passages.findIndex((passage) => question.pages.some((fragment) => passage.url.includes(fragment)) && fact.test(`${passage.headingPath}\n${passage.text}`)) + 1;
}

const failingLeg = (leg: SearchLeg): Partial<IndexDeps> =>
  leg === 'semantic'
    ? { embedder: { embed: () => Promise.reject(new Error('off')) } }
    : { sql: { ...deps.sql, all: (sql, params) => (sql.includes('MATCH') ? Promise.reject(new Error('off')) : deps.sql.all(sql, params)) } };

const quiet = console.error;
const rows: Array<{ id: string; rank: number; keywordRank: number; semanticRank: number; ms: number; top: string[] }> = [];
const show = new Set((process.env.EVAL_SHOW ?? '').split(',').filter(Boolean));
for (const question of questions) {
  const begin = performance.now();
  const hybrid = await searchDocs(deps, { query: question.question, topK: 5 });
  const ms = Math.round(performance.now() - begin);
  console.error = () => {};
  const keywordOnly = await searchDocs({ ...deps, ...failingLeg('semantic') }, { query: question.question, topK: 5 });
  const semanticOnly = await searchDocs({ ...deps, ...failingLeg('keyword') }, { query: question.question, topK: 5 });
  console.error = quiet;
  const row = {
    id: question.id,
    rank: goldRank(question, hybrid.passages),
    keywordRank: goldRank(question, keywordOnly.passages),
    semanticRank: goldRank(question, semanticOnly.passages),
    ms,
    top: hybrid.passages.slice(0, 3).map((passage) => `${passage.url} [${passage.matched.join('+')}]`),
  };
  rows.push(row);
  console.log(`${row.rank || '-'}  kw:${row.keywordRank || '-'} sem:${row.semanticRank || '-'}  ${question.id}`);
  if (show.has(question.id) || (show.has('misses') && !row.rank)) {
    const wide = await searchDocs(deps, { query: question.question, topK: 20 });
    console.log(`     gold rank in top 20: ${goldRank(question, wide.passages) || '-'}`);
    for (const passage of wide.passages.slice(0, 6)) {
      console.log(`     ${passage.matched.join('+').padEnd(16)} ${passage.headingPath.slice(0, 70)} | ${passage.text.slice(0, 80).replace(/\n/g, ' ')}`);
    }
  }
}

const within = (key: 'rank' | 'keywordRank' | 'semanticRank', k: number) => rows.filter((row) => row[key] > 0 && row[key] <= k).length;
const summary = {
  questions: rows.length,
  model: EMBEDDING_MODEL,
  hybrid: { top1: within('rank', 1), top3: within('rank', 3), top5: within('rank', 5) },
  keywordOnly: { top1: within('keywordRank', 1), top3: within('keywordRank', 3), top5: within('keywordRank', 5) },
  semanticOnly: { top1: within('semanticRank', 1), top3: within('semanticRank', 3), top5: within('semanticRank', 5) },
  index: status,
};
console.log(JSON.stringify(summary, null, 1));
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({ summary, rows }, null, 1));
