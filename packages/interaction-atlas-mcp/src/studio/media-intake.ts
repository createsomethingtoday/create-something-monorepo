import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import type { SourceAsset } from '@create-something/atlas-composition';

const execFileAsync = promisify(execFile);

type FfprobePayload = {
  format?: { duration?: string };
  streams?: Array<{
    codec_name?: string;
    codec_type?: string;
    height?: number;
    width?: number;
  }>;
};

export type InspectLocalVideoSourceInput = {
  id: string;
  filePath: string;
  ffprobePath?: string;
};

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

function positiveInteger(value: number | undefined, label: string): number {
  if (!Number.isInteger(value) || !value || value < 0) {
    throw new Error(`FFprobe did not return a positive ${label}.`);
  }
  return value;
}

/**
 * Reads source facts in place. It never copies, uploads, transcodes, or
 * records media contents; the returned file URI is solely for the local Atlas
 * manifest and later local renderer.
 */
export async function inspectLocalVideoSource(
  input: InspectLocalVideoSourceInput
): Promise<SourceAsset> {
  if (!input.id.trim()) throw new Error('A local source asset id is required.');
  if (!path.isAbsolute(input.filePath)) throw new Error('Local video intake requires an absolute file path.');
  const filePath = path.resolve(input.filePath);
  const metadata = await stat(filePath);
  if (!metadata.isFile()) throw new Error(`Local video source is not a file: ${filePath}`);

  const { stdout } = await execFileAsync(
    input.ffprobePath ?? 'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration:stream=codec_type,codec_name,width,height',
      '-of',
      'json',
      filePath
    ],
    { maxBuffer: 1_024 * 1_024 }
  );
  let inspection: FfprobePayload;
  try {
    inspection = JSON.parse(stdout) as FfprobePayload;
  } catch {
    throw new Error('FFprobe returned invalid JSON for the local video source.');
  }
  const video = inspection.streams?.find((stream) => stream.codec_type === 'video');
  const hasAudio = inspection.streams?.some((stream) => stream.codec_type === 'audio') ?? false;
  if (!video && !hasAudio) throw new Error('Local media intake requires at least one video or audio stream.');
  const durationSeconds = Number(inspection.format?.duration);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('FFprobe did not return a positive source duration.');
  }

  return {
    id: input.id.trim(),
    uri: pathToFileURL(filePath).href,
    sha256: await sha256File(filePath),
    media: {
      durationUs: Math.round(durationSeconds * 1_000_000),
      width: video ? positiveInteger(video.width, 'video width') : 0,
      height: video ? positiveInteger(video.height, 'video height') : 0,
      hasAudio
    }
  };
}
