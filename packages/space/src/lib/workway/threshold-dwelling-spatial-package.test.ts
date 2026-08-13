import assert from 'node:assert/strict';
import test from 'node:test';

import {
  THRESHOLD_DWELLING_SPATIAL_PACKAGE,
  assetBrowserUrl,
  chapterForId,
  createSessionAnnotation,
  createThresholdDwellingSpatialPackage,
  portalsFrom,
  validateSpatialPackage
} from './threshold-dwelling-spatial-package.js';

test('derives a client-safe Rev 0.8 package from the Canon living-system revision', () => {
  const packageValue = THRESHOLD_DWELLING_SPATIAL_PACKAGE;
  const validation = validateSpatialPackage(packageValue);

  assert.equal(packageValue.id, 'threshold-dwelling-r08-spatial-package');
  assert.deepEqual(packageValue.canonicalProject, {
    projectId: 'threshold-dwelling',
    projectRevision: '0.7'
  });
  assert.equal(packageValue.spatialRevision, '0.8');
  assert.equal(packageValue.clientSourceDocuments, 'excluded');
  assert.equal(packageValue.constructionReady, false);
  assert.equal(validation.clientSafe, true);
  assert.deepEqual(validation.issueIds, []);
  assert.deepEqual(
    packageValue.roomChapters.slice(0, 3).map((chapter) => [chapter.id, chapter.widthIn, chapter.depthIn]),
    [
      ['kitchen', 180, 156],
      ['dining', 156, 156],
      ['living', 180, 156]
    ]
  );
  assert.deepEqual(chapterForId(packageValue, 'arrival'), {
    id: 'arrival',
    title: 'Arrival loggia',
    entityId: 'arrival-loggia',
    widthIn: 120,
    depthIn: 168,
    scale: 'one-to-one',
    safeStage: {
      minimumWidthIn: 96,
      minimumDepthIn: 96,
      locomotion: 'room-chapter-rebase',
      statement:
        'Minimum physical-stage guidance for a rebased room chapter; not a physical safety certification or architectural clearance.'
    }
  });
  assert.equal(
    assetBrowserUrl(packageValue, 'tabletop-plan-svg'),
    '/experiments/threshold-dwelling/renders/floor-plan.svg'
  );
});

test('keeps native USD and USDZ declarative but explicitly unissued', () => {
  const spatialFormats = THRESHOLD_DWELLING_SPATIAL_PACKAGE.sceneRepresentations
    .filter((representation) => representation.format === 'usd' || representation.format === 'usdz')
    .map((representation) => ({ format: representation.format, status: representation.status, assetId: representation.assetId }));

  assert.deepEqual(spatialFormats, [
    { format: 'usd', status: 'unissued', assetId: null },
    { format: 'usdz', status: 'unissued', assetId: null }
  ]);
});

test('uses explicit portals and immutable session annotation operations', () => {
  const packageValue = THRESHOLD_DWELLING_SPATIAL_PACKAGE;
  assert.deepEqual(portalsFrom(packageValue, 'kitchen'), [
    {
      id: 'kitchen-to-dining',
      fromChapterId: 'kitchen',
      toChapterId: 'dining',
      traversal: 'explicit-transition'
    }
  ]);
  assert.deepEqual(createSessionAnnotation(packageValue, 'dining', 'Move island 4 in south.', 1), {
    operationId: 'threshold-dwelling-r08-spatial-package:0.8:annotation:0001',
    kind: 'create-annotation',
    packageId: 'threshold-dwelling-r08-spatial-package',
    spatialRevision: '0.8',
    chapterId: 'dining',
    text: 'Move island 4 in south.'
  });
});

test('rejects client package paths that could expose a private source document', () => {
  const packageValue = createThresholdDwellingSpatialPackage();
  const invalid = {
    ...packageValue,
    assets: packageValue.assets.map((asset, index) =>
      index === 0 ? { ...asset, clientPath: 'private/source-home-plan.pdf' } : asset
    )
  };

  assert.deepEqual(validateSpatialPackage(invalid).issueIds, ['unsafe-client-asset-path']);
});
