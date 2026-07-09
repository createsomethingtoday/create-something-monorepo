import assert from 'node:assert/strict';
import test from 'node:test';

import { parseArgs, stripTerminalControl, stripThinking } from '../ornith-visible-chat.mjs';

test('visible chat parses required prompt', () => {
  const options = parseArgs(['--model', 'ornith:9b', '--prompt', 'hello', '--timeout-ms', '30000']);
  assert.equal(options.model, 'ornith:9b');
  assert.equal(options.prompt, 'hello');
  assert.equal(options.timeoutMs, 30_000);
});

test('visible chat strips completed thinking block', () => {
  const output = `Thinking...
private chain
...done thinking.

Final answer.`;
  assert.equal(stripThinking(output), 'Final answer.');
});

test('visible chat preserves clean final answer', () => {
  assert.equal(stripThinking('Final only.'), 'Final only.');
});

test('visible chat degrades if thinking marker never closes', () => {
  assert.equal(stripThinking('Thinking...\npartial'), 'partial');
});

test('visible chat strips terminal control and spinner output', () => {
  const output = '\u001B[?25l\u001B[1G⠙ \u001B[K\u001B[?25hFinal answer.';
  assert.equal(stripTerminalControl(output), 'Final answer.');
  assert.equal(stripThinking(output), 'Final answer.');
});
