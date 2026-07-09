import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const repoRoot = findRepoRoot(packageRoot);
const args = new Set(process.argv.slice(2));

const installAtlasSession = args.has('--install-atlas-session') || args.has('--install');
const skipTests = args.has('--skip-tests');

function findRepoRoot(start) {
  let current = start;
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    current = path.dirname(current);
  }
  throw new Error(`Could not find repo root from ${start}`);
}

function relative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function runStep(label, command, stepArgs, options = {}) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, stepArgs, {
    cwd: options.cwd ?? packageRoot,
    env: process.env,
    stdio: 'inherit'
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(packageRoot, relativePath), 'utf8'));
}

function testFiles() {
  return fs
    .readdirSync(path.join(packageRoot, 'test'))
    .filter((name) => name.endsWith('.test.mjs'))
    .sort()
    .map((name) => path.join('test', name));
}

function assertNoLocalTopologyGaps(report) {
  if (report.totals.gaps !== 0) {
    throw new Error(
      `Internal topology refresh left ${report.totals.gaps} local gap(s): ${JSON.stringify(report.totals.gapCounts)}`
    );
  }
}

const scriptSteps = [
  ['Client overlay coverage', ['scripts/generate-client-overlay-coverage.mjs']],
  ['Cloudflare runtime binding coverage', ['scripts/generate-runtime-binding-coverage.mjs']],
  ['Dify and MCP config coverage', ['scripts/generate-agent-config-coverage.mjs']],
  ['Internal topology first pass', ['scripts/generate-internal-topology.mjs']],
  ['Atlas coverage grouping', ['scripts/generate-atlas-coverage.mjs']],
  ['Internal topology mapped pass', ['scripts/generate-internal-topology.mjs']],
  ['Operating slice review', ['scripts/generate-operating-slice-review.mjs']],
  ['Operating slice readiness', ['scripts/generate-operating-slice-readiness.mjs']]
];

for (const [label, stepArgs] of scriptSteps) {
  runStep(label, process.execPath, stepArgs);
}

const tscBin = require.resolve('typescript/bin/tsc');
runStep('TypeScript build', process.execPath, [tscBin]);
runStep('Completion report', process.execPath, ['scripts/report-internal-topology.mjs']);
runStep('Topology diagnostics', process.execPath, ['scripts/generate-topology-diagnostics.mjs']);
runStep('Organization review', process.execPath, ['scripts/generate-organization-review.mjs']);
runStep('Management surface bootstrap', process.execPath, ['scripts/generate-management-surface.mjs']);
runStep('Business operating recommendations', process.execPath, [
  'scripts/generate-business-operating-recommendations.mjs'
]);
runStep('Management surface', process.execPath, ['scripts/generate-management-surface.mjs']);
runStep('Performance contract', process.execPath, ['scripts/generate-performance-contract.mjs']);
runStep('Worker state', process.execPath, ['scripts/generate-worker-state.mjs']);
runStep('3D topology projection', process.execPath, ['scripts/generate-topology-3d.mjs']);
runStep('Atlas Studio session export', process.execPath, [
  'scripts/export-internal-atlas-session.mjs',
  ...(installAtlasSession ? ['--install', '--install-app-data'] : [])
]);
runStep('Atlas/Substrate agent wiki', process.execPath, ['scripts/generate-agent-wiki.mjs']);

if (!skipTests) {
  runStep('Database-layer tests', process.execPath, ['--test', ...testFiles()]);
  runStep('Worker smoke', process.execPath, ['worker/smoke.mjs']);
}

runStep('Topology summary', process.execPath, ['scripts/summarize-internal-topology.mjs']);

const topology = readJson('data/create-something-internal-topology.json');
const report = readJson('data/create-something-internal-topology-completion-report.json');
const managementSurface = readJson('data/create-something-management-surface.json');
const organizationReview = readJson('data/create-something-organization-review.json');
const businessRecommendations = readJson('data/create-something-business-operating-recommendations.json');
const operatingSliceReview = readJson('data/create-something-operating-slice-review.json');
const operatingSliceReadiness = readJson('data/create-something-operating-slice-readiness.json');
const atlasSessionPath = path.join(packageRoot, 'data', 'create-something-internal-operating-topology.atlas-session.json');
const topology3dPath = path.join(packageRoot, 'data', 'create-something-internal-topology.3d.json');
const agentWikiPath = path.join(packageRoot, 'docs', 'agent-wiki', 'README.md');
const workerStatePath = path.join(packageRoot, 'worker', 'generated-state.mjs');

assertNoLocalTopologyGaps(report);

console.log(
  JSON.stringify(
    {
      refreshed: true,
      topologyId: topology.id,
      atlasCanvasId: topology.atlasCanvasId,
      nodes: report.totals.nodes,
      edges: report.totals.edges,
      mapped: report.totals.mapped,
      gaps: report.totals.gaps,
      managementResources: managementSurface.resources.length,
      managementOperations: managementSurface.operations.length,
      organizationValueState: organizationReview.valueState,
      businessRecommendationLanes: businessRecommendations.lanes.length,
      operatingSlices: operatingSliceReview.slices.length,
      readinessItems: operatingSliceReadiness.items.length,
      artifacts: {
        topology: relative(path.join(packageRoot, 'data', 'create-something-internal-topology.json')),
        completionReport: relative(path.join(packageRoot, 'data', 'create-something-internal-topology-completion-report.json')),
        businessRecommendations: relative(path.join(packageRoot, 'data', 'create-something-business-operating-recommendations.json')),
        atlasSession: relative(atlasSessionPath),
        topology3d: relative(topology3dPath),
        agentWiki: relative(agentWikiPath),
        workerState: relative(workerStatePath)
      },
      verification: skipTests ? 'skipped_tests' : 'build_tests_worker_smoke'
    },
    null,
    2
  )
);
