import { buildEmbeddingText } from './chunk.js';
import { DEFAULT_EMBEDDING_MAX_CHARS, DEFAULT_EMBEDDING_MODEL } from './config.js';
import type { CodeBundleInput, CodeChunkInput, Env } from './types.js';
import { chunkArray, parsePositiveInt, truncate } from './utils.js';

const EMBEDDING_BATCH_SIZE = 10;
const VECTORIZE_BATCH_SIZE = 20;
const MAX_CONFIGURED_EMBEDDING_TEXT_CHARS = 32000;
const MIN_FALLBACK_PART_CHARS = 100;

function embeddingModel(env: Env): string {
  return env.EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
}

export function embeddingTextMaxChars(env: Env): number {
  return parsePositiveInt(env.CODE_EMBEDDING_MAX_CHARS, DEFAULT_EMBEDDING_MAX_CHARS, MAX_CONFIGURED_EMBEDDING_TEXT_CHARS);
}

function completeChunkEmbeddingText(
  chunk: CodeChunkInput,
  bundle: Pick<CodeBundleInput, 'repository' | 'ref' | 'commitSha'>,
  maxChars: number,
): string {
  const text = buildEmbeddingText(chunk, bundle);
  if (text.length <= maxChars) return text;

  throw new Error(
    [
      `Embedding input for chunk ${chunk.id} is ${text.length} chars, above CODE_EMBEDDING_MAX_CHARS=${maxChars}.`,
      `No code was truncated.`,
      `Lower CODE_CHUNK_MAX_CHARS or increase CODE_EMBEDDING_MAX_CHARS for the selected embedding model.`,
    ].join(' '),
  );
}

async function runEmbeddingBatch(texts: string[], env: Env): Promise<number[][]> {
  const response = await env.AI.run(embeddingModel(env) as keyof AiModels, { text: texts });
  const result = response as unknown as { data?: number[][] };
  const embeddings = result.data;

  if (!embeddings || embeddings.length < texts.length) {
    throw new Error(`Failed to generate embeddings for ${texts.length} text input(s).`);
  }

  return embeddings;
}

function meanEmbedding(vectors: number[][]): number[] {
  if (vectors.length === 0) throw new Error('Cannot average zero embeddings.');

  const dimensions = vectors[0]?.length ?? 0;
  const values = Array.from({ length: dimensions }, () => 0);

  for (const vector of vectors) {
    if (vector.length !== dimensions) throw new Error('Cannot average embeddings with different dimensions.');
    for (const [index, value] of vector.entries()) {
      values[index] += value;
    }
  }

  const mean = values.map((value) => value / vectors.length);
  const norm = Math.sqrt(mean.reduce((sum, value) => sum + value * value, 0));
  return norm > 0 ? mean.map((value) => value / norm) : mean;
}

function splitContentInHalf(content: string): [string, string] {
  const midpoint = Math.ceil(content.length / 2);
  const left = content.slice(0, midpoint);
  const right = content.slice(midpoint);

  if (left.trim().length === 0 || right.trim().length === 0) {
    throw new Error('Embedding fallback could not split content into two non-empty parts.');
  }

  return [left, right];
}

function codepointEscapeContent(content: string): string {
  return [
    'Codepoint-escaped code slice. Hex codepoints are in original order.',
    Array.from(content)
      .map((character) => character.codePointAt(0)?.toString(16).padStart(4, '0') ?? '0000')
      .join(' '),
  ].join('\n');
}

async function tryGenerateEscapedChunkContentEmbedding(
  chunk: CodeChunkInput,
  content: string,
  bundle: Pick<CodeBundleInput, 'repository' | 'ref' | 'commitSha'>,
  env: Env,
  maxChars: number,
): Promise<number[] | null> {
  const text = completeChunkEmbeddingText({ ...chunk, content: codepointEscapeContent(content) }, bundle, maxChars);

  try {
    const [embedding] = await runEmbeddingBatch([text], env);
    return embedding ?? null;
  } catch {
    return null;
  }
}

async function generateChunkContentEmbedding(
  chunk: CodeChunkInput,
  content: string,
  bundle: Pick<CodeBundleInput, 'repository' | 'ref' | 'commitSha'>,
  env: Env,
  maxChars: number,
): Promise<number[]> {
  const text = completeChunkEmbeddingText({ ...chunk, content }, bundle, maxChars);

  try {
    const [embedding] = await runEmbeddingBatch([text], env);
    if (!embedding) throw new Error('Failed to generate embedding.');
    return embedding;
  } catch (error) {
    if (content.length <= MIN_FALLBACK_PART_CHARS) {
      const escapedEmbedding = await tryGenerateEscapedChunkContentEmbedding(chunk, content, bundle, env, maxChars);
      if (escapedEmbedding) return escapedEmbedding;
      throw error;
    }

    const [leftContent, rightContent] = splitContentInHalf(content);
    const leftEmbedding = await generateChunkContentEmbedding(chunk, leftContent, bundle, env, maxChars);
    const rightEmbedding = await generateChunkContentEmbedding(chunk, rightContent, bundle, env, maxChars);
    return meanEmbedding([leftEmbedding, rightEmbedding]);
  }
}

async function generateSingleChunkEmbeddingWithFallback(
  chunk: CodeChunkInput,
  bundle: Pick<CodeBundleInput, 'repository' | 'ref' | 'commitSha'>,
  env: Env,
  maxChars: number,
  cause: unknown,
): Promise<number[]> {
  try {
    const [leftContent, rightContent] = splitContentInHalf(chunk.content);
    const leftEmbedding = await generateChunkContentEmbedding(chunk, leftContent, bundle, env, maxChars);
    const rightEmbedding = await generateChunkContentEmbedding(chunk, rightContent, bundle, env, maxChars);
    return meanEmbedding([leftEmbedding, rightEmbedding]);
  } catch (fallbackError) {
    throw new Error(
      [
        `Workers AI failed to embed chunk ${chunk.id} (${chunk.filePath}:${chunk.startLine}-${chunk.endLine}).`,
        `Initial error: ${cause instanceof Error ? cause.message : String(cause)}.`,
        `Fallback error: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}.`,
      ].join(' '),
    );
  }
}

async function generateChunkEmbeddingGroup(
  group: CodeChunkInput[],
  bundle: Pick<CodeBundleInput, 'repository' | 'ref' | 'commitSha'>,
  env: Env,
  maxChars: number,
  embeddings: Map<string, number[]>,
): Promise<void> {
  const texts = group.map((chunk) => completeChunkEmbeddingText(chunk, bundle, maxChars));

  try {
    const result = await runEmbeddingBatch(texts, env);
    for (const [index, chunk] of group.entries()) {
      embeddings.set(chunk.vectorId, result[index]!);
    }
    return;
  } catch (error) {
    if (group.length === 1) {
      const [chunk] = group;
      embeddings.set(chunk.vectorId, await generateSingleChunkEmbeddingWithFallback(chunk, bundle, env, maxChars, error));
      return;
    }

    console.warn(
      `Embedding batch of ${group.length} chunks failed; retrying smaller batches. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    const midpoint = Math.ceil(group.length / 2);
    await generateChunkEmbeddingGroup(group.slice(0, midpoint), bundle, env, maxChars, embeddings);
    await generateChunkEmbeddingGroup(group.slice(midpoint), bundle, env, maxChars, embeddings);
  }
}

export async function generateEmbedding(text: string, env: Env): Promise<number[]> {
  const [embedding] = await runEmbeddingBatch([truncate(text, embeddingTextMaxChars(env))], env);
  if (!embedding) throw new Error('Failed to generate embedding.');
  return embedding;
}

export async function generateChunkEmbeddings(
  chunks: CodeChunkInput[],
  bundle: Pick<CodeBundleInput, 'repository' | 'ref' | 'commitSha'>,
  env: Env,
): Promise<Map<string, number[]>> {
  const embeddings = new Map<string, number[]>();
  const maxChars = embeddingTextMaxChars(env);

  for (const group of chunkArray(chunks, EMBEDDING_BATCH_SIZE)) {
    await generateChunkEmbeddingGroup(group, bundle, env, maxChars, embeddings);
  }

  return embeddings;
}

export async function upsertChunkVectors(
  chunks: CodeChunkInput[],
  embeddings: Map<string, number[]>,
  bundle: CodeBundleInput,
  env: Env,
): Promise<{ indexedCount: number; failedCount: number }> {
  let indexedCount = 0;
  let failedCount = 0;

  for (const group of chunkArray(chunks, VECTORIZE_BATCH_SIZE)) {
    const vectors: VectorizeVector[] = [];

    for (const chunk of group) {
      const values = embeddings.get(chunk.vectorId);
      if (!values) {
        failedCount += 1;
        continue;
      }

      vectors.push({
        id: chunk.vectorId,
        values,
        metadata: {
          bundle_id: bundle.id,
          source_type: bundle.sourceType,
          source_uri: bundle.sourceUri ?? '',
          repository: bundle.repository ?? '',
          ref: bundle.ref ?? '',
          commit_sha: bundle.commitSha ?? '',
          file_path: chunk.filePath,
          language: chunk.language,
          ext: chunk.ext,
          content_hash: chunk.contentHash,
          start_line: chunk.startLine,
          end_line: chunk.endLine,
          indexed_at: Date.now(),
        },
      });
    }

    if (vectors.length === 0) continue;

    try {
      await env.VECTORIZE.upsert(vectors);
      indexedCount += vectors.length;
    } catch (error) {
      console.error('Vectorize upsert failed:', error);
      failedCount += vectors.length;
    }
  }

  return { indexedCount, failedCount };
}

export async function deleteChunkVectors(vectorIds: string[], env: Env): Promise<number> {
  let deleted = 0;
  for (const group of chunkArray(Array.from(new Set(vectorIds)), 100)) {
    if (group.length === 0) continue;
    try {
      await env.VECTORIZE.deleteByIds(group);
      deleted += group.length;
    } catch (error) {
      console.error('Vectorize delete failed:', error);
    }
  }
  return deleted;
}
