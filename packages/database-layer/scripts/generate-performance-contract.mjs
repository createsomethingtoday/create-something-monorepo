import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const managementSurfacePath = path.join(packageRoot, 'data', 'create-something-management-surface.json');
const outputPath = path.join(packageRoot, 'data', 'create-something-performance-contract.json');
const generatedAt = new Date().toISOString();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function generatedArtifactCount() {
  return fs
    .readdirSync(path.join(packageRoot, 'data'))
    .filter((name) => name.startsWith('create-something-') && name.endsWith('.json')).length;
}

const topology = readJson(topologyPath);
const managementSurface = readJson(managementSurfacePath);

const performanceContract = {
  id: 'substrate:create-something:performance-contract:internal',
  generatedAt,
  topologyId: topology.id,
  atlasCanvasId: topology.atlasCanvasId,
  runtime: 'substrate',
  baseline: 'obsidian_like_operator_speed',
  summary: {
    topologyRecords: topology.nodes.length,
    topologyEdges: topology.edges.length,
    managementResources: managementSurface.resources.length,
    managementOperations: managementSurface.operations.length,
    workerCacheControl: 'public, max-age=15',
    generatedArtifactCount: generatedArtifactCount()
  },
  budgets: [
    {
      label: 'Record navigation',
      surface: 'local',
      target: 'Immediate local filter, selection, and row-to-detail movement on loaded records.',
      baseline: 'Obsidian-like command speed for the operator path.',
      detail:
        'Atlas Studio keeps the active working set in memory and focuses records locally; cloud reads refresh the state without blocking inspection.'
    },
    {
      label: 'Direct record URLs',
      surface: 'cloud',
      target: 'Every important topology record, Atlas node, operating slice, readiness item, and diagnostic has a durable address.',
      baseline: 'No hidden canvas-only state.',
      detail:
        'Substrate serves stable HTTP JSON endpoints for direct object review before loading the surrounding map.'
    },
    {
      label: 'Viewport rendering',
      surface: 'cloud',
      target: 'Pan and zoom reads stay bounded to the visible Atlas window and node budget.',
      baseline: 'Obsidian-like movement on large mapped workflows.',
      detail:
        'The Atlas viewport endpoint returns only visible nodes, visible-node edges, LOD metadata, and omission counts so the UI can avoid reprocessing the full canvas during navigation.'
    },
    {
      label: 'Agent read path',
      surface: 'agent',
      target: 'Agents inspect the same topology, diagnostics, performance, and readiness records through API/MCP.',
      baseline: 'No UI scraping or prompt-only state.',
      detail:
        'MCP resources, MCP tools, and agent commands are generated from the same management surface as the HTTP API.'
    },
    {
      label: 'Proof refresh',
      surface: 'cloud',
      target: 'Receipts, diagnostics, and audit entries move as small state payloads.',
      baseline: 'Fast notes app feel with shared database durability.',
      detail:
        'The Cloudflare-compatible edge adapter uses short read caching and no-store writes so inspection stays fast while mutation remains explicit.'
    }
  ],
  fastPath: [
    {
      id: 'precomputed-management-surface',
      surface: 'api',
      mechanism: 'Generated management resources and operations are materialized before the Worker starts.',
      evidence: 'packages/database-layer/data/create-something-management-surface.json'
    },
    {
      id: 'stable-record-addresses',
      surface: 'api',
      mechanism: 'Topology records are addressable by record id, Atlas node id, or stable slug.',
      evidence: '/api/substrate/topology/internal/records/{recordId}'
    },
    {
      id: 'bounded-atlas-viewport',
      surface: 'api',
      mechanism: 'Atlas pan/zoom reads can request a bounded viewport instead of loading the full session graph.',
      evidence: '/api/substrate/atlas-sessions/{sessionId}/viewport'
    },
    {
      id: 'edge-read-cache',
      surface: 'worker',
      mechanism: 'Successful GET responses carry a short public cache header; approval-gated writes use no-store.',
      evidence: 'createDatabaseLayerManagementEdgeAdapter cache-control contract'
    },
    {
      id: 'single-contract-agent-access',
      surface: 'agent',
      mechanism: 'MCP resource, MCP tool, and agent command reads all dispatch to the same in-memory API state.',
      evidence: 'databaseLayer.performance.get and database_layer_get_performance_contract'
    },
    {
      id: 'atlas-local-working-set',
      surface: 'client',
      mechanism: 'Atlas Studio filters, selects, and focuses loaded nodes locally instead of waiting on graph reloads.',
      evidence: 'packages/interaction-atlas-mcp/src/studio/client/App.tsx'
    }
  ],
  nonGoals: [
    'This contract does not claim production latency measurements until deployed Cloudflare telemetry is attached.',
    'This contract does not replace D1, R2, KV, or Durable Object design decisions for a future write store.',
    'This contract does not permit mutation without the existing approval-gated operation boundary.'
  ]
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(`${outputPath}.tmp`, `${JSON.stringify(performanceContract, null, 2)}\n`);
fs.renameSync(`${outputPath}.tmp`, outputPath);

console.log(
  JSON.stringify(
    {
      performanceContractId: performanceContract.id,
      outputPath: path.relative(packageRoot, outputPath),
      topologyRecords: performanceContract.summary.topologyRecords,
      managementResources: performanceContract.summary.managementResources,
      budgets: performanceContract.budgets.length,
      fastPath: performanceContract.fastPath.length
    },
    null,
    2
  )
);
