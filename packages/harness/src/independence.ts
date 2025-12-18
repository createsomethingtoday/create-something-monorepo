/**
 * @create-something/harness
 *
 * Independence Detection: Analyzes parsed specs to identify which tasks can run in parallel.
 *
 * Philosophy: The harness runs autonomously. Parallel execution requires understanding
 * which tasks are truly independent—no shared state, no ordering constraints.
 *
 * Heideggerian alignment: The dependency graph recedes into transparent operation.
 * When working, you don't think about dependencies—you execute parallel batches.
 */

import type { Feature, ParsedSpec } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DependencyGraph {
  /** Map from feature ID to IDs of features it depends on (blocks this feature) */
  dependencies: Map<string, Set<string>>;
  /** Map from feature ID to IDs of features that depend on it (this blocks them) */
  dependents: Map<string, Set<string>>;
  /** Features with no dependencies (can start immediately) */
  roots: Set<string>;
  /** Features with no dependents (nothing depends on them) */
  leaves: Set<string>;
}

export interface IndependenceAnalysis {
  /** The dependency graph */
  graph: DependencyGraph;
  /** Features grouped into parallel execution batches (in execution order) */
  parallelBatches: string[][];
  /** Maximum parallel width (largest batch size) */
  maxParallelism: number;
  /** Critical path length (minimum sequential steps needed) */
  criticalPathLength: number;
  /** Features that are completely independent (no connections) */
  isolated: string[];
  /** Detected implicit dependencies (inferred from content analysis) */
  implicitDependencies: Array<{
    from: string;
    to: string;
    reason: string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dependency Graph Construction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a dependency graph from parsed features.
 */
export function buildDependencyGraph(features: Feature[]): DependencyGraph {
  const dependencies = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();

  // Initialize all features
  for (const feature of features) {
    dependencies.set(feature.id, new Set());
    dependents.set(feature.id, new Set());
  }

  // Add explicit dependencies
  for (const feature of features) {
    for (const depId of feature.dependsOn) {
      // Validate dependency exists
      if (!dependencies.has(depId)) continue;

      // feature depends on depId
      dependencies.get(feature.id)!.add(depId);
      // depId blocks feature
      dependents.get(depId)!.add(feature.id);
    }
  }

  // Identify roots and leaves
  const roots = new Set<string>();
  const leaves = new Set<string>();

  for (const feature of features) {
    const deps = dependencies.get(feature.id)!;
    const blocked = dependents.get(feature.id)!;

    if (deps.size === 0) {
      roots.add(feature.id);
    }
    if (blocked.size === 0) {
      leaves.add(feature.id);
    }
  }

  return { dependencies, dependents, roots, leaves };
}

// ─────────────────────────────────────────────────────────────────────────────
// Implicit Dependency Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Keywords that suggest a feature creates something other features might depend on.
 */
const CREATION_KEYWORDS = [
  'create', 'implement', 'add', 'build', 'setup', 'configure', 'initialize',
  'define', 'establish', 'introduce', 'develop'
];

/**
 * Keywords that suggest a feature consumes something another feature creates.
 */
const CONSUMPTION_KEYWORDS = [
  'use', 'integrate', 'extend', 'update', 'modify', 'enhance', 'improve',
  'refactor', 'fix', 'test', 'validate', 'document'
];

/**
 * Domain concepts that often have implicit dependencies.
 */
const DOMAIN_CONCEPTS = [
  // Auth flows
  { concept: 'authentication', creates: ['login', 'signup', 'session'], consumes: [] },
  { concept: 'authorization', creates: ['permission', 'role'], consumes: ['authentication'] },

  // Data flows
  { concept: 'database', creates: ['schema', 'migration', 'model'], consumes: [] },
  { concept: 'api', creates: ['endpoint', 'route'], consumes: ['database', 'authentication'] },

  // UI flows
  { concept: 'component', creates: ['ui', 'widget'], consumes: [] },
  { concept: 'page', creates: ['view', 'screen'], consumes: ['component', 'api'] },

  // Infrastructure
  { concept: 'config', creates: ['configuration', 'setting'], consumes: [] },
  { concept: 'deployment', creates: ['deploy', 'ci/cd'], consumes: ['config'] },
];

/**
 * Detect implicit dependencies based on feature content analysis.
 */
export function detectImplicitDependencies(
  features: Feature[]
): Array<{ from: string; to: string; reason: string }> {
  const implicit: Array<{ from: string; to: string; reason: string }> = [];
  const featureMap = new Map(features.map(f => [f.id, f]));

  // Build a map of what each feature might create/consume
  const featureActions = new Map<string, {
    creates: string[];
    consumes: string[];
  }>();

  for (const feature of features) {
    const text = `${feature.title} ${feature.description}`.toLowerCase();
    const creates: string[] = [];
    const consumes: string[] = [];

    // Check for creation/consumption patterns
    for (const keyword of CREATION_KEYWORDS) {
      if (text.includes(keyword)) {
        // Extract what's being created (word after keyword)
        const match = text.match(new RegExp(`${keyword}\\s+(\\w+)`, 'i'));
        if (match) creates.push(match[1]);
      }
    }

    for (const keyword of CONSUMPTION_KEYWORDS) {
      if (text.includes(keyword)) {
        const match = text.match(new RegExp(`${keyword}\\s+(\\w+)`, 'i'));
        if (match) consumes.push(match[1]);
      }
    }

    // Check domain concepts
    for (const domain of DOMAIN_CONCEPTS) {
      if (text.includes(domain.concept)) {
        creates.push(...domain.creates);
        consumes.push(...domain.consumes);
      }
    }

    featureActions.set(feature.id, { creates, consumes });
  }

  // Find implicit dependencies based on create/consume relationships
  for (const [consumerId, consumerActions] of featureActions) {
    for (const [creatorId, creatorActions] of featureActions) {
      if (consumerId === creatorId) continue;

      // Check if consumer needs something creator provides
      for (const need of consumerActions.consumes) {
        for (const provides of creatorActions.creates) {
          if (need === provides || provides.includes(need) || need.includes(provides)) {
            // Avoid duplicating explicit dependencies
            const consumer = featureMap.get(consumerId)!;
            if (!consumer.dependsOn.includes(creatorId)) {
              implicit.push({
                from: consumerId,
                to: creatorId,
                reason: `"${consumer.title}" may need "${provides}" created by earlier feature`
              });
            }
          }
        }
      }
    }
  }

  // Check for sequential naming patterns (e.g., "Part 1", "Phase 2")
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    const titleLower = feature.title.toLowerCase();

    // Check for numbered sequences
    const numberMatch = titleLower.match(/(part|phase|step|stage)\s*(\d+)/i);
    if (numberMatch) {
      const prefix = numberMatch[1];
      const num = parseInt(numberMatch[2], 10);

      // Look for previous numbered feature
      for (let j = 0; j < i; j++) {
        const prevFeature = features[j];
        const prevMatch = prevFeature.title.toLowerCase().match(new RegExp(`${prefix}\\s*(\\d+)`, 'i'));
        if (prevMatch) {
          const prevNum = parseInt(prevMatch[1], 10);
          if (prevNum === num - 1 && !feature.dependsOn.includes(prevFeature.id)) {
            implicit.push({
              from: feature.id,
              to: prevFeature.id,
              reason: `Sequential ${prefix} numbering suggests dependency`
            });
          }
        }
      }
    }
  }

  return implicit;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parallel Batch Computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute parallel execution batches using topological sort.
 * Each batch contains features that can execute in parallel (all dependencies in prior batches).
 */
export function computeParallelBatches(
  features: Feature[],
  graph: DependencyGraph
): string[][] {
  const batches: string[][] = [];
  const completed = new Set<string>();
  const remaining = new Set(features.map(f => f.id));

  while (remaining.size > 0) {
    const batch: string[] = [];

    // Find all features whose dependencies are complete
    for (const featureId of remaining) {
      const deps = graph.dependencies.get(featureId)!;
      const allDepsComplete = [...deps].every(depId => completed.has(depId));

      if (allDepsComplete) {
        batch.push(featureId);
      }
    }

    if (batch.length === 0) {
      // Circular dependency detected - break the cycle
      console.warn('Circular dependency detected in feature graph');
      // Add remaining features as a single batch
      batches.push([...remaining]);
      break;
    }

    // Add batch and mark as completed
    batches.push(batch);
    for (const featureId of batch) {
      completed.add(featureId);
      remaining.delete(featureId);
    }
  }

  return batches;
}

/**
 * Find completely isolated features (no dependencies or dependents).
 */
export function findIsolatedFeatures(graph: DependencyGraph): string[] {
  const isolated: string[] = [];

  for (const [featureId, deps] of graph.dependencies) {
    const dependents = graph.dependents.get(featureId)!;
    if (deps.size === 0 && dependents.size === 0) {
      isolated.push(featureId);
    }
  }

  return isolated;
}

/**
 * Calculate the critical path length (longest dependency chain).
 */
export function calculateCriticalPath(
  features: Feature[],
  graph: DependencyGraph
): number {
  const memo = new Map<string, number>();

  function depth(featureId: string): number {
    if (memo.has(featureId)) return memo.get(featureId)!;

    const deps = graph.dependencies.get(featureId);
    if (!deps || deps.size === 0) {
      memo.set(featureId, 1);
      return 1;
    }

    const maxDepth = Math.max(...[...deps].map(d => depth(d)));
    const result = maxDepth + 1;
    memo.set(featureId, result);
    return result;
  }

  let maxDepth = 0;
  for (const feature of features) {
    maxDepth = Math.max(maxDepth, depth(feature.id));
  }

  return maxDepth;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Analysis Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyze a parsed spec for task independence.
 * Returns information about which tasks can run in parallel.
 */
export function analyzeIndependence(spec: ParsedSpec): IndependenceAnalysis {
  const { features } = spec;

  // Build initial graph from explicit dependencies
  const graph = buildDependencyGraph(features);

  // Detect implicit dependencies
  const implicitDependencies = detectImplicitDependencies(features);

  // Note: We report implicit dependencies but don't add them to the graph
  // This allows the user to decide whether to add them

  // Compute parallel batches
  const parallelBatches = computeParallelBatches(features, graph);

  // Find isolated features
  const isolated = findIsolatedFeatures(graph);

  // Calculate metrics
  const maxParallelism = Math.max(...parallelBatches.map(b => b.length), 0);
  const criticalPathLength = calculateCriticalPath(features, graph);

  return {
    graph,
    parallelBatches,
    maxParallelism,
    criticalPathLength,
    isolated,
    implicitDependencies,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced Spec Parser Integration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dependency pattern keywords to detect in spec content.
 */
const DEPENDENCY_PATTERNS = [
  { pattern: /requires?\s+(\w+)/gi, type: 'requires' as const },
  { pattern: /depends?\s+on\s+(\w+)/gi, type: 'depends' as const },
  { pattern: /after\s+(\w+)/gi, type: 'after' as const },
  { pattern: /blocks?\s+(\w+)/gi, type: 'blocks' as const },
  { pattern: /before\s+(\w+)/gi, type: 'before' as const },
];

/**
 * Extract dependency hints from feature text.
 * Returns feature IDs or titles that this feature might depend on.
 */
export function extractDependencyHints(
  feature: Feature,
  allFeatures: Feature[]
): string[] {
  const text = `${feature.title} ${feature.description}`.toLowerCase();
  const hints: string[] = [];

  // Build a map of feature titles to IDs for matching
  const titleToId = new Map<string, string>();
  for (const f of allFeatures) {
    titleToId.set(f.title.toLowerCase(), f.id);
    // Also index by key words in the title
    const words = f.title.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 3) {
        titleToId.set(word, f.id);
      }
    }
  }

  // Check for explicit dependency patterns
  for (const { pattern } of DEPENDENCY_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const reference = match[1].toLowerCase();
      const matchedId = titleToId.get(reference);
      if (matchedId && matchedId !== feature.id && !hints.includes(matchedId)) {
        hints.push(matchedId);
      }
    }
  }

  return hints;
}

/**
 * Apply enhanced dependency detection to a spec's features.
 * Mutates the features array to add detected dependencies.
 */
export function enhanceDependencies(spec: ParsedSpec): void {
  for (const feature of spec.features) {
    const hints = extractDependencyHints(feature, spec.features);
    for (const hint of hints) {
      if (!feature.dependsOn.includes(hint)) {
        feature.dependsOn.push(hint);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Display Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format independence analysis as a summary string.
 */
export function formatIndependenceAnalysis(
  analysis: IndependenceAnalysis,
  features: Feature[]
): string {
  const featureMap = new Map(features.map(f => [f.id, f]));
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('  INDEPENDENCE ANALYSIS');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`  Total Features: ${features.length}`);
  lines.push(`  Max Parallelism: ${analysis.maxParallelism}`);
  lines.push(`  Critical Path Length: ${analysis.criticalPathLength}`);
  lines.push(`  Isolated Features: ${analysis.isolated.length}`);
  lines.push(`  Parallel Batches: ${analysis.parallelBatches.length}`);
  lines.push('');

  // Show parallel execution plan
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('  PARALLEL EXECUTION PLAN');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('');

  for (let i = 0; i < analysis.parallelBatches.length; i++) {
    const batch = analysis.parallelBatches[i];
    const batchLabel = batch.length > 1 ? `[PARALLEL x${batch.length}]` : '[SEQUENTIAL]';
    lines.push(`  Batch ${i + 1} ${batchLabel}:`);
    for (const featureId of batch) {
      const feature = featureMap.get(featureId);
      const title = feature ? feature.title.slice(0, 50) : featureId;
      const deps = feature?.dependsOn.length ? ` (after: ${feature.dependsOn.join(', ')})` : '';
      lines.push(`    - ${featureId}: ${title}${deps}`);
    }
    lines.push('');
  }

  // Show implicit dependencies if any
  if (analysis.implicitDependencies.length > 0) {
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('  SUGGESTED DEPENDENCIES (not enforced)');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('');

    for (const dep of analysis.implicitDependencies.slice(0, 10)) {
      const fromFeature = featureMap.get(dep.from);
      const toFeature = featureMap.get(dep.to);
      lines.push(`    ${fromFeature?.title.slice(0, 30) || dep.from}`);
      lines.push(`      → depends on: ${toFeature?.title.slice(0, 30) || dep.to}`);
      lines.push(`      Reason: ${dep.reason}`);
      lines.push('');
    }

    if (analysis.implicitDependencies.length > 10) {
      lines.push(`    ... and ${analysis.implicitDependencies.length - 10} more`);
      lines.push('');
    }
  }

  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Get the next batch of features that can be executed in parallel.
 * Takes into account which features have already been completed.
 */
export function getNextParallelBatch(
  analysis: IndependenceAnalysis,
  completedIds: Set<string>
): string[] {
  // Find the first batch that has unfinished features
  for (const batch of analysis.parallelBatches) {
    const remaining = batch.filter(id => !completedIds.has(id));
    if (remaining.length > 0) {
      return remaining;
    }
  }
  return [];
}

/**
 * Check if all dependencies of a feature are complete.
 */
export function areDependenciesComplete(
  featureId: string,
  graph: DependencyGraph,
  completedIds: Set<string>
): boolean {
  const deps = graph.dependencies.get(featureId);
  if (!deps) return true;
  return [...deps].every(depId => completedIds.has(depId));
}
