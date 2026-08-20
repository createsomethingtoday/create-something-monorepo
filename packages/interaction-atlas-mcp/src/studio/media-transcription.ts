import path from 'node:path';

import type { TranscriptSegment } from '@create-something/atlas-composition';

export type LocalProcessPlan = {
  program: string;
  args: string[];
};

export type WhisperCppTranscriptionPlan = {
  engine: 'whisper.cpp';
  audioExtraction: LocalProcessPlan;
  transcription: LocalProcessPlan;
  outputJsonPath: string;
};

export type BuildWhisperCppTranscriptionPlanInput = {
  executablePath: string;
  modelPath: string;
  sourcePath: string;
  workspacePath: string;
  language?: string;
};

type WhisperCppSegment = {
  timestamps?: { from?: unknown; to?: unknown };
  text?: unknown;
};

type WhisperCppTranscriptPayload = {
  transcription?: WhisperCppSegment[];
};

function requiredAbsolutePath(value: string, label: string): string {
  if (!value.trim()) throw new Error(`A ${label} is required.`);
  if (!path.isAbsolute(value)) throw new Error(`Local transcription requires an absolute ${label}.`);
  return path.resolve(value);
}

function parseWhisperTimestamp(value: unknown, label: string): number {
  if (typeof value !== 'string') throw new Error(`whisper.cpp returned an invalid ${label} timestamp.`);
  const match = /^(\d{2,}):(\d{2}):(\d{2})[,.](\d{3})$/.exec(value.trim());
  if (!match) throw new Error(`whisper.cpp returned an invalid ${label} timestamp.`);
  const [, hours, minutes, seconds, milliseconds] = match;
  const minuteValue = Number(minutes);
  const secondValue = Number(seconds);
  if (minuteValue > 59 || secondValue > 59) {
    throw new Error(`whisper.cpp returned an invalid ${label} timestamp.`);
  }
  return (
    (Number(hours) * 3_600_000 + minuteValue * 60_000 + secondValue * 1_000 + Number(milliseconds)) * 1_000
  );
}

/**
 * Plans an explicitly configured, fully local whisper.cpp invocation. It does
 * not probe, download, choose, or activate an executable or model: those are
 * deliberate operator/packaging decisions at the Rust-sidecar boundary.
 */
export function buildWhisperCppTranscriptionPlan(
  input: BuildWhisperCppTranscriptionPlanInput
): WhisperCppTranscriptionPlan {
  const executablePath = requiredAbsolutePath(input.executablePath, 'executable path');
  const modelPath = requiredAbsolutePath(input.modelPath, 'model path');
  const sourcePath = requiredAbsolutePath(input.sourcePath, 'source path');
  const workspacePath = requiredAbsolutePath(input.workspacePath, 'workspace path');
  const language = input.language?.trim() || 'auto';
  const audioPath = path.join(workspacePath, 'source.wav');
  const outputPrefix = path.join(workspacePath, 'transcript');

  return {
    engine: 'whisper.cpp',
    audioExtraction: {
      program: 'ffmpeg',
      args: [
        '-y', '-v', 'error', '-i', sourcePath, '-vn', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', audioPath
      ]
    },
    transcription: {
      program: executablePath,
      args: [
        '--model', modelPath,
        '--file', audioPath,
        '--output-json-full',
        '--output-file', outputPrefix,
        '--language', language,
        '--no-prints'
      ]
    },
    outputJsonPath: `${outputPrefix}.json`
  };
}

/**
 * Normalizes whisper.cpp JSON into the project-owned transcript contract. The
 * original engine output remains a local implementation artifact; Atlas only
 * accepts explicit text and valid timestamped segments into its graph.
 */
export function parseWhisperCppTranscript(
  payload: unknown,
  assetId: string
): TranscriptSegment[] {
  if (!assetId.trim()) throw new Error('A transcript source asset id is required.');
  const transcript = payload as WhisperCppTranscriptPayload;
  if (!transcript || !Array.isArray(transcript.transcription)) {
    throw new Error('whisper.cpp output does not contain a transcription array.');
  }
  const segments = transcript.transcription.flatMap((entry, index) => {
    const text = typeof entry?.text === 'string' ? entry.text.trim() : '';
    if (!text) return [];
    const startUs = parseWhisperTimestamp(entry.timestamps?.from, 'start');
    const endUs = parseWhisperTimestamp(entry.timestamps?.to, 'end');
    if (endUs <= startUs) throw new Error('whisper.cpp returned a non-positive transcript range.');
    return [{
      id: `whisper.cpp:${assetId.trim()}:${index + 1}`,
      assetId: assetId.trim(),
      startUs,
      endUs,
      text
    }];
  });
  if (!segments.length) throw new Error('whisper.cpp output did not contain timestamped transcript segments.');
  return segments;
}
