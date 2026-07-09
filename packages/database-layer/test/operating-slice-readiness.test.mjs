import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const readinessPath = path.join(packageRoot, 'data', 'create-something-operating-slice-readiness.json');
const reviewPath = path.join(packageRoot, 'data', 'create-something-operating-slice-review.json');
const runtimeBindingCoveragePath = path.join(packageRoot, 'data', 'create-something-runtime-binding-coverage.json');
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');

const readiness = JSON.parse(fs.readFileSync(readinessPath, 'utf8'));
const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const runtimeBindingCoverage = JSON.parse(fs.readFileSync(runtimeBindingCoveragePath, 'utf8'));
const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
const runtimeBindingRefs = runtimeBindingCoverage.records.reduce(
  (total, record) => total + record.bindings.length,
  0
);
const runtimeRouteRefs = runtimeBindingCoverage.records.reduce(
  (total, record) => total + record.routes.length,
  0
);

test('operating slice readiness is derived from the current operating slice review', () => {
  assert.equal(readiness.id, 'substrate:create-something:operating-slice-readiness:internal');
  assert.equal(readiness.topologyId, topology.id);
  assert.equal(readiness.atlasCanvasId, topology.atlasCanvasId);
  assert.equal(readiness.sourceReviewId, review.id);
  assert.equal(readiness.items.length, review.slices.length);
});

test('operating slice readiness keeps promotion approval-gated', () => {
  assert.ok(readiness.items.every((item) => item.productionStatus === 'approval_required'));
  assert.ok(readiness.items.every((item) => /explicit operator approval/.test(item.promotionBoundary)));
  assert.ok(readiness.items.every((item) => /local-first/.test(item.rollbackNote)));
});

test('worker operating slice joins topology records to Cloudflare runtime coverage', () => {
  const worker = readiness.items.find((item) => item.title === 'Automation worker Atlas coverage');
  const workerReview = review.slices.find((slice) => slice.title === 'Automation worker Atlas coverage');

  assert.equal(worker?.surface, 'worker');
  assert.equal(worker?.recordCount, workerReview?.recordIds.length);
  assert.equal(worker?.mappedRecordCount, worker?.recordCount);
  assert.equal(worker?.missingRecordIds.length, 0);
  assert.equal(worker?.workerRuntime?.runtime, 'cloudflare');
  assert.equal(worker?.workerRuntime?.runtimeConfigRecords, runtimeBindingCoverage.records.length);
  assert.equal(worker?.workerRuntime?.workerPackageRecords, 24);
  assert.equal(worker?.workerRuntime?.bindingRefs, runtimeBindingRefs);
  assert.equal(worker?.workerRuntime?.routeRefs, runtimeRouteRefs);
  assert.ok(worker?.workerRuntime?.workersWithD1 >= 60);
  assert.ok(worker?.workerRuntime?.workersWithDurableObjects >= 30);
});

test('worker operating slice carries passing local readiness gates', () => {
  const worker = readiness.items.find((item) => item.title === 'Automation worker Atlas coverage');
  const gates = new Map(worker?.gates.map((gate) => [gate.id, gate.status]));

  assert.equal(gates.get('topology_records_exist'), 'pass');
  assert.equal(gates.get('topology_records_mapped'), 'pass');
  assert.equal(gates.get('cloudflare_runtime_configs_joined'), 'pass');
  assert.equal(gates.get('secret_values_not_captured'), 'pass');
});
