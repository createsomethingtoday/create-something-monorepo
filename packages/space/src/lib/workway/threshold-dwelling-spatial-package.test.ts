import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  THRESHOLD_DWELLING_SPATIAL_PACKAGE,
  assetBrowserUrl,
  chapterForId,
  createKitchenIslandClearanceProposal,
  createSessionAnnotation,
  createSessionProposalDecision,
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

test('expresses the kitchen-island suggestion as a bounded deterministic proposal', () => {
  const packageValue = THRESHOLD_DWELLING_SPATIAL_PACKAGE;
  const proposal = createKitchenIslandClearanceProposal(packageValue);

  assert.deepEqual(proposal.operation, {
    kind: 'move-entity',
    entityId: 'kitchen-island',
    deltaXIn: 0,
    deltaYIn: 4
  });
  assert.deepEqual(proposal.measurements, [
    {
      id: 'island-to-refrigerator-clearance',
      currentIn: 38,
      proposedIn: 42,
      targetIn: 42
    },
    {
      id: 'island-to-opposite-run-clearance',
      currentIn: 48,
      proposedIn: 44,
      targetIn: null
    }
  ]);
  assert.equal(proposal.constructionReady, false);
  assert.equal(proposal.requiresProfessionalReview, true);
  assert.deepEqual(createSessionProposalDecision(packageValue, proposal, 'accepted'), {
    operationId: 'threshold-dwelling-r08-spatial-package:0.8:proposal-decision:accepted:0001',
    kind: 'record-proposal-decision',
    packageId: 'threshold-dwelling-r08-spatial-package',
    spatialRevision: '0.8',
    proposalId: 'threshold-dwelling-r08:proposal:kitchen-island-clearance-0001',
    decision: 'accepted'
  });
});

test('refuses to record a decision against a different package revision', () => {
  const packageValue = THRESHOLD_DWELLING_SPATIAL_PACKAGE;
  const proposal = createKitchenIslandClearanceProposal(packageValue);
  const mismatchedPackage = { ...packageValue, spatialRevision: '0.9' };

  assert.throws(
    () => createSessionProposalDecision(mismatchedPackage, proposal, 'accepted'),
    /active WorkWay package revision/
  );
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

test('keeps the native Swift fixture in exact contract parity with the spatial package', () => {
  const nativeFixture = JSON.parse(
    readFileSync(
      new URL(
        '../../../../../apps/workway-visionos/Sources/WorkWaySpatialContract/Resources/threshold-dwelling-r08-spatial-package.json',
        import.meta.url
      ),
      'utf8'
    )
  );
  const expectedNativeProjection = {
    ...THRESHOLD_DWELLING_SPATIAL_PACKAGE,
    roomChapters: THRESHOLD_DWELLING_SPATIAL_PACKAGE.roomChapters.map(({ title: _title, ...chapter }) =>
      chapter
    )
  };

  assert.deepEqual(nativeFixture, expectedNativeProjection);
});
