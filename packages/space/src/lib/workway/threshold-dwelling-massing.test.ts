import assert from 'node:assert/strict';
import test from 'node:test';

import {
  THRESHOLD_DWELLING_MASSING_GUIDE,
  createThresholdDwellingMassingGeometry,
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
  assert.equal(geometry.floors.length, 11);
  assert.equal(geometry.walls.length, 34);
  assert.ok(geometry.floors.every((floor) => floor.vertices.every((vertex) => vertex.yIn === 0)));
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
