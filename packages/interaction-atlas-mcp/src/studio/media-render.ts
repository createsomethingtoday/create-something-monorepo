import { execFile } from 'node:child_process';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  compileTranscriptSrt,
  compileTranscriptTimeline,
  type MediaInspectionReceipt,
  type MediaRenderReceipt,
  type TranscriptEditorProject
} from '@create-something/atlas-composition';

import { inspectLocalVideoSource } from './media-intake.js';
import {
  getAtlasMediaProjectPath,
  readAtlasMediaProject,
  writeAtlasMediaProject
} from './media-project.js';

const execFileAsync = promisify(execFile);

export type RenderAcceptedTranscriptInput = {
  outputPath: string;
  requestedAt: string;
  fps?: number;
};

export type RenderAcceptedTranscriptResult = {
  project: TranscriptEditorProject;
  receipt: MediaRenderReceipt;
};

type FfprobePayload = {
  format?: { duration?: string };
  streams?: Array<{ codec_name?: string; codec_type?: string; height?: number; width?: number }>;
};

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

function stableHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function escapeDrawtext(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .replace(/[\[\]]/g, (character) => `\\${character}`)
    .replace(/;/g, '\\;')
    .replace(/\r?\n/g, '\\n');
}

async function inspectOutput(filePath: string): Promise<MediaInspectionReceipt> {
  const { stdout } = await execFileAsync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height', '-of', 'json', filePath],
    { maxBuffer: 1_024 * 1_024 }
  );
  const payload = JSON.parse(stdout) as FfprobePayload;
  const video = payload.streams?.find((stream) => stream.codec_type === 'video');
  const durationUs = Math.round(Number(payload.format?.duration) * 1_000_000);
  if (!video?.codec_name || !video.width || !video.height || !Number.isFinite(durationUs) || durationUs <= 0) {
    throw new Error('FFprobe could not verify the rendered local MP4.');
  }
  return {
    inspectedAt: new Date().toISOString(),
    tool: 'ffprobe',
    durationUs,
    width: video.width,
    height: video.height,
    videoCodec: video.codec_name,
    audioStreams: payload.streams?.filter((stream) => stream.codec_type === 'audio').length ?? 0
  };
}

/**
 * Renders exactly the current accepted timeline from one local source. The
 * renderer neither decides edits nor accepts a proposal; it is deliberately
 * downstream of the immutable revision and stores a receipt back on it.
 */
export async function renderAcceptedTranscript(
  project: TranscriptEditorProject,
  input: RenderAcceptedTranscriptInput
): Promise<RenderAcceptedTranscriptResult> {
  if (!path.isAbsolute(input.outputPath)) throw new Error('Local render output requires an absolute path.');
  const outputPath = path.resolve(input.outputPath);
  const timeline = compileTranscriptTimeline(project);
  const clips = timeline.clips.filter((clip) => clip.kind === 'video');
  if (!clips.length) throw new Error('The accepted revision has no video clips to render.');
  const sourceAssetIds = new Set(clips.map((clip) => clip.sourceAssetId).filter(Boolean));
  if (sourceAssetIds.size !== 1) throw new Error('The local alpha renderer requires one source asset per accepted revision.');
  const source = project.sourceAssets.find((asset) => asset.id === [...sourceAssetIds][0]);
  if (!source || !source.uri.startsWith('file:')) throw new Error('The accepted revision source must be a local file URI.');
  const sourcePath = fileURLToPath(source.uri);
  if (path.resolve(sourcePath) === outputPath) throw new Error('Local render output cannot overwrite its source media.');
  const currentSource = await inspectLocalVideoSource({ id: source.id, filePath: sourcePath });
  if (currentSource.sha256 !== source.sha256) {
    throw new Error('Local source changed since import; re-intake is required before rendering.');
  }
  if (!source.media.hasAudio) throw new Error('The first local renderer requires a source audio stream.');
  const fps = input.fps ?? 30;
  if (!Number.isInteger(fps) || fps <= 0 || fps > 120) throw new Error('Render FPS must be a positive integer at most 120.');
  const rendererVersion = 'ffmpeg-local-v2';
  const timelineHash = stableHash(timeline);
  const captionSha256 = createHash('sha256').update(compileTranscriptSrt(project)).digest('hex');
  const cacheKey = stableHash({ captionSha256, fps, rendererVersion, sourceSha256: source.sha256, timelineHash });
  const request = {
    id: `render:${project.currentRevisionId}:${cacheKey.slice(0, 12)}:${stableHash({ outputPath, requestedAt: input.requestedAt }).slice(0, 8)}`,
    projectId: project.id,
    revisionId: project.currentRevisionId,
    compositionId: 'AtlasTranscriptTimeline' as const,
    compositionVersion: '1',
    rendererVersion,
    timelineHash,
    captionSha256,
    cacheKey,
    requestedAt: input.requestedAt,
    output: { path: outputPath, width: source.media.width, height: source.media.height, fps, codec: 'h264' as const }
  };
  const reusableReceipt = [...project.receipts].reverse().find((receipt) =>
    receipt.status === 'completed' &&
    receipt.request.cacheKey === cacheKey &&
    receipt.request.output.path === outputPath &&
    Boolean(receipt.outputSha256 && receipt.inspection)
  );
  if (reusableReceipt?.outputSha256 && reusableReceipt.inspection) {
    try {
      if (await sha256File(outputPath) === reusableReceipt.outputSha256) {
        const receipt: MediaRenderReceipt = {
          ...reusableReceipt,
          id: `receipt:${request.id}`,
          request,
          completedAt: new Date().toISOString(),
          cacheHit: true,
          outputSha256: reusableReceipt.outputSha256,
          inspection: reusableReceipt.inspection
        };
        return { project: { ...project, receipts: [...project.receipts, receipt] }, receipt };
      }
    } catch {
      // A missing or unreadable output cannot be reused; render it again below.
    }
  }

  const parts = clips.flatMap((clip, index) => {
    const start = (clip.sourceStartUs ?? 0) / 1_000_000;
    const end = (clip.sourceEndUs ?? 0) / 1_000_000;
    if (!(end > start)) throw new Error(`Accepted clip ${clip.id} has an invalid source range.`);
    return [
      `[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS[v${index}]`,
      `[0:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS[a${index}]`
    ];
  });
  const concatInputs = clips.map((_, index) => `[v${index}][a${index}]`).join('');
  const acceptedRevision = project.revisions.find((revision) => revision.id === project.currentRevisionId);
  if (!acceptedRevision) throw new Error(`Current transcript revision is missing: ${project.currentRevisionId}`);
  const textOverlays = acceptedRevision.overlays.filter((overlay) => overlay.kind === 'text' && overlay.text?.trim());
  const overlayFilters = textOverlays.map((overlay, index) => {
    const inputLabel = index === 0 ? '[timelinev]' : `[overlay${index - 1}]`;
    const outputLabel = `[overlay${index}]`;
    const start = overlay.startUs / 1_000_000;
    const end = overlay.endUs / 1_000_000;
    return `${inputLabel}drawtext=fontcolor=white:fontsize=24:text='${escapeDrawtext(overlay.text!.trim())}':x=(w-text_w)/2:y=h-(text_h*2):enable='between(t,${start},${end})'${outputLabel}`;
  });
  const videoOutputLabel = textOverlays.length ? `[overlay${textOverlays.length - 1}]` : '[timelinev]';
  const filter = `${parts.join(';')};${concatInputs}concat=n=${clips.length}:v=1:a=1[timelinev][outa]${overlayFilters.length ? `;${overlayFilters.join(';')}` : ''}`;
  await mkdir(path.dirname(outputPath), { recursive: true });
  await execFileAsync(
    'ffmpeg',
    ['-y', '-v', 'error', '-i', sourcePath, '-filter_complex', filter, '-map', videoOutputLabel, '-map', '[outa]', '-r', String(fps), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', outputPath],
    { maxBuffer: 1_024 * 1_024 }
  );
  const receipt: MediaRenderReceipt = {
    id: `receipt:${request.id}`,
    kind: 'render',
    status: 'completed',
    request,
    completedAt: new Date().toISOString(),
    cacheHit: false,
    outputSha256: await sha256File(outputPath),
    inspection: await inspectOutput(outputPath)
  };
  const next = { ...project, receipts: [...project.receipts, receipt] };
  return { project: next, receipt };
}

export type AtlasLocalRenderInput = {
  requestId: string;
  requestedAt: string;
  width?: number;
  height?: number;
  fps?: number;
};

type AtlasRemotionProps = {
  projectId: string;
  revisionId: string;
  durationInFrames: number;
  clips: Array<{ id: string; nodeId: string; kind: 'video' | 'caption' | 'overlay'; from: number; durationInFrames: number; label: string }>;
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function toFrames(microseconds: number, fps: number): number {
  return Math.max(1, Math.round((microseconds / 1_000_000) * fps));
}

/** Deterministic plan for the local renderer; this is provenance, not a model request. */
export function buildAtlasLocalRenderPlan(
  project: TranscriptEditorProject,
  input: AtlasLocalRenderInput,
  cwd = process.cwd()
): { props: AtlasRemotionProps; receipt: MediaRenderReceipt } {
  const width = input.width ?? project.sourceAssets[0]?.media.width ?? 1920;
  const height = input.height ?? project.sourceAssets[0]?.media.height ?? 1080;
  const fps = input.fps ?? 30;
  if (!Number.isInteger(width) || !Number.isInteger(height) || !Number.isInteger(fps) || width <= 0 || height <= 0 || fps <= 0) {
    throw new Error('Render dimensions and FPS must be positive integers.');
  }
  const timeline = compileTranscriptTimeline(project);
  const timelineHash = createHash('sha256').update(stableJson(timeline)).digest('hex');
  const captionSha256 = createHash('sha256').update(compileTranscriptSrt(project)).digest('hex');
  const cacheKey = createHash('sha256').update(stableJson({ projectId: project.id, revisionId: project.currentRevisionId, timelineHash, width, height, fps, rendererVersion: 'ffmpeg-local-v2' })).digest('hex');
  const outputPath = path.join(path.dirname(getAtlasMediaProjectPath(project.id, cwd)), 'renders', `${cacheKey}.mp4`);
  return {
    props: {
      projectId: project.id,
      revisionId: project.currentRevisionId,
      durationInFrames: toFrames(timeline.durationUs, fps),
      clips: timeline.clips.map((clip) => ({
        id: clip.id,
        nodeId: clip.nodeId ?? clip.id,
        kind: clip.kind,
        from: Math.round((clip.startUs / 1_000_000) * fps),
        durationInFrames: toFrames(clip.endUs - clip.startUs, fps),
        label: clip.kind === 'video' ? `Clip node ${clip.nodeId ?? clip.id}` : clip.kind
      }))
    },
    receipt: {
      id: `render_${input.requestId}`,
      kind: 'render',
      status: 'failed',
      request: {
        id: input.requestId,
        projectId: project.id,
        revisionId: project.currentRevisionId,
        compositionId: 'AtlasTranscriptTimeline',
        compositionVersion: '1',
        rendererVersion: 'ffmpeg-local-v2',
        timelineHash,
        captionSha256,
        cacheKey,
        requestedAt: input.requestedAt,
        output: { path: outputPath, width, height, fps, codec: 'h264' }
      },
      completedAt: input.requestedAt,
      cacheHit: false
    }
  };
}

export async function inspectAtlasLocalSourceAsset(sourcePath: string) {
  return inspectLocalVideoSource({ id: 'source-1', filePath: sourcePath });
}

export async function renderAtlasMediaProject(
  project: TranscriptEditorProject,
  input: AtlasLocalRenderInput,
  cwd = process.cwd()
): Promise<{ project: TranscriptEditorProject; receipt: MediaRenderReceipt }> {
  const plan = buildAtlasLocalRenderPlan(project, input, cwd);
  const cached = project.receipts.find((receipt) => receipt.status === 'completed' && receipt.request.cacheKey === plan.receipt.request.cacheKey);
  if (cached?.outputSha256 && existsSync(cached.request.output.path)) {
    if (await sha256File(cached.request.output.path) === cached.outputSha256) {
      const receipt = { ...cached, id: `render_${input.requestId}`, request: plan.receipt.request, completedAt: input.requestedAt, cacheHit: true };
      return { project: { ...project, receipts: [...project.receipts, receipt] }, receipt };
    }
  }
  return renderAcceptedTranscript(project, { outputPath: plan.receipt.request.output.path, requestedAt: input.requestedAt, fps: input.fps });
}

export async function renderAndPersistAtlasMediaProject(
  sessionId: string,
  input: AtlasLocalRenderInput,
  cwd = process.cwd()
): Promise<{ project: TranscriptEditorProject; receipt: MediaRenderReceipt }> {
  const project = await readAtlasMediaProject(sessionId, cwd);
  const rendered = await renderAtlasMediaProject(project, input, cwd);
  const written = await writeAtlasMediaProject(sessionId, rendered.project, cwd);
  return { project: written.project, receipt: rendered.receipt };
}

export async function startAtlasLocalAssetServer(project: TranscriptEditorProject): Promise<{
  sourceUrls: Map<string, string>;
  close: () => Promise<void>;
}> {
  const sourcePaths = new Map(
    project.sourceAssets
      .filter((asset) => asset.uri.startsWith('file:'))
      .map((asset) => [asset.id, fileURLToPath(asset.uri)])
  );
  const server = http.createServer(async (request, response) => {
    const id = new URL(request.url ?? '/', 'http://127.0.0.1').pathname.replace(/^\/asset\//, '');
    const filePath = sourcePaths.get(id);
    if (!filePath) { response.writeHead(404).end(); return; }
    const body = await readFile(filePath);
    const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]);
      const end = range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
      response.writeHead(206, { 'content-length': end - start + 1, 'content-range': `bytes ${start}-${end}/${body.length}` }).end(body.subarray(start, end + 1));
      return;
    }
    response.writeHead(200, { 'content-length': body.length }).end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not start local asset server.');
  return {
    sourceUrls: new Map([...sourcePaths.keys()].map((id) => [id, `http://127.0.0.1:${address.port}/asset/${encodeURIComponent(id)}`])),
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  };
}
