import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { registerTools } from '../dist/tools/index.js';
import { createSession } from '../dist/studio/store.js';

test('Atlas composition tools expose the Arc catalog, generated routes, and the fixture-only action', async () => {
  const tools = new Map();
  const server = {
    tool(name, description, schema, handler, options) {
      tools.set(name, { description, handler, options, schema });
    }
  };

  registerTools(server);

  const listCompositions = tools.get('atlas_composition_list');
  const getComposition = tools.get('atlas_composition_get');
  const resolveModule = tools.get('atlas_composition_resolve_map_module');
  const proposeAction = tools.get('atlas_composition_propose_local_action');
  assert.ok(listCompositions);
  assert.ok(getComposition);
  assert.ok(resolveModule);
  assert.ok(proposeAction);
  assert.equal(getComposition.options?.readOnly, true);
  assert.equal(listCompositions.options?.readOnly, true);
  assert.equal(resolveModule.options?.readOnly, true);
  assert.equal(proposeAction.options?.readOnly, true);

  const ctx = { accountId: 'acct_test', metadata: {}, policy: {}, userId: 'agent_test' };
  const listResult = await listCompositions.handler({}, ctx);
  const listPayload = JSON.parse(listResult.content[0].text);
  assert.equal(listPayload.total, 55);
  assert.equal(
    listPayload.arcs.some((arc) => arc.slug === 'runbook-codex-morning-briefing'),
    true
  );
  assert.equal(
    listPayload.arcs.some((arc) => arc.slug === 'operator-solo-control-tower'),
    true
  );
  assert.equal('composition' in listPayload.arcs[0], false);

  const generatedResult = await getComposition.handler(
    { composition_id: 'runbook-codex-morning-briefing' },
    ctx
  );
  const generatedPayload = JSON.parse(generatedResult.content[0].text);
  assert.equal(generatedPayload.composition.id, 'runbook-codex-morning-briefing');
  assert.equal(generatedPayload.source.kind, 'runbook');
  assert.equal(generatedPayload.story.scenes.length, 5);

  const compositionResult = await getComposition.handler({}, ctx);
  const compositionPayload = JSON.parse(compositionResult.content[0].text);
  assert.equal(compositionPayload.composition.id, 'app-review-governance');
  assert.equal(compositionPayload.story.ephemeral, true);
  assert.equal(compositionPayload.story.scenes.length, 10);
  assert.equal(compositionPayload.story.scenes[0].id, 'intake-preflight');
  assert.equal(compositionPayload.story.scenes[0].motionCue, 'trace-handoff');
  assert.equal(compositionPayload.story.scenes[0].presentation.layout, 'split');
  assert.equal(compositionPayload.story.scenes[0].presentation.reader.stakeholders[0].role, 'Creator');
  assert.equal(compositionPayload.story.scenes[3].presentation.code.language, 'typescript');
  assert.equal(compositionPayload.story.scenes[7].presentation.layout, 'branches');

  const resolutionResult = await resolveModule.handler(
    { module_id: 'app-review-governance-map' },
    ctx
  );
  const resolutionPayload = JSON.parse(resolutionResult.content[0].text);
  assert.equal(resolutionPayload.resolution.resolvedVersion, '2026-08-11');
  assert.equal(resolutionPayload.resolution.versionMode, 'pinned');

  const generatedResolutionResult = await resolveModule.handler(
    {
      composition_id: 'runbook-codex-morning-briefing',
      module_id: 'runbook-codex-morning-briefing-map'
    },
    ctx
  );
  const generatedResolutionPayload = JSON.parse(generatedResolutionResult.content[0].text);
  assert.equal(generatedResolutionPayload.resolution.resolvedVersion, 'registry-v1');

  const proposalResult = await proposeAction.handler({}, ctx);
  const proposalPayload = JSON.parse(proposalResult.content[0].text);
  assert.equal(proposalPayload.proposal.status, 'proposed');
  assert.equal(proposalPayload.proposal.proposedBy, 'agent_test');
  assert.equal(proposalPayload.nextRequiredActor, 'operator');
});

test('Atlas Studio database health is exposed as a read-only MCP tool', async () => {
  const previousHome = process.env.CREATE_SOMETHING_ATLAS_HOME;
  const home = await mkdtemp(path.join(tmpdir(), 'atlas-tools-health-test-'));
  process.env.CREATE_SOMETHING_ATLAS_HOME = home;

  try {
    const session = await createSession({
      client: 'CREATE SOMETHING',
      workflow: 'Internal operating topology',
      owner: 'Micah'
    });
    const tools = new Map();
    const server = {
      tool(name, description, schema, handler, options) {
        tools.set(name, { description, handler, options, schema });
      }
    };

    registerTools(server);

    const entry = tools.get('atlas_studio_database_health');
    assert.ok(entry, 'atlas_studio_database_health should be registered');
    assert.equal(entry.options?.readOnly, true);

    const result = await entry.handler(
      { session_id: session.id },
      { accountId: 'acct_test', metadata: {}, policy: {}, userId: 'user_test' }
    );
    const payload = JSON.parse(result.content[0].text);

    assert.equal(payload.accountId, 'acct_test');
    assert.equal(payload.health.sessionId, session.id);
    assert.equal(payload.health.topology.title, 'Business health');
  } finally {
    if (previousHome === undefined) {
      delete process.env.CREATE_SOMETHING_ATLAS_HOME;
    } else {
      process.env.CREATE_SOMETHING_ATLAS_HOME = previousHome;
    }
  }
});
