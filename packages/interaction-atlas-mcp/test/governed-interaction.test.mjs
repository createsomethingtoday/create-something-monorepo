import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { compileWorkflowDefinition } from '@create-something/workflow-compiler';
import { inspectAtlasGovernedInteraction } from '../dist/studio/governed-interaction.js';
import { startStudioServer } from '../dist/studio/server.js';

const fixtureUrl = new URL(
  '../../workflow-compiler/fixtures/marketplace/workflow.json',
  import.meta.url,
);

test('Atlas Studio validates the shared governed interaction contract without redefining it', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  const interaction = compileWorkflowDefinition(definition).governedInteraction;

  const inspected = inspectAtlasGovernedInteraction(interaction);

  assert.equal(inspected.schemaVersion, 'atlas_governed_interaction_inspection.v0.2');
  assert.equal(inspected.bundle.workflowId, 'webflow.marketplace.template-lifecycle');
  assert.equal(inspected.compatibility.hostId, 'atlas-studio');
  assert.equal(inspected.compatibility.compatible, true);
  assert.deepEqual(inspected.compatibility.errors, []);
});

test('Atlas Studio explicitly supports the v0.3 exact-enum interaction envelope', async () => {
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  definition.schemaVersion = 'workflow_definition.v0.3';
  definition.actions[0].requiredEvidenceMatchers = {
    published_url: { kind: 'equals_one_of', values: ['https://fixture-template.webflow.io'] },
  };
  const interaction = compileWorkflowDefinition(definition).governedInteraction;

  const inspected = inspectAtlasGovernedInteraction(interaction);

  assert.equal(interaction.schemaVersion, 'governed_interaction_bundle.v0.3');
  assert.equal(inspected.schemaVersion, 'atlas_governed_interaction_inspection.v0.3');
  assert.equal(inspected.compatibility.compatible, true);
  assert.deepEqual(inspected.compatibility.errors, []);
});

test('Atlas Studio exposes the packaged interaction read-only and fails closed on incompatibility', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'atlas-governed-interaction-'));
  const definition = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  const interaction = compileWorkflowDefinition(definition).governedInteraction;
  const interactionPath = path.join(root, 'governed-interaction.json');
  await writeFile(interactionPath, JSON.stringify(interaction));
  const server = await startStudioServer({
    host: '127.0.0.1',
    port: 0,
    cwd: root,
    governedInteractionPath: interactionPath,
  });
  const address = server.address();
  assert.equal(typeof address, 'object');
  const url = `http://127.0.0.1:${address.port}/api/governed-interaction`;

  try {
    const validResponse = await fetch(url);
    assert.equal(validResponse.status, 200);
    assert.match(
      validResponse.headers.get('content-security-policy') ?? '',
      /script-src 'self'/,
    );
    const valid = await validResponse.json();
    assert.equal(valid.authority, 'read_only');
    assert.equal(valid.compatibility.compatible, true);

    const incompatibleInteraction = JSON.parse(JSON.stringify(interaction));
    incompatibleInteraction.runtimeVersion = '99.0.0';
    await writeFile(interactionPath, JSON.stringify(incompatibleInteraction));
    const invalidResponse = await fetch(url);
    assert.equal(invalidResponse.status, 400);
    assert.deepEqual(await invalidResponse.json(), {
      error: 'Unsupported governed interaction runtime 99.0.0.',
      code: 'UNKNOWN_RUNTIME_VERSION',
      path: 'bundle.runtimeVersion',
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
