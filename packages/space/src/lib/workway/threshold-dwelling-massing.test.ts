import assert from 'node:assert/strict';
import test from 'node:test';

import {
  THRESHOLD_DWELLING_MASSING_GUIDE,
  createThresholdDwellingMassingGeometry,
  toThreeMassingVector,
  validateThresholdDwellingMassingGuide
} from './threshold-dwelling-massing.js';

test('derives a browser 3D massing guide from the same Rev 0.8 plan used for 2D review', () => {
  const geometry = createThresholdDwellingMassingGeometry();

  assert.deepEqual(THRESHOLD_DWELLING_MASSING_GUIDE.dimensions, {
    widthIn: 780,
    depthIn: 504,
    horizontalSource: 'canon-rev-0.8-floor-plan',
    verticalMassingHeightIn: 108,
    verticalStatus: 'illustrative-visualization-parameter'
  });
  assert.equal(THRESHOLD_DWELLING_MASSING_GUIDE.constructionReady, false);
  assert.equal(
    THRESHOLD_DWELLING_MASSING_GUIDE.materialContract.scheduleId,
    'threshold-dwelling-rev-0.8-design-intent-assembly-schedule'
  );
  assert.equal(geometry.floors.length, 11);
  assert.equal(geometry.walls.length, 34);
  assert.ok(geometry.floors.every((floor) => floor.vertices.every((vertex) => vertex.yIn === 0)));
  assert.deepEqual(
    [...new Set(geometry.floors.map((floor) => floor.materialId))],
    ['M-INT-002', 'M-INT-001']
  );
  assert.deepEqual(
    [...new Set(geometry.walls.map((wall) => wall.materialId))],
    ['M-ENV-001', 'M-ENV-002']
  );
  assert.ok(
    [...geometry.floors, ...geometry.walls].every(
      (surface) => surface.materialSelectionStatus === 'role-codified-product-unselected'
    )
  );
  assert.ok(
    geometry.walls.every((wall) =>
      wall.vertices.some((vertex) => vertex.yIn === 108) &&
      wall.vertices.some((vertex) => vertex.yIn === 0)
    )
  );
  assert.deepEqual(validateThresholdDwellingMassingGuide(THRESHOLD_DWELLING_MASSING_GUIDE), {
    issueIds: [],
    isSafeForReview: true,
    constructionReady: false
  });
});

test('converts issued plan inches to a centered one-to-one meter coordinate system for Three.js', () => {
  const vector = toThreeMassingVector(
    { xIn: 0, yIn: 108, zIn: 0 },
    THRESHOLD_DWELLING_MASSING_GUIDE
  );

  assert.ok(Math.abs(vector.xM + 9.906) < 1e-12);
  assert.ok(Math.abs(vector.yM - 2.7432) < 1e-12);
  assert.ok(Math.abs(vector.zM + 6.4008) < 1e-12);
  assert.equal(vector.coordinateTruth, 'revised-plan-horizontal-only');
  assert.equal(vector.verticalStatus, 'illustrative-visualization-parameter');
});
