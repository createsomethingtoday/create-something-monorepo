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
  assert.equal(geometry.walls.length, 41);
  assert.ok(geometry.outfitting.length > 22);
  assert.deepEqual(
    geometry.outfitting.find((item) => item.id === 'opening-window-daughter-suite'),
    {
      id: 'opening-window-daughter-suite',
      category: 'opening',
      title: 'Window opening marker',
      chapterId: 'daughter-sleep-zone',
      rendering: 'plan-opening-marker',
      basis: 'plan-opening',
      sourceOpeningId: 'window-daughter-suite',
      placement: {
        xIn: 108,
        yIn: 500,
        widthIn: 72,
        depthIn: 4,
        renderHeightIn: 3
      },
      constructionReady: false
    }
  );
  assert.ok(geometry.floors.every((floor) => floor.vertices.every((vertex) => vertex.yIn === 0)));
  assert.deepEqual(
    [...new Set(geometry.floors.map((floor) => floor.materialId))],
    ['M-INT-002', 'M-INT-001']
  );
  assert.deepEqual(
    [...new Set(geometry.walls.map((wall) => wall.materialId))],
    ['M-ENV-002', 'M-ENV-001']
  );
  const exteriorWallLengthInByMaterial = geometry.walls
    .filter((wall) => wall.exterior)
    .reduce<Record<string, number>>((lengths, wall) => {
      const [start, end] = wall.vertices;
      const lengthIn = Math.hypot(end.xIn - start.xIn, end.zIn - start.zIn);
      lengths[wall.materialId] = (lengths[wall.materialId] ?? 0) + lengthIn;
      return lengths;
    }, {});
  assert.equal(exteriorWallLengthInByMaterial['M-ENV-001'], 1140);
  assert.equal(exteriorWallLengthInByMaterial['M-ENV-002'], 1356);
  assert.ok(
    exteriorWallLengthInByMaterial['M-ENV-002'] > exteriorWallLengthInByMaterial['M-ENV-001']
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
