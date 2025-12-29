/**
 * Similarity Computation
 *
 * Computes cosine similarity between embedding vectors and creates
 * semantic edges for highly similar documents.
 */

import type { GraphEdge, GraphNode } from '../types.js';

/**
 * Compute cosine similarity between two vectors
 * Returns value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Create semantic edges based on embedding similarity
 */
export function createSemanticEdges(
  nodes: GraphNode[],
  embeddings: Map<string, number[]>,
  options: {
    threshold: number;
    maxEdgesPerNode: number;
  }
): GraphEdge[] {
  const { threshold, maxEdgesPerNode } = options;
  const edges: GraphEdge[] = [];

  // For each node, find its most similar neighbors
  for (const sourceNode of nodes) {
    const sourceEmbedding = embeddings.get(sourceNode.id);
    if (!sourceEmbedding) continue;

    // Compute similarity to all other nodes
    const similarities: Array<{ node: GraphNode; similarity: number }> = [];

    for (const targetNode of nodes) {
      // Skip self
      if (targetNode.id === sourceNode.id) continue;

      const targetEmbedding = embeddings.get(targetNode.id);
      if (!targetEmbedding) continue;

      const similarity = cosineSimilarity(sourceEmbedding, targetEmbedding);

      // Only consider above threshold
      if (similarity >= threshold) {
        similarities.push({ node: targetNode, similarity });
      }
    }

    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Take top N most similar
    const topSimilar = similarities.slice(0, maxEdgesPerNode);

    // Create edges
    for (const { node, similarity } of topSimilar) {
      edges.push({
        source: sourceNode.id,
        target: node.id,
        type: 'semantic',
        weight: similarity, // Use raw similarity as weight
        metadata: {
          similarity,
        },
      });
    }
  }

  return edges;
}

/**
 * Deduplicate bidirectional semantic edges
 * If A→B and B→A both exist, keep only one (the one with higher combined weight)
 */
export function deduplicateSemanticEdges(edges: GraphEdge[]): GraphEdge[] {
  const edgeMap = new Map<string, GraphEdge>();

  for (const edge of edges) {
    // Create canonical key (sorted node IDs)
    const key = [edge.source, edge.target].sort().join('→');

    // Keep edge with highest weight
    const existing = edgeMap.get(key);
    if (!existing || edge.weight > existing.weight) {
      edgeMap.set(key, edge);
    }
  }

  return Array.from(edgeMap.values());
}

/**
 * Find clusters of highly similar documents
 * Uses simple connected components algorithm
 */
export function findSimilarityClusters(
  nodes: GraphNode[],
  edges: GraphEdge[],
  minClusterSize: number = 3
): Array<{ nodes: GraphNode[]; avgSimilarity: number }> {
  // Build adjacency list from semantic edges only
  const adjacency = new Map<string, Set<string>>();
  const semanticEdges = edges.filter(e => e.type === 'semantic');

  for (const edge of semanticEdges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, new Set());
    }
    if (!adjacency.has(edge.target)) {
      adjacency.set(edge.target, new Set());
    }

    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  }

  // Find connected components (DFS)
  const visited = new Set<string>();
  const clusters: Array<{ nodes: GraphNode[]; avgSimilarity: number }> = [];

  function dfs(nodeId: string, component: Set<string>) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    component.add(nodeId);

    const neighbors = adjacency.get(nodeId);
    if (neighbors) {
      for (const neighbor of neighbors) {
        dfs(neighbor, component);
      }
    }
  }

  // Find all components
  for (const node of nodes) {
    if (visited.has(node.id)) continue;

    const component = new Set<string>();
    dfs(node.id, component);

    if (component.size >= minClusterSize) {
      const clusterNodes = nodes.filter(n => component.has(n.id));

      // Compute average similarity within cluster
      const clusterEdges = semanticEdges.filter(
        e => component.has(e.source) && component.has(e.target)
      );

      const avgSimilarity =
        clusterEdges.reduce((sum, e) => sum + e.weight, 0) / clusterEdges.length;

      clusters.push({
        nodes: clusterNodes,
        avgSimilarity,
      });
    }
  }

  // Sort by cluster size (descending)
  clusters.sort((a, b) => b.nodes.length - a.nodes.length);

  return clusters;
}
