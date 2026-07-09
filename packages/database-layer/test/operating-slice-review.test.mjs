import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const packageRoot = path.resolve(new URL('..', import.meta.url).pathname);
const reviewPath = path.join(packageRoot, 'data', 'create-something-operating-slice-review.json');
const topologyPath = path.join(packageRoot, 'data', 'create-something-internal-topology.json');
const atlasCoveragePath = path.join(packageRoot, 'data', 'create-something-atlas-coverage.json');

const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const topology = JSON.parse(fs.readFileSync(topologyPath, 'utf8'));
const atlasCoverage = JSON.parse(fs.readFileSync(atlasCoveragePath, 'utf8'));

test('operating slice review is derived from the current topology and Atlas coverage', () => {
  assert.equal(review.id, 'substrate:create-something:operating-slice-review:internal');
  assert.equal(review.topologyId, topology.id);
  assert.equal(review.atlasCanvasId, topology.atlasCanvasId);
  assert.equal(review.sourceCoverageId, atlasCoverage.id);
});

test('operating slice review creates one promotion slice per Atlas coverage group', () => {
  const reviewedRecordCount = review.slices.reduce((count, slice) => count + slice.recordIds.length, 0);

  assert.equal(review.slices.length, atlasCoverage.groups.length);
  assert.equal(reviewedRecordCount, atlasCoverage.records.length);
  assert.ok(review.slices.every((slice) => slice.status === 'review_ready'));
});

test('operating slices carry validation commands and explicit promotion boundaries', () => {
  for (const slice of review.slices) {
    assert.ok(slice.validationCommands.length > 0);
    assert.match(slice.promotionBoundary, /explicit operator approval/);
    assert.match(slice.rollbackNote, /local-first/);
    assert.ok(slice.nextAction.length > 0);
  }
});

test('operating slices are sorted by largest review surface first', () => {
  for (let index = 1; index < review.slices.length; index += 1) {
    assert.ok(review.slices[index - 1].nodeCount >= review.slices[index].nodeCount);
  }

  assert.equal(review.slices[0].surface, 'worker');
  assert.ok(review.slices[0].nodeCount > 100);
});
