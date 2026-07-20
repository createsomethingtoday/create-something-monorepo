import { z } from 'zod';
import { courtZone } from './court.js';

export const FILM_BENCHMARK_PROFILE = 'guard-player-trace-v1';
export const FILM_TEAM_BENCHMARK_PROFILE = 'guard-player-team-benchmark-v2';
export const FILM_IDENTITY_BENCHMARK_PROFILE = 'guard-player-13-identity-v3';
export const FILM_MASK_TRACK_PROFILE = 'guard-player-mask-track-v1';
export const FILM_PLAY_STATE_PROFILE = 'guard-player-play-state-v1';
export const FILM_IMPORT_GATE_PROFILE = 'guard-film-import-gate-v1';

const pointSchema = z.tuple([z.number(), z.number()]);
const capturedTargetStatusSchema = z.enum(['resolved', 'unresolved', 'out-of-frame', 'inactive']);
export const filmPlayStateSchema = z.enum([
  'live-offense',
  'live-defense',
  'transition-offense',
  'transition-defense',
  'dead-ball',
  'free-throw',
  'substitution',
  'unknown'
]);
const filmPlayStateEvidenceSchema = z.object({
  intervalId: z.string().min(1),
  method: z.enum(['source-review', 'unreviewed']),
  reviewer: z.enum(['user', 'codex']),
  note: z.string().trim().min(1)
});
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
  targetStatus: z.enum(['resolved', 'unresolved', 'out-of-frame', 'inactive']),
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

const teamRoleSchema = z.enum(['teammate', 'opponent', 'ignore']);
const courtMembershipSchema = z.enum(['foreground-court', 'opposite-court']);
const cropBoundsSchema = z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative(), z.number().int().positive(), z.number().int().positive()]);
const maskTrackSampleSchema = z.object({
  timeMs: z.number().int().nonnegative(),
  box: cropBoundsSchema,
  foot: pointSchema,
  confidence: z.number().min(0).max(1),
  provenance: z.enum(['seed', 'propagated', 'reviewed'])
});
export const filmMaskTrackSchema = z.object({
  version: z.literal(1),
  profile: z.literal(FILM_MASK_TRACK_PROFILE),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  coordinateSpace: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
  engine: z.object({
    name: z.string().min(1),
    model: z.string().min(1),
    modelSha256: z.string().regex(/^[a-f0-9]{64}$/),
    device: z.string().min(1).optional()
  }),
  participation: z.array(z.object({
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().nonnegative(),
    state: z.enum(['active', 'inactive', 'unknown', 'out-of-frame']),
    evidence: z.string().trim().min(1)
  })),
  segments: z.array(z.object({
    id: z.string().min(1),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().nonnegative(),
    seed: z.object({ timeMs: z.number().int().nonnegative(), box: cropBoundsSchema, reviewer: z.enum(['user', 'codex']) }),
    samples: z.array(maskTrackSampleSchema)
  }))
});

export function validateFilmMaskTrack(input: unknown) {
  const parsed = filmMaskTrackSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, issues: parsed.error.issues.map((issue) => issue.message), segmentCount: 0, sampleCount: 0 };
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const segment of parsed.data.segments) {
    if (ids.has(segment.id)) issues.push(`Duplicate mask segment id: ${segment.id}.`);
    ids.add(segment.id);
    if (segment.endMs < segment.startMs) issues.push(`${segment.id} ends before it starts.`);
    if (segment.seed.timeMs < segment.startMs || segment.seed.timeMs > segment.endMs) issues.push(`${segment.id} seed is outside its segment.`);
    if (!segment.samples.some((sample) => sample.timeMs === segment.seed.timeMs && sample.provenance === 'seed')) issues.push(`${segment.id} requires a seed sample at the reviewed seed frame.`);
    if (segment.samples.some((sample) => sample.timeMs < segment.startMs || sample.timeMs > segment.endMs)) issues.push(`${segment.id} contains a sample outside its segment.`);
  }
  const participation = [...parsed.data.participation].sort((a, b) => a.startMs - b.startMs);
  for (let index = 0; index < participation.length; index += 1) {
    const interval = participation[index]!;
    if (interval.endMs < interval.startMs) issues.push(`Participation interval ${index + 1} ends before it starts.`);
    if (index > 0 && interval.startMs <= participation[index - 1]!.endMs) issues.push(`Participation interval ${index + 1} overlaps the prior interval.`);
  }
  const sampleCount = parsed.data.segments.reduce((count, segment) => count + segment.samples.length, 0);
  return { ok: issues.length === 0, issues, segmentCount: parsed.data.segments.length, sampleCount };
}

export function combineFilmMaskTracks(inputs: unknown[]) {
  if (inputs.length === 0) throw new Error('At least one reviewed mask track is required.');
  const tracks = inputs.map((input, index) => {
    const validation = validateFilmMaskTrack(input);
    if (!validation.ok) throw new Error(`Invalid mask track ${index + 1}: ${validation.issues.join(' ')}`);
    return filmMaskTrackSchema.parse(input);
  });
  const first = tracks[0]!;
  for (const track of tracks.slice(1)) {
    if (track.sourceSha256 !== first.sourceSha256) throw new Error('Mask track source receipts do not match.');
    if (track.coordinateSpace.width !== first.coordinateSpace.width || track.coordinateSpace.height !== first.coordinateSpace.height) throw new Error('Mask track coordinate spaces do not match.');
    if (track.engine.name !== first.engine.name || track.engine.model !== first.engine.model || track.engine.modelSha256 !== first.engine.modelSha256) throw new Error('Mask track model receipts do not match.');
  }
  const participation: z.infer<typeof filmMaskTrackSchema>['participation'] = [];
  for (const interval of tracks.flatMap((track) => track.participation).toSorted((a, b) => a.startMs - b.startMs)) {
    const prior = participation.at(-1);
    if (!prior || interval.startMs > prior.endMs) {
      participation.push({ ...interval });
      continue;
    }
    if (interval.state !== prior.state) throw new Error('Overlapping mask participation receipts disagree about player state.');
    prior.endMs = Math.max(prior.endMs, interval.endMs);
    if (!prior.evidence.split('; ').includes(interval.evidence)) prior.evidence = `${prior.evidence}; ${interval.evidence}`;
  }
  const combined = {
    version: 1 as const,
    profile: FILM_MASK_TRACK_PROFILE,
    sourceSha256: first.sourceSha256,
    coordinateSpace: first.coordinateSpace,
    engine: first.engine,
    participation,
    segments: tracks.flatMap((track) => track.segments).toSorted((a, b) => a.startMs - b.startMs)
  };
  const validation = validateFilmMaskTrack(combined);
  if (!validation.ok) throw new Error(`Combined mask track is invalid: ${validation.issues.join(' ')}`);
  return combined;
}

export function reviewFilmMaskTrackStint(
  input: unknown,
  review: { segmentId: string; startMs: number; endMs: number; evidence: string }
) {
  const validation = validateFilmMaskTrack(input);
  if (!validation.ok) throw new Error(`Invalid diagnostic mask track: ${validation.issues.join(' ')}`);
  const track = filmMaskTrackSchema.parse(input);
  if (!review.segmentId.trim() || !review.evidence.trim()) throw new Error('A reviewed mask stint requires an id and visible source evidence.');
  if (review.endMs < review.startMs) throw new Error('A reviewed mask stint ends before it starts.');
  const sourceSegment = track.segments.find((segment) => segment.seed.timeMs === review.startMs && segment.startMs <= review.startMs && segment.endMs >= review.endMs);
  if (!sourceSegment) throw new Error('A reviewed mask stint must start at the diagnostic run direct seed and remain inside that run.');
  const samples = sourceSegment.samples.filter((sample) => sample.timeMs >= review.startMs && sample.timeMs <= review.endMs);
  if (!samples.some((sample) => sample.timeMs === review.startMs && sample.provenance === 'seed')) throw new Error('A reviewed mask stint requires its direct seed sample.');
  const reviewed = {
    version: 1 as const,
    profile: FILM_MASK_TRACK_PROFILE,
    sourceSha256: track.sourceSha256,
    coordinateSpace: track.coordinateSpace,
    engine: track.engine,
    participation: [{ startMs: review.startMs, endMs: review.endMs, state: 'active' as const, evidence: review.evidence }],
    segments: [{
      id: review.segmentId,
      startMs: review.startMs,
      endMs: review.endMs,
      seed: sourceSegment.seed,
      samples
    }]
  };
  const reviewedValidation = validateFilmMaskTrack(reviewed);
  if (!reviewedValidation.ok) throw new Error(`Reviewed mask stint is invalid: ${reviewedValidation.issues.join(' ')}`);
  return filmMaskTrackSchema.parse(reviewed);
}
const teamAnnotationSchema = z.object({
  id: z.string().min(1),
  clipId: z.enum(['clear-half-court', 'transition-wide', 'pan-occlusion']),
  timeMs: z.number().int().nonnegative(),
  box: cropBoundsSchema,
  expectedRole: teamRoleSchema,
  courtMembership: courtMembershipSchema,
  ignoreReason: z.enum(['opposite-court', 'official', 'sideline-or-non-player-traffic']).nullable(),
  provenance: z.object({
    method: z.literal('manual-review'),
    detectorConfidence: z.number().min(0).max(1),
    cropBounds: cropBoundsSchema,
    legacyWholeBoxWhiteRatio: z.number().min(0).max(1),
    reviewCorrection: z.object({
      priorRole: teamRoleSchema,
      correctedRole: teamRoleSchema,
      reason: z.string().min(1)
    }).optional()
  })
});

export const filmTeamBenchmarkSchema = z.object({
  version: z.literal(1),
  profile: z.literal(FILM_TEAM_BENCHMARK_PROFILE),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  reviewRule: z.string().min(1),
  annotations: z.array(teamAnnotationSchema)
});

export function validateFilmTeamBenchmark(input: unknown) {
  const parsed = filmTeamBenchmarkSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, issues: parsed.error.issues.map((issue) => issue.message), sampleCount: 0 };
  const issues: string[] = [];
  const annotations = parsed.data.annotations;
  const countRole = (role: z.infer<typeof teamRoleSchema>) => annotations.filter((sample) => sample.expectedRole === role).length;
  const ids = new Set<string>();
  for (const annotation of annotations) {
    if (ids.has(annotation.id)) issues.push(`Duplicate team benchmark id: ${annotation.id}.`);
    ids.add(annotation.id);
    if (annotation.box.some((value, index) => value !== annotation.provenance.cropBounds[index])) issues.push(`${annotation.id} crop provenance does not match its reviewed bounds.`);
    if (annotation.provenance.reviewCorrection && annotation.provenance.reviewCorrection.correctedRole !== annotation.expectedRole) issues.push(`${annotation.id} review correction does not match the final expected role.`);
    if (annotation.courtMembership === 'opposite-court' && (annotation.expectedRole !== 'ignore' || annotation.ignoreReason !== 'opposite-court')) issues.push(`${annotation.id} opposite-court traffic must be labeled ignore with opposite-court provenance.`);
    if (annotation.expectedRole !== 'ignore' && annotation.ignoreReason !== null) issues.push(`${annotation.id} active player traffic cannot carry an ignore reason.`);
  }
  if (annotations.length < 60) issues.push('The team benchmark requires at least 60 real-source crops.');
  for (const clipId of ['clear-half-court', 'transition-wide', 'pan-occlusion'] as const) {
    if (!annotations.some((sample) => sample.clipId === clipId)) issues.push(`Missing required team benchmark clip: ${clipId}.`);
  }
  if (countRole('teammate') < 20) issues.push('The team benchmark requires at least 20 teammate crops.');
  if (countRole('opponent') < 20) issues.push('The team benchmark requires at least 20 opponent crops.');
  if (countRole('ignore') < 10) issues.push('The team benchmark requires at least 10 ignore crops.');
  if (annotations.filter((sample) => sample.courtMembership === 'opposite-court').length < 2) issues.push('The team benchmark requires explicit opposite-court negatives.');
  const regression = annotations.filter((sample) => sample.timeMs === 1698000);
  if (regression.filter((sample) => sample.expectedRole === 'teammate').length < 4 || regression.filter((sample) => sample.expectedRole === 'opponent').length < 4) issues.push('The 28:18 regression frame requires at least four teammate and four opponent crops.');
  return { ok: issues.length === 0, issues, sampleCount: annotations.length };
}

const teamPredictionSchema = z.object({
  id: z.string().min(1),
  predictedRole: teamRoleSchema,
  courtMembership: courtMembershipSchema,
  confidence: z.number().min(0).max(1),
  trackId: z.string().min(1).optional(),
  corrected: z.literal(false).optional()
});

export type FilmTeamPrediction = z.infer<typeof teamPredictionSchema>;

export function scoreFilmTeamBenchmark(benchmarkInput: unknown, predictionInput: unknown) {
  const benchmarkValidation = validateFilmTeamBenchmark(benchmarkInput);
  const parsedPredictions = z.array(teamPredictionSchema).safeParse(predictionInput);
  const issues = [...benchmarkValidation.issues];
  const empty = { ok: false as const, issues, teammateRecall: 0, opponentRecall: 0, ignoreRecall: 0, balancedAccuracy: 0, oppositeCourtRecall: 0, regressionCorrect: 0, confusionMatrix: { teammate: { teammate: 0, opponent: 0, ignore: 0 }, opponent: { teammate: 0, opponent: 0, ignore: 0 }, ignore: { teammate: 0, opponent: 0, ignore: 0 } } };
  if (!parsedPredictions.success) return { ...empty, issues: [...issues, ...parsedPredictions.error.issues.map((issue) => issue.message)] };
  const benchmark = filmTeamBenchmarkSchema.safeParse(benchmarkInput);
  if (!benchmark.success) return empty;
  const predictions = new Map(parsedPredictions.data.map((prediction) => [prediction.id, prediction]));
  const matrix = {
    teammate: { teammate: 0, opponent: 0, ignore: 0 },
    opponent: { teammate: 0, opponent: 0, ignore: 0 },
    ignore: { teammate: 0, opponent: 0, ignore: 0 }
  };
  for (const annotation of benchmark.data.annotations) {
    const prediction = predictions.get(annotation.id);
    if (!prediction) { issues.push(`Missing team prediction: ${annotation.id}.`); continue; }
    matrix[annotation.expectedRole][prediction.predictedRole] += 1;
  }
  const recall = (role: z.infer<typeof teamRoleSchema>) => {
    const row = matrix[role];
    const total = row.teammate + row.opponent + row.ignore;
    return total ? row[role] / total : 0;
  };
  const teammateRecall = recall('teammate');
  const opponentRecall = recall('opponent');
  const ignoreRecall = recall('ignore');
  const balancedAccuracy = (teammateRecall + opponentRecall + ignoreRecall) / 3;
  const opposite = benchmark.data.annotations.filter((sample) => sample.courtMembership === 'opposite-court');
  const oppositeCourtRecall = opposite.length ? opposite.filter((sample) => {
    const prediction = predictions.get(sample.id);
    return prediction?.predictedRole === 'ignore' && prediction.courtMembership === 'opposite-court';
  }).length / opposite.length : 0;
  const regression = benchmark.data.annotations.filter((sample) => sample.timeMs === 1698000 && (sample.expectedRole === 'teammate' || sample.expectedRole === 'opponent'));
  const regressionCorrect = regression.length ? regression.filter((sample) => predictions.get(sample.id)?.predictedRole === sample.expectedRole).length / regression.length : 0;
  if (teammateRecall < 0.95) issues.push(`Teammate recall ${Math.round(teammateRecall * 1000) / 10}% is below 95%.`);
  if (opponentRecall < 0.95) issues.push(`Opponent recall ${Math.round(opponentRecall * 1000) / 10}% is below 95%.`);
  if (ignoreRecall < 0.9) issues.push(`Ignore recall ${Math.round(ignoreRecall * 1000) / 10}% is below 90%.`);
  if (balancedAccuracy < 0.95) issues.push(`Team balanced accuracy ${Math.round(balancedAccuracy * 1000) / 10}% is below 95%.`);
  if (oppositeCourtRecall < 1) issues.push(`Opposite-court rejection ${Math.round(oppositeCourtRecall * 1000) / 10}% must be 100%.`);
  if (regressionCorrect < 1) issues.push(`The 28:18 team regression is ${Math.round(regressionCorrect * 1000) / 10}% and must be 100%.`);
  return { ok: issues.length === 0, issues, teammateRecall, opponentRecall, ignoreRecall, balancedAccuracy, oppositeCourtRecall, regressionCorrect, confusionMatrix: matrix };
}

const identityNegativeClassSchema = z.enum(['5', '11', '15', 'unreadable', 'substitution', 'tracker-handoff']);
const identityAnnotationSchema = z.object({
  id: z.string().min(1),
  segmentId: z.string().min(1),
  timeMs: z.number().int().nonnegative(),
  associationTimeMs: z.number().int().nonnegative(),
  trackId: z.string().min(1),
  cropBounds: cropBoundsSchema,
  courtMembership: z.literal('foreground-court'),
  expectedIdentity: z.enum(['13', 'not-13', 'unreadable']),
  visibleNumber: z.string().min(1),
  participation: z.enum(['active', 'inactive', 'unknown']),
  negativeClass: identityNegativeClassSchema.nullable(),
  provenance: z.object({
    method: z.enum(['direct-number-review', 'user-confirmed', 'bounded-continuity']),
    reviewer: z.enum(['user', 'codex']),
    cropBounds: cropBoundsSchema,
    sourceFrame: z.string().min(1),
    reviewNote: z.string().min(1).optional(),
    contextFrame: z.string().min(1).optional()
  })
});

export const filmIdentityBenchmarkSchema = z.object({
  version: z.literal(1),
  profile: z.literal(FILM_IDENTITY_BENCHMARK_PROFILE),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  derivedFromRevision: z.literal(2),
  personDetectionExecuted: z.literal(false),
  annotations: z.array(identityAnnotationSchema)
});

export function validateFilmIdentityBenchmark(input: unknown) {
  const parsed = filmIdentityBenchmarkSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, issues: parsed.error.issues.map((issue) => issue.message), positiveCount: 0, negativeCount: 0, positiveSegmentCount: 0, positiveDecisionCount: 0, negativeDecisionCount: 0 };
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const annotation of parsed.data.annotations) {
    if (ids.has(annotation.id)) issues.push(`Duplicate identity benchmark id: ${annotation.id}.`);
    ids.add(annotation.id);
    if (annotation.cropBounds.some((value, index) => value !== annotation.provenance.cropBounds[index])) issues.push(`${annotation.id} crop provenance does not match its reviewed bounds.`);
    if (annotation.expectedIdentity === '13' && annotation.participation === 'active' && (annotation.visibleNumber !== '13' || annotation.negativeClass !== null)) issues.push(`${annotation.id} active readable #13 evidence must be visibly numbered 13 and not a negative class.`);
    if (annotation.expectedIdentity === '13' && annotation.participation === 'inactive' && (annotation.visibleNumber !== '13' || annotation.negativeClass !== 'substitution')) issues.push(`${annotation.id} inactive #13 evidence must retain the visible identity and substitution provenance.`);
    if (annotation.expectedIdentity === '13' && annotation.participation === 'unknown') issues.push(`${annotation.id} #13 evidence cannot leave participation unknown.`);
    if (annotation.expectedIdentity !== '13' && annotation.negativeClass === null) issues.push(`${annotation.id} non-target evidence requires a hard-negative class.`);
    if (annotation.expectedIdentity !== '13' && annotation.negativeClass === 'substitution') issues.push(`${annotation.id} substitution evidence must preserve #13 identity while marking participation inactive.`);
  }
  const positive = parsed.data.annotations.filter((annotation) => annotation.expectedIdentity === '13' && annotation.visibleNumber === '13' && annotation.participation === 'active');
  const negative = parsed.data.annotations.filter((annotation) => annotation.expectedIdentity !== '13' || annotation.participation !== 'active');
  const positiveSegmentCount = new Set(positive.map((annotation) => annotation.segmentId)).size;
  const positiveDecisionCount = new Set(positive.map((annotation) => annotation.associationTimeMs)).size;
  const negativeDecisionCount = new Set(negative.map((annotation) => `${annotation.associationTimeMs}:${annotation.negativeClass}`)).size;
  if (positive.length < 30) issues.push('The identity benchmark requires at least 30 readable #13 crops.');
  if (positiveSegmentCount < 3) issues.push('The identity benchmark requires readable #13 evidence across at least three on-court segments.');
  if (positiveDecisionCount < 4) issues.push('The identity benchmark requires at least four unique positive association frames.');
  if (negative.length < 30) issues.push('The identity benchmark requires at least 30 hard-negative crops.');
  if (negativeDecisionCount < 6) issues.push('The identity benchmark requires at least six unique hard-negative decisions.');
  for (const negativeClass of identityNegativeClassSchema.options) {
    if (!negative.some((annotation) => annotation.negativeClass === negativeClass)) issues.push(`The identity benchmark is missing required ${negativeClass} hard-negative evidence.`);
  }
  return { ok: issues.length === 0, issues, positiveCount: positive.length, negativeCount: negative.length, positiveSegmentCount, positiveDecisionCount, negativeDecisionCount };
}

const identityPredictionSchema = z.object({
  id: z.string().min(1),
  predictedIdentity: z.enum(['13', 'not-13', 'unresolved']),
  targetStatus: capturedTargetStatusSchema,
  evidence: z.enum(['direct-number', 'bounded-continuity', 'substitution', 'none']),
  corrected: z.boolean().default(false)
});

export function scoreFilmIdentityBenchmark(benchmarkInput: unknown, predictionInput: unknown) {
  const validation = validateFilmIdentityBenchmark(benchmarkInput);
  const parsedBenchmark = filmIdentityBenchmarkSchema.safeParse(benchmarkInput);
  const parsedPredictions = z.array(identityPredictionSchema).safeParse(predictionInput);
  const issues = [...validation.issues];
  const empty = { ok: false as const, issues, positiveRecall: 0, hardNegativePrecision: 0, substitutionAccuracy: 0 };
  if (!parsedBenchmark.success) return empty;
  if (!parsedPredictions.success) return { ...empty, issues: [...issues, ...parsedPredictions.error.issues.map((issue) => issue.message)] };
  const predictions = new Map(parsedPredictions.data.map((prediction) => [prediction.id, prediction]));
  const positive = parsedBenchmark.data.annotations.filter((annotation) => annotation.expectedIdentity === '13' && annotation.participation === 'active');
  const negative = parsedBenchmark.data.annotations.filter((annotation) => annotation.expectedIdentity !== '13');
  const substitutions = parsedBenchmark.data.annotations.filter((annotation) => annotation.expectedIdentity === '13' && annotation.participation === 'inactive' && annotation.negativeClass === 'substitution');
  const group = <T>(items: T[], key: (item: T) => string | number) => {
    const grouped = new Map<string | number, T[]>();
    for (const item of items) grouped.set(key(item), [...(grouped.get(key(item)) ?? []), item]);
    return [...grouped.values()];
  };
  const positiveDecisions = group(positive, (annotation) => annotation.associationTimeMs);
  const negativeDecisions = group(negative, (annotation) => `${annotation.associationTimeMs}:${annotation.negativeClass}`);
  const substitutionDecisions = group(substitutions, (annotation) => annotation.associationTimeMs);
  for (const annotation of parsedBenchmark.data.annotations) {
    if (!predictions.has(annotation.id)) issues.push(`Missing identity prediction: ${annotation.id}.`);
  }
  const positiveRecall = positiveDecisions.length ? positiveDecisions.filter((decision) => decision.every((annotation) => {
    const prediction = predictions.get(annotation.id);
    return prediction?.predictedIdentity === '13' && prediction.targetStatus === 'resolved' && prediction.evidence !== 'none' && !prediction.corrected;
  })).length / positiveDecisions.length : 0;
  const hardNegativePrecision = negativeDecisions.length ? negativeDecisions.filter((decision) => decision.every((annotation) => predictions.get(annotation.id)?.predictedIdentity !== '13')).length / negativeDecisions.length : 0;
  const substitutionAccuracy = substitutionDecisions.length ? substitutionDecisions.filter((decision) => decision.every((annotation) => {
    const prediction = predictions.get(annotation.id);
    return prediction?.predictedIdentity === '13' && prediction?.targetStatus === 'inactive' && prediction.evidence !== 'none' && !prediction.corrected;
  })).length / substitutionDecisions.length : 0;
  const unprovenTargets = parsedPredictions.data.filter((prediction) => prediction.predictedIdentity === '13' && (!['resolved', 'inactive'].includes(prediction.targetStatus) || prediction.evidence === 'none' || prediction.corrected));
  if (positiveRecall < 0.95) issues.push(`Readable #13 recall ${Math.round(positiveRecall * 1000) / 10}% is below 95%.`);
  if (hardNegativePrecision < 1) issues.push(`Readable hard-negative precision ${Math.round(hardNegativePrecision * 1000) / 10}% must be 100%.`);
  if (substitutionAccuracy < 1) issues.push(`Verified substitution state accuracy ${Math.round(substitutionAccuracy * 1000) / 10}% must be 100%.`);
  if (unprovenTargets.length) issues.push(`${unprovenTargets.length} target prediction(s) lack direct-number or bounded-continuity evidence, use a correction, or are not resolved.`);
  return { ok: issues.length === 0, issues, positiveRecall, hardNegativePrecision, substitutionAccuracy };
}

const capturedPlayerSchema = z.object({
  trackId: z.string().min(1),
  team: z.enum(['target', 'teammate', 'opponent']),
  court: pointSchema,
  confidence: z.number().min(0).max(1),
  provenance: z.enum(['model', 'corrected']).default('model'),
  correctionId: z.string().optional(),
  image: pointSchema.optional(),
  cropBounds: cropBoundsSchema.optional(),
  projection: z.enum(['estimated', 'calibrated']).optional(),
  zone: z.string().optional(),
  courtMembership: z.literal('foreground-court').optional(),
  classification: z.record(z.unknown()).optional()
}).passthrough();
const ignoredDetectionSchema = z.object({
  trackId: z.string().min(1),
  role: z.literal('ignore'),
  image: pointSchema,
  confidence: z.number().min(0).max(1),
  courtMembership: z.enum(['foreground-court', 'opposite-court']),
  reason: z.string().min(1),
  classification: z.record(z.unknown())
}).passthrough();
const capturedFrameSchema = z.object({
  timeMs: z.number().int().nonnegative(),
  targetStatus: capturedTargetStatusSchema.default('resolved'),
  playState: filmPlayStateSchema.default('unknown'),
  playStateEvidence: filmPlayStateEvidenceSchema.optional(),
  players: z.array(capturedPlayerSchema),
  pan: z.object({ offsetPixels: z.number(), confidence: z.number().min(0).max(1) }).optional(),
  ignored: z.array(ignoredDetectionSchema).default([])
}).passthrough();

const filmIdentityPolicySchema = z.enum([
  'direct-number-or-bounded-continuity-fail-closed-v1',
  'segmentation-mask-direct-reseed-fail-closed-v1'
]);

const fullFlowVerificationSchema = z.object({
  profile: z.literal('guard-player-13-full-flow-v1'),
  sourceRevision: z.union([z.literal(1), z.literal(2)]),
  candidateFingerprint: z.string().min(1),
  analysisSha256: z.string().regex(/^[a-f0-9]{64}$/),
  participationSha256: z.string().regex(/^[a-f0-9]{64}$/),
  maskTrackSha256: z.string().regex(/^[a-f0-9]{64}$/),
  candidateSha256: z.string().regex(/^[a-f0-9]{64}$/),
  stateTotals: z.object({ frameCount: z.number().int().nonnegative(), resolved: z.number().int().nonnegative(), unresolved: z.number().int().nonnegative(), inactive: z.number().int().nonnegative(), outOfFrame: z.number().int().nonnegative() })
});

const promotableFullFlowReceiptSchema = z.object({
  profile: z.literal('guard-player-13-full-flow-v1'),
  ok: z.literal(true),
  promotable: z.literal(true),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  sourceRevision: z.union([z.literal(1), z.literal(2)]),
  candidateFingerprint: z.string().min(1),
  fingerprints: z.object({ analysisSha256: z.string().regex(/^[a-f0-9]{64}$/), participationSha256: z.string().regex(/^[a-f0-9]{64}$/), maskTrackSha256: z.string().regex(/^[a-f0-9]{64}$/), candidateSha256: z.string().regex(/^[a-f0-9]{64}$/) }),
  stateTotals: fullFlowVerificationSchema.shape.stateTotals
}).passthrough();

const capturedAnalysisReceiptSchema = z.object({
  revision: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  executionCount: z.literal(1),
  analyzedAt: z.string().min(1),
  derivedFromRevision: z.union([z.literal(1), z.literal(2)]).optional(),
  personDetectionExecuted: z.literal(false).optional(),
  identityExecutionCount: z.literal(1).optional(),
  identityPolicy: filmIdentityPolicySchema.optional(),
  identityVerification: z.object({
    benchmarkProfile: z.literal(FILM_IDENTITY_BENCHMARK_PROFILE),
    candidateFingerprint: z.string().min(1),
    positiveRecall: z.number().min(0.95),
    hardNegativePrecision: z.literal(1),
    substitutionAccuracy: z.literal(1),
    correctionOverlayCount: z.literal(0)
  }).optional(),
  fullFlowVerification: fullFlowVerificationSchema.optional(),
  playStateVerification: z.object({
    profile: z.literal(FILM_PLAY_STATE_PROFILE),
    ledgerFingerprint: z.string().min(1),
    intervalCount: z.number().int().positive(),
    frameCount: z.number().int().nonnegative(),
    liveFrameCount: z.number().int().nonnegative(),
    nonLiveFrameCount: z.number().int().nonnegative(),
    unknownFrameCount: z.number().int().nonnegative()
  }).optional()
}).passthrough().superRefine((receipt, context) => {
  if (receipt.revision !== 3) return;
  if (receipt.derivedFromRevision !== 2) context.addIssue({ code: z.ZodIssueCode.custom, path: ['derivedFromRevision'], message: 'Revision 3 must be derived from revision 2.' });
  if (receipt.personDetectionExecuted !== false) context.addIssue({ code: z.ZodIssueCode.custom, path: ['personDetectionExecuted'], message: 'Revision 3 must prove person detection was not executed.' });
  if (receipt.identityExecutionCount !== 1) context.addIssue({ code: z.ZodIssueCode.custom, path: ['identityExecutionCount'], message: 'Revision 3 requires exactly one identity execution.' });
  if (!receipt.identityVerification) context.addIssue({ code: z.ZodIssueCode.custom, path: ['identityVerification'], message: 'Revision 3 requires the locked identity verification receipt.' });
});

export const capturedFilmAnalysisSchema = z.object({
  version: z.literal(1),
  source: filmSourceSchema,
  profile: z.literal(FILM_BENCHMARK_PROFILE),
  analysis: capturedAnalysisReceiptSchema,
  frames: z.array(capturedFrameSchema)
}).passthrough();

export type CapturedPlayer = z.infer<typeof capturedPlayerSchema>;
export type CapturedFrame = z.infer<typeof capturedFrameSchema>;
export type CapturedFilmAnalysis = z.infer<typeof capturedFilmAnalysisSchema>;
export type FilmPlayState = z.infer<typeof filmPlayStateSchema>;

const filmPlayStateIntervalSchema = z.object({
  id: z.string().min(1),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  state: filmPlayStateSchema,
  evidence: z.object({
    method: z.enum(['source-review', 'unreviewed']),
    reviewer: z.enum(['user', 'codex']),
    note: z.string().trim().min(1)
  })
});

export const filmPlayStateLedgerSchema = z.object({
  version: z.literal(1),
  profile: z.literal(FILM_PLAY_STATE_PROFILE),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  intervals: z.array(filmPlayStateIntervalSchema).min(1)
});

function filmPlayStateLedgerFingerprint(ledger: z.infer<typeof filmPlayStateLedgerSchema>) {
  const text = JSON.stringify(ledger.intervals);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function applyFilmPlayStateLedger(analysisInput: unknown, ledgerInput: unknown): CapturedFilmAnalysis {
  const analysis = capturedFilmAnalysisSchema.parse(analysisInput);
  const ledger = filmPlayStateLedgerSchema.parse(ledgerInput);
  if (ledger.sourceSha256 !== analysis.source.sha256) throw new Error('Play-state ledger source hash does not match the captured film source hash.');
  const intervals = ledger.intervals.toSorted((a, b) => a.startMs - b.startMs);
  const ids = new Set<string>();
  for (let index = 0; index < intervals.length; index += 1) {
    const interval = intervals[index]!;
    if (ids.has(interval.id)) throw new Error(`Duplicate play-state interval id: ${interval.id}.`);
    ids.add(interval.id);
    if (interval.endMs < interval.startMs) throw new Error(`Play-state interval ${interval.id} ends before it starts.`);
    if (interval.state === 'unknown' && interval.evidence.method !== 'unreviewed') throw new Error(`Unknown play-state interval ${interval.id} must use unreviewed evidence.`);
    if (interval.state !== 'unknown' && interval.evidence.method !== 'source-review') throw new Error(`Reviewed play-state interval ${interval.id} requires source-review evidence.`);
    const expectedStart = index === 0 ? 0 : intervals[index - 1]!.endMs + 1;
    if (interval.startMs !== expectedStart) throw new Error(`Play-state ledger has a gap or overlap before ${interval.id}; expected ${expectedStart}ms and received ${interval.startMs}ms.`);
  }
  if (intervals.at(-1)!.endMs !== analysis.source.durationMs) throw new Error(`Play-state ledger has a gap after ${intervals.at(-1)!.endMs}ms; expected complete coverage through ${analysis.source.durationMs}ms.`);

  let intervalIndex = 0;
  const frames = analysis.frames.map((frame) => {
    while (intervalIndex < intervals.length - 1 && frame.timeMs > intervals[intervalIndex]!.endMs) intervalIndex += 1;
    const interval = intervals[intervalIndex]!;
    if (frame.timeMs < interval.startMs || frame.timeMs > interval.endMs) throw new Error(`Frame ${frame.timeMs}ms does not map to exactly one play-state interval.`);
    return {
      ...frame,
      playState: interval.state,
      playStateEvidence: { intervalId: interval.id, ...interval.evidence }
    };
  });
  const liveStates = new Set<FilmPlayState>(['live-offense', 'live-defense', 'transition-offense', 'transition-defense']);
  const liveFrameCount = frames.filter((frame) => liveStates.has(frame.playState)).length;
  const unknownFrameCount = frames.filter((frame) => frame.playState === 'unknown').length;
  return capturedFilmAnalysisSchema.parse({
    ...analysis,
    analysis: {
      ...analysis.analysis,
      playStateVerification: {
        profile: FILM_PLAY_STATE_PROFILE,
        ledgerFingerprint: filmPlayStateLedgerFingerprint(ledger),
        intervalCount: intervals.length,
        frameCount: frames.length,
        liveFrameCount,
        nonLiveFrameCount: frames.length - liveFrameCount - unknownFrameCount,
        unknownFrameCount
      }
    },
    frames
  });
}

function boxIntersectionOverUnion(first: [number, number, number, number], second: [number, number, number, number]) {
  const firstRight = first[0] + first[2];
  const firstBottom = first[1] + first[3];
  const secondRight = second[0] + second[2];
  const secondBottom = second[1] + second[3];
  const intersectionWidth = Math.max(0, Math.min(firstRight, secondRight) - Math.max(first[0], second[0]));
  const intersectionHeight = Math.max(0, Math.min(firstBottom, secondBottom) - Math.max(first[1], second[1]));
  const intersection = intersectionWidth * intersectionHeight;
  const union = first[2] * first[3] + second[2] * second[3] - intersection;
  return union ? intersection / union : 0;
}

export function fuseFilmMaskTrack(analysisInput: unknown, maskTrackInput: unknown) {
  const analysis = capturedFilmAnalysisSchema.parse(analysisInput);
  const validation = validateFilmMaskTrack(maskTrackInput);
  if (!validation.ok) throw new Error(`Invalid mask track: ${validation.issues.join(' ')}`);
  const maskTrack = filmMaskTrackSchema.parse(maskTrackInput);
  if (maskTrack.sourceSha256 !== analysis.source.sha256) throw new Error('Mask track source hash does not match the captured film source hash.');
  if (maskTrack.coordinateSpace.width !== analysis.source.width || maskTrack.coordinateSpace.height !== analysis.source.height) throw new Error('Mask track coordinate space does not match the captured film source dimensions.');

  const rawFrames = analysis.frames.map((frame) => {
    const players: CapturedPlayer[] = frame.players.map((player) => ({ ...player, team: player.team === 'target' ? 'teammate' : player.team }));
    const participation = maskTrack.participation.find((interval) => frame.timeMs >= interval.startMs && frame.timeMs <= interval.endMs);
    if (participation?.state === 'inactive') return { ...frame, targetStatus: 'inactive' as const, players, identityEvidence: { method: 'substitution-ledger', evidence: participation.evidence } };
    if (participation?.state === 'out-of-frame') return { ...frame, targetStatus: 'out-of-frame' as const, players, identityEvidence: { method: 'participation-ledger', evidence: participation.evidence } };
    if (!participation || participation.state === 'unknown') return { ...frame, targetStatus: 'unresolved' as const, players };

    const segment = maskTrack.segments.find((candidate) => frame.timeMs >= candidate.startMs && frame.timeMs <= candidate.endMs);
    const sample = segment?.samples.toSorted((a, b) => Math.abs(a.timeMs - frame.timeMs) - Math.abs(b.timeMs - frame.timeMs))[0];
    if (!segment || !sample || Math.abs(sample.timeMs - frame.timeMs) > 300 || sample.confidence < 0.7) return { ...frame, targetStatus: 'unresolved' as const, players };

    const overlaps = players.flatMap((player) => player.cropBounds ? [{ player, overlap: boxIntersectionOverUnion(player.cropBounds, sample.box) }] : []).toSorted((a, b) => b.overlap - a.overlap);
    let selected: CapturedPlayer | undefined;
    let association: 'crop-iou' | 'source-footpoint' | undefined;
    if (overlaps.length) {
      const best = overlaps[0]!;
      const runnerUp = overlaps[1];
      const rawRole = (best.player.classification as { role?: string } | undefined)?.role;
      if (best.player.team === 'teammate' && (!rawRole || rawRole === 'teammate') && best.overlap >= 0.35 && (!runnerUp || best.overlap - runnerUp.overlap >= 0.12)) {
        selected = best.player;
        association = 'crop-iou';
      }
    } else {
      const maskFoot: [number, number] = [sample.foot[0] / analysis.source.width, sample.foot[1] / analysis.source.height];
      const distances = players.flatMap((player) => player.image ? [{ player, distance: Math.hypot(player.image[0] - maskFoot[0], player.image[1] - maskFoot[1]) }] : []).toSorted((a, b) => a.distance - b.distance);
      const best = distances[0];
      const runnerUp = distances[1];
      const rawRole = (best?.player.classification as { role?: string } | undefined)?.role;
      if (best && best.player.team === 'teammate' && (!rawRole || rawRole === 'teammate') && best.distance <= 0.04 && (!runnerUp || runnerUp.distance - best.distance >= 0.02)) {
        selected = best.player;
        association = 'source-footpoint';
      }
    }
    if (!selected || !association) return { ...frame, targetStatus: 'unresolved' as const, players };
    selected.team = 'target';
    selected.confidence = Math.min(selected.confidence, sample.confidence);
    Object.assign(selected, { identity: '13', identityEvidence: { method: 'segmentation-mask', segmentId: segment.id, engine: maskTrack.engine.name, confidence: sample.confidence, association } });
    return { ...frame, targetStatus: 'resolved' as const, players, identityEvidence: { method: 'segmentation-mask', segmentId: segment.id, engine: maskTrack.engine.name, confidence: sample.confidence } };
  });
  const acceptedBySegment = new Map<string, number[]>();
  for (const frame of rawFrames) {
    const evidence = (frame as CapturedFrame & { identityEvidence?: { method?: string; segmentId?: string } }).identityEvidence;
    if (frame.targetStatus !== 'resolved' || evidence?.method !== 'segmentation-mask' || !evidence.segmentId) continue;
    acceptedBySegment.set(evidence.segmentId, [...(acceptedBySegment.get(evidence.segmentId) ?? []), frame.timeMs]);
  }
  const allowed = new Set<string>();
  const maximumAcceptedGapMs = 3500;
  for (const segment of maskTrack.segments) {
    const times = (acceptedBySegment.get(segment.id) ?? []).toSorted((a, b) => a - b);
    if (!times.length) continue;
    let anchorIndex = 0;
    for (let index = 1; index < times.length; index += 1) {
      if (Math.abs(times[index]! - segment.seed.timeMs) < Math.abs(times[anchorIndex]! - segment.seed.timeMs)) anchorIndex = index;
    }
    if (Math.abs(times[anchorIndex]! - segment.seed.timeMs) > maximumAcceptedGapMs) continue;
    allowed.add(`${segment.id}:${times[anchorIndex]}`);
    for (let index = anchorIndex - 1; index >= 0 && times[index + 1]! - times[index]! <= maximumAcceptedGapMs; index -= 1) allowed.add(`${segment.id}:${times[index]}`);
    for (let index = anchorIndex + 1; index < times.length && times[index]! - times[index - 1]! <= maximumAcceptedGapMs; index += 1) allowed.add(`${segment.id}:${times[index]}`);
  }
  const frames = rawFrames.map((frame) => {
    const evidence = (frame as CapturedFrame & { identityEvidence?: { method?: string; segmentId?: string } }).identityEvidence;
    if (frame.targetStatus !== 'resolved' || evidence?.method !== 'segmentation-mask' || !evidence.segmentId || allowed.has(`${evidence.segmentId}:${frame.timeMs}`)) return frame;
    const players = frame.players.map((player) => {
      if (player.team !== 'target') return player;
      const { identity: _identity, identityEvidence: _identityEvidence, identityPreviousRole: _identityPreviousRole, ...neutral } = player as CapturedPlayer & { identity?: string; identityEvidence?: unknown; identityPreviousRole?: unknown };
      return { ...neutral, team: 'teammate' as const };
    });
    const { identityEvidence: _identityEvidence, ...neutralFrame } = frame;
    return { ...neutralFrame, targetStatus: 'unresolved' as const, players };
  });
  return {
    version: 1 as const,
    source: analysis.source,
    profile: analysis.profile,
    derivedFromRevision: analysis.analysis.revision,
    personDetectionExecuted: false as const,
    identityPolicy: 'segmentation-mask-direct-reseed-fail-closed-v1' as const,
    maskTrack: {
      profile: maskTrack.profile,
      sourceSha256: maskTrack.sourceSha256,
      coordinateSpace: maskTrack.coordinateSpace,
      engine: maskTrack.engine,
      segmentCount: validation.segmentCount,
      sampleCount: validation.sampleCount
    },
    frames
  };
}
const identityAssignmentSchema = z.object({
  timeMs: z.number().int().nonnegative(),
  trackId: z.string().min(1).optional(),
  targetStatus: capturedTargetStatusSchema,
  evidence: z.object({
    method: z.enum(['direct-number', 'bounded-continuity', 'substitution']),
    anchorId: z.string().min(1)
  })
}).superRefine((assignment, context) => {
  if (assignment.targetStatus === 'resolved' && !assignment.trackId) context.addIssue({ code: z.ZodIssueCode.custom, path: ['trackId'], message: 'A resolved identity assignment requires an existing revision-2 track ID.' });
  if (assignment.targetStatus === 'resolved' && assignment.evidence.method === 'substitution') context.addIssue({ code: z.ZodIssueCode.custom, path: ['evidence'], message: 'A resolved target requires direct-number or bounded-continuity evidence.' });
  if (assignment.targetStatus === 'inactive' && assignment.evidence.method !== 'substitution') context.addIssue({ code: z.ZodIssueCode.custom, path: ['evidence'], message: 'Inactive identity state requires substitution evidence.' });
});

export function deriveFilmIdentityCandidate(revision2Input: unknown, assignmentInput: unknown) {
  const revision2 = capturedFilmAnalysisSchema.parse(revision2Input);
  if (revision2.analysis.revision !== 2) throw new Error('Identity candidate derivation requires immutable revision 2.');
  const assignments = z.array(identityAssignmentSchema).parse(assignmentInput);
  const assignmentByTime = new Map<number, z.infer<typeof identityAssignmentSchema>>();
  for (const assignment of assignments) {
    if (assignmentByTime.has(assignment.timeMs)) throw new Error(`Duplicate identity assignment at ${assignment.timeMs}ms.`);
    assignmentByTime.set(assignment.timeMs, assignment);
  }
  const frameTimes = new Set(revision2.frames.map((frame) => frame.timeMs));
  for (const assignment of assignments) {
    if (!frameTimes.has(assignment.timeMs)) throw new Error(`Identity assignment at ${assignment.timeMs}ms does not match a captured revision-2 frame.`);
  }
  const frames = revision2.frames.map((frame) => {
    const players = frame.players.map((player) => player.team === 'target'
      ? { ...player, team: 'teammate' as const, identityPreviousRole: 'target' }
      : { ...player });
    const assignment = assignmentByTime.get(frame.timeMs);
    if (!assignment) return { ...frame, targetStatus: 'unresolved' as const, players };
    if (assignment.targetStatus !== 'resolved') return {
      ...frame,
      targetStatus: assignment.targetStatus,
      players,
      identityEvidence: assignment.evidence
    };
    const selected = players.find((player) => player.trackId === assignment.trackId);
    if (!selected) throw new Error(`Identity assignment ${assignment.evidence.anchorId} references missing revision-2 track ${assignment.trackId}.`);
    if (selected.team !== 'teammate') throw new Error(`Identity assignment ${assignment.evidence.anchorId} must select an existing foreground teammate.`);
    selected.team = 'target';
    Object.assign(selected, { identity: '13', identityEvidence: assignment.evidence });
    return { ...frame, targetStatus: 'resolved' as const, players, identityEvidence: assignment.evidence };
  });
  return {
    version: 1 as const,
    source: revision2.source,
    profile: revision2.profile,
    derivedFromRevision: 2 as const,
    personDetectionExecuted: false as const,
    identityPolicy: 'direct-number-or-bounded-continuity-fail-closed-v1',
    frames
  };
}

export const filmIdentityCandidateSchema = z.object({
  version: z.literal(1),
  source: filmSourceSchema,
  profile: z.literal(FILM_BENCHMARK_PROFILE),
  derivedFromRevision: z.union([z.literal(1), z.literal(2)]),
  personDetectionExecuted: z.literal(false),
  identityPolicy: filmIdentityPolicySchema,
  frames: z.array(capturedFrameSchema)
}).passthrough();

export function applyFilmIdentityAssignments(candidateInput: unknown, assignmentInput: unknown) {
  const candidate = filmIdentityCandidateSchema.parse(candidateInput);
  const assignments = z.array(identityAssignmentSchema).parse(assignmentInput);
  const assignmentByTime = new Map<number, z.infer<typeof identityAssignmentSchema>>();
  for (const assignment of assignments) {
    if (assignmentByTime.has(assignment.timeMs)) throw new Error(`Duplicate identity assignment at ${assignment.timeMs}ms.`);
    assignmentByTime.set(assignment.timeMs, assignment);
  }
  const frameTimes = new Set(candidate.frames.map((frame) => frame.timeMs));
  for (const assignment of assignments) {
    if (!frameTimes.has(assignment.timeMs)) throw new Error(`Identity assignment at ${assignment.timeMs}ms does not match a captured frame.`);
  }
  return filmIdentityCandidateSchema.parse({
    ...candidate,
    frames: candidate.frames.map((frame) => {
      const assignment = assignmentByTime.get(frame.timeMs);
      if (!assignment) return frame;
      const players = frame.players.map((player) => player.team === 'target'
        ? { ...player, team: 'teammate' as const, identityPreviousRole: 'target' }
        : { ...player });
      if (assignment.targetStatus !== 'resolved') return { ...frame, targetStatus: assignment.targetStatus, players, identityEvidence: assignment.evidence };
      const selected = players.find((player) => player.trackId === assignment.trackId);
      if (!selected) throw new Error(`Identity assignment ${assignment.evidence.anchorId} references missing track ${assignment.trackId}.`);
      if (selected.team !== 'teammate') throw new Error(`Identity assignment ${assignment.evidence.anchorId} must select an existing foreground teammate.`);
      selected.team = 'target';
      Object.assign(selected, { identity: '13', identityEvidence: assignment.evidence });
      return { ...frame, targetStatus: 'resolved' as const, players, identityEvidence: assignment.evidence };
    })
  });
}

export function filmIdentityCandidateFingerprint(candidate: z.infer<typeof filmIdentityCandidateSchema>) {
  const text = JSON.stringify(candidate.frames.map((frame) => ({
    timeMs: frame.timeMs,
    targetStatus: frame.targetStatus,
    target: frame.players.find((player) => player.team === 'target')?.trackId ?? null,
    evidence: frame.identityEvidence ?? null
  })));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function identityNeutralPlayer(player: CapturedPlayer) {
  const { team, identity: _identity, identityEvidence: _identityEvidence, identityPreviousRole: _identityPreviousRole, ...rest } = player;
  return { ...rest, team: team === 'target' ? 'teammate' : team };
}

function reviewCropContainsPlayerCenter(reviewCrop: [number, number, number, number], playerCrop?: [number, number, number, number]) {
  if (!playerCrop) return false;
  const [left, top, right, bottom] = reviewCrop;
  const [x, y, width, height] = playerCrop;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  return right > left && bottom > top && centerX >= left && centerX <= right && centerY >= top && centerY <= bottom;
}

export function verifyFilmIdentityCandidate(sourceRevisionInput: unknown, candidateInput: unknown, benchmarkInput: unknown) {
  const sourceRevision = capturedFilmAnalysisSchema.parse(sourceRevisionInput);
  const candidate = filmIdentityCandidateSchema.parse(candidateInput);
  const benchmark = filmIdentityBenchmarkSchema.parse(benchmarkInput);
  const invariantIssues: string[] = [];
  if (![1, 2].includes(sourceRevision.analysis.revision)) invariantIssues.push('Identity verification requires an immutable revision 1 or 2 source.');
  if (candidate.derivedFromRevision !== sourceRevision.analysis.revision) invariantIssues.push('Candidate derived revision does not match its immutable source revision.');
  if (candidate.source.sha256 !== sourceRevision.source.sha256 || benchmark.sourceSha256 !== sourceRevision.source.sha256) invariantIssues.push('Candidate, benchmark, and source revision hashes must match.');
  if (candidate.frames.length !== sourceRevision.frames.length) invariantIssues.push('Candidate frame count changed from its source revision.');

  for (let index = 0; index < sourceRevision.frames.length; index += 1) {
    const prior = sourceRevision.frames[index]!;
    const next = candidate.frames[index];
    if (!next || next.timeMs !== prior.timeMs) {
      invariantIssues.push(`Candidate frame time changed at index ${index}.`);
      continue;
    }
    if (next.players.length !== prior.players.length) invariantIssues.push(`Player count changed at ${prior.timeMs}ms.`);
    if (JSON.stringify(next.ignored) !== JSON.stringify(prior.ignored)) invariantIssues.push(`Ignored player field changed at ${prior.timeMs}ms.`);
    const priorPlayers = new Map(prior.players.map((player) => [player.trackId, identityNeutralPlayer(player)]));
    for (const player of next.players) {
      const baseline = priorPlayers.get(player.trackId);
      if (!baseline) {
        invariantIssues.push(`Candidate synthesized track ${player.trackId} at ${prior.timeMs}ms.`);
        continue;
      }
      const normalized = identityNeutralPlayer(player);
      if (JSON.stringify(normalized.court) !== JSON.stringify(baseline.court)) invariantIssues.push(`Candidate changed court coordinates for ${player.trackId} at ${prior.timeMs}ms.`);
      if (JSON.stringify(normalized) !== JSON.stringify(baseline)) invariantIssues.push(`Candidate changed a non-identity player field for ${player.trackId} at ${prior.timeMs}ms.`);
      priorPlayers.delete(player.trackId);
    }
    if (priorPlayers.size) invariantIssues.push(`Candidate removed ${priorPlayers.size} source track(s) at ${prior.timeMs}ms.`);
    const targets = next.players.filter((player) => player.team === 'target');
    if (targets.length > 1) invariantIssues.push(`Candidate contains multiple targets at ${prior.timeMs}ms.`);
    if (next.targetStatus === 'resolved') {
      if (targets.length !== 1) invariantIssues.push(`Resolved frame ${prior.timeMs}ms must contain exactly one target.`);
      if (!next.identityEvidence || !['direct-number', 'bounded-continuity', 'segmentation-mask'].includes(String((next.identityEvidence as { method?: string }).method))) invariantIssues.push(`Resolved frame ${prior.timeMs}ms lacks direct-number, bounded-continuity, or reviewed segmentation-mask evidence.`);
    } else if (targets.length) invariantIssues.push(`Non-resolved frame ${prior.timeMs}ms contains a target.`);
    if (next.targetStatus === 'inactive' && !['substitution', 'substitution-ledger'].includes(String((next.identityEvidence as { method?: string } | undefined)?.method))) invariantIssues.push(`Inactive frame ${prior.timeMs}ms lacks substitution evidence.`);
    if (targets.some((target) => target.provenance === 'corrected' || target.correctionId)) invariantIssues.push(`Candidate uses a correction overlay at ${prior.timeMs}ms.`);
  }

  const frameByTime = new Map(candidate.frames.map((frame) => [frame.timeMs, frame]));
  const predictions = benchmark.annotations.map((annotation) => {
    const frame = frameByTime.get(annotation.associationTimeMs);
    const target = frame?.players.find((player) => player.team === 'target');
    const evidenceMethod = (frame?.identityEvidence as { method?: string } | undefined)?.method;
    const targetMatchesReview = target?.trackId === annotation.trackId || (
      candidate.identityPolicy === 'segmentation-mask-direct-reseed-fail-closed-v1'
      && reviewCropContainsPlayerCenter(annotation.cropBounds, target?.cropBounds)
    ) || (candidate.derivedFromRevision === 1 && evidenceMethod === 'direct-number' && annotation.expectedIdentity === '13');
    return {
      id: annotation.id,
      predictedIdentity: frame?.targetStatus === 'inactive'
        ? '13' as const
        : target && targetMatchesReview
          ? '13' as const
          : 'unresolved' as const,
      targetStatus: frame?.targetStatus ?? 'unresolved' as const,
      evidence: evidenceMethod === 'direct-number' ? 'direct-number' as const : evidenceMethod === 'bounded-continuity' || evidenceMethod === 'segmentation-mask' ? 'bounded-continuity' as const : evidenceMethod === 'substitution' || evidenceMethod === 'substitution-ledger' ? 'substitution' as const : 'none' as const,
      corrected: Boolean(target?.provenance === 'corrected' || target?.correctionId)
    };
  });
  const score = scoreFilmIdentityBenchmark(benchmark, predictions);
  const correctionOverlayCount = candidate.frames.reduce((count, frame) => count + frame.players.filter((player) => player.provenance === 'corrected' || player.correctionId).length, 0);
  if (correctionOverlayCount) invariantIssues.push(`Candidate contains ${correctionOverlayCount} correction overlay(s).`);
  return {
    ok: invariantIssues.length === 0 && score.ok,
    benchmarkProfile: FILM_IDENTITY_BENCHMARK_PROFILE,
    sourceSha256: sourceRevision.source.sha256,
    candidateFingerprint: filmIdentityCandidateFingerprint(candidate),
    correctionOverlayCount,
    invariantIssues,
    positiveRecall: score.positiveRecall,
    hardNegativePrecision: score.hardNegativePrecision,
    substitutionAccuracy: score.substitutionAccuracy,
    scoreIssues: score.issues,
    predictions
  };
}

const filmIdentityVerificationReceiptSchema = z.object({
  ok: z.literal(true),
  benchmarkProfile: z.literal(FILM_IDENTITY_BENCHMARK_PROFILE),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  candidateFingerprint: z.string().min(1),
  correctionOverlayCount: z.literal(0),
  invariantIssues: z.array(z.never()).length(0),
  positiveRecall: z.number().min(0.95),
  hardNegativePrecision: z.literal(1),
  substitutionAccuracy: z.literal(1),
  scoreIssues: z.array(z.never()).length(0)
}).passthrough();

export function finalizeFilmIdentityRevision(sourceRevisionInput: unknown, candidateInput: unknown, receiptInput: unknown, analyzedAt = new Date().toISOString(), fullFlowReceiptInput?: unknown) {
  const sourceRevision = capturedFilmAnalysisSchema.parse(sourceRevisionInput);
  const candidate = filmIdentityCandidateSchema.parse(candidateInput);
  const parsedReceipt = filmIdentityVerificationReceiptSchema.safeParse(receiptInput);
  if (!parsedReceipt.success) throw new Error('An identity-only revision requires a passing identity verification receipt.');
  if (![1, 2].includes(sourceRevision.analysis.revision) || candidate.derivedFromRevision !== sourceRevision.analysis.revision) throw new Error('An identity-only revision must derive from its immutable revision 1 or 2 source.');
  if (parsedReceipt.data.sourceSha256 !== sourceRevision.source.sha256 || parsedReceipt.data.candidateFingerprint !== filmIdentityCandidateFingerprint(candidate)) throw new Error('The passing identity verification receipt does not match this candidate.');
  const fullFlowReceipt = fullFlowReceiptInput === undefined ? undefined : promotableFullFlowReceiptSchema.parse(fullFlowReceiptInput);
  if (fullFlowReceipt && (fullFlowReceipt.sourceSha256 !== sourceRevision.source.sha256 || fullFlowReceipt.sourceRevision !== sourceRevision.analysis.revision || fullFlowReceipt.candidateFingerprint !== filmIdentityCandidateFingerprint(candidate))) throw new Error('The promotable full-flow receipt does not match this source revision and candidate.');
  const nextRevision = sourceRevision.analysis.revision + 1;
  return capturedFilmAnalysisSchema.parse({
    version: 1,
    source: sourceRevision.source,
    profile: sourceRevision.profile,
    analysis: {
      ...sourceRevision.analysis,
      revision: nextRevision,
      analyzedAt,
      derivedFromRevision: sourceRevision.analysis.revision,
      personDetectionExecuted: false,
      identityExecutionCount: 1,
      identityPolicy: candidate.identityPolicy,
      identityVerification: {
        benchmarkProfile: parsedReceipt.data.benchmarkProfile,
        candidateFingerprint: parsedReceipt.data.candidateFingerprint,
        positiveRecall: parsedReceipt.data.positiveRecall,
        hardNegativePrecision: parsedReceipt.data.hardNegativePrecision,
        substitutionAccuracy: parsedReceipt.data.substitutionAccuracy,
        correctionOverlayCount: 0
      },
      fullFlowVerification: fullFlowReceipt ? {
        profile: fullFlowReceipt.profile,
        sourceRevision: fullFlowReceipt.sourceRevision,
        candidateFingerprint: fullFlowReceipt.candidateFingerprint,
        analysisSha256: fullFlowReceipt.fingerprints.analysisSha256,
        participationSha256: fullFlowReceipt.fingerprints.participationSha256,
        maskTrackSha256: fullFlowReceipt.fingerprints.maskTrackSha256,
        candidateSha256: fullFlowReceipt.fingerprints.candidateSha256,
        stateTotals: fullFlowReceipt.stateTotals
      } : undefined
    },
    frames: candidate.frames
  });
}
export const filmCorrectionSchema = z.object({
  id: z.string().min(1),
  timeMs: z.number().int().nonnegative(),
  trackId: z.string().min(1).default('13'),
  court: pointSchema.nullable(),
  targetStatus: capturedTargetStatusSchema.optional(),
  reason: z.string().trim().min(1).max(800),
  createdAt: z.string().min(1)
});
export type FilmCorrection = z.infer<typeof filmCorrectionSchema>;
export type FilmCorrectionDraft = Pick<FilmCorrection, 'timeMs' | 'court' | 'targetStatus' | 'reason'> & Partial<Pick<FilmCorrection, 'trackId'>>;

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const filmBenchmarkImportReportSchema = z.object({
  ok: z.literal(true),
  sourceSha256: sha256Schema,
  analysisSha256: sha256Schema,
  correctionsSha256: sha256Schema,
  analysisRevision: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  correctionCount: z.number().int().nonnegative()
});

export const filmImportGateSchema = z.object({
  version: z.literal(1),
  profile: z.literal(FILM_IMPORT_GATE_PROFILE),
  ok: z.literal(true),
  analysisSha256: sha256Schema,
  correctionsSha256: sha256Schema,
  sourceSha256: sha256Schema,
  analysisRevision: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  analysisExecutionCount: z.literal(1),
  frameCount: z.number().int().positive(),
  correctionCount: z.number().int().nonnegative(),
  benchmarkProfile: z.union([z.literal(FILM_BENCHMARK_PROFILE), z.literal(FILM_IDENTITY_BENCHMARK_PROFILE)]),
  identityFingerprint: z.string().min(1).nullable(),
  playStateFingerprint: z.string().min(1).nullable(),
  verifiedAt: z.string().min(1)
});

type FilmImportHashes = { analysisSha256: string; correctionsSha256: string };

function assertVerifiedPlayStateReceipt(analysis: CapturedFilmAnalysis) {
  const receipt = analysis.analysis.playStateVerification;
  if (!receipt) return;
  const liveFrameCount = analysis.frames.filter((frame) => isLiveFilmPlayState(frame.playState)).length;
  const unknownFrameCount = analysis.frames.filter((frame) => frame.playState === 'unknown').length;
  const nonLiveFrameCount = analysis.frames.length - liveFrameCount - unknownFrameCount;
  if (analysis.frames.some((frame) => !frame.playStateEvidence)) throw new Error('The play-state import receipt does not provide evidence for every captured frame.');
  if (receipt.frameCount !== analysis.frames.length || receipt.liveFrameCount !== liveFrameCount || receipt.nonLiveFrameCount !== nonLiveFrameCount || receipt.unknownFrameCount !== unknownFrameCount) {
    throw new Error('The play-state import receipt counts do not match the captured frames.');
  }
}

export function createFilmImportGate(
  analysisInput: unknown,
  correctionsInput: unknown,
  hashes: FilmImportHashes,
  verifiedAt: string,
  benchmarkReportInput?: unknown
) {
  const analysis = capturedFilmAnalysisSchema.parse(analysisInput);
  const corrections = z.array(filmCorrectionSchema).parse(correctionsInput);
  sha256Schema.parse(hashes.analysisSha256);
  sha256Schema.parse(hashes.correctionsSha256);
  assertVerifiedPlayStateReceipt(analysis);

  let benchmarkProfile: typeof FILM_BENCHMARK_PROFILE | typeof FILM_IDENTITY_BENCHMARK_PROFILE;
  if (analysis.analysis.identityVerification) {
    benchmarkProfile = analysis.analysis.identityVerification.benchmarkProfile;
  } else {
    if (!benchmarkReportInput) throw new Error('Revision 1 or 2 import requires a passing benchmark report bound to the exact analysis and corrections.');
    const report = filmBenchmarkImportReportSchema.parse(benchmarkReportInput);
    if (report.sourceSha256 !== analysis.source.sha256 || report.analysisSha256 !== hashes.analysisSha256 || report.correctionsSha256 !== hashes.correctionsSha256
      || report.analysisRevision !== analysis.analysis.revision || report.correctionCount !== corrections.length) {
      throw new Error('The passing benchmark report does not match this analysis and correction overlay.');
    }
    benchmarkProfile = FILM_BENCHMARK_PROFILE;
  }

  return filmImportGateSchema.parse({
    version: 1,
    profile: FILM_IMPORT_GATE_PROFILE,
    ok: true,
    analysisSha256: hashes.analysisSha256,
    correctionsSha256: hashes.correctionsSha256,
    sourceSha256: analysis.source.sha256,
    analysisRevision: analysis.analysis.revision,
    analysisExecutionCount: analysis.analysis.executionCount,
    frameCount: analysis.frames.length,
    correctionCount: corrections.length,
    benchmarkProfile,
    identityFingerprint: analysis.analysis.identityVerification?.candidateFingerprint ?? null,
    playStateFingerprint: analysis.analysis.playStateVerification?.ledgerFingerprint ?? null,
    verifiedAt
  });
}

export function validateFilmImportGate(analysisInput: unknown, correctionsInput: unknown, gateInput: unknown, hashes: FilmImportHashes) {
  const analysis = capturedFilmAnalysisSchema.parse(analysisInput);
  const corrections = z.array(filmCorrectionSchema).parse(correctionsInput);
  const gate = filmImportGateSchema.parse(gateInput);
  assertVerifiedPlayStateReceipt(analysis);
  if (gate.analysisSha256 !== hashes.analysisSha256) throw new Error('The import gate analysis hash does not match the exact analysis artifact.');
  if (gate.correctionsSha256 !== hashes.correctionsSha256) throw new Error('The import gate corrections hash does not match the exact correction overlay.');
  if (gate.sourceSha256 !== analysis.source.sha256 || gate.analysisRevision !== analysis.analysis.revision || gate.analysisExecutionCount !== analysis.analysis.executionCount
    || gate.frameCount !== analysis.frames.length || gate.correctionCount !== corrections.length) throw new Error('The import gate does not match this captured film revision.');
  if (gate.identityFingerprint !== (analysis.analysis.identityVerification?.candidateFingerprint ?? null)) throw new Error('The import gate identity fingerprint does not match this analysis.');
  if (gate.playStateFingerprint !== (analysis.analysis.playStateVerification?.ledgerFingerprint ?? null)) throw new Error('The import gate play-state fingerprint does not match this analysis.');
  if (analysis.analysis.identityVerification && gate.benchmarkProfile !== FILM_IDENTITY_BENCHMARK_PROFILE) throw new Error('An identity-only revision import requires the locked identity benchmark gate.');
  if (analysis.analysis.revision === 3 && !analysis.analysis.identityVerification) throw new Error('Revision 3 import requires its passing embedded identity benchmark.');
  return gate;
}

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

export function summarizeFilmTargetCoverage(analysisInput: unknown) {
  const analysis = capturedFilmAnalysisSchema.parse(analysisInput);
  const count = (status: z.infer<typeof capturedTargetStatusSchema>) => analysis.frames.filter((frame) => frame.targetStatus === status).length;
  const targets = analysis.frames.flatMap((frame) => frame.players.filter((player) => player.team === 'target'));
  const percent = (value: number) => analysis.frames.length ? Math.round(value / analysis.frames.length * 10_000) / 100 : 0;
  const resolvedFrames = count('resolved');
  const unresolvedFrames = count('unresolved');
  const inactiveFrames = count('inactive');
  const outOfFrameFrames = count('out-of-frame');
  return {
    frameCount: analysis.frames.length,
    resolvedFrames,
    unresolvedFrames,
    inactiveFrames,
    outOfFrameFrames,
    resolvedPercent: percent(resolvedFrames),
    knownStatePercent: percent(resolvedFrames + inactiveFrames + outOfFrameFrames),
    estimatedTargetFrames: targets.filter((player) => player.projection === 'estimated').length,
    calibratedTargetFrames: targets.filter((player) => player.projection === 'calibrated' && player.provenance !== 'corrected').length,
    correctedTargetFrames: targets.filter((player) => player.provenance === 'corrected').length
  };
}

export function filmZone(court: [number, number]) {
  return courtZone(court);
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
    frame.players = frame.players.filter((player) => player.team !== 'target' && (status !== 'resolved' || player.trackId !== correction.trackId));
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

export type FilmMovementMode = 'live-only' | 'all-captured';

export function isLiveFilmPlayState(state: FilmPlayState) {
  return ['live-offense', 'live-defense', 'transition-offense', 'transition-defense'].includes(state);
}

export function resolveFilmTrafficAt(analysis: CapturedFilmAnalysis, requestedTimeMs: number, wakeMs = 5000, options: { movementMode?: FilmMovementMode } = {}) {
  const movementMode = options.movementMode ?? 'live-only';
  const timeMs = Math.max(0, Math.min(requestedTimeMs, analysis.source.durationMs));
  const beforeIndex = analysis.frames.findLastIndex((frame) => frame.timeMs <= timeMs);
  const before = analysis.frames[beforeIndex];
  const after = analysis.frames.slice(beforeIndex + 1).find((frame) => frame.timeMs >= timeMs);
  let players = before?.players ?? [];
  if (before && after && before.targetStatus === 'resolved' && after.targetStatus === 'resolved' && before.playState === after.playState && after.timeMs > before.timeMs) {
    const ratio = (timeMs - before.timeMs) / (after.timeMs - before.timeMs);
    players = before.players.flatMap((player) => {
      const next = after.players.find((candidate) => candidate.trackId === player.trackId)
        ?? (player.team === 'target' ? after.players.find((candidate) => candidate.team === 'target') : undefined);
      return next ? [interpolatePlayer(player, next, ratio)] : [player];
    });
  }
  const targetWake: Array<Array<{ timeMs: number; court: [number, number] }>> = [];
  const contextWake: Array<{ playState: FilmPlayState; points: Array<{ timeMs: number; court: [number, number] }> }> = [];
  let liveSegment: Array<{ timeMs: number; court: [number, number] }> = [];
  let contextSegment: { playState: FilmPlayState; points: Array<{ timeMs: number; court: [number, number] }> } | undefined;
  const flushLive = () => {
    if (liveSegment.length) targetWake.push(liveSegment);
    liveSegment = [];
  };
  const flushContext = () => {
    if (contextSegment?.points.length) contextWake.push(contextSegment);
    contextSegment = undefined;
  };
  const appendPoint = (playState: FilmPlayState, point: { timeMs: number; court: [number, number] }) => {
    if (isLiveFilmPlayState(playState)) {
      flushContext();
      liveSegment.push(point);
      return;
    }
    flushLive();
    if (movementMode !== 'all-captured') return;
    if (!contextSegment || contextSegment.playState !== playState) {
      flushContext();
      contextSegment = { playState, points: [] };
    }
    contextSegment.points.push(point);
  };
  for (const frame of analysis.frames) {
    if (frame.timeMs < timeMs - wakeMs || frame.timeMs > timeMs) continue;
    const target = frame.targetStatus === 'resolved' ? frame.players.find((player) => player.team === 'target') : undefined;
    if (!target) { flushLive(); flushContext(); continue; }
    appendPoint(frame.playState, { timeMs: frame.timeMs, court: target.court });
  }
  const currentTarget = players.find((player) => player.team === 'target');
  const latestTime = liveSegment.at(-1)?.timeMs ?? contextSegment?.points.at(-1)?.timeMs;
  if (currentTarget && latestTime !== timeMs) appendPoint(before?.playState ?? 'unknown', { timeMs, court: currentTarget.court });
  flushLive();
  flushContext();
  return {
    timeMs,
    players,
    targetWake,
    contextWake,
    currentTargetStatus: before?.targetStatus ?? 'out-of-frame',
    currentPlayState: before?.playState ?? 'unknown',
    currentPlayStateEvidence: before?.playStateEvidence,
    movementMode,
    analysisRevision: analysis.analysis.revision
  };
}
