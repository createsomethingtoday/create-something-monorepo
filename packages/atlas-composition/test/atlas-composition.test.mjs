import assert from 'node:assert/strict';
import test from 'node:test';

import {
  APP_REVIEW_GOVERNANCE_COMPOSITION,
  ATLAS_COMPOSITION_SCHEMA,
  decideArcAction,
  executeArcAction,
  proposeArcAction,
  resolveMapModule,
  toAtlasStoryAdapter,
  validateAtlasComposition
} from '../dist/index.js';

test('the App Review Arc makes intake and preflight a reusable first scene', () => {
  const result = validateAtlasComposition(APP_REVIEW_GOVERNANCE_COMPOSITION);

  assert.deepEqual(result, { ok: true, issues: [] });
  assert.equal(APP_REVIEW_GOVERNANCE_COMPOSITION.schema, ATLAS_COMPOSITION_SCHEMA);
  assert.equal(APP_REVIEW_GOVERNANCE_COMPOSITION.scenes.length, 7);
  assert.equal(APP_REVIEW_GOVERNANCE_COMPOSITION.mapModules.length, 1);

  const intake = APP_REVIEW_GOVERNANCE_COMPOSITION.scenes.find((scene) => scene.id === 'intake-preflight');
  assert.ok(intake, 'the Arc should expose a first-class intake and preflight scene');
  assert.deepEqual(intake.focusNodeIds, [
    'app-submission-form',
    'app-review-preflight',
    'webflow-app-preflight-skills',
    'app-governance-mcp'
  ]);
  assert.deepEqual(intake.artifactIds, [
    'app-submission-form-contract',
    'app-review-preflight-contract',
    'webflow-app-preflight-skill-contract',
    'motion-authoring-contract'
  ]);
  assert.match(intake.detail, /not an approval/i);

  assert.deepEqual(
    APP_REVIEW_GOVERNANCE_COMPOSITION.scenes.map((scene) => scene.presentation.layout),
    ['split', 'statement', 'code', 'map', 'image', 'demo', 'proof'],
    'an Arc is a sequence of deliberately different slide compositions, not one repeated panel'
  );
  assert.equal(intake.presentation.media?.artifactId, 'app-review-evidence-gate-media');
  assert.equal(
    APP_REVIEW_GOVERNANCE_COMPOSITION.artifacts.find(
      (artifact) => artifact.id === 'app-review-evidence-gate-media'
    )?.provenance.costUsd,
    null,
    'an unmetered generated asset must not be presented as a zero-cost generation'
  );

  const story = toAtlasStoryAdapter(APP_REVIEW_GOVERNANCE_COMPOSITION, 'app-review-governance-arc');
  assert.equal(story.scenes[0].presentation.layout, 'split');
  assert.equal(story.scenes[2].presentation.code?.language, 'typescript');

  const moduleId = APP_REVIEW_GOVERNANCE_COMPOSITION.mapModules[0].id;
  for (const route of APP_REVIEW_GOVERNANCE_COMPOSITION.routes) {
    assert.ok(route.sceneIds.length > 0);
    assert.equal(route.sceneIds[0], 'intake-preflight');
    for (const sceneId of route.sceneIds) {
      const scene = APP_REVIEW_GOVERNANCE_COMPOSITION.scenes.find((item) => item.id === sceneId);
      assert.ok(scene, `route ${route.id} should reference an existing scene`);
      assert.ok(scene.mapModuleIds.includes(moduleId));
      assert.notEqual(scene.motion.cue, 'none');
      assert.equal(scene.motion.reducedMotion, 'static-emphasis');
    }
  }
});

test('composition validation refuses nested map modules and unapproved action paths', () => {
  const nested = structuredClone(APP_REVIEW_GOVERNANCE_COMPOSITION);
  nested.mapModules[0].nestedModuleIds = ['another-map-module'];

  const result = validateAtlasComposition(nested);
  assert.equal(result.ok, false);
  assert.match(result.issues.join('\n'), /nested map modules/i);
});

test('map module resolution preserves an explicit pinned map version', () => {
  const resolved = resolveMapModule(
    APP_REVIEW_GOVERNANCE_COMPOSITION,
    'app-review-governance-map',
    (mapId) => ({
      mapId,
      latestVersion: '2026-08-11',
      versions: ['2026-08-11', '2026-08-10']
    })
  );

  assert.equal(resolved.map.mapId, 'app-review-governance-canonical-map');
  assert.equal(resolved.resolvedVersion, '2026-08-11');
  assert.equal(resolved.versionMode, 'pinned');
});

test('a bounded agent proposal requires an operator decision before local execution returns a receipt', () => {
  const proposal = proposeArcAction(APP_REVIEW_GOVERNANCE_COMPOSITION, {
    proposedBy: 'atlas-agent'
  });

  assert.equal(proposal.status, 'proposed');
  assert.equal(proposal.gate, 'approval');
  assert.throws(() => executeArcAction(proposal, { executor: 'local-prototype-runtime' }), /approved/i);

  const approved = decideArcAction(proposal, {
    decision: 'approved',
    decidedBy: 'operator'
  });
  const completed = executeArcAction(approved, { executor: 'local-prototype-runtime' });

  assert.equal(completed.action.status, 'completed');
  assert.equal(completed.receipt.issuer, 'local-prototype-runtime');
  assert.equal(completed.receipt.kind, 'proof');
  assert.match(completed.receipt.evidence, /local fixture/i);
});

test('a rejected proposal remains a visible stop condition', () => {
  const proposal = proposeArcAction(APP_REVIEW_GOVERNANCE_COMPOSITION, {
    proposedBy: 'atlas-agent'
  });
  const rejected = decideArcAction(proposal, {
    decision: 'rejected',
    decidedBy: 'operator'
  });

  assert.equal(rejected.status, 'rejected');
  assert.throws(() => executeArcAction(rejected, { executor: 'local-prototype-runtime' }), /approved/i);
});
