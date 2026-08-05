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
