/**
 * Template Indexer for Vector Similarity Search
 * 
 * Indexes templates into Vectorize for automatic plagiarism discovery
 * 
 * Canon: Index once, query forever. Convergence reveals truth.
 */

import OpenAI from 'openai';
import {
  fetchPublishedContent,
  extractCodeFeatures,
  type FetchedContent,
  type CodeFeatures
} from './vector-similarity';

// =============================================================================
// TYPES
// =============================================================================

export interface TemplateMetadata {
  name: string;
  creator: string;
  url: string;
  published_at?: number;
}

export interface IndexedTemplate {
  id: string;
  similarity: number;
  name: string;
  url: string;
  creator: string;
  indexed_at: number;
}

interface Env {
  VECTORIZE: VectorizeIndex;
  OPENAI_API_KEY: string;
}

// =============================================================================
// EMBEDDING COMPUTATION
// =============================================================================

/**
 * Compute a single combined embedding for all features
 */
async function computeCombinedEmbedding(
  features: CodeFeatures,
  apiKey: string
): Promise<number[]> {
  const openai = new OpenAI({ apiKey });

  // Combine all features into one text for a unified embedding
  const combined = `
[HTML Structure] ${features.html_structure}
[CSS Patterns] ${features.css_patterns}
[JavaScript] ${features.js_logic}
[Webflow Interactions] ${features.webflow_interactions}
[DOM Hierarchy] ${features.dom_hierarchy}
  `.trim();

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: combined,
      dimensions: 512
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('[Indexer] Embedding error:', error);
    throw error;
  }
}

// =============================================================================
// INDEXING
// =============================================================================

/**
 * Index a single template into Vectorize
 */
export async function indexTemplate(
  templateId: string,
  templateUrl: string,
  metadata: TemplateMetadata,
  env: Env
): Promise<boolean> {
  console.log(`[Indexer] Indexing ${templateId}: ${metadata.name}...`);

  try {
    // 1. Fetch content
    const content = await fetchPublishedContent(templateUrl);
    if (!content) {
      console.log(`[Indexer] Failed to fetch content for ${templateId}`);
      return false;
    }

    console.log(`[Indexer] Content fetched for ${templateId}`);

    // 2. Extract features
    const features = extractCodeFeatures(content);
    console.log(`[Indexer] Features extracted for ${templateId}`);

    // 3. Compute combined embedding
    const embedding = await computeCombinedEmbedding(features, env.OPENAI_API_KEY);
    console.log(`[Indexer] Embedding computed for ${templateId} (${embedding.length} dimensions)`);

    // 4. Store in Vectorize
    await env.VECTORIZE.upsert([{
      id: templateId,
      values: embedding,
      metadata: {
        name: metadata.name,
        url: templateUrl,
        creator: metadata.creator,
        indexed_at: Date.now()
      }
    }]);

    console.log(`[Indexer] ✅ Successfully indexed ${templateId}`);
    return true;

  } catch (error: any) {
    console.error(`[Indexer] ❌ Error indexing ${templateId}:`, error.message);
    return false;
  }
}

// =============================================================================
// QUERYING
// =============================================================================

/**
 * Find similar templates for a given URL
 */
export async function findSimilarTemplates(
  queryUrl: string,
  env: Env,
  topK: number = 10
): Promise<IndexedTemplate[]> {
  console.log(`[Query] Finding similar templates for: ${queryUrl}`);

  try {
    // 1. Fetch and extract features
    const content = await fetchPublishedContent(queryUrl);
    if (!content) {
      console.log('[Query] Failed to fetch content');
      return [];
    }

    const features = extractCodeFeatures(content);
    console.log('[Query] Features extracted');

    // 2. Compute embedding
    const embedding = await computeCombinedEmbedding(features, env.OPENAI_API_KEY);
    console.log('[Query] Embedding computed');

    // 3. Query Vectorize
    const results = await env.VECTORIZE.query(embedding, {
      topK,
      returnValues: false,
      returnMetadata: true
    });

    console.log(`[Query] Found ${results.matches.length} similar templates`);

    // 4. Format results
    return results.matches.map(match => ({
      id: match.id,
      similarity: match.score,
      name: (match.metadata?.name as string) || 'Unknown',
      url: (match.metadata?.url as string) || '',
      creator: (match.metadata?.creator as string) || 'Unknown',
      indexed_at: (match.metadata?.indexed_at as number) || 0
    }));

  } catch (error: any) {
    console.error('[Query] Error:', error.message);
    return [];
  }
}

/**
 * Get statistics about the index
 */
export async function getIndexStats(env: Env): Promise<{
  total: number;
  sample: any[];
}> {
  try {
    // Query for a random vector to get sample results
    const randomVector = new Array(512).fill(0).map(() => Math.random());
    
    const results = await env.VECTORIZE.query(randomVector, {
      topK: 5,
      returnMetadata: true
    });

    return {
      total: -1, // Vectorize doesn't provide total count directly
      sample: results.matches.map(m => ({
        id: m.id,
        metadata: m.metadata
      }))
    };
  } catch (error: any) {
    console.error('[Stats] Error:', error.message);
    return { total: 0, sample: [] };
  }
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Index multiple templates in batch
 */
export async function batchIndexTemplates(
  templates: Array<{
    id: string;
    url: string;
    metadata: TemplateMetadata;
  }>,
  env: Env
): Promise<{
  success: number;
  failed: number;
}> {
  console.log(`[Batch] Starting batch index of ${templates.length} templates...`);

  let success = 0;
  let failed = 0;

  // Process in smaller batches to respect rate limits
  const BATCH_SIZE = 5;
  for (let i = 0; i < templates.length; i += BATCH_SIZE) {
    const batch = templates.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.allSettled(
      batch.map(t => indexTemplate(t.id, t.url, t.metadata, env))
    );

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        success++;
      } else {
        failed++;
      }
    });

    // Rate limiting: wait between batches
    if (i + BATCH_SIZE < templates.length) {
      console.log(`[Batch] Waiting before next batch... (${success + failed}/${templates.length})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`[Batch] Complete: ${success} succeeded, ${failed} failed`);
  return { success, failed };
}
