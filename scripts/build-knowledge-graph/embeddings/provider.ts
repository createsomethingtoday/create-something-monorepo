/**
 * Embedding Provider
 *
 * Interface to Voyage AI for generating document embeddings.
 * Uses voyage-3-lite model ($0.02/1M tokens).
 */

import { readFileSync } from 'fs';
import { VoyageAIClient } from 'voyageai';
import type { GraphNode } from '../types.js';

export interface EmbeddingOptions {
  /** Voyage AI API key */
  apiKey: string;

  /** Model to use (default: voyage-3-lite) */
  model?: string;

  /** Max tokens per document (default: 8000) */
  maxTokensPerDoc?: number;

  /** Documents per API call (default: 8 for free tier rate limits) */
  batchSize?: number;

  /** Delay between batches in ms (default: 21000 for 3 RPM limit) */
  batchDelayMs?: number;
}

export interface EmbeddingResult {
  /** Node ID */
  nodeId: string;

  /** Embedding vector (1024 dimensions for voyage-3-lite) */
  embedding: number[];
}

/**
 * Truncate text to approximate token limit
 * Rough estimate: 1 token ≈ 4 characters for English
 */
function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars);
}

/**
 * Prepare node content for embedding
 * Combines title and first N tokens of content
 */
function prepareNodeText(node: GraphNode, maxTokens: number): string {
  // Read file content
  const content = readFileSync(node.absolutePath, 'utf-8');

  // Format: "Title: {title}\n\n{content}"
  const combined = `Title: ${node.title}\n\nPackage: ${node.package ?? 'root'}\n\nType: ${node.type}\n\n${content}`;

  return truncateToTokens(combined, maxTokens);
}

/**
 * Generate embeddings for a batch of nodes
 */
/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateEmbeddings(
  nodes: GraphNode[],
  options: EmbeddingOptions
): Promise<EmbeddingResult[]> {
  const {
    apiKey,
    model = 'voyage-3-lite',
    maxTokensPerDoc = 8000,
    batchSize = 8, // Small batches for free tier (10K TPM limit)
    batchDelayMs = 21000, // 21 seconds between batches for 3 RPM limit
  } = options;

  const client = new VoyageAIClient({ apiKey });
  const results: EmbeddingResult[] = [];
  const totalBatches = Math.ceil(nodes.length / batchSize);

  // Process in batches with rate limiting
  for (let i = 0; i < nodes.length; i += batchSize) {
    const batchNum = Math.floor(i / batchSize) + 1;
    const batch = nodes.slice(i, i + batchSize);
    const texts = batch.map(node => prepareNodeText(node, maxTokensPerDoc));

    try {
      const eta = batchNum === 1 ? '' : ` (ETA: ${Math.ceil((totalBatches - batchNum) * batchDelayMs / 60000)}m)`;
      console.log(`Embedding batch ${batchNum}/${totalBatches} (${batch.length} docs)...${eta}`);

      const response = await client.embed({
        input: texts,
        model,
      });

      // Map embeddings back to node IDs
      for (let j = 0; j < batch.length; j++) {
        if (response.data?.[j]?.embedding) {
          results.push({
            nodeId: batch[j].id,
            embedding: response.data[j].embedding,
          });
        }
      }

      // Rate limit delay between batches (skip after last batch)
      if (i + batchSize < nodes.length) {
        console.log(`  Rate limiting: waiting ${batchDelayMs / 1000}s...`);
        await sleep(batchDelayMs);
      }
    } catch (error) {
      console.error(`Failed to embed batch starting at index ${i}:`, error);
      throw error;
    }
  }

  return results;
}

/**
 * Generate embeddings for specific nodes (incremental update)
 */
export async function generateEmbeddingsForNodes(
  nodes: GraphNode[],
  options: EmbeddingOptions
): Promise<Map<string, number[]>> {
  const results = await generateEmbeddings(nodes, options);
  const embeddingMap = new Map<string, number[]>();

  for (const result of results) {
    embeddingMap.set(result.nodeId, result.embedding);
  }

  return embeddingMap;
}
