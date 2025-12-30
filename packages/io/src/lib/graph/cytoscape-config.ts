/**
 * Cytoscape Configuration
 *
 * Layout algorithms and Canon-compliant styling for the knowledge graph.
 */

import type { ViewMode } from './types.js';

/** Cytoscape stylesheet entry - using loose type for dynamic data() bindings */
interface StylesheetEntry {
  selector: string;
  style: Record<string, unknown>;
}

/**
 * Package colors from Canon data visualization palette
 */
export const PACKAGE_COLORS: Record<string, string> = {
  io: '#60a5fa', // --color-data-1 (blue)
  space: '#22c55e', // --color-data-2 (green)
  agency: '#c084fc', // --color-data-3 (purple)
  ltd: '#fbbf24', // --color-data-4 (amber)
  components: '#f472b6', // --color-data-5 (pink)
  harness: '#facc15', // --color-data-6 (yellow)
  lms: '#60a5fa', // Blue (shared with io)
  dotfiles: '#22c55e', // Green (shared with space)
  'templates-platform': '#c084fc', // Purple (shared with agency)
  verticals: '#fbbf24', // Amber (shared with ltd)
  'cloudflare-sdk': '#f472b6', // Pink (shared with components)
  root: 'rgba(255, 255, 255, 0.46)', // --color-fg-muted (no package)
};

/**
 * Cytoscape stylesheet with Canon design tokens
 */
export function createStylesheet(): StylesheetEntry[] {
  return [
    // ===========================================================================
    // Nodes
    // ===========================================================================
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'border-width': 1,
        'border-color': 'rgba(255, 255, 255, 0.2)', // --color-border-emphasis
        label: 'data(label)',
        'font-size': 11,
        'font-family': '"Geist Mono", "SF Mono", Monaco, monospace',
        color: '#ffffff', // --color-fg-primary
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': 100,
        width: 'data(size)',
        height: 'data(size)',
      },
    },

    // Node hover state
    {
      selector: 'node:active',
      style: {
        'border-width': 2,
        'border-color': 'rgba(255, 255, 255, 0.5)', // --color-focus
      },
    },

    // Selected node
    {
      selector: 'node:selected',
      style: {
        'border-width': 3,
        'border-color': '#ffffff', // --color-fg-primary
        'background-opacity': 1,
      },
    },

    // Dimmed nodes (when filtering)
    {
      selector: 'node.dimmed',
      style: {
        opacity: 0.3,
      },
    },

    // ===========================================================================
    // Edges
    // ===========================================================================
    {
      selector: 'edge',
      style: {
        width: 'data(width)',
        'line-color': 'data(color)',
        'line-style': 'data(style)',
        'curve-style': 'bezier',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': 'data(color)',
        opacity: 'data(opacity)',
      },
    },

    // Edge labels (hidden by default)
    {
      selector: 'edge.show-label',
      style: {
        label: 'data(label)',
        'font-size': 9,
        'font-family': '"Geist Mono", "SF Mono", Monaco, monospace',
        color: 'rgba(255, 255, 255, 0.6)', // --color-fg-tertiary
        'text-background-color': '#000000', // --color-bg-pure
        'text-background-opacity': 0.8,
        'text-background-padding': 3,
      },
    },

    // Explicit edges (UNDERSTANDING.md)
    {
      selector: 'edge.explicit',
      style: {
        'line-color': 'rgba(255, 255, 255, 0.6)', // --color-fg-tertiary
        'target-arrow-color': 'rgba(255, 255, 255, 0.6)',
        width: 2,
        'line-style': 'solid',
        opacity: 1,
      },
    },

    // Cross-reference edges (markdown links)
    {
      selector: 'edge.cross-reference',
      style: {
        'line-color': 'rgba(255, 255, 255, 0.46)', // --color-fg-muted
        'target-arrow-color': 'rgba(255, 255, 255, 0.46)',
        width: 1.5,
        'line-style': 'solid',
        opacity: 0.8,
      },
    },

    // Concept edges (shared concepts)
    {
      selector: 'edge.concept',
      style: {
        'line-color': 'rgba(255, 255, 255, 0.2)', // --color-border-emphasis
        'target-arrow-color': 'rgba(255, 255, 255, 0.2)',
        width: 1,
        'line-style': 'dashed',
        opacity: 0.6,
      },
    },

    // Semantic edges (embedding similarity)
    {
      selector: 'edge.semantic',
      style: {
        'line-color': 'rgba(255, 255, 255, 0.1)', // --color-border-default
        'target-arrow-color': 'rgba(255, 255, 255, 0.1)',
        width: 1,
        'line-style': 'dotted',
        opacity: 0.25,
      },
    },

    // Infrastructure edges (shared Cloudflare resources)
    {
      selector: 'edge.infrastructure',
      style: {
        'line-color': '#fbbf24', // --color-data-4 (amber)
        'target-arrow-color': '#fbbf24',
        width: 2.5,
        'line-style': 'solid',
        opacity: 0.8,
      },
    },

    // Hidden edges (when filtered out)
    {
      selector: 'edge.hidden',
      style: {
        display: 'none',
      },
    },
  ];
}

/**
 * Layout configurations for different view modes
 */
export function getLayoutConfig(mode: ViewMode, targetId?: string) {
  switch (mode) {
    case 'full':
      // cose-bilkent: force-directed layout, good for large graphs
      return {
        name: 'cose-bilkent',
        animate: false,
        nodeDimensionsIncludeLabels: true,
        nodeRepulsion: 8000,
        idealEdgeLength: 100,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500,
        tile: true,
        tilingPaddingVertical: 10,
        tilingPaddingHorizontal: 10,
      };

    case 'package':
      // concentric: target package at center, neighbors in rings
      return {
        name: 'concentric',
        animate: true,
        animationDuration: 500,
        fit: true,
        padding: 50,
        startAngle: (3 / 2) * Math.PI,
        sweep: undefined,
        clockwise: true,
        equidistant: false,
        minNodeSpacing: 50,
        concentric: (node: any) => {
          // Center node gets highest concentric value
          if (node.id() === targetId) return 10;
          // Direct neighbors get next ring
          const neighbors = node.neighborhood(`#${targetId}`);
          if (neighbors.length > 0) return 5;
          // Everything else outer ring
          return 1;
        },
        levelWidth: () => 2,
      };

    case 'concept':
      // breadthfirst: tree-like layout radiating from concept
      return {
        name: 'breadthfirst',
        animate: true,
        animationDuration: 500,
        fit: true,
        padding: 50,
        directed: false,
        spacingFactor: 1.5,
        roots: targetId ? `[id = "${targetId}"]` : undefined,
      };

    default:
      return { name: 'cose-bilkent' };
  }
}

/**
 * Compute node size based on word count (logarithmic scale)
 */
export function computeNodeSize(wordCount: number): number {
  const minSize = 20;
  const maxSize = 60;
  const scale = 8;

  const size = minSize + Math.log(wordCount + 1) * scale;
  return Math.min(maxSize, Math.max(minSize, size));
}

/**
 * Compute edge width based on weight
 */
export function computeEdgeWidth(weight: number): number {
  return weight * 3; // 0-1 weight → 0-3px
}
