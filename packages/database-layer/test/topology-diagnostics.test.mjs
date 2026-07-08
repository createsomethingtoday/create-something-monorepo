import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const diagnostics = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-topology-diagnostics.json'), 'utf8')
);
const topology = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'data', 'create-something-internal-topology.json'), 'utf8')
);

test('topology diagnostics makes Atlas business value inspectable', () => {
  assert.equal(diagnostics.id, 'substrate:create-something:topology-diagnostics:internal');
  assert.equal(diagnostics.topologyId, topology.id);
  assert.equal(diagnostics.atlasCanvasId, topology.atlasCanvasId);
  assert.equal(diagnostics.summary.nodes, topology.nodes.length);
  assert.equal(diagnostics.summary.edges, topology.edges.length);
  assert.equal(diagnostics.summary.hardGapCount, 0);
  assert.equal(diagnostics.summary.exactDuplicatePathCount, 0);
  assert.equal(diagnostics.summary.isolatedNodeCount, 0);
  assert.equal(diagnostics.summary.valueState, 'connected_map_with_review_signals');
});

test('topology diagnostics separates hard gaps from overlap and balance review signals', () => {
  const hardGaps = diagnostics.signals.filter((signal) => signal.classification === 'hard_gap');
  const reviewSignals = diagnostics.signals.filter((signal) => signal.classification === 'review_signal');
  const automationBalance = diagnostics.signals.find((signal) => signal.id === 'automation_database_balance');
  const workerOverlap = diagnostics.signals.find((signal) => signal.id === 'surface_overlap_worker');
  const exactDuplicates = diagnostics.signals.find((signal) => signal.id === 'exact_duplicate_paths');

  assert.equal(hardGaps.length, 0);
  assert.ok(reviewSignals.length >= 3);
  assert.equal(automationBalance?.severity, 'review');
  assert.ok(automationBalance?.summary.includes('Automation'));
  assert.equal(workerOverlap?.severity, 'review');
  assert.ok(workerOverlap?.evidence.some((item) => item.includes('worker')));
  assert.equal(exactDuplicates?.severity, 'info');
  assert.ok(exactDuplicates?.summary.includes('No exact duplicate paths'));
});
