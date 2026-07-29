import assert from 'node:assert/strict';
import test from 'node:test';

import { toSafeVoiceError } from '../src/lib/voice/errors';
import { toVoiceTranscriptEntries } from '../src/lib/voice/transcript';

test('realtime history becomes a candidate and Concierge transcript', () => {
  const history = [
    {
      itemId: 'candidate-1',
      type: 'message',
      role: 'user',
      status: 'completed',
      content: [{ type: 'input_audio', transcript: 'I am an ICU nurse looking for nights.' }]
    },
    {
      itemId: 'concierge-1',
      type: 'message',
      role: 'assistant',
      status: 'completed',
      content: [{ type: 'output_audio', transcript: 'What location works best for you?' }]
    },
    {
      itemId: 'tool-1',
      type: 'function_call',
      name: 'prepare_application_brief'
    }
  ];

  assert.deepEqual(toVoiceTranscriptEntries(history), [
    {
      id: 'candidate-1',
      speaker: 'Candidate',
      text: 'I am an ICU nurse looking for nights.',
      status: 'completed'
    },
    {
      id: 'concierge-1',
      speaker: 'Concierge',
      text: 'What location works best for you?',
      status: 'completed'
    }
  ]);
});

test('voice errors stay useful without echoing provider details', () => {
  const message = toSafeVoiceError(
    new Error('Realtime request 429: quota. Secret sk-test-sensitive. Request req_123.')
  );
  assert.match(message, /temporarily unavailable/i);
  assert.doesNotMatch(message, /sk-test|req_123|OpenAI/i);
});

test('microphone denials return one recovery action', () => {
  assert.equal(
    toSafeVoiceError(new DOMException('Permission denied', 'NotAllowedError')),
    'Microphone access is off. Allow microphone access for this page, then try again.'
  );
});
