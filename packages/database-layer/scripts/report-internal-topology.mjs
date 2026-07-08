import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = findRepoRoot(packageRoot);
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const reportPath = path.join(packageRoot, 'data', 'create-something-internal-topology-completion-report.json');
const distPath = path.join(packageRoot, 'dist', 'index.js');

if (!fs.existsSync(distPath)) {
  throw new Error('Build the package first: pnpm --filter @create-something/database-layer build');
}

function findRepoRoot(start) {
  let current = start;
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    current = path.dirname(current);
  }
  throw new Error(`Could not find repo root from ${start}`);
}

const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
const { buildTopologyCompletionReport } = await import(pathToFileURL(distPath).href);
const report = buildTopologyCompletionReport(topology);

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(`${reportPath}.tmp`, `${JSON.stringify(report, null, 2)}\n`);
fs.renameSync(`${reportPath}.tmp`, reportPath);

console.log(
  JSON.stringify(
    {
      reportId: report.id,
      outputPath: path.relative(repoRoot, reportPath),
      nodes: report.totals.nodes,
      edges: report.totals.edges,
      mapped: report.totals.mapped,
      gaps: report.totals.gaps,
      gapCounts: report.totals.gapCounts,
      clientOverlays: report.clientOverlays.length,
      firstCompletionWave: report.firstCompletionWave.length
    },
    null,
    2
  )
);
