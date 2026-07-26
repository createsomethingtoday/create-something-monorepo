import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';
import { capturedFilmAnalysisSchema } from '../src/lib/film.js';
import { FILM_PLAY_REVIEW_PROFILE, filmPlayReviewPacketSchema } from '../src/lib/film-play-review.js';

const run = promisify(execFile);
const OUTPUT_WIDTH = 960;
const OUTPUT_HEIGHT = 540;
const PIXEL_WIDTH = 160;
const PIXEL_HEIGHT = 90;

const definitionSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  startMs: z.number().int().nonnegative(),
  representativeTimeMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  possession: z.enum(['teammate', 'opponent', 'dead-ball', 'unknown']),
  phase: z.enum(['half-court-offense', 'half-court-defense', 'transition-offense', 'transition-defense', 'baseline-inbound-defense', 'dead-ball']),
  position: z.string().trim().min(1),
  observation: z.string().trim().min(1),
  interpretation: z.string().trim().min(1),
  limitation: z.string().trim().min(1)
});

function argument(name: string, fallback?: string) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : fallback;
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

const analysisPath = resolve(argument('--analysis'));
const sourcePath = resolve(argument('--source'));
const definitionsPath = resolve(argument('--definitions'));
const outputPath = resolve(argument('--output'));
const imageDirectory = process.argv.includes('--image-dir') ? resolve(argument('--image-dir')) : undefined;
const fontPath = resolve(argument('--font', 'static/fonts/IBMPlexMono-Bold.otf'));

const analysis = capturedFilmAnalysisSchema.parse(JSON.parse(await readFile(analysisPath, 'utf8')));
const definitions = z.array(definitionSchema).min(1).max(12).parse(JSON.parse(await readFile(definitionsPath, 'utf8')));
const tempDirectory = await mkdtemp(join(tmpdir(), 'guard-film-review-'));

try {
  const cards = [];
  for (const definition of definitions) {
    const frame = analysis.frames
      .filter((candidate) => Math.abs(candidate.timeMs - definition.representativeTimeMs) <= 500)
      .toSorted((a, b) => Math.abs(a.timeMs - definition.representativeTimeMs) - Math.abs(b.timeMs - definition.representativeTimeMs))[0];
    const target = frame?.players.find((player) => player.team === 'target');
    if (!frame || frame.targetStatus !== 'resolved' || !target?.image) {
      throw new Error(`${definition.id} requires a resolved #13 source frame within 500ms of ${definition.representativeTimeMs}ms.`);
    }

    const [normalizedX, normalizedY] = target.image;
    if (normalizedX < 0 || normalizedX > 1 || normalizedY < 0 || normalizedY > 1) throw new Error(`${definition.id} contains an invalid target image point.`);
    const markerX = Math.max(0, Math.min(OUTPUT_WIDTH - 52, Math.round(normalizedX * OUTPUT_WIDTH) - 26));
    const markerY = Math.max(0, Math.min(OUTPUT_HEIGHT - 38, Math.round(normalizedY * OUTPUT_HEIGHT) - 19));
    const imagePath = join(tempDirectory, `${definition.id}.webp`);
    const filter = [
      `scale=${PIXEL_WIDTH}:${PIXEL_HEIGHT}:flags=area`,
      `scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:flags=neighbor`,
      `drawbox=x=${markerX}:y=${markerY}:w=52:h=38:color=0xe54800@0.96:t=fill`,
      `drawbox=x=${markerX}:y=${markerY}:w=52:h=38:color=white@0.95:t=2`,
      `drawtext=fontfile=${fontPath}:text=13:fontcolor=white:fontsize=23:x=${markerX + 10}:y=${markerY + 5}`
    ].join(',');
    await run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-ss', (frame.timeMs / 1000).toFixed(3), '-i', sourcePath,
      '-frames:v', '1', '-vf', filter, '-c:v', 'libwebp', '-quality', '78', '-y', imagePath
    ]);

    const bytes = await readFile(imagePath);
    if (imageDirectory) {
      await mkdir(imageDirectory, { recursive: true });
      await writeFile(join(imageDirectory, basename(imagePath)), bytes);
    }
    cards.push({
      ...definition,
      representativeTimeMs: frame.timeMs,
      image: {
        mediaType: 'image/webp' as const,
        dataUrl: `data:image/webp;base64,${bytes.toString('base64')}`,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        width: OUTPUT_WIDTH as const,
        height: OUTPUT_HEIGHT as const,
        anonymization: {
          method: 'whole-frame-pixelation-v1' as const,
          sourceWidth: analysis.source.width,
          sourceHeight: analysis.source.height,
          pixelWidth: PIXEL_WIDTH,
          pixelHeight: PIXEL_HEIGHT,
          rawSourceIncluded: false as const,
          marker: { label: '13' as const, style: 'synthetic-orange-v1' as const, normalizedPoint: target.image }
        }
      }
    });
  }

  const packet = filmPlayReviewPacketSchema.parse({
    version: 1,
    profile: FILM_PLAY_REVIEW_PROFILE,
    sourceSha256: analysis.source.sha256,
    analysisRevision: analysis.analysis.revision,
    analysisExecutionCount: analysis.analysis.executionCount,
    reviewer: 'codex',
    reviewedAt: new Date().toISOString(),
    cards
  });
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    ok: true,
    outputPath,
    sourceSha256: packet.sourceSha256,
    analysisRevision: packet.analysisRevision,
    analysisExecutionCount: packet.analysisExecutionCount,
    cardCount: packet.cards.length,
    embeddedBytes: packet.cards.reduce((sum, card) => sum + Buffer.from(card.image.dataUrl.split(',')[1]!, 'base64').byteLength, 0),
    anonymization: 'whole-frame-pixelation-v1',
    rawSourceIncluded: false
  }, null, 2));
} finally {
  await rm(tempDirectory, { recursive: true, force: true });
}
