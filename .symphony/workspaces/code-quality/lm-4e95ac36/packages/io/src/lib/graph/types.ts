/**
 * Graph Visualization Types
 *
 * Type definitions for the knowledge graph visualization components.
 */

import type { GraphNode, GraphEdge, BuildMetadata } from '../../../../../scripts/build-knowledge-graph/types.js';

// Re-export graph builder types
export type { GraphNode, GraphEdge, BuildMetadata };

/**
 * View modes for the graph visualization
 */
export type ViewMode = 'full' | 'package' | 'concept';

/**
 * Visible edge types (for filtering)
 */
export interface EdgeFilters {
  explicit: boolean;
  crossReference: boolean;
  concept: boolean;
  semantic: boolean;
  infrastructure: boolean;
}

/**
 * Selected node/package/concept for focused view
 */
export interface GraphFocus {
  mode: ViewMode;
  nodeId?: string;
  packageName?: string;
  conceptName?: string;
}

/**
 * Graph display options
 */
export interface GraphOptions {
  showLabels: boolean;
  showEdgeLabels: boolean;
  edgeFilters: EdgeFilters;
  highlightConnected: boolean;
}

/**
 * Cytoscape element (node or edge)
 */
export interface CytoscapeElement {
  data: {
    id: string;
    [key: string]: any;
  };
  classes?: string;
}

/**
 * Complete graph data for Cytoscape
 */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: BuildMetadata;
}
