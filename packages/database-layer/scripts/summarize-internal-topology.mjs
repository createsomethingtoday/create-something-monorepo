import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const distPath = path.join(packageRoot, 'dist', 'index.js');

if (!fs.existsSync(distPath)) {
  throw new Error('Build the package first: pnpm --filter @create-something/database-layer build');
}

const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
const { projectInternalTopology } = await import(pathToFileURL(distPath).href);
const projection = projectInternalTopology(topology);

const gapCounts = projection.gapActions.reduce(
  (counts, action) => {
    const key = action.id.includes(':needs_substrate:') ? 'needs_substrate' : 'needs_atlas';
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  },
  { needs_atlas: 0, needs_substrate: 0 }
);

console.log(
  JSON.stringify(
    {
      topologyId: topology.id,
      atlasCanvasId: topology.atlasCanvasId,
      nodes: topology.nodes.length,
      edges: topology.edges.length,
      sourceRecords: projection.sourceRecords.length,
      atlasNodes: projection.atlasCanvas.nodes.length,
      atlasEdges: projection.atlasCanvas.edges.length,
      receipts: projection.receipts.length,
      gapActions: projection.gapActions.length,
      gapCounts,
      coverage: topology.coverage
    },
    null,
    2
  )
);
