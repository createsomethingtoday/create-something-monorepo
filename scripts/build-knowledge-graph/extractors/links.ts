/**
 * Link Extractor
 *
 * Extracts cross-references from markdown links between files.
 * Handles relative paths, absolute paths, and external links.
 */

import { readFileSync } from 'fs';
import { resolve, dirname, relative, join } from 'path';
import type { CrossReference, GraphEdge, GraphNode } from '../types.js';

/**
 * Extract all markdown links from content
 * Matches: [text](url) and [text][ref] (but ignores image syntax ![])
 */
function extractMarkdownLinks(content: string): Array<{ text: string; url: string; line: number }> {
  const links: Array<{ text: string; url: string; line: number }> = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match inline links: [text](url) but not images: ![text](url)
    const inlinePattern = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = inlinePattern.exec(line)) !== null) {
      const text = match[1].trim();
      const url = match[2].trim();

      // Skip anchors, external URLs, mailto, etc.
      if (
        url.startsWith('#') ||
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('mailto:') ||
        url.startsWith('tel:')
      ) {
        continue;
      }

      links.push({
        text,
        url,
        line: i + 1, // 1-indexed
      });
    }
  }

  return links;
}

/**
 * Resolve a relative path from one file to another
 */
function resolveLinkPath(
  sourcePath: string,
  linkUrl: string,
  rootDir: string
): string | null {
  try {
    // Remove any anchor fragments
    const urlWithoutAnchor = linkUrl.split('#')[0];

    // Handle absolute paths from repo root
    if (urlWithoutAnchor.startsWith('/')) {
      return urlWithoutAnchor.slice(1);
    }

    // Handle relative paths
    const sourceDir = dirname(sourcePath);
    const absoluteTarget = resolve(rootDir, sourceDir, urlWithoutAnchor);
    const relativeTarget = relative(rootDir, absoluteTarget);

    // Normalize to forward slashes (Windows compatibility)
    return relativeTarget.split('\\').join('/');
  } catch {
    return null;
  }
}

/**
 * Extract cross-references from a single file
 */
export function extractCrossReferences(
  content: string,
  sourcePath: string,
  rootDir: string
): CrossReference[] {
  const links = extractMarkdownLinks(content);
  const crossRefs: CrossReference[] = [];

  for (const link of links) {
    const targetPath = resolveLinkPath(sourcePath, link.url, rootDir);

    if (targetPath) {
      // Add .md extension if missing (common in markdown links)
      const normalizedTarget = targetPath.endsWith('.md')
        ? targetPath
        : `${targetPath}.md`;

      crossRefs.push({
        target: normalizedTarget,
        label: link.text,
        line: link.line,
      });
    }
  }

  return crossRefs;
}

/**
 * Extract all cross-reference edges from nodes
 */
export async function extractLinkEdges(
  nodes: GraphNode[],
  rootDir: string
): Promise<GraphEdge[]> {
  const edges: GraphEdge[] = [];
  const nodeIds = new Set(nodes.map(n => n.id));

  for (const node of nodes) {
    try {
      const content = readFileSync(node.absolutePath, 'utf-8');
      const crossRefs = extractCrossReferences(content, node.id, rootDir);

      for (const ref of crossRefs) {
        // Only create edges to nodes that exist in the graph
        if (nodeIds.has(ref.target)) {
          const edge: GraphEdge = {
            source: node.id,
            target: ref.target,
            type: 'cross-reference',
            weight: 0.8, // High weight, explicit but not as strong as UNDERSTANDING.md
            metadata: {
              reason: ref.label,
            },
          };

          edges.push(edge);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not extract links from ${node.id}: ${error}`);
    }
  }

  return edges;
}
