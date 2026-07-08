import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { buildTopologyCompletionReport } from '../dist/index.js';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const reportPath = path.join(
  packageRoot,
  'data',
  'create-something-internal-topology-completion-report.json'
);
const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

test('completion report preserves topology totals and gap counts', () => {
  const rebuilt = buildTopologyCompletionReport(topology);

  assert.deepEqual(report.totals, rebuilt.totals);
  assert.equal(report.totals.nodes, topology.nodes.length);
  assert.equal(report.totals.edges, topology.edges.length);
  assert.equal(report.totals.gaps, report.totals.gapCounts.needs_atlas + report.totals.gapCounts.needs_substrate);
  assert.equal(report.totals.gaps, 0);
});

test('completion report makes managed client overlays first-class', () => {
  const slugs = new Set(report.clientOverlays.map((overlay) => overlay.clientSlug));

  assert.equal(report.clientOverlays.length, topology.coverage.clientOverlayCount);
  assert.ok(slugs.has('outerfields'));
  assert.ok(slugs.has('jandjhomehealth'));
  assert.ok(slugs.has('cato-supply-insights-review'));
  assert.ok(report.clientOverlays.every((overlay) => overlay.status === 'mapped'));
  assert.ok(report.clientOverlays.every((overlay) => overlay.actionId === undefined));
});

test('completion report removes covered client, runtime, and agent config bindings from the first gap wave', () => {
  const firstWaveClientItems = report.firstCompletionWave.filter((item) => item.surface === 'client');
  const firstWaveWorkerConfigItems = report.firstCompletionWave.filter((item) =>
    /wrangler\.(toml|json|jsonc)$/.test(item.path)
  );
  const firstWaveSubstrateItems = report.firstCompletionWave.filter((item) => item.gapKind === 'needs_substrate');

  assert.equal(firstWaveClientItems.length, 0);
  assert.equal(firstWaveWorkerConfigItems.length, 0);
  assert.equal(firstWaveSubstrateItems.length, 0);
  assert.equal(report.firstCompletionWave.length, 0);
});

test('completion report separates operating lanes for Atlas, Substrate, agents, and judgment', () => {
  const laneIds = new Set(report.completionLanes.map((lane) => lane.id));

  assert.ok(laneIds.has('client_atlas'));
  assert.ok(laneIds.has('substrate_runtime'));
  assert.ok(laneIds.has('mcp_agent'));
  assert.ok(laneIds.has('policy_judgment'));
  assert.ok(laneIds.has('package_atlas'));
  assert.equal(report.completionLanes.find((lane) => lane.id === 'client_atlas')?.count, 0);
  assert.equal(report.completionLanes.find((lane) => lane.id === 'substrate_runtime')?.count, 0);
  assert.equal(report.totals.gapCounts.needs_substrate, 0);
  assert.ok(report.completionLanes.every((lane) => lane.count === 0));
});
