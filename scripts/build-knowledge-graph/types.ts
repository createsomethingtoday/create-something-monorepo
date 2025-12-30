/**
 * Knowledge Graph Types
 *
 * Shared interfaces for the graph builder and visualization.
 */

// =============================================================================
// Node Types
// =============================================================================

export type NodeType =
  | 'understanding'  // UNDERSTANDING.md files
  | 'readme'         // README.md files
  | 'paper'          // Research papers
  | 'lesson'         // LMS lesson content
  | 'rule'           // .claude/rules files
  | 'spec'           // Specification files
  | 'general';       // All other markdown

export type PackageName =
  | 'io'
  | 'space'
  | 'agency'
  | 'ltd'
  | 'lms'
  | 'components'
  | 'harness'
  | 'dotfiles'
  | 'templates-platform'
  | 'verticals'
  | 'cloudflare-sdk'
  | null;  // Root-level files

export interface GraphNode {
  /** Normalized relative path: "packages/ltd/UNDERSTANDING.md" */
  id: string;

  /** Display title extracted from first H1 or filename */
  title: string;

  /** Package name or null for root-level files */
  package: PackageName;

  /** Document classification */
  type: NodeType;

  /** Philosophical concepts mentioned in the document */
  concepts: string[];

  /** SHA-256 hash of content for incremental updates */
  hash: string;

  /** Word count for potential node sizing */
  wordCount: number;

  /** ISO timestamp of last modification */
  lastModified: string;

  /** Absolute path for file operations */
  absolutePath: string;
}

// =============================================================================
// Edge Types
// =============================================================================

export type EdgeType =
  | 'explicit'        // From UNDERSTANDING.md dependency tables
  | 'cross-reference' // Markdown links between files
  | 'concept'         // Shared concept co-occurrence
  | 'semantic';       // Embedding similarity above threshold

export interface EdgeMetadata {
  /** Reason from UNDERSTANDING.md "Why It Matters" column */
  reason?: string;

  /** Shared concept name for concept edges */
  concept?: string;

  /** Raw cosine similarity for semantic edges */
  similarity?: number;
}

export interface GraphEdge {
  /** Source node ID */
  source: string;

  /** Target node ID */
  target: string;

  /** Edge classification */
  type: EdgeType;

  /** Edge weight (0-1), 1.0 for explicit */
  weight: number;

  /** Additional context */
  metadata?: EdgeMetadata;
}

// =============================================================================
// Extracted Data Types
// =============================================================================

export interface ExplicitDependency {
  /** Package or file being depended on */
  target: string;

  /** Why this dependency matters */
  reason: string;

  /** Direction: 'depends-on' or 'enables' */
  direction: 'depends-on' | 'enables';
}

export interface CrossReference {
  /** Target file path (resolved from relative) */
  target: string;

  /** Link text */
  label: string;

  /** Source line number */
  line: number;
}

export interface ConceptMention {
  /** Canonical concept name */
  concept: string;

  /** Number of occurrences in document */
  count: number;
}

// =============================================================================
// Embedding Types
// =============================================================================

export interface EmbeddingCacheEntry {
  /** Content hash when embedding was generated */
  hash: string;

  /** Embedding vector (1024 dimensions for voyage-3-lite) */
  embedding: number[];

  /** When this embedding was generated */
  generatedAt: string;
}

export interface EmbeddingCache {
  /** Cache format version for migrations */
  version: string;

  /** Model used for embeddings */
  model: string;

  /** Node ID -> cache entry */
  entries: Record<string, EmbeddingCacheEntry>;
}

// =============================================================================
// Build Metadata
// =============================================================================

export interface BuildMetadata {
  /** When the build was run */
  builtAt: string;

  /** Total nodes in graph */
  nodeCount: number;

  /** Total edges in graph */
  edgeCount: number;

  /** Edge counts by type */
  edgesByType: Record<EdgeType, number>;

  /** Node counts by package */
  nodesByPackage: Record<string, number>;

  /** Whether embeddings were generated/updated */
  embeddingsUpdated: boolean;

  /** Number of files that needed re-embedding */
  filesReembedded: number;
}

// =============================================================================
// Config Types
// =============================================================================

export interface ConceptDefinition {
  /** Canonical concept name */
  term: string;

  /** Alternative spellings/phrases */
  aliases: string[];
}

export interface BuildConfig {
  /** Root directory of monorepo */
  rootDir: string;

  /** Output directory for graph files */
  outputDir: string;

  /** Path to embedding cache file */
  cacheFile: string;

  /** Directories to include */
  includeDirs: string[];

  /** Glob patterns to exclude */
  excludePatterns: string[];

  /** Embedding provider: 'cloudflare' | 'none' */
  embeddingProvider: 'cloudflare' | 'none';

  /** Embedding model name */
  embeddingModel: string;

  /** Documents per embedding API call */
  batchSize: number;

  /** Max tokens to send per document */
  maxTokensPerDoc: number;

  /** Minimum cosine similarity for semantic edges */
  similarityThreshold: number;

  /** Max semantic edges per node to prevent dense graphs */
  maxSemanticEdgesPerNode: number;

  /** Concepts to extract */
  concepts: ConceptDefinition[];
}

// =============================================================================
// Output Types
// =============================================================================

export interface GraphOutput {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: BuildMetadata;
}
