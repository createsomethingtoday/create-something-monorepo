#!/usr/bin/env tsx
/**
 * Knowledge Graph Analyzer
 *
 * Analyzes the knowledge graph for gaps and creates Beads issues.
 * Implements self-healing: gaps are automatically surfaced as tasks.
 *
 * Usage:
 *   pnpm graph:analyze              # Dry run - preview issues
 *   pnpm graph:analyze --create     # Create Beads issues
 *   pnpm graph:analyze --max-issues=20  # Limit issues created
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { GraphNode, GraphEdge, BuildMetadata } from './types.js';
import { analyzeGraph, reportGaps, DEFAULT_ANALYZER_CONFIG } from './analyzers/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// CLI
// =============================================================================

interface CLIOptions {
  dryRun: boolean;
  maxIssues: number;
  semanticThreshold: number;
  minEdges: number;
}

function parseCLI(): CLIOptions {
  const args = process.argv.slice(2);

  const getArg = (name: string, defaultValue: number): number => {
    const arg = args.find(a => a.startsWith(`--${name}=`));
    if (arg) {
      return parseInt(arg.split('=')[1], 10) || defaultValue;
    }
    return defaultValue;
  };

  return {
    dryRun: !args.includes('--create'),
    maxIssues: getArg('max-issues', 10),
    semanticThreshold: getArg('semantic-threshold', 85) / 100,
    minEdges: getArg('min-edges', 2),
  };
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const options = parseCLI();
  const graphDir = resolve(__dirname, '../../.graph');

  // Check if graph exists
  const nodesPath = resolve(graphDir, 'nodes.json');
  const edgesPath = resolve(graphDir, 'edges.json');
  const metadataPath = resolve(graphDir, 'metadata.json');

  if (!existsSync(nodesPath) || !existsSync(edgesPath)) {
    console.error('❌ Knowledge graph not found. Run `pnpm graph:build` first.\n');
    process.exit(1);
  }

  console.log('🔍 Analyzing knowledge graph...\n');

  // Load graph data
  const nodes: GraphNode[] = JSON.parse(readFileSync(nodesPath, 'utf-8'));
  const edges: GraphEdge[] = JSON.parse(readFileSync(edgesPath, 'utf-8'));

  let metadata: BuildMetadata | null = null;
  if (existsSync(metadataPath)) {
    metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
    console.log(`Graph built: ${metadata?.builtAt}`);
    console.log(`Nodes: ${metadata?.nodeCount}, Edges: ${metadata?.edgeCount}\n`);
  }

  // Run analysis
  const result = analyzeGraph(nodes, edges, {
    ...DEFAULT_ANALYZER_CONFIG,
    semanticThreshold: options.semanticThreshold,
    minEdgesForConnected: options.minEdges,
  });

  // Report and optionally create issues
  const report = reportGaps(result, {
    dryRun: options.dryRun,
    maxIssues: options.maxIssues,
  });

  if (options.dryRun && result.totalGaps > 0) {
    console.log('💡 To create issues, run: pnpm graph:analyze --create\n');
  }

  // Exit with error code if gaps found (useful for CI)
  process.exit(result.totalGaps > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
});
