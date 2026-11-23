import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sourcesForMessage } from '../src/lib/npg/astryx/turn-sources.ts';
const messages = [{ role: 'user' }, { role: 'assistant' }, { role: 'user' }, { role: 'assistant' }];
test('source stays attached to its recorded assistant answer across turns', () => {
  const first = { tool: 'search_registry_sourcing', assistantMessageIndex: 1 };
  const second = { tool: 'search_registry_sourcing', assistantMessageIndex: 3 };
  assert.deepEqual(sourcesForMessage(messages, [first, second], 1), [first]);
  assert.deepEqual(sourcesForMessage(messages, [first, second], 3), [second]);
});
test('legacy sources require one unambiguous assistant answer', () => {
  const source = { tool: 'search_registry_sourcing' };
  assert.deepEqual(sourcesForMessage(messages, [source], 3), []);
  assert.deepEqual(sourcesForMessage(messages.slice(0, 3), [source], 1), []);
  assert.deepEqual(sourcesForMessage(messages.slice(0, 2), [source], 1), [source]);
  assert.deepEqual(sourcesForMessage(messages.slice(0, 2), [source], 0), []);
});
