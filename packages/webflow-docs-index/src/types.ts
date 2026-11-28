export type DocsVersion = 'current' | 'beta';

/** A docs page as listed in the llms.txt tree. */
export interface PageRef {
  /** Canonical page URL: no `.md`, no default-version segment. */
  url: string;
  /** The Markdown URL that is fetched. */
  sourceUrl: string;
  title: string;
  /** First path segment: apps, data, designer, ... */
  product: string;
  version: DocsVersion;
  /** Lower = preferred when two pages have the same body. */
  rank: number;
}

export interface Chunk {
  ordinal: number;
  /** "Page title > Section > Subsection" */
  headingPath: string;
  /** Heading slug for the URL fragment; null for text under the page title. */
  anchor: string | null;
  /** Exact Markdown of the passage. */
  text: string;
}

export type SearchLeg = 'keyword' | 'semantic';

export interface Passage {
  /** Page URL with the section fragment. */
  url: string;
  headingPath: string;
  /** Exact Markdown from the docs page. */
  text: string;
  version: DocsVersion;
  /** When the indexer last compared this page with the live docs. */
  checkedAt: string | null;
  /** Relevance from the reranker (0-1); the merged rank score when the reranker did not run. */
  score: number;
  matched: SearchLeg[];
}

export interface SearchInput {
  query: string;
  /** 1-20, default 5. */
  topK?: number;
  /** Also search pages of the v2 beta docs. Default false. */
  includeBeta?: boolean;
}

export type SearchStage = SearchLeg | 'rerank';

export interface SearchResult {
  passages: Passage[];
  /** Stages that failed. The result then comes from the stages that worked, in a less exact order. */
  degraded: SearchStage[];
}

export interface SqlStatement {
  sql: string;
  params?: unknown[];
}

/** The part of D1 the index uses. `batch` is one transaction. */
export interface Sql {
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  batch(statements: SqlStatement[]): Promise<void>;
}

export type EmbedKind = 'passage' | 'query';

export interface Embedder {
  embed(texts: string[], kind: EmbedKind): Promise<number[][]>;
}

/** Scores each text against the query, in the order given. Higher = more relevant. */
export interface Reranker {
  rerank(query: string, texts: string[]): Promise<number[]>;
}

export interface VectorRecord {
  id: string;
  values: number[];
  version: DocsVersion;
}

export interface VectorStore {
  upsert(vectors: VectorRecord[]): Promise<void>;
  deleteByIds(ids: string[]): Promise<void>;
  query(values: number[], options: { topK: number; versions: DocsVersion[] }): Promise<Array<{ id: string; score: number }>>;
}

export interface IndexDeps {
  sql: Sql;
  embedder: Embedder;
  vectors: VectorStore;
  /** Optional: without it the merged keyword + vector order is the result order. */
  reranker?: Reranker;
  fetchFn: typeof fetch;
  now: () => Date;
}
