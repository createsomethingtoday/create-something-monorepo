import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  callDifyChat,
  collectDifyStreamOutput,
  parseDifySseEvents,
  splitDifyToolNames
} from '../src/lib/server/dify/client.ts';
import { difyOperatorAgents } from '../src/lib/server/dify/agent-registry.ts';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const difyInventoryPath = path.join(repositoryRoot, 'config/dify/inventory.json');

test('Dify operator client parses streamed answer and bounded tool proof', () => {
  const stream = [
    'data: {"event":"agent_message","answer":"Hello "}',
    '',
    'data: {"event":"agent_thought","tool":"hub_search; hub_execute","tool_input":"{\\"q\\":\\"x\\"}","observation":"result"}',
    '',
    'data: {"event":"message","answer":"operator"}',
    '',
    'data: {"event":"message_end","message_id":"msg-1","conversation_id":"conv-1"}',
    '',
    'data: [DONE]',
    ''
  ].join('\n');

  const events = parseDifySseEvents(stream);
  const output = collectDifyStreamOutput({
    events,
    responseOk: true,
    status: 200,
    durationMs: 42
  });

  assert.equal(output.ok, true);
  assert.equal(output.answer, 'Hello operator');
  assert.equal(output.messageId, 'msg-1');
  assert.equal(output.conversationId, 'conv-1');
  assert.deepEqual(output.toolCalls, [
    { tool: 'hub_search', hasInput: true, hasObservation: true, observationBytes: 6 },
    { tool: 'hub_execute', hasInput: true, hasObservation: true, observationBytes: 6 }
  ]);
});

test('Dify operator registry follows checked-in inventory service API names', () => {
  const inventory = JSON.parse(fs.readFileSync(difyInventoryPath, 'utf8')) as {
    agents: Record<string, { service_api?: { api_key_secret?: { secret_key?: string } } }>;
  };
  const inventorySecretKeys = new Map(
    Object.entries(inventory.agents).map(([agentId, agent]) => [
      agentId,
      agent.service_api?.api_key_secret?.secret_key
    ])
  );

  assert.equal(difyOperatorAgents.length, Object.keys(inventory.agents).length);

  for (const agent of difyOperatorAgents) {
    assert.equal(
      agent.apiKeyEnv,
      inventorySecretKeys.get(agent.id),
      `${agent.id} must use the inventory Dify Service API key name`
    );
  }
});

test('Dify operator client calls chat-messages with server-side API key', async () => {
  const agent = difyOperatorAgents.find((candidate) => candidate.id === 'template-review-hub');
  assert.ok(agent);

  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  const fetchMock: typeof fetch = async (url, init) => {
    requestUrl = String(url);
    requestInit = init;

    return new Response(
      [
        'data: {"event":"agent_message","answer":"Ready"}',
        '',
        'data: {"event":"message_end","message_id":"msg-2","conversation_id":"conv-2"}',
        ''
      ].join('\n'),
      { status: 200 }
    );
  };

  const output = await callDifyChat({
    agent,
    query: 'What is next?',
    conversationId: 'conv-1',
    user: 'ona-operator-test',
    platform: {
      env: {
        DIFY_TEMPLATE_REVIEW_HUB_API_KEY: 'test-key'
      }
    },
    fetch: fetchMock
  });

  assert.equal(requestUrl, 'https://api.dify.ai/v1/chat-messages');
  assert.equal(requestInit?.method, 'POST');
  assert.equal((requestInit?.headers as Record<string, string>).Authorization, 'Bearer test-key');
  assert.deepEqual(JSON.parse(String(requestInit?.body)), {
    inputs: {},
    query: 'What is next?',
    response_mode: 'streaming',
    conversation_id: 'conv-1',
    user: 'ona-operator-test'
  });
  assert.equal(output.ok, true);
  assert.equal(output.answer, 'Ready');
  assert.equal(output.conversationId, 'conv-2');
});

test('Dify operator client preserves plain JSON provider errors', async () => {
  const agent = difyOperatorAgents.find((candidate) => candidate.id === 'template-review-hub');
  assert.ok(agent);

  const output = await callDifyChat({
    agent,
    query: 'What is next?',
    user: 'ona-operator-test',
    platform: {
      env: {
        DIFY_TEMPLATE_REVIEW_HUB_API_KEY: 'test-key'
      }
    },
    fetch: async () =>
      new Response(JSON.stringify({ code: 'unauthorized', message: 'invalid api key' }), {
        status: 401
      })
  });

  assert.equal(output.ok, false);
  assert.equal(output.status, 401);
  assert.equal(output.error, 'unauthorized: invalid api key');
});

test('splitDifyToolNames removes blank tool entries', () => {
  assert.deepEqual(splitDifyToolNames(' search ; ; execute '), ['search', 'execute']);
});
