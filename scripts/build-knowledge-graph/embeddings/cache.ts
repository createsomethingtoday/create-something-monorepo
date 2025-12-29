/**
 * Embedding Cache
 *
 * Hash-based caching to avoid re-embedding unchanged documents.
 * Saves cost and time on incremental builds.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import type { EmbeddingCache, GraphNode } from '../types.js';

export const CACHE_VERSION = '1.0.0';
export const DEFAULT_MODEL = 'voyage-3-lite';

/**
 * Load embedding cache from file
 */
export function loadCache(cacheFile: string): EmbeddingCache {
  if (!existsSync(cacheFile)) {
    return {
      version: CACHE_VERSION,
      model: DEFAULT_MODEL,
      entries: {},
    };
  }

  try {
    const content = readFileSync(cacheFile, 'utf-8');
    const cache = JSON.parse(content) as EmbeddingCache;

    // Migrate or invalidate old cache versions
    if (cache.version !== CACHE_VERSION) {
      console.warn(`Cache version mismatch (found ${cache.version}, expected ${CACHE_VERSION}). Rebuilding cache.`);
      return {
        version: CACHE_VERSION,
        model: DEFAULT_MODEL,
        entries: {},
      };
    }

    return cache;
  } catch (error) {
    console.warn(`Failed to load cache from ${cacheFile}: ${error}`);
    return {
      version: CACHE_VERSION,
      model: DEFAULT_MODEL,
      entries: {},
    };
  }
}

/**
 * Save embedding cache to file
 */
export function saveCache(cache: EmbeddingCache, cacheFile: string): void {
  try {
    const content = JSON.stringify(cache, null, 2);
    writeFileSync(cacheFile, content, 'utf-8');
    console.log(`✓ Saved cache to ${cacheFile} (${Object.keys(cache.entries).length} entries)`);
  } catch (error) {
    console.error(`Failed to save cache to ${cacheFile}: ${error}`);
  }
}

/**
 * Check if a node needs re-embedding
 * Returns true if:
 * - No cached embedding exists
 * - Content hash has changed
 * - Model has changed
 */
export function needsEmbedding(
  node: GraphNode,
  cache: EmbeddingCache,
  model: string
): boolean {
  // Model changed - invalidate all
  if (cache.model !== model) {
    return true;
  }

  // No cached entry
  const entry = cache.entries[node.id];
  if (!entry) {
    return true;
  }

  // Content hash changed
  if (entry.hash !== node.hash) {
    return true;
  }

  return false;
}

/**
 * Filter nodes that need embedding
 */
export function filterNodesToEmbed(
  nodes: GraphNode[],
  cache: EmbeddingCache,
  model: string
): GraphNode[] {
  return nodes.filter(node => needsEmbedding(node, cache, model));
}

/**
 * Update cache with new embeddings
 */
export function updateCache(
  cache: EmbeddingCache,
  embeddings: Map<string, number[]>,
  nodes: GraphNode[],
  model: string
): EmbeddingCache {
  const updatedCache: EmbeddingCache = {
    ...cache,
    model,
  };

  // Add/update entries
  for (const [nodeId, embedding] of embeddings.entries()) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) continue;

    updatedCache.entries[nodeId] = {
      hash: node.hash,
      embedding,
      generatedAt: new Date().toISOString(),
    };
  }

  return updatedCache;
}

/**
 * Get embeddings from cache
 * Returns map of node ID -> embedding vector
 */
export function getEmbeddingsFromCache(
  nodes: GraphNode[],
  cache: EmbeddingCache
): Map<string, number[]> {
  const embeddings = new Map<string, number[]>();

  for (const node of nodes) {
    const entry = cache.entries[node.id];
    if (entry && entry.hash === node.hash) {
      embeddings.set(node.id, entry.embedding);
    }
  }

  return embeddings;
}

/**
 * Prune cache entries for nodes that no longer exist
 */
export function pruneCache(cache: EmbeddingCache, nodes: GraphNode[]): EmbeddingCache {
  const existingNodeIds = new Set(nodes.map(n => n.id));
  const prunedEntries: typeof cache.entries = {};

  let prunedCount = 0;

  for (const [nodeId, entry] of Object.entries(cache.entries)) {
    if (existingNodeIds.has(nodeId)) {
      prunedEntries[nodeId] = entry;
    } else {
      prunedCount++;
    }
  }

  if (prunedCount > 0) {
    console.log(`✓ Pruned ${prunedCount} stale cache entries`);
  }

  return {
    ...cache,
    entries: prunedEntries,
  };
}
