import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyArcCommand,
  createAppReviewArcDocument,
  validateArcDocument,
  visibleComposition,
  type ArcCommandContext
} from '../src/lib/model.ts';

let sequence = 0;
const context = (): ArcCommandContext => ({
  actor: 'shared-admin@jandj.local',
  now: `2026-08-11T15:00:${String(sequence).padStart(2, '0')}.000Z`,
  id: () => String(++sequence)
});

test('the default Arc is valid and reuses scene IDs across Arc, Playbook, and Runbook routes', () => {
  const document = createAppReviewArcDocument('2026-08-11T15:00:00.000Z');
  assert.deepEqual(validateArcDocument(document), []);
  assert.equal(document.ownerContact, 'Ejohnson@jandjhomehealth.com');
  assert.equal(document.composition.routes.length, 3);
  const sceneObjects = new Set(document.composition.scenes);
  assert.equal(sceneObjects.size, document.composition.scenes.length);
  for (const route of document.composition.routes) {
    for (const sceneId of route.sceneIds) {
      assert.ok(document.composition.scenes.some((scene) => scene.id === sceneId));
    }
  }
});

test('studio commands add, duplicate, reorder, lock, hide, and remove without raw JSON editing', () => {
  let document = createAppReviewArcDocument('2026-08-11T15:00:00.000Z');
  document = applyArcCommand(document, { type: 'add_scene', afterSceneId: 'signal' }, context()).document;
  const added = document.composition.scenes.at(-1)!;
  document = applyArcCommand(document, { type: 'duplicate_scene', sceneId: added.id }, context()).document;
  const copy = document.composition.scenes.at(-1)!;
  document = applyArcCommand(
    document,
    { type: 'reorder_scene', sceneId: copy.id, toIndex: 0 },
    context()
  ).document;
  document = applyArcCommand(
    document,
    { type: 'set_scene_hidden', sceneId: added.id, hidden: true },
    context()
  ).document;
  assert.ok(!visibleComposition(document, 'app-review-governance-arc').routes[0].sceneIds.includes(added.id));
  document = applyArcCommand(
    document,
    { type: 'set_scene_lock', sceneId: copy.id, locked: true },
    context()
  ).document;
  assert.throws(
    () => applyArcCommand(document, { type: 'remove_scene', sceneId: copy.id }, context()),
    /locked/
  );
  document = applyArcCommand(
    document,
    { type: 'set_scene_lock', sceneId: copy.id, locked: false },
    context()
  ).document;
  document = applyArcCommand(document, { type: 'remove_scene', sceneId: copy.id }, context()).document;
  assert.ok(!document.composition.scenes.some((scene) => scene.id === copy.id));
});

test('agent proposals preserve a human decision boundary and provenance', () => {
  let document = createAppReviewArcDocument('2026-08-11T15:00:00.000Z');
  const before = document.composition.scenes[0].presentation.reader.heading;
  document = applyArcCommand(
    document,
    {
      type: 'propose_scene_patch',
      sceneId: 'intake-preflight',
      kind: 'copy',
      summary: 'Lead with the creator outcome.',
      patch: { heading: 'A creator can see what happens next.' },
      model: 'operator-agent',
      prompt: 'Rewrite this heading in direct plain language.'
    },
    context()
  ).document;
  assert.equal(document.composition.scenes[0].presentation.reader.heading, before);
  const proposal = document.proposals[0];
  document = applyArcCommand(
    document,
    { type: 'decide_scene_proposal', proposalId: proposal.id, decision: 'accepted' },
    context()
  ).document;
  assert.equal(document.composition.scenes[0].presentation.reader.heading, 'A creator can see what happens next.');
  assert.equal(document.sceneMeta['intake-preflight'].provenance.author, 'agent');
  assert.equal(document.sceneMeta['intake-preflight'].provenance.model, 'operator-agent');
});

test('locally generated media enters a scene only with provenance and rights', () => {
  let document = createAppReviewArcDocument('2026-08-11T15:00:00.000Z');
  document = applyArcCommand(document, {
    type: 'attach_media',
    sceneId: 'intake-preflight',
    source: '/images/app-review/preflight.webp',
    alt: 'A reviewer checks a preflight evidence bundle before making a decision.',
    caption: 'Preflight makes missing evidence visible before review.',
    model: 'logged-in local Codex account',
    promptReference: 'arc-agent-brief revision 1',
    rights: 'First-party generated asset approved for this customer Arc.',
    costUsd: null
  }, context()).document;

  const scene = document.composition.scenes.find((candidate) => candidate.id === 'intake-preflight')!;
  const artifact = document.composition.artifacts.find((candidate) => candidate.id === scene.presentation.media?.artifactId)!;
  assert.equal(scene.presentation.layout, 'split');
  assert.equal(artifact.kind, 'media');
  assert.equal(artifact.provenance.model, 'logged-in local Codex account');
  assert.match(artifact.provenance.rights, /approved/);
  assert.throws(() => applyArcCommand(document, {
    type: 'attach_media', sceneId: 'intake-preflight', source: 'javascript:alert(1)', alt: 'x', caption: 'x', model: 'x', promptReference: 'x', rights: 'x', costUsd: null
  }, context()), /Media source/);
});

test('review, approval, and publication remain explicit gates', () => {
  let document = createAppReviewArcDocument('2026-08-11T15:00:00.000Z');
  document = applyArcCommand(
    document,
    { type: 'add_comment', sceneId: 'decide', body: 'Clarify who owns approval.' },
    context()
  ).document;
  document = applyArcCommand(document, { type: 'request_review' }, context()).document;
  assert.throws(
    () => applyArcCommand(document, { type: 'approve', reason: 'Ready.' }, context()),
    /Resolve open review comments/
  );
  document = applyArcCommand(
    document,
    { type: 'resolve_comment', commentId: document.comments[0].id },
    context()
  ).document;
  document = applyArcCommand(document, { type: 'approve', reason: 'Evidence and owner are clear.' }, context()).document;
  document = applyArcCommand(document, { type: 'publish' }, context()).document;
  assert.equal(document.status, 'published');
  assert.equal(document.publishedRevision, document.revision);
  assert.throws(
    () => applyArcCommand(document, { type: 'patch_scene', sceneId: 'decide', patch: { heading: 'Changed' } }, context()),
    /Recover it to a draft/
  );
});
