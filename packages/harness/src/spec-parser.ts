/**
 * @create-something/harness
 *
 * Spec Parser: Converts markdown or YAML PRD documents into structured features.
 *
 * Supports two formats:
 *
 * 1. Markdown (legacy):
 * ```markdown
 * # Project Title
 *
 * ## Overview
 * Description of the project...
 *
 * ## Features
 *
 * ### Feature Name
 * Description of the feature...
 * - Acceptance criteria 1
 * - Acceptance criteria 2
 * ```
 *
 * 2. YAML (recommended):
 * ```yaml
 * title: Project Title
 * property: agency
 * complexity: standard
 *
 * features:
 *   - title: Feature Name
 *     priority: 1
 *     acceptance:
 *       - Acceptance criteria 1
 *       - test: Acceptance criteria 2
 *         verify: pnpm test
 * ```
 *
 * YAML specs are validated against JSON Schema for unambiguous, machine-validatable specifications.
 * Schema: https://createsomething.ltd/schemas/harness-spec.json
 */

import type { Feature, ParsedSpec, DependencyGraph } from './types.js';
import { parseYamlSpec, isYamlSpec, SpecValidationError, generateYamlFromMarkdown } from './yaml-spec-parser.js';

// Re-export YAML parser utilities
export { parseYamlSpec, isYamlSpec, SpecValidationError, generateYamlFromMarkdown };

/**
 * Parse a spec file (auto-detects Markdown vs YAML).
 * This is the recommended entry point for parsing specs.
 */
export function parse(content: string): ParsedSpec {
  if (isYamlSpec(content)) {
    return parseYamlSpec(content);
  }
  return parseSpec(content);
}

/**
 * Parse a markdown PRD spec into structured features.
 * Each H3 (###) becomes ONE feature. Bullets are acceptance criteria.
 */
export function parseSpec(markdown: string): ParsedSpec {
  const lines = markdown.split('\n');

  let title = '';
  let overview = '';
  const features: Feature[] = [];

  let currentSection: 'title' | 'overview' | 'features' | 'other' = 'title';
  let currentFeature: Partial<Feature> | null = null;
  let overviewLines: string[] = [];
  let featureId = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // H1: Project title
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      title = trimmed.slice(2).trim();
      currentSection = 'title';
      continue;
    }

    // H2: Section headers
    if (trimmed.startsWith('## ')) {
      const sectionName = trimmed.slice(3).trim().toLowerCase();

      // Save any pending feature
      if (currentFeature && currentFeature.title) {
        features.push(finalizeFeature(currentFeature, featureId++));
        currentFeature = null;
      }

      if (sectionName === 'overview' || sectionName === 'description') {
        currentSection = 'overview';
        overviewLines = [];
      } else if (sectionName === 'features' || sectionName.includes('feature')) {
        currentSection = 'features';
      } else {
        currentSection = 'other';
      }
      continue;
    }

    // H3: Feature titles (within Features section) - each H3 is ONE feature
    if (trimmed.startsWith('### ') && currentSection === 'features') {
      // Save any pending feature
      if (currentFeature && currentFeature.title) {
        features.push(finalizeFeature(currentFeature, featureId++));
      }

      // Create new feature from H3 title
      const featureTitle = trimmed.slice(4).trim();
      currentFeature = {
        title: featureTitle,
        description: '',
        labels: [slugify(featureTitle)],
        acceptanceCriteria: [],
        dependsOn: [],
      };
      continue;
    }

    // Collect overview content
    if (currentSection === 'overview') {
      overviewLines.push(trimmed);
      continue;
    }

    // Bullets in Features section become acceptance criteria for current feature
    if (currentSection === 'features' && trimmed.startsWith('- ') && currentFeature) {
      const criterion = trimmed.slice(2).trim();
      if (criterion) {
        currentFeature.acceptanceCriteria = currentFeature.acceptanceCriteria || [];
        currentFeature.acceptanceCriteria.push(criterion);
      }
      continue;
    }

    // Plain text after H3 becomes description
    if (currentSection === 'features' && currentFeature && trimmed && !trimmed.startsWith('-')) {
      if (!currentFeature.description) {
        currentFeature.description = trimmed;
      } else {
        currentFeature.description += ' ' + trimmed;
      }
    }
  }

  // Save final pending feature
  if (currentFeature && currentFeature.title) {
    features.push(finalizeFeature(currentFeature, featureId++));
  }

  // Clean up overview
  overview = overviewLines
    .join('\n')
    .trim()
    .replace(/\n{3,}/g, '\n\n');

  // Build dependency graph and detect independence (no auto-inferred deps)
  const dependencyGraph = buildDependencyGraph(features);
  detectIndependence(features, dependencyGraph);

  // Collect independent features
  const independentFeatures = features.filter((f) => f.isIndependent);

  return { title, overview, features, independentFeatures, dependencyGraph };
}

/**
 * Finalize a partial feature into a complete Feature object.
 */
function finalizeFeature(partial: Partial<Feature>, index: number): Feature {
  return {
    id: `feature-${index.toString().padStart(3, '0')}`,
    title: partial.title || 'Untitled Feature',
    description: partial.description || '',
    priority: inferPriority(partial.title || '', index),
    dependsOn: partial.dependsOn || [],
    blockedBy: [], // Will be populated by buildDependencyGraph
    isIndependent: true, // Will be recalculated by detectIndependence
    acceptanceCriteria: partial.acceptanceCriteria || [],
    labels: partial.labels || [],
  };
}

/**
 * Infer priority from keywords in title or position.
 * Earlier features get higher priority (lower number).
 */
function inferPriority(title: string, index: number): number {
  const lowerTitle = title.toLowerCase();

  // P0 keywords
  if (lowerTitle.includes('critical') || lowerTitle.includes('urgent') || lowerTitle.includes('blocker')) {
    return 0;
  }

  // P1 keywords
  if (lowerTitle.includes('important') || lowerTitle.includes('core') || lowerTitle.includes('essential')) {
    return 1;
  }

  // P3 keywords
  if (lowerTitle.includes('nice to have') || lowerTitle.includes('optional') || lowerTitle.includes('future')) {
    return 3;
  }

  // Default: P2 for first 10, P2-P3 based on position
  if (index < 10) return 2;
  if (index < 20) return 2;
  return 3;
}

/**
 * Infer dependencies between features.
 * Simple heuristic: features in the same category depend on earlier ones.
 */
function inferDependencies(features: Feature[]): void {
  const categoryFirstFeature: Record<string, string> = {};

  for (const feature of features) {
    const category = feature.labels[0];
    if (!category) continue;

    if (categoryFirstFeature[category]) {
      // Later features in a category depend on the first one
      // (Only add if not already the first)
      if (feature.id !== categoryFirstFeature[category]) {
        feature.dependsOn.push(categoryFirstFeature[category]);
      }
    } else {
      // This is the first feature in the category
      categoryFirstFeature[category] = feature.id;
    }
  }
}

/**
 * Convert a string to a URL-safe slug.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Build a dependency graph from features.
 * Creates both forward (dependsOn) and reverse (blockedBy) mappings.
 */
function buildDependencyGraph(features: Feature[]): DependencyGraph {
  const blocksMap = new Map<string, string[]>();
  const dependsOnMap = new Map<string, string[]>();

  // Initialize maps for all features
  for (const feature of features) {
    blocksMap.set(feature.id, []);
    dependsOnMap.set(feature.id, [...feature.dependsOn]);
  }

  // Build reverse mapping (blocksMap)
  for (const feature of features) {
    for (const depId of feature.dependsOn) {
      const blocks = blocksMap.get(depId) || [];
      blocks.push(feature.id);
      blocksMap.set(depId, blocks);

      // Also update the feature's blockedBy array
      feature.blockedBy = feature.dependsOn;
    }
  }

  // Find roots (features with no dependencies)
  const roots = features
    .filter((f) => f.dependsOn.length === 0)
    .map((f) => f.id);

  // Find leaves (features with no dependents)
  const leaves = features
    .filter((f) => {
      const blocks = blocksMap.get(f.id) || [];
      return blocks.length === 0;
    })
    .map((f) => f.id);

  // Calculate max depth using BFS from roots
  const maxDepth = calculateMaxDepth(features, blocksMap, roots);

  return { blocksMap, dependsOnMap, roots, leaves, maxDepth };
}

/**
 * Calculate the maximum depth of the dependency chain.
 * Uses BFS to find the longest path from any root to any leaf.
 */
function calculateMaxDepth(
  features: Feature[],
  blocksMap: Map<string, string[]>,
  roots: string[]
): number {
  if (roots.length === 0) return 0;
  if (features.length === 0) return 0;

  const depths = new Map<string, number>();

  // Initialize all features with depth 0
  for (const feature of features) {
    depths.set(feature.id, 0);
  }

  // BFS from roots
  const queue = [...roots];
  for (const root of roots) {
    depths.set(root, 1);
  }

  let maxDepth = 1;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depths.get(current) || 1;

    const dependents = blocksMap.get(current) || [];
    for (const depId of dependents) {
      const newDepth = currentDepth + 1;
      const existingDepth = depths.get(depId) || 0;

      if (newDepth > existingDepth) {
        depths.set(depId, newDepth);
        maxDepth = Math.max(maxDepth, newDepth);
        queue.push(depId);
      }
    }
  }

  return maxDepth;
}

/**
 * Detect which features are independent and can run in parallel.
 * A feature is independent if it has no dependencies (dependsOn is empty).
 */
function detectIndependence(features: Feature[], graph: DependencyGraph): void {
  for (const feature of features) {
    // A feature is independent if:
    // 1. It has no dependencies (it's a root node)
    // 2. All its dependencies are optional (not implemented yet)
    feature.isIndependent = feature.dependsOn.length === 0;
  }
}

/**
 * Get features that can be started immediately (no blockers).
 * This is useful for the swarm orchestrator to find initial parallel tasks.
 */
export function getStartableFeatures(spec: ParsedSpec): Feature[] {
  return spec.independentFeatures.slice().sort((a, b) => a.priority - b.priority);
}

/**
 * Get the next batch of features that become unblocked after completing a set.
 * Used by the swarm orchestrator to find the next wave of parallel tasks.
 */
export function getNextBatch(
  spec: ParsedSpec,
  completedIds: Set<string>
): Feature[] {
  return spec.features.filter((feature) => {
    // Skip already completed features
    if (completedIds.has(feature.id)) return false;

    // Check if all dependencies are completed
    const allDepsComplete = feature.dependsOn.every((depId) =>
      completedIds.has(depId)
    );

    return allDepsComplete;
  });
}

/**
 * Analyze the dependency graph for potential parallelism.
 * Returns metrics useful for deciding swarm configuration.
 */
export function analyzeDependencyGraph(spec: ParsedSpec): {
  independentCount: number;
  avgDependencies: number;
  maxParallelPotential: number;
  criticalPathLength: number;
} {
  const features = spec.features;
  const independentCount = spec.independentFeatures.length;

  // Average dependencies per feature
  const totalDeps = features.reduce((sum, f) => sum + f.dependsOn.length, 0);
  const avgDependencies = features.length > 0 ? totalDeps / features.length : 0;

  // Maximum parallel potential (max number of features at any depth level)
  // This requires analyzing the graph by levels
  const { blocksMap } = spec.dependencyGraph;
  const levelCounts = new Map<number, number>();
  const depths = new Map<string, number>();

  // Calculate depth for each feature
  for (const root of spec.dependencyGraph.roots) {
    depths.set(root, 1);
    levelCounts.set(1, (levelCounts.get(1) || 0) + 1);
  }

  // BFS to assign depths
  const queue = [...spec.dependencyGraph.roots];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depths.get(current) || 1;

    const dependents = blocksMap.get(current) || [];
    for (const depId of dependents) {
      const newDepth = currentDepth + 1;
      const existingDepth = depths.get(depId) || 0;

      if (newDepth > existingDepth) {
        depths.set(depId, newDepth);

        // Update level counts
        if (existingDepth > 0) {
          levelCounts.set(existingDepth, (levelCounts.get(existingDepth) || 1) - 1);
        }
        levelCounts.set(newDepth, (levelCounts.get(newDepth) || 0) + 1);

        queue.push(depId);
      }
    }
  }

  // Max parallel potential is the maximum count at any level
  const maxParallelPotential = Math.max(1, ...levelCounts.values());

  return {
    independentCount,
    avgDependencies: Math.round(avgDependencies * 100) / 100,
    maxParallelPotential,
    criticalPathLength: spec.dependencyGraph.maxDepth,
  };
}

/**
 * Format a parsed spec as a summary string.
 */
export function formatSpecSummary(spec: ParsedSpec): string {
  const lines: string[] = [];

  lines.push(`# ${spec.title}`);
  lines.push('');

  if (spec.overview) {
    lines.push(`## Overview`);
    lines.push(spec.overview);
    lines.push('');
  }

  lines.push(`## Features (${spec.features.length} total)`);
  lines.push('');

  // Group by category
  const byCategory: Record<string, Feature[]> = {};
  for (const feature of spec.features) {
    const category = feature.labels[0] || 'uncategorized';
    if (!byCategory[category]) byCategory[category] = [];
    byCategory[category].push(feature);
  }

  for (const [category, categoryFeatures] of Object.entries(byCategory)) {
    lines.push(`### ${category} (${categoryFeatures.length})`);
    for (const feature of categoryFeatures) {
      const deps = feature.dependsOn.length > 0 ? ` (depends: ${feature.dependsOn.join(', ')})` : '';
      lines.push(`- P${feature.priority}: ${feature.title}${deps}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
