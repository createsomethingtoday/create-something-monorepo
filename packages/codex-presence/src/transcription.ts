export type TranscriptionResult = {
  text: string;
  model: 'gpt-4o-mini-transcribe';
};

export type TranscribeAudioOptions = {
  bytes: Uint8Array;
  mimeType: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
};

export class OpenAITranscriptionError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(`OpenAI transcription failed (${status}${code ? ` ${code}` : ''}).`);
    this.name = 'OpenAITranscriptionError';
  }
}

export async function transcribeAudio(options: TranscribeAudioOptions): Promise<TranscriptionResult> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required for server-side transcription.');
  const wav = options.mimeType.toLowerCase().startsWith('audio/l16')
    ? wrapPcm16Wav(options.bytes, 16_000)
    : options.bytes;
  const form = new FormData();
  const audioBuffer = wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength) as ArrayBuffer;
  form.append('file', new File([new Uint8Array(audioBuffer)], 'even-g2.wav', { type: 'audio/wav' }));
  form.append('model', 'gpt-4o-mini-transcribe');
  const response = await (options.fetchImpl ?? fetch)('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}` },
    body: form
  });
  const value = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const error = object(value.error);
    throw new OpenAITranscriptionError(response.status, typeof error.code === 'string' ? error.code : '');
  }
  if (typeof value.text !== 'string' || !value.text.trim()) throw new Error('Transcription response did not contain text.');
  return { text: value.text.trim(), model: 'gpt-4o-mini-transcribe' };
}

function object(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function wrapPcm16Wav(bytes: Uint8Array, sampleRate: number): Uint8Array {
  const buffer = Buffer.alloc(44 + bytes.byteLength);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + bytes.byteLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(bytes.byteLength, 40);
  Buffer.from(bytes).copy(buffer, 44);
  return buffer;
}
