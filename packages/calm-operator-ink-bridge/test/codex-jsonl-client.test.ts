import assert from 'node:assert/strict';
import readline from 'node:readline';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';

import { CodexJsonlRpcClient } from '../scripts/codex-app-server-client.mjs';

test('initializes JSONL app-server and declines authority-escalation requests', async () => {
  const fromServer = new PassThrough();
  const toServer = new PassThrough();
  const outbound = readline.createInterface({ input: toServer })[Symbol.asyncIterator]();
  const client = new CodexJsonlRpcClient({
    input: fromServer,
    output: toServer,
    requestTimeoutMs: 1_000
  });

  const initialized = client.initialize();
  const initializeRequest = JSON.parse(String((await outbound.next()).value));
  assert.equal(initializeRequest.method, 'initialize');
  assert.equal(initializeRequest.params.clientInfo.name, 'calm_operator_stopwatch');
  fromServer.write(
    `${JSON.stringify({ id: initializeRequest.id, result: { userAgent: 'test' } })}\n`
  );
  await initialized;
  assert.deepEqual(JSON.parse(String((await outbound.next()).value)), {
    method: 'initialized',
    params: {}
  });

  fromServer.write(
    `${JSON.stringify({
      method: 'item/commandExecution/requestApproval',
      id: 99,
      params: { threadId: 'thread-1', turnId: 'turn-1', itemId: 'item-1' }
    })}\n`
  );
  assert.deepEqual(JSON.parse(String((await outbound.next()).value)), {
    id: 99,
    result: { decision: 'decline' }
  });

  const listed = client.request('thread/list', { limit: 1 });
  const listRequest = JSON.parse(String((await outbound.next()).value));
  fromServer.write(`${JSON.stringify({ id: listRequest.id, result: { data: [] } })}\n`);
  assert.deepEqual(await listed, { data: [] });
  client.close();
});
