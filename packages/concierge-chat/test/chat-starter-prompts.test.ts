import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { nurseStarterPrompts } from '../src/lib/chat/starter-prompts';

const chatPageSource = readFileSync('src/routes/chat/[threadId]/+page.svelte', 'utf8');

test('starter prompts provide concise, editable first-message drafts', () => {
  assert.deepEqual(nurseStarterPrompts, [
    {
      label: 'ICU nights in Dallas',
      message: "I'm an ICU traveler looking for nights in Dallas."
    },
    {
      label: 'ER days near Phoenix',
      message: "I'm an ER traveler looking for day shifts near Phoenix."
    },
    {
      label: 'Compact license, open to Texas',
      message: "I have a compact license and I'm open to travel roles in Texas."
    }
  ]);
});

test('selecting a starter prompt fills and focuses the composer without sending it', () => {
  const useStarterPromptBlock = chatPageSource.match(
    /async function useStarterPrompt\(prompt: NurseStarterPrompt\) \{([\s\S]*?)\n\s*\}\n\n\s*async function submitComposer/
  )?.[1];

  assert.ok(useStarterPromptBlock, 'expected a dedicated starter-prompt action');
  assert.match(
    useStarterPromptBlock,
    /composerText = prompt\.message;[\s\S]*?composerEl\?\.focus\(\);/
  );
  assert.match(
    chatPageSource,
    /<button\s+type="button"\s+on:click=\{\(\) => useStarterPrompt\(prompt\)\}\s*>[\s\S]*?\{prompt\.label\}[\s\S]*?<\/button>/
  );
  assert.doesNotMatch(useStarterPromptBlock, /submitComposer\(/);
});
