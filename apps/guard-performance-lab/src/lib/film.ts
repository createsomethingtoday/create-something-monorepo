import { z } from 'zod';

export const FILM_BENCHMARK_PROFILE = 'guard-player-trace-v1';
export const FILM_TEAM_BENCHMARK_PROFILE = 'guard-player-team-benchmark-v2';
export const FILM_IDENTITY_BENCHMARK_PROFILE = 'guard-player-13-identity-v3';

const pointSchema = z.tuple([z.number(), z.number()]);
const capturedTargetStatusSchema = z.enum(['resolved', 'unresolved', 'out-of-frame', 'inactive']);
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
  if (!parsed.success) return { ok: false as const, issues: parsed.error.issues.map((issue) => issue.message), positiveCount: 0, negativeCount: 0, positiveSegmentCount: 0 };
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
  if (positive.length < 30) issues.push('The identity benchmark requires at least 30 readable #13 crops.');
  if (positiveSegmentCount < 3) issues.push('The identity benchmark requires readable #13 evidence across at least three on-court segments.');
  if (negative.length < 30) issues.push('The identity benchmark requires at least 30 hard-negative crops.');
  for (const negativeClass of identityNegativeClassSchema.options) {
    if (!negative.some((annotation) => annotation.negativeClass === negativeClass)) issues.push(`The identity benchmark is missing required ${negativeClass} hard-negative evidence.`);
  }
  return { ok: issues.length === 0, issues, positiveCount: positive.length, negativeCount: negative.length, positiveSegmentCount };
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
  for (const annotation of parsedBenchmark.data.annotations) {
    if (!predictions.has(annotation.id)) issues.push(`Missing identity prediction: ${annotation.id}.`);
  }
  const positiveRecall = positive.length ? positive.filter((annotation) => {
    const prediction = predictions.get(annotation.id);
    return prediction?.predictedIdentity === '13' && prediction.targetStatus === 'resolved' && prediction.evidence !== 'none' && !prediction.corrected;
  }).length / positive.length : 0;
  const hardNegativePrecision = negative.length ? negative.filter((annotation) => predictions.get(annotation.id)?.predictedIdentity !== '13').length / negative.length : 0;
  const substitutionAccuracy = substitutions.length ? substitutions.filter((annotation) => {
    const prediction = predictions.get(annotation.id);
    return prediction?.predictedIdentity === '13' && prediction?.targetStatus === 'inactive' && prediction.evidence !== 'none' && !prediction.corrected;
  }).length / substitutions.length : 0;
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
  players: z.array(capturedPlayerSchema),
  pan: z.object({ offsetPixels: z.number(), confidence: z.number().min(0).max(1) }).optional(),
  ignored: z.array(ignoredDetectionSchema).default([])
}).passthrough();

const capturedAnalysisReceiptSchema = z.object({
  revision: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  executionCount: z.literal(1),
  analyzedAt: z.string().min(1),
  derivedFromRevision: z.literal(2).optional(),
  personDetectionExecuted: z.literal(false).optional(),
  identityExecutionCount: z.literal(1).optional(),
  identityPolicy: z.literal('direct-number-or-bounded-continuity-fail-closed-v1').optional(),
  identityVerification: z.object({
    benchmarkProfile: z.literal(FILM_IDENTITY_BENCHMARK_PROFILE),
    candidateFingerprint: z.string().min(1),
    positiveRecall: z.number().min(0.95),
    hardNegativePrecision: z.literal(1),
    substitutionAccuracy: z.literal(1),
    correctionOverlayCount: z.literal(0)
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

const filmIdentityCandidateSchema = z.object({
  version: z.literal(1),
  source: filmSourceSchema,
  profile: z.literal(FILM_BENCHMARK_PROFILE),
  derivedFromRevision: z.literal(2),
  personDetectionExecuted: z.literal(false),
  identityPolicy: z.literal('direct-number-or-bounded-continuity-fail-closed-v1'),
  frames: z.array(capturedFrameSchema)
}).passthrough();

function filmIdentityCandidateFingerprint(candidate: z.infer<typeof filmIdentityCandidateSchema>) {
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

export function verifyFilmIdentityCandidate(revision2Input: unknown, candidateInput: unknown, benchmarkInput: unknown) {
  const revision2 = capturedFilmAnalysisSchema.parse(revision2Input);
  const candidate = filmIdentityCandidateSchema.parse(candidateInput);
  const benchmark = filmIdentityBenchmarkSchema.parse(benchmarkInput);
  const invariantIssues: string[] = [];
  if (revision2.analysis.revision !== 2) invariantIssues.push('Identity verification requires immutable revision 2.');
  if (candidate.source.sha256 !== revision2.source.sha256 || benchmark.sourceSha256 !== revision2.source.sha256) invariantIssues.push('Candidate, benchmark, and revision-2 source hashes must match.');
  if (candidate.frames.length !== revision2.frames.length) invariantIssues.push('Candidate frame count changed from revision 2.');

  for (let index = 0; index < revision2.frames.length; index += 1) {
    const prior = revision2.frames[index]!;
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
    if (priorPlayers.size) invariantIssues.push(`Candidate removed ${priorPlayers.size} revision-2 track(s) at ${prior.timeMs}ms.`);
    const targets = next.players.filter((player) => player.team === 'target');
    if (targets.length > 1) invariantIssues.push(`Candidate contains multiple targets at ${prior.timeMs}ms.`);
    if (next.targetStatus === 'resolved') {
      if (targets.length !== 1) invariantIssues.push(`Resolved frame ${prior.timeMs}ms must contain exactly one target.`);
      if (!next.identityEvidence || !['direct-number', 'bounded-continuity'].includes(String((next.identityEvidence as { method?: string }).method))) invariantIssues.push(`Resolved frame ${prior.timeMs}ms lacks direct-number or bounded-continuity evidence.`);
    } else if (targets.length) invariantIssues.push(`Non-resolved frame ${prior.timeMs}ms contains a target.`);
    if (next.targetStatus === 'inactive' && (next.identityEvidence as { method?: string } | undefined)?.method !== 'substitution') invariantIssues.push(`Inactive frame ${prior.timeMs}ms lacks substitution evidence.`);
    if (targets.some((target) => target.provenance === 'corrected' || target.correctionId)) invariantIssues.push(`Candidate uses a correction overlay at ${prior.timeMs}ms.`);
  }

  const frameByTime = new Map(candidate.frames.map((frame) => [frame.timeMs, frame]));
  const predictions = benchmark.annotations.map((annotation) => {
    const frame = frameByTime.get(annotation.associationTimeMs);
    const target = frame?.players.find((player) => player.team === 'target');
    const evidenceMethod = (frame?.identityEvidence as { method?: string } | undefined)?.method;
    return {
      id: annotation.id,
      predictedIdentity: frame?.targetStatus === 'inactive'
        ? '13' as const
        : target?.trackId === annotation.trackId
          ? '13' as const
          : 'unresolved' as const,
      targetStatus: frame?.targetStatus ?? 'unresolved' as const,
      evidence: evidenceMethod === 'direct-number' ? 'direct-number' as const : evidenceMethod === 'bounded-continuity' ? 'bounded-continuity' as const : evidenceMethod === 'substitution' ? 'substitution' as const : 'none' as const,
      corrected: Boolean(target?.provenance === 'corrected' || target?.correctionId)
    };
  });
  const score = scoreFilmIdentityBenchmark(benchmark, predictions);
  const correctionOverlayCount = candidate.frames.reduce((count, frame) => count + frame.players.filter((player) => player.provenance === 'corrected' || player.correctionId).length, 0);
  if (correctionOverlayCount) invariantIssues.push(`Candidate contains ${correctionOverlayCount} correction overlay(s).`);
  return {
    ok: invariantIssues.length === 0 && score.ok,
    benchmarkProfile: FILM_IDENTITY_BENCHMARK_PROFILE,
    sourceSha256: revision2.source.sha256,
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

export function finalizeFilmIdentityRevision(revision2Input: unknown, candidateInput: unknown, receiptInput: unknown, analyzedAt = new Date().toISOString()) {
  const revision2 = capturedFilmAnalysisSchema.parse(revision2Input);
  const candidate = filmIdentityCandidateSchema.parse(candidateInput);
  const parsedReceipt = filmIdentityVerificationReceiptSchema.safeParse(receiptInput);
  if (!parsedReceipt.success) throw new Error('Revision 3 requires a passing identity verification receipt.');
  if (revision2.analysis.revision !== 2 || candidate.derivedFromRevision !== 2) throw new Error('Revision 3 must derive from immutable revision 2.');
  if (parsedReceipt.data.sourceSha256 !== revision2.source.sha256 || parsedReceipt.data.candidateFingerprint !== filmIdentityCandidateFingerprint(candidate)) throw new Error('The passing identity verification receipt does not match this candidate.');
  return capturedFilmAnalysisSchema.parse({
    version: 1,
    source: revision2.source,
    profile: revision2.profile,
    analysis: {
      ...revision2.analysis,
      revision: 3,
      analyzedAt,
      derivedFromRevision: 2,
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
      }
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
