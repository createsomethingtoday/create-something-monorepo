import { z } from 'zod';

export const FILM_BENCHMARK_PROFILE = 'guard-player-trace-v1';

const pointSchema = z.tuple([z.number(), z.number()]);
const targetSchema = z.object({
  status: z.enum(['visible', 'occluded', 'out-of-frame', 'unresolved']),
  court: pointSchema.optional(),
  zone: z.string().optional(),
  trackId: z.string().optional(),
  provenance: z.enum(['manual', 'model', 'corrected']).default('manual')
});
const annotationSchema = z.object({ timeMs: z.number().int().nonnegative(), target: targetSchema });
const clipSchema = z.object({ id: z.string(), startMs: z.number().int(), endMs: z.number().int(), annotations: z.array(annotationSchema) });
export const filmBenchmarkSchema = z.object({ profile: z.literal(FILM_BENCHMARK_PROFILE), clips: z.array(clipSchema) });

export const filmSourceSchema = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  durationMs: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().positive(),
  byteSize: z.number().int().positive(),
  linkedPath: z.string().min(1)
});

const requiredClips = [
  { id: 'clear-half-court', startMs: 235000, endMs: 255000 },
  { id: 'transition-wide', startMs: 1700000, endMs: 1720000 },
  { id: 'pan-occlusion', startMs: 2325000, endMs: 2345000 }
] as const;

export function validateFilmBenchmark(input: unknown) {
  const parsed = filmBenchmarkSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, issues: parsed.error.issues.map((issue) => issue.message), sampleCount: 0 };
  const issues: string[] = [];
  let sampleCount = 0;
  for (const required of requiredClips) {
    const clip = parsed.data.clips.find((candidate) => candidate.id === required.id);
    if (!clip) { issues.push(`Missing required clip: ${required.id}.`); continue; }
    if (clip.startMs !== required.startMs || clip.endMs !== required.endMs) issues.push(`${required.id} must use ${required.startMs}-${required.endMs}ms.`);
    if (clip.annotations.length < 20) issues.push(`${required.id} requires at least 20 annotations.`);
    sampleCount += clip.annotations.length;
  }
  return { ok: issues.length === 0, issues, sampleCount };
}

const benchmarkPredictionSchema = z.object({
  timeMs: z.number().int().nonnegative(),
  targetStatus: z.enum(['resolved', 'unresolved', 'out-of-frame']),
  targetTrackId: z.string().optional(),
  court: pointSchema.optional(),
  zone: z.string().optional(),
  provenance: z.enum(['model', 'corrected']),
  corrected: z.boolean().optional(),
  correctionId: z.string().optional()
});

type BenchmarkPrediction = z.infer<typeof benchmarkPredictionSchema>;

function percentile(values: number[], fraction: number) {
  if (!values.length) return Number.POSITIVE_INFINITY;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]!;
}

export function scoreFilmBenchmark(benchmarkInput: unknown, predictionInput: unknown) {
  const benchmarkValidation = validateFilmBenchmark(benchmarkInput);
  const predictionsParsed = z.array(benchmarkPredictionSchema).safeParse(predictionInput);
  const issues = [...benchmarkValidation.issues];
  if (!predictionsParsed.success) {
    return { ok: false as const, issues: [...issues, ...predictionsParsed.error.issues.map((issue) => issue.message)], visibleAccuracy: 0, medianCourtErrorFeet: Number.POSITIVE_INFINITY, p95CourtErrorFeet: Number.POSITIVE_INFINITY, zoneAccuracy: 0, silentIdentitySwitches: 0 };
  }
  const benchmark = filmBenchmarkSchema.parse(benchmarkInput);
  const predictions = predictionsParsed.data;
  const visibleSamples = benchmark.clips.flatMap((clip) => clip.annotations).filter((annotation) => annotation.target.status === 'visible');
  const allSamples = benchmark.clips.flatMap((clip) => clip.annotations);
  const matched = visibleSamples.map((annotation) => {
    const candidates = predictions.filter((prediction) => Math.abs(prediction.timeMs - annotation.timeMs) <= 500);
    const prediction = candidates.sort((a, b) => Math.abs(a.timeMs - annotation.timeMs) - Math.abs(b.timeMs - annotation.timeMs))[0];
    return { annotation, prediction };
  });
  const correctIdentity = matched.filter(({ annotation, prediction }) => prediction?.targetStatus === 'resolved' && prediction.targetTrackId === annotation.target.trackId).length;
  const visibleAccuracy = visibleSamples.length ? correctIdentity / visibleSamples.length : 0;
  const courtErrors = matched.flatMap(({ annotation, prediction }) => {
    if (!annotation.target.court || !prediction?.court || prediction.targetStatus !== 'resolved') return [];
    return [Math.hypot(prediction.court[0] - annotation.target.court[0], prediction.court[1] - annotation.target.court[1])];
  });
  const medianCourtErrorFeet = percentile(courtErrors, 0.5);
  const p95CourtErrorFeet = percentile(courtErrors, 0.95);
  const zoned = matched.filter(({ annotation }) => annotation.target.zone);
  const zoneAccuracy = zoned.length ? zoned.filter(({ annotation, prediction }) => prediction?.zone === annotation.target.zone).length / zoned.length : 0;
  const statusAccuracy = allSamples.length ? allSamples.filter((annotation) => {
    const prediction = predictions.filter((candidate) => Math.abs(candidate.timeMs - annotation.timeMs) <= 500).sort((a, b) => Math.abs(a.timeMs - annotation.timeMs) - Math.abs(b.timeMs - annotation.timeMs))[0];
    const expected = annotation.target.status === 'visible' ? 'resolved' : annotation.target.status === 'out-of-frame' ? 'out-of-frame' : 'unresolved';
    return prediction?.targetStatus === expected;
  }).length / allSamples.length : 0;

  let silentIdentitySwitches = 0;
  for (const clip of benchmark.clips) {
    let wrongSince: number | undefined;
    for (const annotation of clip.annotations.filter((item) => item.target.status === 'visible').sort((a, b) => a.timeMs - b.timeMs)) {
      const prediction = predictions.find((candidate) => Math.abs(candidate.timeMs - annotation.timeMs) <= 500);
      const wrong = prediction?.targetStatus === 'resolved' && prediction.targetTrackId !== annotation.target.trackId;
      if (wrong && wrongSince === undefined) wrongSince = annotation.timeMs;
      if (!wrong && wrongSince !== undefined) {
        if (annotation.timeMs - wrongSince > 500) silentIdentitySwitches += 1;
        wrongSince = undefined;
      }
    }
    if (wrongSince !== undefined && clip.endMs - wrongSince > 500) silentIdentitySwitches += 1;
  }

  const unprovenCorrections = predictions.filter((prediction) => prediction.corrected && (prediction.provenance !== 'corrected' || !prediction.correctionId));
  if (visibleAccuracy < 0.95) issues.push(`Visible target accuracy ${Math.round(visibleAccuracy * 1000) / 10}% is below 95%.`);
  if (silentIdentitySwitches > 0) issues.push(`${silentIdentitySwitches} silent identity switch interval(s) exceeded 0.5 seconds.`);
  if (medianCourtErrorFeet > 2) issues.push(`The median court error ${medianCourtErrorFeet}ft exceeds 2ft.`);
  if (p95CourtErrorFeet > 4) issues.push(`The p95 court error ${p95CourtErrorFeet}ft exceeds 4ft.`);
  if (zoneAccuracy < 0.95) issues.push(`Zone accuracy ${Math.round(zoneAccuracy * 1000) / 10}% is below 95%.`);
  if (statusAccuracy < 0.95) issues.push(`Target status accuracy ${Math.round(statusAccuracy * 1000) / 10}% is below 95%.`);
  if (unprovenCorrections.length) issues.push(`Correction provenance is missing for ${unprovenCorrections.length} prediction(s).`);
  return { ok: issues.length === 0, issues, visibleAccuracy, medianCourtErrorFeet, p95CourtErrorFeet, zoneAccuracy, statusAccuracy, silentIdentitySwitches };
}

const capturedPlayerSchema = z.object({
  trackId: z.string().min(1),
  team: z.enum(['target', 'teammate', 'opponent']),
  court: pointSchema,
  confidence: z.number().min(0).max(1),
  provenance: z.enum(['model', 'corrected']).default('model'),
  correctionId: z.string().optional(),
  image: pointSchema.optional(),
  projection: z.enum(['estimated', 'calibrated']).optional(),
  zone: z.string().optional()
}).passthrough();
const capturedFrameSchema = z.object({
  timeMs: z.number().int().nonnegative(),
  targetStatus: z.enum(['resolved', 'unresolved', 'out-of-frame']).default('resolved'),
  players: z.array(capturedPlayerSchema),
  pan: z.object({ offsetPixels: z.number(), confidence: z.number().min(0).max(1) }).optional()
}).passthrough();

export const capturedFilmAnalysisSchema = z.object({
  version: z.literal(1),
  source: filmSourceSchema,
  profile: z.literal(FILM_BENCHMARK_PROFILE),
  analysis: z.object({ revision: z.literal(1), executionCount: z.literal(1), analyzedAt: z.string().min(1) }).passthrough(),
  frames: z.array(capturedFrameSchema)
}).passthrough();

export type CapturedPlayer = z.infer<typeof capturedPlayerSchema>;
export type CapturedFrame = z.infer<typeof capturedFrameSchema>;
export type CapturedFilmAnalysis = z.infer<typeof capturedFilmAnalysisSchema>;
export const filmCorrectionSchema = z.object({
  id: z.string().min(1),
  timeMs: z.number().int().nonnegative(),
  trackId: z.string().min(1).default('13'),
  court: pointSchema.nullable(),
  targetStatus: z.enum(['resolved', 'unresolved', 'out-of-frame']).optional(),
  reason: z.string().trim().min(1).max(800),
  createdAt: z.string().min(1)
});
export type FilmCorrection = z.infer<typeof filmCorrectionSchema>;
export type FilmCorrectionDraft = Pick<FilmCorrection, 'timeMs' | 'court' | 'targetStatus' | 'reason'> & Partial<Pick<FilmCorrection, 'trackId'>>;

export function captureFilmAnalysis(input: { source: unknown; frames: unknown; analyzedAt?: string }): CapturedFilmAnalysis {
  const source = filmSourceSchema.parse(input.source);
  const frames = z.array(capturedFrameSchema).parse(input.frames).sort((a, b) => a.timeMs - b.timeMs);
  return capturedFilmAnalysisSchema.parse({ version: 1, source, profile: FILM_BENCHMARK_PROFILE, analysis: { revision: 1, executionCount: 1, analyzedAt: input.analyzedAt ?? new Date().toISOString() }, frames });
}

export function filmFrameAt(analysis: CapturedFilmAnalysis, timeMs: number): CapturedFrame | undefined {
  let frame: CapturedFrame | undefined;
  for (const candidate of analysis.frames) {
    if (candidate.timeMs > timeMs) break;
    frame = candidate;
  }
  return frame;
}

export function filmZone(court: [number, number]) {
  const side = court[0] < 47 ? 'left' : 'right';
  const band = court[1] < 50 / 3 ? 'near' : court[1] > 100 / 3 ? 'far' : 'middle';
  return `${side}-${band}`;
}

export function applyFilmCorrections(analysis: CapturedFilmAnalysis & { corrections?: FilmCorrection[] }): CapturedFilmAnalysis {
  const corrections = z.array(filmCorrectionSchema).parse(analysis.corrections ?? []);
  const frames = analysis.frames.map((frame) => ({ ...frame, players: frame.players.map((player) => ({ ...player, court: [...player.court] as [number, number] })) }));
  for (const correction of corrections) {
    const frame = frames.reduce<CapturedFrame | undefined>((nearest, candidate) => {
      if (!nearest) return candidate;
      return Math.abs(candidate.timeMs - correction.timeMs) < Math.abs(nearest.timeMs - correction.timeMs) ? candidate : nearest;
    }, undefined);
    if (!frame || Math.abs(frame.timeMs - correction.timeMs) > 500) continue;
    const status = correction.targetStatus ?? (correction.court ? 'resolved' : 'unresolved');
    frame.targetStatus = status;
    frame.players = frame.players.filter((player) => player.team !== 'target');
    if (status === 'resolved' && correction.court) {
      frame.players.push({ trackId: correction.trackId, team: 'target', court: correction.court, confidence: 1, provenance: 'corrected', correctionId: correction.id, projection: 'calibrated', zone: filmZone(correction.court) });
    }
  }
  return capturedFilmAnalysisSchema.parse({ ...analysis, frames });
}

function interpolatePlayer(before: CapturedPlayer, after: CapturedPlayer, ratio: number): CapturedPlayer {
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return {
    ...before,
    court: [round(before.court[0] + (after.court[0] - before.court[0]) * ratio), round(before.court[1] + (after.court[1] - before.court[1]) * ratio)],
    confidence: Math.min(before.confidence, after.confidence),
    provenance: before.provenance === 'corrected' || after.provenance === 'corrected' ? 'corrected' : 'model'
  };
}

export function resolveFilmTrafficAt(analysis: CapturedFilmAnalysis, requestedTimeMs: number, wakeMs = 5000) {
  const timeMs = Math.max(0, Math.min(requestedTimeMs, analysis.source.durationMs));
  const beforeIndex = analysis.frames.findLastIndex((frame) => frame.timeMs <= timeMs);
  const before = analysis.frames[beforeIndex];
  const after = analysis.frames.slice(beforeIndex + 1).find((frame) => frame.timeMs >= timeMs);
  let players = before?.players ?? [];
  if (before && after && before.targetStatus === 'resolved' && after.targetStatus === 'resolved' && after.timeMs > before.timeMs) {
    const ratio = (timeMs - before.timeMs) / (after.timeMs - before.timeMs);
    players = before.players.flatMap((player) => {
      const next = after.players.find((candidate) => candidate.trackId === player.trackId);
      return next ? [interpolatePlayer(player, next, ratio)] : [player];
    });
  }
  const targetWake: Array<Array<{ timeMs: number; court: [number, number] }>> = [];
  let segment: Array<{ timeMs: number; court: [number, number] }> = [];
  for (const frame of analysis.frames) {
    if (frame.timeMs < timeMs - wakeMs || frame.timeMs > timeMs) continue;
    const target = frame.targetStatus === 'resolved' ? frame.players.find((player) => player.team === 'target') : undefined;
    if (!target) { if (segment.length) targetWake.push(segment); segment = []; continue; }
    segment.push({ timeMs: frame.timeMs, court: target.court });
  }
  const currentTarget = players.find((player) => player.team === 'target');
  if (currentTarget && (!segment.length || segment.at(-1)?.timeMs !== timeMs)) segment.push({ timeMs, court: currentTarget.court });
  if (segment.length) targetWake.push(segment);
  return { timeMs, players, targetWake, analysisRevision: analysis.analysis.revision };
}
