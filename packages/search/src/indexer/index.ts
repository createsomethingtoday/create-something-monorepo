/**
 * Search Indexer
 *
 * Indexes content from all CREATE SOMETHING properties into Vectorize.
 * Canon: Index once, search everywhere. Unity through connection.
 */

import type { Env, IndexableContent, VectorMetadata } from '../types';
import { fetchAllContent } from './content-fetchers';
import { enrichWithConcepts } from './concept-enrichment';

// =============================================================================
// CONSTANTS
// =============================================================================

const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';
const EMBEDDING_DIMENSIONS = 768;
const BATCH_SIZE = 20; // Vectorize upsert limit
const EMBEDDING_BATCH_SIZE = 10; // Workers AI batch limit

// =============================================================================
// EMBEDDING GENERATION
// =============================================================================

/**
 * Generate embeddings for content using Workers AI
 */
async function generateEmbeddings(
  items: IndexableContent[],
  ai: Ai
): Promise<Map<string, number[]>> {
  const embeddings = new Map<string, number[]>();

  // Process in batches
  for (let i = 0; i < items.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = items.slice(i, i + EMBEDDING_BATCH_SIZE);
    const texts = batch.map((item) => {
      // Combine title, description, and content for embedding
      return `Title: ${item.title}\n\nDescription: ${item.description}\n\n${item.content}`.slice(
        0,
        2000 // BGE model token limit approximation
      );
    });

    try {
      const response = await ai.run(EMBEDDING_MODEL, {
        text: texts,
      });

      if (response.data) {
        for (let j = 0; j < batch.length; j++) {
          if (response.data[j]) {
            embeddings.set(batch[j].id, response.data[j]);
          }
        }
      }

      // Small delay to avoid rate limiting
      if (i + EMBEDDING_BATCH_SIZE < items.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Embedding batch ${i / EMBEDDING_BATCH_SIZE + 1} failed:`, error);
    }
  }

  return embeddings;
}

// =============================================================================
// VECTORIZE OPERATIONS
// =============================================================================

/**
 * Upsert content into Vectorize index
 */
async function upsertToVectorize(
  items: IndexableContent[],
  embeddings: Map<string, number[]>,
  vectorize: VectorizeIndex
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const vectors: VectorizeVector[] = [];

    for (const item of batch) {
      const embedding = embeddings.get(item.id);
      if (!embedding) {
        failed++;
        continue;
      }

      const metadata: VectorMetadata = {
        title: item.title,
        description: item.description,
        property: item.property,
        type: item.type,
        path: item.path,
        concepts: JSON.stringify(item.concepts),
        indexed_at: Date.now(),
      };

      vectors.push({
        id: item.id,
        values: embedding,
        metadata: metadata as unknown as Record<string, string | number | boolean | string[]>,
      });
    }

    if (vectors.length > 0) {
      try {
        await vectorize.upsert(vectors);
        success += vectors.length;
      } catch (error) {
        console.error(`Vectorize upsert batch ${i / BATCH_SIZE + 1} failed:`, error);
        failed += vectors.length;
      }
    }

    // Small delay between batches
    if (i + BATCH_SIZE < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return { success, failed };
}

// =============================================================================
// INDEX RESULT
// =============================================================================

export interface IndexResult {
  success: boolean;
  totalContent: number;
  indexed: number;
  failed: number;
  byProperty: Record<string, number>;
  errors: string[];
  duration: number;
}

// =============================================================================
// MAIN INDEX FUNCTION
// =============================================================================

/**
 * Index all content from all properties
 */
export async function indexAllContent(env: Env): Promise<IndexResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  console.log('Starting unified search index...');

  // 1. Fetch content from all properties
  console.log('Fetching content from all properties...');
  const { content, errors: fetchErrors } = await fetchAllContent(
    env.DB_SPACE,
    env.DB_IO,
    env.DB_LTD,
    env.DB_AGENCY
  );
  errors.push(...fetchErrors);

  console.log(`Fetched ${content.length} items`);

  if (content.length === 0) {
    return {
      success: false,
      totalContent: 0,
      indexed: 0,
      failed: 0,
      byProperty: {},
      errors: ['No content found to index'],
      duration: Date.now() - startTime,
    };
  }

  // 2. Enrich with concepts
  console.log('Enriching content with concepts...');
  enrichWithConcepts(content);

  // 3. Generate embeddings
  console.log('Generating embeddings...');
  const embeddings = await generateEmbeddings(content, env.AI);
  console.log(`Generated ${embeddings.size} embeddings`);

  // 4. Upsert to Vectorize
  console.log('Upserting to Vectorize...');
  const { success: indexed, failed } = await upsertToVectorize(
    content,
    embeddings,
    env.VECTORIZE
  );

  // 5. Calculate stats
  const byProperty: Record<string, number> = {};
  for (const item of content) {
    byProperty[item.property] = (byProperty[item.property] || 0) + 1;
  }

  const duration = Date.now() - startTime;
  console.log(`Indexing complete: ${indexed} indexed, ${failed} failed in ${duration}ms`);

  return {
    success: failed === 0 && errors.length === 0,
    totalContent: content.length,
    indexed,
    failed,
    byProperty,
    errors,
    duration,
  };
}

/**
 * Index a single content item (for incremental updates)
 */
export async function indexSingleItem(
  item: IndexableContent,
  env: Env
): Promise<boolean> {
  // Enrich with concepts
  enrichWithConcepts([item]);

  // Generate embedding
  const embeddings = await generateEmbeddings([item], env.AI);
  const embedding = embeddings.get(item.id);

  if (!embedding) {
    console.error(`Failed to generate embedding for ${item.id}`);
    return false;
  }

  // Upsert to Vectorize
  const metadata: VectorMetadata = {
    title: item.title,
    description: item.description,
    property: item.property,
    type: item.type,
    path: item.path,
    concepts: JSON.stringify(item.concepts),
    indexed_at: Date.now(),
  };

  try {
    await env.VECTORIZE.upsert([
      {
        id: item.id,
        values: embedding,
        metadata: metadata as unknown as Record<string, string | number | boolean | string[]>,
      },
    ]);
    return true;
  } catch (error) {
    console.error(`Failed to upsert ${item.id}:`, error);
    return false;
  }
}

/**
 * Delete items from the index
 */
export async function deleteFromIndex(ids: string[], env: Env): Promise<number> {
  let deleted = 0;

  // Vectorize delete is batch-limited
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    try {
      await env.VECTORIZE.deleteByIds(batch);
      deleted += batch.length;
    } catch (error) {
      console.error(`Failed to delete batch:`, error);
    }
  }

  return deleted;
}
