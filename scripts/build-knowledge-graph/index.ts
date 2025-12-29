#!/usr/bin/env tsx
/**
 * Knowledge Graph Builder
 *
 * Main entry point for building the knowledge graph from markdown files.
 * Generates nodes.json, edges.json, and metadata.json.
 *
 * Usage:
 *   pnpm graph:build              # Full rebuild
 *   pnpm graph:build --incremental # Only re-embed changed files
 *   pnpm graph:build --dry-run    # Preview without API calls
 */

import { mkdir, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { BuildConfig, BuildMetadata, GraphEdge, GraphNode, GraphOutput } from './types.js';
import { walkRepository, filterChangedNodes } from './extractors/walker.js';
import { extractUnderstandingEdges } from './extractors/understanding.js';
import { extractLinkEdges } from './extractors/links.js';
import { enrichNodesWithConcepts, createConceptEdges, CANONICAL_CONCEPTS } from './extractors/concepts.js';
import {
  loadCache,
  saveCache,
  filterNodesToEmbed,
  updateCache,
  getEmbeddingsFromCache,
  pruneCache,
  DEFAULT_MODEL,
} from './embeddings/cache.js';
import { generateEmbeddingsForNodes } from './embeddings/provider.js';
import { createSemanticEdges, deduplicateSemanticEdges } from './embeddings/similarity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_CONFIG: BuildConfig = {
  rootDir: resolve(__dirname, '../..'),
  outputDir: resolve(__dirname, '../../.graph'),
  cacheFile: resolve(__dirname, '../../.graph/embeddings.cache.json'),
  includeDirs: ['packages', '.claude', 'specs', 'docs', 'papers'],
  excludePatterns: [
    '**/node_modules/**',
    '**/.svelte-kit/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.md',
    '**/CHANGELOG.md',
  ],
  embeddingProvider: 'voyage',
  embeddingModel: DEFAULT_MODEL,
  batchSize: 100,
  maxTokensPerDoc: 8000,
  similarityThreshold: 0.75,
  maxSemanticEdgesPerNode: 10,
  concepts: CANONICAL_CONCEPTS,
};

// =============================================================================
// CLI Parsing
// =============================================================================

interface CLIOptions {
  incremental: boolean;
  dryRun: boolean;
  skipEmbeddings: boolean;
}

function parseCLI(): CLIOptions {
  const args = process.argv.slice(2);

  return {
    incremental: args.includes('--incremental'),
    dryRun: args.includes('--dry-run'),
    skipEmbeddings: args.includes('--skip-embeddings'),
  };
}

// =============================================================================
// Main Build Pipeline
// =============================================================================

async function buildGraph(
  config: BuildConfig,
  options: CLIOptions
): Promise<GraphOutput> {
  console.log('🔨 Building knowledge graph...\n');

  // Step 1: Discover all markdown files
  console.log('📂 Discovering files...');
  const nodes = await walkRepository(config.rootDir, config);
  console.log(`✓ Found ${nodes.length} documents\n`);

  // Step 2: Enrich nodes with concepts
  console.log('🔍 Extracting concepts...');
  enrichNodesWithConcepts(nodes, config.concepts);
  const totalConcepts = nodes.reduce((sum, n) => sum + n.concepts.length, 0);
  console.log(`✓ Extracted ${totalConcepts} concept mentions\n`);

  // Step 3: Extract explicit edges (UNDERSTANDING.md)
  console.log('🔗 Extracting explicit dependencies...');
  const explicitEdges = await extractUnderstandingEdges(nodes, config.rootDir);
  console.log(`✓ Found ${explicitEdges.length} explicit edges\n`);

  // Step 4: Extract cross-reference edges (markdown links)
  console.log('🔗 Extracting cross-references...');
  const linkEdges = await extractLinkEdges(nodes, config.rootDir);
  console.log(`✓ Found ${linkEdges.length} cross-reference edges\n`);

  // Step 5: Create concept edges
  console.log('🔗 Creating concept edges...');
  const conceptEdges = createConceptEdges(nodes, 2);
  console.log(`✓ Created ${conceptEdges.length} concept edges\n`);

  // Step 6: Generate embeddings and semantic edges
  let semanticEdges: GraphEdge[] = [];
  let embeddingsUpdated = false;
  let filesReembedded = 0;

  if (!options.skipEmbeddings) {
    console.log('🧠 Processing embeddings...');

    // Load cache
    const cache = loadCache(config.cacheFile);
    console.log(`✓ Loaded cache (${Object.keys(cache.entries).length} entries)`);

    // Prune stale entries
    const prunedCache = pruneCache(cache, nodes);

    // Determine which nodes need embedding
    const nodesToEmbed = options.incremental
      ? filterNodesToEmbed(nodes, prunedCache, config.embeddingModel)
      : nodes;

    filesReembedded = nodesToEmbed.length;

    if (nodesToEmbed.length === 0) {
      console.log('✓ All embeddings up to date\n');
    } else if (options.dryRun) {
      console.log(`⚠️  Dry run: would embed ${nodesToEmbed.length} documents\n`);
    } else {
      // Check for API key
      const apiKey = process.env.VOYAGE_API_KEY;
      if (!apiKey) {
        console.error('❌ VOYAGE_API_KEY environment variable not set');
        console.error('   Set it in .env.local or export it before running this script\n');
        process.exit(1);
      }

      // Generate new embeddings
      console.log(`Embedding ${nodesToEmbed.length} documents...`);
      const newEmbeddings = await generateEmbeddingsForNodes(nodesToEmbed, {
        apiKey,
        model: config.embeddingModel,
        maxTokensPerDoc: config.maxTokensPerDoc,
        batchSize: config.batchSize,
      });

      // Update cache
      const updatedCache = updateCache(prunedCache, newEmbeddings, nodes, config.embeddingModel);
      saveCache(updatedCache, config.cacheFile);

      embeddingsUpdated = true;
      console.log(`✓ Embedded ${nodesToEmbed.length} documents\n`);
    }

    // Get all embeddings (cached + new)
    if (!options.dryRun) {
      const allEmbeddings = getEmbeddingsFromCache(nodes, loadCache(config.cacheFile));

      // Create semantic edges
      console.log('🔗 Creating semantic edges...');
      const rawSemanticEdges = createSemanticEdges(nodes, allEmbeddings, {
        threshold: config.similarityThreshold,
        maxEdgesPerNode: config.maxSemanticEdgesPerNode,
      });

      // Deduplicate bidirectional edges
      semanticEdges = deduplicateSemanticEdges(rawSemanticEdges);
      console.log(`✓ Created ${semanticEdges.length} semantic edges\n`);
    }
  } else {
    console.log('⚠️  Skipping embeddings (--skip-embeddings flag)\n');
  }

  // Step 7: Combine all edges
  const allEdges = [
    ...explicitEdges,
    ...linkEdges,
    ...conceptEdges,
    ...semanticEdges,
  ];

  // Step 8: Build metadata
  const edgesByType = {
    explicit: explicitEdges.length,
    'cross-reference': linkEdges.length,
    concept: conceptEdges.length,
    semantic: semanticEdges.length,
  };

  const nodesByPackage: Record<string, number> = {};
  for (const node of nodes) {
    const pkg = node.package ?? 'root';
    nodesByPackage[pkg] = (nodesByPackage[pkg] ?? 0) + 1;
  }

  const metadata: BuildMetadata = {
    builtAt: new Date().toISOString(),
    nodeCount: nodes.length,
    edgeCount: allEdges.length,
    edgesByType,
    nodesByPackage,
    embeddingsUpdated,
    filesReembedded,
  };

  return { nodes, edges: allEdges, metadata };
}

// =============================================================================
// Output Writing
// =============================================================================

function writeOutput(output: GraphOutput, config: BuildConfig, dryRun: boolean): void {
  if (dryRun) {
    console.log('⚠️  Dry run: skipping file writes\n');
    console.log('Preview:');
    console.log(`  Nodes: ${output.nodes.length}`);
    console.log(`  Edges: ${output.edges.length}`);
    console.log(`  Edge breakdown:`, output.metadata.edgesByType);
    console.log(`  Package breakdown:`, output.metadata.nodesByPackage);
    return;
  }

  // Create output directory
  try {
    mkdir(config.outputDir, { recursive: true }, (err) => {
      if (err) throw err;
    });
  } catch (error) {
    // Directory might already exist, that's fine
  }

  // Write nodes.json
  const nodesPath = resolve(config.outputDir, 'nodes.json');
  writeFileSync(nodesPath, JSON.stringify(output.nodes, null, 2), 'utf-8');
  console.log(`✓ Wrote ${nodesPath}`);

  // Write edges.json
  const edgesPath = resolve(config.outputDir, 'edges.json');
  writeFileSync(edgesPath, JSON.stringify(output.edges, null, 2), 'utf-8');
  console.log(`✓ Wrote ${edgesPath}`);

  // Write metadata.json
  const metadataPath = resolve(config.outputDir, 'metadata.json');
  writeFileSync(metadataPath, JSON.stringify(output.metadata, null, 2), 'utf-8');
  console.log(`✓ Wrote ${metadataPath}`);

  console.log('\n✅ Knowledge graph build complete!');
  console.log(`   ${output.nodes.length} nodes, ${output.edges.length} edges`);
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const options = parseCLI();

  try {
    const output = await buildGraph(DEFAULT_CONFIG, options);
    writeOutput(output, DEFAULT_CONFIG, options.dryRun);
  } catch (error) {
    console.error('\n❌ Build failed:', error);
    process.exit(1);
  }
}

main();
