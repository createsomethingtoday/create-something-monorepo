import assert from 'node:assert/strict';
import { test } from 'node:test';

import { boundedTranscript, voiceTranscriberCommand } from '../src/voice-relay.js';

test('builds a shell-free transcriber command with an explicit audio placeholder', () => {
  assert.deepEqual(
    voiceTranscriberCommand('/tmp/voice.pcm', {
      executable: '/opt/bin/transcribe',
      argsJson: '["--model","tiny","{audio}"]'
    }),
    {
      executable: '/opt/bin/transcribe',
      args: ['--model', 'tiny', '/tmp/voice.pcm']
    }
  );
});

test('appends the audio path when no placeholder is configured', () => {
  assert.deepEqual(
    voiceTranscriberCommand('/tmp/voice.pcm', {
      executable: 'transcribe',
      argsJson: '["--language","en"]'
    }).args,
    ['--language', 'en', '/tmp/voice.pcm']
  );
});

test('rejects malformed arguments and empty transcripts', () => {
  assert.throws(
    () => voiceTranscriberCommand('/tmp/voice.pcm', { executable: 'x', argsJson: '{}' }),
    /JSON array/
  );
  assert.throws(() => boundedTranscript('  \n '), /empty transcript/);
  assert.equal(boundedTranscript('  focus   on tests  '), 'focus on tests');
});
