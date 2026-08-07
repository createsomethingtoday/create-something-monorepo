import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('voice page uses the signed ElevenLabs WebRTC session end to end', async () => {
  const source = await readFile('src/routes/voice/+page.svelte', 'utf8');

  assert.match(source, /Conversation\.startSession\(\{/);
  assert.match(source, /conversationToken: token\.conversationToken/);
  assert.match(source, /prepare_application_brief/);
  assert.match(source, /setMicMuted\(muted\)/);
  assert.doesNotMatch(source, /@openai\/agents\/realtime/);
  assert.doesNotMatch(source, /new RealtimeSession/);
});

test('voice page accurately describes the configured retention boundary', async () => {
  const source = await readFile('src/routes/voice/+page.svelte', 'utf8');

  assert.match(source, /Audio is processed live and not\s+retained/i);
  assert.match(source, /transcript may be kept for up to 30 days/i);
  assert.match(source, /Audio not retained/i);
  assert.doesNotMatch(source, />Not saved</);
});
