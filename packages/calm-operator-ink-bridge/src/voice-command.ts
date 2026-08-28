import type { AgentDecisionInput } from './agent-console.js';

export type VoiceCommandState =
  | 'queued'
  | 'leased'
  | 'transcribed'
  | 'confirmed'
  | 'failed'
  | 'expired';

export interface VoiceCommandInput {
  agent_id?: string;
  progress_version?: number;
  decision_id?: string;
  device_id?: string;
  idempotency_key?: string;
  format?: string;
  sample_rate_hz?: number;
  duration_ms?: number;
  audio_base64?: string;
  payload?: Record<string, unknown>;
}

export interface StoredVoiceCommand {
  id: string;
  idempotency_key: string;
  agent_id: string;
  progress_version: number;
  decision_id: string;
  device_id: string;
  format: 'pcm_s16le';
  sample_rate_hz: 16000;
  duration_ms: number;
  audio_base64: string;
  transcript: string;
  state: VoiceCommandState;
  requires_confirmation: true;
  created_at: number;
  updated_at: number;
  expires_at: number;
  lease_owner: string;
  lease_expires_at: number | null;
  attempts: number;
  error: string;
  payload: Record<string, unknown>;
}

export interface VoiceCommandLeaseInput {
  relay_id?: string;
  limit?: number;
  lease_ms?: number;
}

export interface VoiceTranscriptInput {
  relay_id?: string;
  transcript?: string;
  error?: string;
  payload?: Record<string, unknown>;
}

export type VoiceCommandError = { ok: false; status: number; error: string };

const MAX_AUDIO_BYTES = 320_000;
const MAX_DURATION_MS = 10_000;
// The round Stopwatch review surface renders four complete 39-character lines.
const MAX_TRANSCRIPT_LENGTH = 156;
const DEFAULT_TTL_MS = 15 * 60 * 1000;
const DEFAULT_LEASE_MS = 2 * 60 * 1000;
const MAX_LEASE_MS = 5 * 60 * 1000;

function boundedText(value: unknown, maximum: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function base64ByteLength(value: string): number {
  if (!value || !/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) return -1;
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  return (value.length / 4) * 3 - padding;
}

export function normalizeVoiceCommand(
  input: VoiceCommandInput,
  now = Date.now(),
  id = crypto.randomUUID()
): { ok: true; command: StoredVoiceCommand } | VoiceCommandError {
  const agentId = boundedText(input.agent_id, 160);
  const decisionId = boundedText(input.decision_id, 96);
  const deviceId = boundedText(input.device_id, 96);
  const idempotencyKey = boundedText(input.idempotency_key, 180);
  if (
    !agentId ||
    !decisionId ||
    !deviceId ||
    !idempotencyKey ||
    !Number.isInteger(input.progress_version) ||
    Number(input.progress_version) < 0
  ) {
    return {
      ok: false,
      status: 400,
      error: 'agent_id, progress_version, decision_id, device_id, and idempotency_key are required.'
    };
  }

  if (input.format !== 'pcm_s16le' || input.sample_rate_hz !== 16000) {
    return {
      ok: false,
      status: 400,
      error: 'Voice audio must be mono 16-bit PCM at 16 kHz.'
    };
  }

  const durationMs = Number(input.duration_ms);
  const audioBase64 = typeof input.audio_base64 === 'string' ? input.audio_base64 : '';
  const audioBytes = base64ByteLength(audioBase64);
  if (!Number.isFinite(durationMs) || durationMs < 250 || durationMs > MAX_DURATION_MS) {
    return { ok: false, status: 400, error: 'Voice duration must be between 250 and 10000 ms.' };
  }
  if (audioBytes <= 0 || audioBytes > MAX_AUDIO_BYTES) {
    return { ok: false, status: 413, error: 'Voice audio exceeds the 320000-byte limit.' };
  }

  return {
    ok: true,
    command: {
      id,
      idempotency_key: idempotencyKey,
      agent_id: agentId,
      progress_version: Number(input.progress_version),
      decision_id: decisionId,
      device_id: deviceId,
      format: 'pcm_s16le',
      sample_rate_hz: 16000,
      duration_ms: Math.round(durationMs),
      audio_base64: audioBase64,
      transcript: '',
      state: 'queued',
      requires_confirmation: true,
      created_at: now,
      updated_at: now,
      expires_at: now + DEFAULT_TTL_MS,
      lease_owner: '',
      lease_expires_at: null,
      attempts: 0,
      error: '',
      payload: input.payload ?? {}
    }
  };
}

export function leaseVoiceCommands(input: {
  commands: StoredVoiceCommand[];
  request: VoiceCommandLeaseInput;
  now?: number;
}): { ok: true; commands: StoredVoiceCommand[] } | VoiceCommandError {
  const now = input.now ?? Date.now();
  const relayId = boundedText(input.request.relay_id, 120);
  if (!relayId) return { ok: false, status: 400, error: 'relay_id is required.' };
  const limit = Math.max(1, Math.min(4, Math.round(Number(input.request.limit) || 1)));
  const leaseMs = Math.max(
    10_000,
    Math.min(MAX_LEASE_MS, Math.round(Number(input.request.lease_ms) || DEFAULT_LEASE_MS))
  );

  const commands = input.commands
    .filter(
      (command) =>
        command.expires_at > now &&
        (command.state === 'queued' ||
          (command.state === 'leased' && (command.lease_expires_at ?? 0) <= now))
    )
    .sort((left, right) => left.created_at - right.created_at)
    .slice(0, limit)
    .map((command) => ({
      ...command,
      state: 'leased' as const,
      updated_at: now,
      lease_owner: relayId,
      lease_expires_at: now + leaseMs,
      attempts: command.attempts + 1
    }));

  return { ok: true, commands };
}

export function recordVoiceTranscript(
  command: StoredVoiceCommand | null,
  input: VoiceTranscriptInput,
  now = Date.now()
): { ok: true; command: StoredVoiceCommand } | VoiceCommandError {
  if (!command) return { ok: false, status: 404, error: 'Voice command not found.' };
  const relayId = boundedText(input.relay_id, 120);
  if (!relayId || command.lease_owner !== relayId) {
    return { ok: false, status: 409, error: 'Voice command is leased by another relay.' };
  }
  if (command.state !== 'leased' || (command.lease_expires_at ?? 0) <= now) {
    return { ok: false, status: 409, error: 'Voice command lease is not active.' };
  }

  const error = boundedText(input.error, 500);
  const transcript = boundedText(input.transcript, MAX_TRANSCRIPT_LENGTH);
  if (error) {
    return {
      ok: true,
      command: {
        ...command,
        state: 'failed',
        updated_at: now,
        lease_expires_at: null,
        audio_base64: '',
        error,
        payload: { ...command.payload, ...(input.payload ?? {}) }
      }
    };
  }
  if (!transcript) return { ok: false, status: 400, error: 'Transcript is required.' };

  return {
    ok: true,
    command: {
      ...command,
      state: 'transcribed',
      transcript,
      audio_base64: '',
      updated_at: now,
      lease_expires_at: null,
      error: '',
      payload: { ...command.payload, ...(input.payload ?? {}) }
    }
  };
}

export function confirmVoiceCommand(
  command: StoredVoiceCommand | null,
  confirmed: boolean,
  now = Date.now()
): { ok: true; command: StoredVoiceCommand; decision: AgentDecisionInput } | VoiceCommandError {
  if (!command) return { ok: false, status: 404, error: 'Voice command not found.' };
  if (command.state !== 'transcribed' || !command.transcript) {
    return { ok: false, status: 409, error: 'Voice command is not ready for confirmation.' };
  }
  if (!confirmed) return { ok: false, status: 400, error: 'Explicit confirmation is required.' };

  const updated: StoredVoiceCommand = {
    ...command,
    state: 'confirmed',
    updated_at: now,
    audio_base64: ''
  };
  return {
    ok: true,
    command: updated,
    decision: {
      agent_id: updated.agent_id,
      progress_version: updated.progress_version,
      decision_id: updated.decision_id,
      message: updated.transcript,
      confirmed: true,
      idempotency_key: `voice:${updated.id}`,
      device_id: updated.device_id,
      payload: { voice_command_id: updated.id }
    }
  };
}

export function publicVoiceCommand(
  command: StoredVoiceCommand
): Omit<StoredVoiceCommand, 'audio_base64'> {
  const { audio_base64: _audio, ...publicCommand } = command;
  return publicCommand;
}
