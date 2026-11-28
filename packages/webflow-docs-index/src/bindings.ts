import type { DocsVersion, Embedder, IndexDeps, Reranker, Sql, VectorStore } from './types.js';

export interface Env {
  DB: D1Database;
  VECTORIZE: Vectorize;
  AI: Ai;
  EMBEDDING_MODEL?: string;
  RERANK_MODEL?: string;
  /** Secret. Unset = the /admin and /search HTTP routes answer 503. */
  DOCS_INDEX_ADMIN_TOKEN?: string;
}

export const DEFAULT_EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';
export const DEFAULT_RERANK_MODEL = '@cf/baai/bge-reranker-base';
/** The bge v1.5 models are trained with this instruction on the query side of retrieval. */
const BGE_QUERY_INSTRUCTION = 'Represent this sentence for searching relevant passages: ';

export function createSql(db: D1Database): Sql {
  return {
    async all<T>(sql: string, params: unknown[] = []) {
      const { results } = await db
        .prepare(sql)
        .bind(...params)
        .all<T>();
      return results;
    },
    async batch(statements) {
      if (statements.length === 0) return;
      await db.batch(statements.map((statement) => db.prepare(statement.sql).bind(...(statement.params ?? []))));
    },
  };
}

export function createEmbedder(ai: Pick<Ai, 'run'>, model = DEFAULT_EMBEDDING_MODEL): Embedder {
  return {
    async embed(texts, kind) {
      if (texts.length === 0) return [];
      const input = kind === 'query' ? texts.map((text) => `${BGE_QUERY_INSTRUCTION}${text}`) : texts;
      // `cls` pooling is the setting Cloudflare recommends for the bge models. Vectors
      // made with it do not mix with mean-pooled ones: a change here needs a new INDEX_VERSION.
      const response = (await ai.run(model as keyof AiModels, { text: input, pooling: 'cls' } as never)) as unknown as {
        data?: number[][];
      };
      if (!response.data || response.data.length !== texts.length) {
        throw new Error(`The embedding model returned ${response.data?.length ?? 0} vectors for ${texts.length} texts.`);
      }
      return response.data;
    },
  };
}

export function createReranker(ai: Pick<Ai, 'run'>, model = DEFAULT_RERANK_MODEL): Reranker {
  return {
    async rerank(query, texts) {
      if (texts.length === 0) return [];
      const response = (await ai.run(model as keyof AiModels, { query, contexts: texts.map((text) => ({ text })) } as never)) as unknown as {
        response?: Array<{ id: number; score: number }>;
      };
      const scores = Array.from({ length: texts.length }, () => Number.NEGATIVE_INFINITY);
      for (const item of response.response ?? []) if (item.id >= 0 && item.id < scores.length) scores[item.id] = item.score;
      if (scores.every((score) => score === Number.NEGATIVE_INFINITY)) throw new Error('The rerank model returned no scores.');
      return scores;
    },
  };
}

export function createVectorStore(index: Vectorize): VectorStore {
  return {
    async upsert(vectors) {
      if (vectors.length === 0) return;
      await index.upsert(vectors.map((vector) => ({ id: vector.id, values: vector.values, metadata: { version: vector.version } })));
    },
    async deleteByIds(ids) {
      if (ids.length > 0) await index.deleteByIds(ids);
    },
    async query(values, options) {
      const versions = new Set<DocsVersion>(options.versions);
      // `version` has a metadata index (README, First deploy). No filter = every version.
      const filter = versions.has('beta') ? undefined : { version: 'current' };
      const result = await index.query(values, { topK: options.topK, returnMetadata: 'none', filter });
      return result.matches.map((match) => ({ id: match.id, score: match.score }));
    },
  };
}

export function createDeps(env: Env): IndexDeps {
  return {
    sql: createSql(env.DB),
    embedder: createEmbedder(env.AI, env.EMBEDDING_MODEL),
    vectors: createVectorStore(env.VECTORIZE),
    reranker: createReranker(env.AI, env.RERANK_MODEL),
    fetchFn: (input, init) => fetch(input, init),
    now: () => new Date(),
  };
}
