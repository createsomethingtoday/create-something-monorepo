/**
 * Gap Detection
 *
 * Analyzes knowledge graph to find documentation gaps.
 * Each gap becomes a potential Beads issue for self-healing.
 */

import type { GraphNode, GraphEdge, PackageName } from '../types.js';
import type { KnowledgeGap, AnalysisResult, AnalyzerConfig, GapPriority } from './types.js';
import { DEFAULT_ANALYZER_CONFIG } from './types.js';

/**
 * All packages that should have UNDERSTANDING.md files
 */
const EXPECTED_PACKAGES: PackageName[] = [
  'io', 'space', 'agency', 'ltd', 'lms', 'components',
  'harness', 'dotfiles', 'templates-platform', 'verticals', 'cloudflare-sdk'
];

/**
 * Find packages missing UNDERSTANDING.md
 */
export function findMissingUnderstanding(nodes: GraphNode[]): KnowledgeGap[] {
  const gaps: KnowledgeGap[] = [];
  const understandingNodes = nodes.filter(n => n.type === 'understanding');
  const packagesWithUnderstanding = new Set(understandingNodes.map(n => n.package));

  for (const pkg of EXPECTED_PACKAGES) {
    if (!packagesWithUnderstanding.has(pkg)) {
      // Check if package has any docs at all
      const packageDocs = nodes.filter(n => n.package === pkg);
      if (packageDocs.length > 0) {
        gaps.push({
          type: 'missing-understanding',
          priority: 2,
          title: `Create UNDERSTANDING.md for ${pkg}`,
          description: `Package \`${pkg}\` has ${packageDocs.length} documentation files but no UNDERSTANDING.md to explain dependencies and architectural decisions.`,
          targets: [`packages/${pkg}/UNDERSTANDING.md`],
          labels: [pkg, 'documentation'],
          metadata: {
            existingDocs: packageDocs.length,
            package: pkg,
          },
        });
      }
    }
  }

  return gaps;
}

/**
 * Find orphaned nodes (low edge count)
 */
export function findOrphanedNodes(
  nodes: GraphNode[],
  edges: GraphEdge[],
  config: AnalyzerConfig
): KnowledgeGap[] {
  const gaps: KnowledgeGap[] = [];

  // Count edges per node
  const edgeCounts = new Map<string, number>();
  for (const node of nodes) {
    edgeCounts.set(node.id, 0);
  }
  for (const edge of edges) {
    edgeCounts.set(edge.source, (edgeCounts.get(edge.source) ?? 0) + 1);
    edgeCounts.set(edge.target, (edgeCounts.get(edge.target) ?? 0) + 1);
  }

  for (const node of nodes) {
    const count = edgeCounts.get(node.id) ?? 0;
    if (count < config.minEdgesForConnected) {
      // Skip root-level config files
      if (node.id.startsWith('.claude/') && node.type === 'rule') continue;

      const priority: GapPriority = count === 0 ? 2 : 3;
      gaps.push({
        type: 'orphaned-node',
        priority,
        title: `Review orphaned doc: ${node.title}`,
        description: `Document "${node.title}" has only ${count} connection(s). Consider:\n- Adding cross-references to related docs\n- Linking from UNDERSTANDING.md\n- Archiving if no longer relevant`,
        targets: [node.id],
        labels: [node.package ?? 'root', 'review'],
        metadata: {
          edgeCount: count,
          wordCount: node.wordCount,
          type: node.type,
          lastModified: node.lastModified,
        },
      });
    }
  }

  return gaps;
}

/**
 * Find high semantic similarity without explicit documentation
 */
export function findUndocumentedSemanticLinks(
  edges: GraphEdge[],
  nodes: GraphNode[],
  config: AnalyzerConfig
): KnowledgeGap[] {
  const gaps: KnowledgeGap[] = [];

  // Get explicit edges for comparison
  const explicitPairs = new Set<string>();
  for (const edge of edges) {
    if (edge.type === 'explicit' || edge.type === 'cross-reference') {
      const key = [edge.source, edge.target].sort().join('|');
      explicitPairs.add(key);
    }
  }

  // Find high-similarity semantic edges without explicit counterpart
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const seen = new Set<string>();

  for (const edge of edges) {
    if (edge.type !== 'semantic') continue;
    if ((edge.metadata?.similarity ?? 0) < config.semanticThreshold) continue;

    const key = [edge.source, edge.target].sort().join('|');
    if (explicitPairs.has(key)) continue; // Already documented
    if (seen.has(key)) continue; // Already reported
    seen.add(key);

    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) continue;

    const similarity = edge.metadata?.similarity ?? 0;
    gaps.push({
      type: 'undocumented-semantic',
      priority: 2,
      title: `Document relationship: ${sourceNode.title} ↔ ${targetNode.title}`,
      description: `High semantic similarity (${(similarity * 100).toFixed(0)}%) detected between:\n- ${sourceNode.id}\n- ${targetNode.id}\n\nConsider adding explicit cross-reference or documenting the relationship in UNDERSTANDING.md.`,
      targets: [sourceNode.id, targetNode.id],
      labels: ['documentation', 'semantic-link'],
      metadata: {
        similarity,
        sourcePackage: sourceNode.package,
        targetPackage: targetNode.package,
      },
    });
  }

  return gaps;
}

/**
 * Find concepts mentioned frequently but without definition
 */
export function findUndefinedConcepts(
  nodes: GraphNode[],
  config: AnalyzerConfig
): KnowledgeGap[] {
  const gaps: KnowledgeGap[] = [];

  // Count concept mentions across all nodes
  const conceptCounts = new Map<string, number>();
  const conceptFiles = new Map<string, string[]>();

  for (const node of nodes) {
    for (const concept of node.concepts) {
      conceptCounts.set(concept, (conceptCounts.get(concept) ?? 0) + 1);
      const files = conceptFiles.get(concept) ?? [];
      files.push(node.id);
      conceptFiles.set(concept, files);
    }
  }

  // Check for concepts without dedicated documentation
  // A concept is "defined" if there's a file with that concept in the title
  for (const [concept, count] of conceptCounts) {
    if (count < config.minConceptMentions) continue;

    const hasDefinition = nodes.some(n =>
      n.title.toLowerCase().includes(concept.toLowerCase()) ||
      n.id.toLowerCase().includes(concept.toLowerCase().replace(/\s+/g, '-'))
    );

    if (!hasDefinition) {
      gaps.push({
        type: 'undefined-concept',
        priority: 3,
        title: `Define canonical concept: ${concept}`,
        description: `Concept "${concept}" appears in ${count} documents but has no dedicated definition.\n\nMentioned in:\n${(conceptFiles.get(concept) ?? []).slice(0, 5).map(f => `- ${f}`).join('\n')}${count > 5 ? `\n- ... and ${count - 5} more` : ''}`,
        targets: conceptFiles.get(concept) ?? [],
        labels: ['ltd', 'concept', 'documentation'],
        metadata: {
          mentionCount: count,
          files: conceptFiles.get(concept),
        },
      });
    }
  }

  return gaps;
}

/**
 * Run all gap analyzers
 */
export function analyzeGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  config: Partial<AnalyzerConfig> = {}
): AnalysisResult {
  const fullConfig = { ...DEFAULT_ANALYZER_CONFIG, ...config };
  const gaps: KnowledgeGap[] = [];

  // Run all analyzers
  gaps.push(...findMissingUnderstanding(nodes));
  gaps.push(...findOrphanedNodes(nodes, edges, fullConfig));
  gaps.push(...findUndocumentedSemanticLinks(edges, nodes, fullConfig));
  gaps.push(...findUndefinedConcepts(nodes, fullConfig));

  // Sort by priority
  gaps.sort((a, b) => a.priority - b.priority);

  // Build stats
  const gapsByType: Record<string, number> = {};
  for (const gap of gaps) {
    gapsByType[gap.type] = (gapsByType[gap.type] ?? 0) + 1;
  }

  return {
    analyzedAt: new Date().toISOString(),
    totalGaps: gaps.length,
    gapsByType: gapsByType as AnalysisResult['gapsByType'],
    gaps,
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      orphanedNodes: gapsByType['orphaned-node'] ?? 0,
      packagesWithoutUnderstanding: gapsByType['missing-understanding'] ?? 0,
      undocumentedSemanticLinks: gapsByType['undocumented-semantic'] ?? 0,
      undefinedConcepts: gapsByType['undefined-concept'] ?? 0,
    },
  };
}
