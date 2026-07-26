import { z } from 'zod';
import { capturedFilmAnalysisSchema, filmIdentityCandidateFingerprint, filmIdentityCandidateSchema, filmMaskTrackSchema, validateFilmMaskTrack } from './film.js';
import { filmParticipationLedgerSchema, verifyFilmParticipationLedger } from './film-participation.js';

export const FILM_FULL_FLOW_PROFILE = 'guard-player-13-full-flow-v1';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const identityReceiptSchema = z.object({
  ok: z.literal(true),
  sourceSha256: sha256Schema,
  candidateFingerprint: z.string().min(1),
  correctionOverlayCount: z.literal(0),
  invariantIssues: z.array(z.never()).length(0),
  positiveRecall: z.number().min(0.95),
  hardNegativePrecision: z.literal(1),
  substitutionAccuracy: z.literal(1),
  scoreIssues: z.array(z.never()).length(0)
}).passthrough();

const calibrationReceiptSchema = z.object({
  ok: z.literal(true),
  sourceSha256: sha256Schema,
  medianErrorFeet: z.number().max(2),
  p95ErrorFeet: z.number().max(4)
}).passthrough();

type FullFlowInput = {
  baseline: unknown;
  candidate: unknown;
  participation: unknown;
  maskTrack: unknown;
  identityReceipt: unknown;
  calibrationReceipt?: unknown;
  fingerprints: { analysisSha256: string; participationSha256: string; maskTrackSha256: string; candidateSha256: string };
};

function targetNeutral(frame: z.infer<typeof filmIdentityCandidateSchema>['frames'][number]) {
  return frame.players.filter((player) => player.team === 'target');
}

export function verifyFilmFullFlow(input: FullFlowInput) {
  const baseline = capturedFilmAnalysisSchema.parse(input.baseline);
  const candidate = filmIdentityCandidateSchema.parse(input.candidate);
  const ledger = filmParticipationLedgerSchema.parse(input.participation);
  const maskTrack = filmMaskTrackSchema.parse(input.maskTrack);
  const identityReceipt = identityReceiptSchema.safeParse(input.identityReceipt);
  const fingerprints = z.object({ analysisSha256: sha256Schema, participationSha256: sha256Schema, maskTrackSha256: sha256Schema, candidateSha256: sha256Schema }).parse(input.fingerprints);
  const issues: string[] = [];
  const participationReceipt = verifyFilmParticipationLedger(ledger, baseline.source);
  if (!participationReceipt.ok) issues.push(...participationReceipt.issues);
  const maskReceipt = validateFilmMaskTrack(maskTrack);
  if (!maskReceipt.ok) issues.push(...maskReceipt.issues);
  if (candidate.source.sha256 !== baseline.source.sha256 || ledger.sourceSha256 !== baseline.source.sha256 || maskTrack.sourceSha256 !== baseline.source.sha256) issues.push('Full-flow source fingerprints do not match.');
  if (candidate.derivedFromRevision !== baseline.analysis.revision) issues.push('Full-flow candidate does not derive from the immutable source revision.');
  if (candidate.frames.length !== baseline.frames.length) issues.push('Full-flow candidate frame count changed from the immutable person field.');
  if (!identityReceipt.success) issues.push('The exact candidate lacks a passing locked identity receipt.');
  else {
    if (identityReceipt.data.sourceSha256 !== baseline.source.sha256) issues.push('Identity receipt source fingerprint does not match.');
    if (identityReceipt.data.candidateFingerprint !== filmIdentityCandidateFingerprint(candidate)) issues.push('Identity receipt candidate fingerprint does not match.');
  }

  const intervalAt = (timeMs: number) => ledger.intervals.find((interval) => timeMs >= interval.startMs && timeMs <= interval.endMs);
  let opponentOrOtherCourtLeakage = 0;
  let inactiveBridges = 0;
  for (let index = 0; index < candidate.frames.length; index += 1) {
    const frame = candidate.frames[index]!;
    const prior = baseline.frames[index];
    const interval = intervalAt(frame.timeMs);
    if (!interval) {
      issues.push(`Captured frame ${frame.timeMs}ms has no participation state.`);
      continue;
    }
    const targets = targetNeutral(frame);
    const expectedState = interval.state === 'unknown' ? 'unresolved' : interval.state;
    if (interval.state === 'active') {
      if (!['resolved', 'unresolved'].includes(frame.targetStatus)) issues.push(`Active frame ${frame.timeMs}ms has invalid ${frame.targetStatus} state.`);
    } else if (frame.targetStatus !== expectedState) {
      issues.push(`Frame ${frame.timeMs}ms is ${frame.targetStatus}, but the participation ledger requires ${expectedState}.`);
      if (targets.length) inactiveBridges += 1;
    }
    if (frame.targetStatus === 'resolved' && targets.length !== 1) issues.push(`Resolved frame ${frame.timeMs}ms does not have exactly one target.`);
    if (frame.targetStatus !== 'resolved' && targets.length) issues.push(`Non-resolved frame ${frame.timeMs}ms contains target traffic.`);
    for (const target of targets) {
      const sourcePlayer = prior?.players.find((player) => player.trackId === target.trackId);
      if (!sourcePlayer || sourcePlayer.team === 'opponent') opponentOrOtherCourtLeakage += 1;
    }
  }
  if (opponentOrOtherCourtLeakage) issues.push(`${opponentOrOtherCourtLeakage} opponent or opposite-court assignment(s) leaked into target traffic.`);
  if (inactiveBridges) issues.push(`${inactiveBridges} target assignment(s) bridge a non-active interval.`);

  const segmentIds = new Set(maskTrack.segments.map((segment) => segment.id));
  for (const stint of ledger.stints) {
    const segment = maskTrack.segments.find((candidateSegment) => candidateSegment.id === stint.id);
    if (!segment) {
      issues.push(`Active stint ${stint.id} has no reviewed mask receipt.`);
      continue;
    }
    if (segment.startMs !== stint.startMs || segment.endMs > stint.endMs || segment.seed.timeMs !== stint.entrySeed.timeMs) issues.push(`Mask segment ${segment.id} does not match its reviewed participation boundary and seed.`);
  }
  for (const segmentId of segmentIds) {
    if (!ledger.stints.some((stint) => stint.id === segmentId)) issues.push(`Mask segment ${segmentId} is not present in the reviewed participation ledger.`);
  }

  const stateTotals = {
    frameCount: candidate.frames.length,
    resolved: candidate.frames.filter((frame) => frame.targetStatus === 'resolved').length,
    unresolved: candidate.frames.filter((frame) => frame.targetStatus === 'unresolved').length,
    inactive: candidate.frames.filter((frame) => frame.targetStatus === 'inactive').length,
    outOfFrame: candidate.frames.filter((frame) => frame.targetStatus === 'out-of-frame').length
  };
  if (stateTotals.resolved + stateTotals.unresolved + stateTotals.inactive + stateTotals.outOfFrame !== stateTotals.frameCount) issues.push('Full-flow state totals do not equal the captured frame count.');

  const resolvedTargets = candidate.frames.flatMap((frame) => frame.targetStatus === 'resolved' ? targetNeutral(frame) : []);
  const calibratedCoordinates = resolvedTargets.filter((target) => target.projection === 'calibrated').length;
  const estimatedCoordinates = resolvedTargets.length - calibratedCoordinates;
  const calibration = input.calibrationReceipt === undefined ? undefined : calibrationReceiptSchema.safeParse(input.calibrationReceipt);
  if (calibratedCoordinates && (!calibration?.success || calibration.data.sourceSha256 !== baseline.source.sha256)) issues.push('Calibrated coordinates lack a matching 2ft median / 4ft p95 held-out receipt.');

  const unresolvedIntervals: Array<{ startMs: number; endMs: number }> = [];
  for (const frame of candidate.frames.filter((item) => item.targetStatus === 'unresolved')) {
    const prior = unresolvedIntervals.at(-1);
    if (prior && frame.timeMs - prior.endMs <= 1000) prior.endMs = frame.timeMs;
    else unresolvedIntervals.push({ startMs: frame.timeMs, endMs: frame.timeMs });
  }
  const hardNegativeAssignments = identityReceipt.success && identityReceipt.data.hardNegativePrecision === 1 ? 0 : 1;
  const silentIdentitySwitches = identityReceipt.success ? 0 : 1;
  const promotable = issues.length === 0 && hardNegativeAssignments === 0 && silentIdentitySwitches === 0;
  return {
    version: 1,
    profile: FILM_FULL_FLOW_PROFILE,
    ok: promotable,
    promotable,
    decision: promotable ? 'promotable' : 'reject',
    issues,
    sourceSha256: baseline.source.sha256,
    sourceRevision: baseline.analysis.revision,
    candidateFingerprint: filmIdentityCandidateFingerprint(candidate),
    fingerprints,
    model: maskTrack.engine,
    coordinateSpace: maskTrack.coordinateSpace,
    stateTotals,
    unresolvedIntervals,
    reviewedStints: ledger.stints.length,
    heldOutChecks: participationReceipt.heldOutCount,
    reviewedMaskSamples: maskReceipt.sampleCount,
    hardNegativeAssignments,
    silentIdentitySwitches,
    inactiveBridges,
    opponentOrOtherCourtLeakage,
    substitutionAccuracy: identityReceipt.success ? identityReceipt.data.substitutionAccuracy : 0,
    calibration: {
      estimatedCoordinates,
      calibratedCoordinates,
      medianHeldOutErrorFeet: calibration?.success ? calibration.data.medianErrorFeet : null,
      p95HeldOutErrorFeet: calibration?.success ? calibration.data.p95ErrorFeet : null,
      label: calibratedCoordinates ? 'calibrated' : 'estimated'
    }
  };
}
