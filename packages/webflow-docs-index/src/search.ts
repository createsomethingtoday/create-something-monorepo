import type { DocsVersion, IndexDeps, Passage, SearchInput, SearchLeg, SearchResult, SearchStage } from './types.js';

export const DEFAULT_TOP_K = 5;
export const MAX_TOP_K = 20;
export const MAX_QUERY_CHARS = 500;
/**
 * Candidates taken from each leg. The reranker scores all of them (50 at most).
 * On eval/questions.json, 15 to 40 per leg gave the same result within one question.
 */
const CANDIDATES_PER_LEG = 25;
/** Reciprocal rank fusion constant (Cormack et al., 2009). Sets the order only when the reranker does not run. */
const RRF_K = 60;
/** bm25 weight of the heading path against the passage text. */
const HEADING_WEIGHT = 3;
const MAX_KEYWORD_TERMS = 40;

const STOPWORDS = new Set(
  (
    'a an and are as at be but by can do does for from has have how i if in into is it its may must my not of on or ' +
    'our should so than that the their then there these they this to was what when where which who why will with ' +
    'would you your'
  ).split(' '),
);

/**
 * Build an FTS5 MATCH expression: every useful word, OR-ed, plus one phrase for
 * each identifier (`custom_code:write`, `x-webflow-signature`, `bundle.zip`).
 * The tokenizer splits an identifier at its punctuation, so the phrase keeps
 * its parts together and bm25 ranks the exact identifier first.
 * Returns null when the query has no searchable word.
 */
export function buildKeywordQuery(query: string): string | null {
  const terms: string[] = [];
  const seen = new Set<string>();
  const add = (term: string) => {
    if (!seen.has(term) && terms.length < MAX_KEYWORD_TERMS) {
      seen.add(term);
      terms.push(`"${term}"`);
    }
  };

  for (const match of query.matchAll(/[A-Za-z0-9]+(?:[_:.\-/][A-Za-z0-9]+)+/g)) {
    const words = match[0].toLowerCase().match(/[a-z0-9]+/g) ?? [];
    if (words.length > 1) add(words.join(' '));
  }
  for (const word of query.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    if (word.length < 2 || STOPWORDS.has(word)) continue;
    add(word);
    // The index has no stemmer, so match the other number of a plain word too (scope, scopes).
    if (/^[a-z]{3,}$/.test(word)) add(word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : `${word}s`);
  }
  return terms.length > 0 ? terms.join(' OR ') : null;
}

/** Merge ranked ID lists with reciprocal rank fusion. Best first. */
export function fuseRankings(lists: Partial<Record<SearchLeg, string[]>>): Array<{ id: string; score: number; matched: SearchLeg[] }> {
  const merged = new Map<string, { id: string; score: number; matched: SearchLeg[] }>();
  for (const leg of ['keyword', 'semantic'] as const) {
    (lists[leg] ?? []).forEach((id, index) => {
      const entry = merged.get(id) ?? { id, score: 0, matched: [] };
      entry.score += 1 / (RRF_K + index + 1);
      entry.matched.push(leg);
      merged.set(id, entry);
    });
  }
  return [...merged.values()].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

interface ChunkRow {
  vector_id: string;
  page_url: string;
  heading_path: string;
  anchor: string | null;
  text: string;
  text_hash: string;
  version: DocsVersion;
  checked_at: string | null;
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

async function keywordLeg(deps: Pick<IndexDeps, 'sql'>, query: string, versions: DocsVersion[]): Promise<string[]> {
  const match = buildKeywordQuery(query);
  if (!match) return [];
  const rows = await deps.sql.all<{ id: string }>(
    `SELECT chunks.vector_id AS id
       FROM chunks_fts JOIN chunks ON chunks.id = chunks_fts.rowid
      WHERE chunks_fts MATCH ? AND chunks.version IN (${placeholders(versions.length)})
      ORDER BY bm25(chunks_fts, ${HEADING_WEIGHT}, 1.0)
      LIMIT ?`,
    [match, ...versions, CANDIDATES_PER_LEG],
  );
  return rows.map((row) => row.id);
}

async function semanticLeg(deps: Pick<IndexDeps, 'embedder' | 'vectors'>, query: string, versions: DocsVersion[]): Promise<string[]> {
  const [vector] = await deps.embedder.embed([query], 'query');
  if (!vector) throw new Error('The embedding model returned no vector for the query.');
  const matches = await deps.vectors.query(vector, { topK: CANDIDATES_PER_LEG, versions });
  return matches.map((match) => match.id);
}

/**
 * Keyword + vector search over the indexed docs, then a rerank of the merged
 * candidates. The two search legs run at the same time. When a stage fails the
 * result comes from the stages that worked and names the failed one.
 */
export async function searchDocs(
  deps: Pick<IndexDeps, 'sql' | 'embedder' | 'vectors' | 'reranker'>,
  input: SearchInput,
): Promise<SearchResult> {
  const query = input.query.trim().slice(0, MAX_QUERY_CHARS);
  if (!query) return { passages: [], degraded: [] };
  const topK = Math.min(Math.max(Math.trunc(input.topK ?? DEFAULT_TOP_K) || DEFAULT_TOP_K, 1), MAX_TOP_K);
  const versions: DocsVersion[] = input.includeBeta ? ['current', 'beta'] : ['current'];

  const degraded: SearchStage[] = [];
  const [keyword, semantic] = await Promise.all([
    keywordLeg(deps, query, versions).catch((error) => {
      console.error('docs index: keyword leg failed', error);
      degraded.push('keyword');
      return [] as string[];
    }),
    semanticLeg(deps, query, versions).catch((error) => {
      console.error('docs index: semantic leg failed', error);
      degraded.push('semantic');
      return [] as string[];
    }),
  ]);

  const fused = fuseRankings({ keyword, semantic });
  if (fused.length === 0) return { passages: [], degraded };

  const rows = await deps.sql.all<ChunkRow>(
    `SELECT chunks.vector_id, chunks.page_url, chunks.heading_path, chunks.anchor, chunks.text, chunks.text_hash,
            chunks.version, pages.checked_at
       FROM chunks JOIN pages ON pages.url = chunks.page_url
      WHERE chunks.vector_id IN (${placeholders(fused.length)})`,
    fused.map((entry) => entry.id),
  );
  const byId = new Map(rows.map((row) => [row.vector_id, row]));

  let candidates: Array<{ row: ChunkRow; score: number; matched: SearchLeg[] }> = [];
  const seenText = new Set<string>();
  for (const entry of fused) {
    // A vector can outlive its chunk for a short time after a page changes.
    const row = byId.get(entry.id);
    if (!row || seenText.has(row.text_hash)) continue;
    seenText.add(row.text_hash);
    candidates.push({ row, score: entry.score, matched: entry.matched });
  }

  if (deps.reranker && candidates.length > 1) {
    try {
      const scores = await deps.reranker.rerank(
        query,
        candidates.map(({ row }) => `${row.heading_path}\n\n${row.text}`),
      );
      // The sort is stable: equal scores keep the merged order.
      candidates = candidates.map((candidate, index) => ({ ...candidate, score: scores[index] })).sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error('docs index: rerank failed', error);
      degraded.push('rerank');
    }
  }

  return {
    passages: candidates.slice(0, topK).map(({ row, score, matched }): Passage => ({
      url: row.anchor ? `${row.page_url}#${row.anchor}` : row.page_url,
      headingPath: row.heading_path,
      text: row.text,
      version: row.version,
      checkedAt: row.checked_at,
      score: Number(score.toFixed(5)),
      matched,
    })),
    degraded,
  };
}
