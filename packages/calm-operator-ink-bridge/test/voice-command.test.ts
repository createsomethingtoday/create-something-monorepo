import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  confirmVoiceCommand,
  leaseVoiceCommands,
  normalizeVoiceCommand,
  recordVoiceTranscript,
  type StoredVoiceCommand
} from '../src/voice-command.js';

function validInput() {
  return {
    agent_id: 'codex:session-1',
    progress_version: 7,
    decision_id: 'redirect',
    device_id: 'stopwatch',
    idempotency_key: 'stopwatch:session-1:7:redirect:1',
    format: 'pcm_s16le' as const,
    sample_rate_hz: 16000,
    duration_ms: 2400,
    audio_base64: Buffer.alloc(16000, 1).toString('base64')
  };
}

test('accepts a bounded mono PCM voice command for later transcription', () => {
  const result = normalizeVoiceCommand(validInput(), 1000, 'voice-1');
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.command.state, 'queued');
  assert.equal(result.command.requires_confirmation, true);
  assert.equal(result.command.device_id, 'stopwatch');
});

test('rejects unsupported audio and clips outside the size or duration policy', () => {
  assert.deepEqual(normalizeVoiceCommand({ ...validInput(), format: 'mp3' }, 1000, 'v1'), {
    ok: false,
    status: 400,
    error: 'Voice audio must be mono 16-bit PCM at 16 kHz.'
  });
  assert.equal(
    normalizeVoiceCommand({ ...validInput(), duration_ms: 16000 }, 1000, 'v1').ok,
    false
  );
  assert.equal(
    normalizeVoiceCommand(
      { ...validInput(), audio_base64: Buffer.alloc(320_001, 1).toString('base64') },
      1000,
      'v1'
    ).ok,
    false
  );
});

test('accepts a ten-second PCM recording within the expanded byte ceiling', () => {
  const tenSecondRecording = Buffer.alloc(320_000, 1).toString('base64');
  assert.equal(
    normalizeVoiceCommand(
      { ...validInput(), duration_ms: 10_000, audio_base64: tenSecondRecording },
      1000,
      'v10'
    ).ok,
    true
  );
  assert.equal(
    normalizeVoiceCommand({ ...validInput(), duration_ms: 10_001 }, 1000, 'v10').ok,
    false
  );
  assert.equal(
    normalizeVoiceCommand(
      { ...validInput(), audio_base64: Buffer.alloc(320_001, 1).toString('base64') },
      1000,
      'v10'
    ).ok,
    false
  );
});

test('requires a transcript before the operator can confirm delivery', () => {
  const normalized = normalizeVoiceCommand(validInput(), 1000, 'voice-1');
  assert.equal(normalized.ok, true);
  if (!normalized.ok) return;

  assert.deepEqual(confirmVoiceCommand(normalized.command, true, 2000), {
    ok: false,
    status: 409,
    error: 'Voice command is not ready for confirmation.'
  });
});

test('turns a confirmed transcript into the existing safe agent-decision input', () => {
  const normalized = normalizeVoiceCommand(validInput(), 1000, 'voice-1');
  assert.equal(normalized.ok, true);
  if (!normalized.ok) return;
  const leased = leaseVoiceCommands({
    commands: [normalized.command],
    request: { relay_id: 'mac' },
    now: 1500
  });
  assert.equal(leased.ok, true);
  if (!leased.ok) return;
  const transcribed = recordVoiceTranscript(
    leased.commands[0] ?? null,
    { relay_id: 'mac', transcript: 'Focus on the failing integration test.' },
    2000
  );
  assert.equal(transcribed.ok, true);
  if (!transcribed.ok) return;

  const confirmed = confirmVoiceCommand(transcribed.command, true, 3000);
  assert.equal(confirmed.ok, true);
  if (!confirmed.ok) return;
  assert.deepEqual(confirmed.decision, {
    agent_id: 'codex:session-1',
    progress_version: 7,
    decision_id: 'redirect',
    message: 'Focus on the failing integration test.',
    confirmed: true,
    idempotency_key: 'voice:voice-1',
    device_id: 'stopwatch',
    payload: { voice_command_id: 'voice-1' }
  });
});

test('rejects empty transcripts and relay ownership mismatches', () => {
  const command = {
    ...(
      normalizeVoiceCommand(validInput(), 1000, 'voice-1') as {
        ok: true;
        command: StoredVoiceCommand;
      }
    ).command,
    state: 'leased' as const,
    lease_owner: 'relay-a',
    lease_expires_at: 5000
  };
  assert.equal(
    recordVoiceTranscript(command, { relay_id: 'relay-b', transcript: 'test' }, 2000).ok,
    false
  );
  assert.equal(
    recordVoiceTranscript(command, { relay_id: 'relay-a', transcript: '   ' }, 2000).ok,
    false
  );
});

test('bounds a transcript to the complete Stopwatch review surface', () => {
  const command = {
    ...(
      normalizeVoiceCommand(validInput(), 1000, 'voice-review') as {
        ok: true;
        command: StoredVoiceCommand;
      }
    ).command,
    state: 'leased' as const,
    lease_owner: 'relay-a',
    lease_expires_at: 5000
  };
  const result = recordVoiceTranscript(
    command,
    { relay_id: 'relay-a', transcript: 'a'.repeat(220) },
    2000
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.command.transcript.length, 156);
});
