import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_WHISPER_MODEL,
  buildLocalWhisperCommands
} from '../scripts/transcribe-local-whisper.mjs';

test('builds a shell-free raw PCM to local Whisper transcription pipeline', () => {
  const commands = buildLocalWhisperCommands('/private/tmp/voice command.pcm', {
    modelPath: '/private/models/base.en.bin',
    ffmpegExecutable: '/opt/local/bin/ffmpeg',
    whisperExecutable: '/opt/local/bin/whisper-cli'
  });

  assert.deepEqual(commands.ffmpeg, {
    executable: '/opt/local/bin/ffmpeg',
    args: [
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      's16le',
      '-ar',
      '16000',
      '-ac',
      '1',
      '-i',
      '/private/tmp/voice command.pcm',
      '-y',
      '/private/tmp/voice command.pcm.wav'
    ]
  });
  assert.equal(commands.whisper.executable, '/opt/local/bin/whisper-cli');
  assert.deepEqual(commands.whisper.args.slice(0, 4), [
    '--model',
    '/private/models/base.en.bin',
    '--file',
    '/private/tmp/voice command.pcm.wav'
  ]);
  assert.equal(commands.transcriptPath, '/private/tmp/voice command.pcm.transcript.txt');
});

test('defaults to the private Calm Operator application-support model', () => {
  assert.match(DEFAULT_WHISPER_MODEL, /Calm Operator\/models\/ggml-base\.en\.bin$/);
});
