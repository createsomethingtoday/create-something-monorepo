import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildPublicMapInteractionPair } from '../src/lib/analytics/workflow-interactions';

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

test('workflow interaction storage distinguishes human, agent, system, and policy actors without raw content', () => {
  const migration = read('../migrations/0040_workflow_interaction_events.sql');

  assert.match(migration, /CREATE TABLE workflow_interaction_events/);
  assert.match(migration, /actor_kind IN \('human', 'agent', 'system', 'policy'\)/);
  assert.match(
    migration,
    /event_type IN \('request', 'recommendation', 'approval_requested', 'approval_decided', 'action_proposed', 'action_executed', 'proof_attached', 'recovery_triggered'\)/
  );
  assert.match(migration, /authority_state IN \('run', 'wait', 'stop'\)/);
  assert.match(migration, /actor_id_hash/);
  assert.doesNotMatch(migration, /prompt|message_text|email|ip_address/i);
});

test('public Map emits a correlated human request and agent recommendation with no message body', () => {
  const pair = buildPublicMapInteractionPair({
    correlationId: 'workflow_interaction_123',
    humanEventId: 'workflow_event_human',
    agentEventId: 'workflow_event_agent',
    sessionId: 'atlas_session_123',
    actorIdHash: 'a'.repeat(64),
    messageChars: 48,
    mutationCount: 2,
    tier: 'anonymous'
  });

  assert.equal(pair.length, 2);
  assert.deepEqual(
    pair.map((event) => event.actorKind),
    ['human', 'agent']
  );
  assert.deepEqual(
    pair.map((event) => event.eventType),
    ['request', 'recommendation']
  );
  assert.ok(pair.every((event) => event.correlationId === 'workflow_interaction_123'));
  assert.ok(pair.every((event) => event.authorityState === 'wait'));
  assert.equal(pair[1].parentEventId, pair[0].id);
  assert.equal(JSON.stringify(pair).includes('messageBody'), false);
  assert.equal(JSON.stringify(pair).includes('prompt'), false);
});

test('public Map persistence writes the interaction pair alongside its existing operational event', () => {
  const route = read('../src/routes/api/atlas/public-agent/+server.ts');

  assert.match(route, /buildPublicMapInteractionPair/);
  assert.match(route, /INSERT INTO workflow_interaction_events/);
  assert.match(route, /interactionEvents\.map/);
});
