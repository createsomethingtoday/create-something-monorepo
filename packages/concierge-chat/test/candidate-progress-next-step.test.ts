import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const chatPageSource = readFileSync('src/routes/chat/[threadId]/+page.svelte', 'utf8');

test('candidate progress pairs completion with the Concierge next step', () => {
  const candidateProgressBlock = chatPageSource.match(
    /\{#if !showInternalOperatorUi\}([\s\S]*?)\{\/if\}/
  )?.[1];

  assert.ok(candidateProgressBlock, 'expected a candidate-only progress rail');
  assert.match(
    candidateProgressBlock,
    /<span>Current step<\/span>[\s\S]*?<strong>\{nurseGuidance\.title\}<\/strong>/
  );
  assert.match(candidateProgressBlock, /\{liveThreadView\.thread\.profile\.completion\}% complete/);
  assert.doesNotMatch(candidateProgressBlock, /Working profile/);
  assert.doesNotMatch(
    chatPageSource,
    /@media \(max-width: 720px\) \{[\s\S]*?\.application-completion-note \{\s*display: none;/
  );
});
