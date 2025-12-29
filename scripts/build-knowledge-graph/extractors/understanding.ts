/**
 * UNDERSTANDING.md Parser
 *
 * Extracts explicit dependencies from UNDERSTANDING.md table format.
 *
 * Expected format:
 * ## Depends On (Understanding-Critical)
 * | Dependency | Why It Matters |
 * |------------|----------------|
 * | `@create-something/components` | Shared UI... |
 *
 * ## Enables Understanding Of
 * | Consumer | What This Package Clarifies |
 * |----------|----------------------------|
 * | `@create-something/io` | What standards... |
 */

import { readFileSync } from 'fs';
import type { ExplicitDependency, GraphEdge, GraphNode } from '../types.js';

/**
 * Parse a markdown table into rows
 * Returns array of [col1, col2] for each data row
 */
function parseTable(content: string, headerPattern: RegExp): Array<[string, string]> {
  const match = content.match(headerPattern);
  if (!match) return [];

  // Find the table after this header
  const headerEnd = (match.index ?? 0) + match[0].length;
  const afterHeader = content.slice(headerEnd);

  // Match table rows (skip header row and separator row)
  const tableMatch = afterHeader.match(
    /\|[^|]+\|[^|]+\|\n\|[-:]+\|[-:]+\|\n((?:\|[^|]+\|[^|]+\|\n?)+)/
  );

  if (!tableMatch) return [];

  const rows: Array<[string, string]> = [];
  const rowPattern = /\|([^|]+)\|([^|]+)\|/g;
  let rowMatch;

  while ((rowMatch = rowPattern.exec(tableMatch[1])) !== null) {
    const col1 = rowMatch[1].trim();
    const col2 = rowMatch[2].trim();
    if (col1 && col2) {
      rows.push([col1, col2]);
    }
  }

  return rows;
}

/**
 * Extract package name from various formats:
 * - `@create-something/components`
 * - `packages/io`
 * - just `io`
 */
function normalizePackageReference(ref: string): string | null {
  // Remove backticks
  ref = ref.replace(/`/g, '').trim();

  // @create-something/package format
  const scopedMatch = ref.match(/@create-something\/([a-z-]+)/);
  if (scopedMatch) {
    return `packages/${scopedMatch[1]}/UNDERSTANDING.md`;
  }

  // packages/name format
  const pathMatch = ref.match(/packages\/([a-z-]+)/);
  if (pathMatch) {
    return `packages/${pathMatch[1]}/UNDERSTANDING.md`;
  }

  // Just the package name
  const simpleMatch = ref.match(/^([a-z-]+)$/);
  if (simpleMatch) {
    return `packages/${simpleMatch[1]}/UNDERSTANDING.md`;
  }

  return null;
}

/**
 * Extract dependencies from an UNDERSTANDING.md file
 */
export function parseUnderstandingFile(content: string): ExplicitDependency[] {
  const dependencies: ExplicitDependency[] = [];

  // Parse "Depends On" section
  const dependsOnRows = parseTable(content, /##\s*Depends On.*\n/i);
  for (const [target, reason] of dependsOnRows) {
    const normalized = normalizePackageReference(target);
    if (normalized) {
      dependencies.push({
        target: normalized,
        reason,
        direction: 'depends-on',
      });
    }
  }

  // Parse "Enables Understanding Of" section
  const enablesRows = parseTable(content, /##\s*Enables Understanding Of.*\n/i);
  for (const [consumer, clarification] of enablesRows) {
    const normalized = normalizePackageReference(consumer);
    if (normalized) {
      dependencies.push({
        target: normalized,
        reason: clarification,
        direction: 'enables',
      });
    }
  }

  return dependencies;
}

/**
 * Extract all explicit edges from UNDERSTANDING.md files
 */
export async function extractUnderstandingEdges(
  nodes: GraphNode[],
  rootDir: string
): Promise<GraphEdge[]> {
  const edges: GraphEdge[] = [];
  const understandingNodes = nodes.filter(n => n.type === 'understanding');

  for (const node of understandingNodes) {
    try {
      const content = readFileSync(node.absolutePath, 'utf-8');
      const dependencies = parseUnderstandingFile(content);

      for (const dep of dependencies) {
        // Check if target node exists
        const targetNode = nodes.find(n => n.id === dep.target);

        if (targetNode) {
          // For "depends-on": source depends on target (edge from source to target)
          // For "enables": source enables target (edge from source to target)
          const edge: GraphEdge = {
            source: dep.direction === 'depends-on' ? node.id : dep.target,
            target: dep.direction === 'depends-on' ? dep.target : node.id,
            type: 'explicit',
            weight: 1.0,
            metadata: {
              reason: dep.reason,
            },
          };

          edges.push(edge);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not parse ${node.id}: ${error}`);
    }
  }

  return edges;
}
