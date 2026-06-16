import { describe, expect, it } from 'vitest';

import { generateChunkEmbeddings } from '../src/embeddings.js';
import type { CodeChunkInput, Env } from '../src/types.js';

function chunk(overrides: Partial<CodeChunkInput> = {}): CodeChunkInput {
  return {
    id: 'code_chunk_1',
    bundleId: 'bundle_1',
    vectorId: 'code_chunk_1',
    filePath: 'src/index.ts',
    ext: '.ts',
    language: 'typescript',
    chunkIndex: 0,
    startLine: 1,
    endLine: 1,
    sizeBytes: 21,
    contentHash: 'hash',
    content: 'export const value = 1;',
    tags: [],
    createdAt: '2026-05-12T00:00:00.000Z',
    ...overrides,
  };
}

function envWithCapturedTexts(captured: string[]): Env {
  return {
    CODE_EMBEDDING_MAX_CHARS: '1000',
    AI: {
      async run(_model: string, input: { text: string[] }) {
        captured.push(...input.text);
        return { data: input.text.map(() => [0.1, 0.2, 0.3]) };
      },
    },
    DB: {} as D1Database,
    VECTORIZE: {} as VectorizeIndex,
  } as unknown as Env;
}

describe('code chunk embeddings', () => {
  it('sends complete chunk content to the embedding model', async () => {
    const captured: string[] = [];
    const content = 'export function handler() { return "complete"; }';

    await generateChunkEmbeddings(
      [chunk({ content, sizeBytes: new TextEncoder().encode(content).byteLength })],
      { repository: 'owner/repo', ref: 'main', commitSha: 'abc123' },
      envWithCapturedTexts(captured),
    );

    expect(captured).toHaveLength(1);
    expect(captured[0]).toContain('Repository: owner/repo');
    expect(captured[0]).toContain('Path: src/index.ts');
    expect(captured[0]?.endsWith(content)).toBe(true);
  });

  it('fails loudly instead of truncating oversized chunk content', async () => {
    const captured: string[] = [];
    const env = envWithCapturedTexts(captured);
    env.CODE_EMBEDDING_MAX_CHARS = '120';

    await expect(
      generateChunkEmbeddings(
        [chunk({ content: 'x'.repeat(200), sizeBytes: 200 })],
        { repository: 'owner/repo', ref: 'main', commitSha: null },
        env,
      ),
    ).rejects.toThrow(/No code was truncated/);
    expect(captured).toHaveLength(0);
  });

  it('splits failed embedding batches into smaller real embedding calls', async () => {
    const captured: number[] = [];
    const env = {
      CODE_EMBEDDING_MAX_CHARS: '1000',
      AI: {
        async run(_model: string, input: { text: string[] }) {
          captured.push(input.text.length);
          if (input.text.length > 1) throw new Error('batch too large');
          return { data: input.text.map(() => [0.1, 0.2, 0.3]) };
        },
      },
      DB: {} as D1Database,
      VECTORIZE: {} as VectorizeIndex,
    } as unknown as Env;

    const embeddings = await generateChunkEmbeddings(
      [
        chunk({ id: 'code_chunk_1', vectorId: 'code_chunk_1', content: 'export const a = 1;' }),
        chunk({ id: 'code_chunk_2', vectorId: 'code_chunk_2', content: 'export const b = 2;' }),
      ],
      { repository: 'owner/repo', ref: 'main', commitSha: null },
      env,
    );

    expect(captured).toEqual([2, 1, 1]);
    expect(embeddings.size).toBe(2);
    expect(embeddings.get('code_chunk_1')).toEqual([0.1, 0.2, 0.3]);
    expect(embeddings.get('code_chunk_2')).toEqual([0.1, 0.2, 0.3]);
  });

  it('embeds a rejected chunk by averaging smaller real code-part embeddings', async () => {
    const env = {
      CODE_EMBEDDING_MAX_CHARS: '300',
      AI: {
        async run(_model: string, input: { text: string[] }) {
          if (input.text.some((text) => text.length > 220)) throw new Error('input too large');
          return { data: input.text.map(() => [2, 0]) };
        },
      },
      DB: {} as D1Database,
      VECTORIZE: {} as VectorizeIndex,
    } as unknown as Env;

    const content = ['export const value = "', 'x'.repeat(160), '";'].join('');
    const embeddings = await generateChunkEmbeddings(
      [chunk({ content, sizeBytes: new TextEncoder().encode(content).byteLength })],
      { repository: 'owner/repo', ref: 'main', commitSha: null },
      env,
    );

    expect(embeddings.get('code_chunk_1')).toEqual([1, 0]);
  });

  it('embeds tiny rejected code leaves as escaped real code representations', async () => {
    const env = {
      CODE_EMBEDDING_MAX_CHARS: '1000',
      AI: {
        async run(_model: string, input: { text: string[] }) {
          if (input.text.some((text) => text.includes('\u0000'))) throw new Error('raw control character rejected');
          return { data: input.text.map(() => [0, 3]) };
        },
      },
      DB: {} as D1Database,
      VECTORIZE: {} as VectorizeIndex,
    } as unknown as Env;

    const content = `const bad = "value\u0000";`;
    const embeddings = await generateChunkEmbeddings(
      [chunk({ content, sizeBytes: new TextEncoder().encode(content).byteLength })],
      { repository: 'owner/repo', ref: 'main', commitSha: null },
      env,
    );

    expect(embeddings.get('code_chunk_1')).toEqual([0, 1]);
  });
});
