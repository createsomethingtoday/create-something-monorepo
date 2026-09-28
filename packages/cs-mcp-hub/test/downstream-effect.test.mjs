import assert from 'node:assert/strict';
import test from 'node:test';

import { connectClientAndListTools, DownstreamConnectionError } from '../dist/downstream.js';

test('successful startup lists every page and retains the connection', async () => {
  const calls = [];
  const client = {
    async listTools(input) {
      calls.push(input?.cursor ?? 'first');
      return input?.cursor
        ? { tools: [{ name: 'second' }] }
        : { tools: [{ name: 'first' }], nextCursor: 'next' };
    },
    async close() { calls.push('close'); },
  };
  const tools = await connectClientAndListTools('sample', client, async () => { calls.push('connect'); });
  assert.deepEqual(tools.map((tool) => tool.name), ['first', 'second']);
  assert.deepEqual(calls, ['connect', 'first', 'next']);
});

test('connection failure is tagged and closes the client once', async () => {
  const calls = [];
  const cause = new Error('offline');
  const client = {
    async listTools() { calls.push('list'); return { tools: [] }; },
    async close() { calls.push('close'); },
  };
  await assert.rejects(
    connectClientAndListTools('sample', client, async () => { calls.push('connect'); throw cause; }),
    (error) => error instanceof DownstreamConnectionError &&
      error.server === 'sample' && error.phase === 'connect' && error.cause === cause,
  );
  assert.deepEqual(calls, ['connect', 'close']);
});

test('catalog failure closes the client and keeps the failing phase', async () => {
  const calls = [];
  const client = {
    async listTools() { calls.push('list'); throw new Error('catalog unavailable'); },
    async close() { calls.push('close'); throw new Error('cleanup unavailable'); },
  };
  await assert.rejects(
    connectClientAndListTools('sample', client, async () => { calls.push('connect'); }),
    (error) => error instanceof DownstreamConnectionError &&
      error.phase === 'list-tools' && error.message === 'catalog unavailable',
  );
  assert.deepEqual(calls, ['connect', 'list', 'close']);
});
