import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  THRESHOLD_DWELLING_SPATIAL_PACKAGE,
  DEFAULT_THRESHOLD_DWELLING_COMPOSER_INTENT,
  assetBrowserUrl,
  agentClientProjectionForPackage,
  agentScenarioForId,
  chapterForId,
  composerProposalForIntent,
  createSessionAnnotation,
  createSessionProposalDecision,
  createThresholdDwellingSpatialPackage,
  interpretThresholdDwellingComposerIntent,
  portalsFrom,
  validateSpatialPackage
} from './threshold-dwelling-spatial-package.js';
import { evidenceIntakePacketForPackage } from './threshold-dwelling-evidence-intake.js';

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
  assert.deepEqual(packageValue.materialContract, {
    scheduleId: 'threshold-dwelling-rev-0.8-design-intent-assembly-schedule',
    materialBindingStatus: 'role-codified-product-unselected',
    renderedMaterialIds: ['M-INT-002', 'M-INT-001', 'M-ENV-002', 'M-ENV-001'],
    constructionReady: false
  });
  const { evidenceFacts, ...physicalSceneContractWithoutEvidenceFacts } =
    packageValue.physicalSceneContract;
  assert.deepEqual(physicalSceneContractWithoutEvidenceFacts, {
    issuanceId: 'threshold-dwelling-rev-0.8-physical-scene-gate',
    status: 'blocked-vertical-geometry-unissued',
    coordinateTruth: 'revised-plan-horizontal-only',
    clientSourceDocuments: 'excluded',
    unissuedFactIds: [
      'finished-floor-and-site-datum',
      'exterior-wall-assembly-geometry',
      'interior-partition-geometry',
      'roof-and-ceiling-geometry',
      'door-opening-geometry',
      'window-and-glass-opening-geometry',
      'structural-support-and-lateral-geometry',
      'mep-service-coordination-geometry',
      'exterior-grade-and-threshold-geometry'
    ],
    canGeneratePhysicalOneToOneScene: false,
    constructionReady: false
  });
  assert.equal(evidenceFacts.length, 9);
  assert.deepEqual(
    evidenceFacts.map((fact) => fact.id),
    packageValue.physicalSceneContract.unissuedFactIds
  );
  assert.deepEqual(
    evidenceFacts.find(
      (fact) => fact.id === 'door-opening-geometry'
    ),
    {
      id: 'door-opening-geometry',
      title: 'Door-opening geometry',
      evidenceStatus: 'missing',
      requiredReviewerRoles: [
        'Architect or qualified residential design professional',
        'Authority having jurisdiction and project team'
      ]
    }
  );
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

test('keeps USD unissued while delivering a content-addressed design-intent USDZ massing asset', () => {
  const spatialFormats = THRESHOLD_DWELLING_SPATIAL_PACKAGE.sceneRepresentations
    .filter((representation) => representation.format === 'usd' || representation.format === 'usdz')
    .map((representation) => ({ format: representation.format, status: representation.status, assetId: representation.assetId }));

  assert.deepEqual(spatialFormats, [
    { format: 'usd', status: 'unissued', assetId: null },
    { format: 'usdz', status: 'available', assetId: 'native-massing-usdz' }
  ]);
});

test('delivers deterministic browser massing and validator-backed native design-intent assets', () => {
  const browserMassing = THRESHOLD_DWELLING_SPATIAL_PACKAGE.sceneRepresentations.find(
    (representation) => representation.id === 'browser-massing-glb'
  );

  assert.deepEqual(browserMassing, {
    id: 'browser-massing-glb',
    format: 'glb',
    status: 'available',
    canonicalRevision: '0.7',
    spatialRevision: '0.8',
    assetId: 'browser-massing-glb'
  });

  const nativeMassing = THRESHOLD_DWELLING_SPATIAL_PACKAGE.sceneRepresentations.find(
    (representation) => representation.id === 'native-usdz'
  );

  assert.deepEqual(nativeMassing, {
    id: 'native-usdz',
    format: 'usdz',
    status: 'available',
    canonicalRevision: '0.7',
    spatialRevision: '0.8',
    assetId: 'native-massing-usdz'
  });
});

test('keeps each available visual asset content-addressed to its local package receipt', () => {
  const packageValue = THRESHOLD_DWELLING_SPATIAL_PACKAGE;

  for (const asset of packageValue.assets) {
    const contents = readFileSync(resolve(process.cwd(), 'static', asset.clientPath));
    assert.equal(createHash('sha256').update(contents).digest('hex'), asset.sha256, asset.id);
  }
});

test('declares the Apple USDZ MIME type at the static delivery boundary', () => {
  const headers = readFileSync(resolve(process.cwd(), '_headers'), 'utf8');

  assert.match(
    headers,
    /\/experiments\/threshold-dwelling\/renders\/threshold-dwelling-r08-massing-guide\.usdz\n\s+Content-Type: model\/vnd\.usdz\+zip\n\s+X-Content-Type-Options: nosniff/
  );
});

test('projects Rust-authored evidence handoff requirements without an upload or document contents', () => {
  const packageValue = THRESHOLD_DWELLING_SPATIAL_PACKAGE;
  const packet = evidenceIntakePacketForPackage(packageValue);
  const packetJson = JSON.stringify(packet);

  assert.equal(packet.projectId, packageValue.canonicalProject.projectId);
  assert.equal(packet.canonicalRevision, packageValue.canonicalProject.projectRevision);
  assert.equal(packet.derivedRevision, packageValue.spatialRevision);
  assert.equal(packet.clientFileUploadAvailable, false);
  assert.equal(packet.constructionReady, false);
  assert.equal(packet.requests.length, 9);
  assert.equal(packet.requests.find((request) => request.evidenceId === 'evr_glazing')?.reviewStatus, 'missing');
  assert.equal(packet.requests.every((request) => request.clientFileUploadAvailable === false), true);
  assert.equal(packetJson.includes('vaultRecordId'), false);
  assert.equal(packetJson.includes('sourcePath'), false);
  assert.equal(packetJson.includes('documentContent'), false);
  assert.throws(
    () =>
      evidenceIntakePacketForPackage({
        ...packageValue,
        canonicalProject: { ...packageValue.canonicalProject, projectRevision: '0.9' }
      }),
    /does not match the active WorkWay package/
  );
});

test('projects source-free Rust agent evaluation receipts only for the active package revision', () => {
  const packageValue = THRESHOLD_DWELLING_SPATIAL_PACKAGE;
  const projection = agentClientProjectionForPackage(packageValue);
  const serialized = JSON.stringify(projection);

  assert.equal(projection.schemaVersion, 'workway.agent-client-projection.v1');
  assert.equal(projection.evaluatorPassed, true);
  assert.equal(projection.constructionReady, false);
  assert.deepEqual(
    projection.scenarios.map((scenario) => [scenario.id, scenario.expectedOutcome]),
    [
      ['supported-kitchen-clearance', 'proposed'],
      ['material-role-alternative', 'proposed'],
      ['safety-professional-determination', 'escalated'],
      ['private-document-boundary', 'blocked']
    ]
  );
  assert.equal(
    agentScenarioForId(packageValue, 'safety-professional-determination').receipt.block?.reasonId,
    'qualified-professional-determination-required'
  );
  for (const forbidden of [
    '"intent":',
    'customer-plan.pdf',
    'vault_',
    'privateDocument',
    'evaluation-uploadaprivatepdfandacce'
  ]) {
    assert.equal(serialized.includes(forbidden), false, `agent client projection leaked ${forbidden}`);
  }
  assert.throws(
    () =>
      agentClientProjectionForPackage({
        ...packageValue,
        spatialRevision: '0.9'
      }),
    /does not match the active WorkWay package/
  );
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
  const proposal = composerProposalForIntent(
    packageValue,
    DEFAULT_THRESHOLD_DWELLING_COMPOSER_INTENT
  );
  assert.ok(proposal);

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

test('projects only codified Composer intents and blocks unissued facade geometry', () => {
  const packageValue = THRESHOLD_DWELLING_SPATIAL_PACKAGE;
  const materialProposal = composerProposalForIntent(
    packageValue,
    'Use architectural concrete for the exterior envelope.'
  );
  assert.ok(materialProposal);

  assert.deepEqual(materialProposal.operation, {
    kind: 'set-material-role',
    entityId: 'exterior-envelope',
    materialRoleId: 'material-architectural-concrete'
  });
  assert.deepEqual(
    interpretThresholdDwellingComposerIntent(
      packageValue,
      'Move the kitchen island 4 inches south to improve refrigerator clearance.'
    ),
    {
      kind: 'proposed',
      proposal: composerProposalForIntent(packageValue, DEFAULT_THRESHOLD_DWELLING_COMPOSER_INTENT),
      validation: { deterministic: true, issueIds: [] }
    }
  );
  assert.deepEqual(
    interpretThresholdDwellingComposerIntent(
      packageValue,
      'Replace the exterior wall with floor-to-ceiling glass.'
    ),
    {
      kind: 'blocked',
      reasonId: 'window-and-glass-opening-geometry-unissued',
      explanation:
        'Glass-opening geometry, support, safety, water-management, and energy evidence remain unissued; no facade operation was created.'
    }
  );
});

test('refuses to record a decision against a different package revision', () => {
  const packageValue = THRESHOLD_DWELLING_SPATIAL_PACKAGE;
  const proposal = composerProposalForIntent(
    packageValue,
    DEFAULT_THRESHOLD_DWELLING_COMPOSER_INTENT
  );
  assert.ok(proposal);
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

test('rejects a material contract that tries to imply construction readiness', () => {
  const packageValue = createThresholdDwellingSpatialPackage();
  const invalid = {
    ...packageValue,
    materialContract: {
      ...packageValue.materialContract,
      constructionReady: true as never
    }
  };

  assert.deepEqual(validateSpatialPackage(invalid).issueIds, ['invalid-material-contract']);
});

test('rejects a physical-scene contract that tries to elevate illustrative massing', () => {
  const packageValue = createThresholdDwellingSpatialPackage();
  const invalid = {
    ...packageValue,
    physicalSceneContract: {
      ...packageValue.physicalSceneContract,
      canGeneratePhysicalOneToOneScene: true as never
    }
  };

  assert.deepEqual(validateSpatialPackage(invalid).issueIds, ['invalid-physical-scene-contract']);
});

test('rejects a physical-scene contract that tries to include private source documents', () => {
  const packageValue = createThresholdDwellingSpatialPackage();
  const invalid = {
    ...packageValue,
    physicalSceneContract: {
      ...packageValue.physicalSceneContract,
      clientSourceDocuments: 'included' as never
    }
  };

  assert.deepEqual(validateSpatialPackage(invalid).issueIds, ['invalid-physical-scene-contract']);
});

test('rejects an evidence-readiness summary that tries to mark an unissued fact accepted', () => {
  const packageValue = createThresholdDwellingSpatialPackage();
  const invalid = {
    ...packageValue,
    physicalSceneContract: {
      ...packageValue.physicalSceneContract,
      evidenceFacts: packageValue.physicalSceneContract.evidenceFacts.map((fact, index) =>
        index === 0 ? { ...fact, evidenceStatus: 'accepted' as never } : fact
      )
    }
  };

  assert.deepEqual(validateSpatialPackage(invalid).issueIds, ['invalid-physical-scene-contract']);
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
