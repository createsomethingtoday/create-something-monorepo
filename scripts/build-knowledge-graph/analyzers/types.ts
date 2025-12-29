/**
 * Analyzer Types
 *
 * Types for knowledge graph gap detection and self-healing.
 */

export type GapType =
  | 'missing-understanding'  // Package without UNDERSTANDING.md
  | 'orphaned-node'          // Node with <2 edges
  | 'undocumented-semantic'  // High semantic similarity without explicit edge
  | 'undefined-concept'      // Concept mentioned frequently without definition
  | 'stale-documentation';   // Old, low-centrality docs

export type GapPriority = 0 | 1 | 2 | 3 | 4;

export interface KnowledgeGap {
  /** Type of gap detected */
  type: GapType;

  /** Priority (P0-P4) */
  priority: GapPriority;

  /** Human-readable title for the issue */
  title: string;

  /** Detailed description */
  description: string;

  /** Affected file(s) or package(s) */
  targets: string[];

  /** Labels to apply to the Beads issue */
  labels: string[];

  /** Supporting data (edge count, similarity score, etc.) */
  metadata: Record<string, unknown>;
}

export interface AnalysisResult {
  /** When analysis was run */
  analyzedAt: string;

  /** Total gaps found */
  totalGaps: number;

  /** Gaps by type */
  gapsByType: Record<GapType, number>;

  /** All detected gaps */
  gaps: KnowledgeGap[];

  /** Summary statistics */
  stats: {
    totalNodes: number;
    totalEdges: number;
    orphanedNodes: number;
    packagesWithoutUnderstanding: number;
    undocumentedSemanticLinks: number;
    undefinedConcepts: number;
  };
}

export interface AnalyzerConfig {
  /** Minimum edges for a node to not be considered orphaned */
  minEdgesForConnected: number;

  /** Minimum semantic similarity to flag as needing documentation */
  semanticThreshold: number;

  /** Minimum concept mentions to flag as needing definition */
  minConceptMentions: number;

  /** Create issues automatically (vs dry-run) */
  createIssues: boolean;

  /** Labels to add to all created issues */
  defaultLabels: string[];
}

export const DEFAULT_ANALYZER_CONFIG: AnalyzerConfig = {
  minEdgesForConnected: 2,
  semanticThreshold: 0.85,
  minConceptMentions: 5,
  createIssues: false,
  defaultLabels: ['knowledge-graph', 'self-heal'],
};
