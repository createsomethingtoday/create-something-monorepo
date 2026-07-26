import { z } from 'zod';
import { filmIdentityCandidateFingerprint, filmIdentityCandidateSchema } from './film.js';
import { filmParticipationLedgerSchema, verifyFilmParticipationLedger } from './film-participation.js';

export const FILM_MIGRATION_TRACE_PROFILE = 'guard-player-13-migration-trace-v1';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const fullFlowReceiptSchema = z.object({
  profile: z.literal('guard-player-13-full-flow-v1'),
  ok: z.literal(true),
  promotable: z.literal(true),
  sourceSha256: sha256Schema,
  sourceRevision: z.union([z.literal(1), z.literal(2)]),
  candidateFingerprint: z.string().min(1),
  hardNegativeAssignments: z.literal(0),
  silentIdentitySwitches: z.literal(0),
  inactiveBridges: z.literal(0),
  opponentOrOtherCourtLeakage: z.literal(0)
}).passthrough();
const cameraStateSchema = z.object({
  id: z.string().min(1),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  calibration: z.object({
    ok: z.literal(true),
    sourceSha256: sha256Schema,
    medianErrorFeet: z.number().max(2),
    p95ErrorFeet: z.number().max(4),
    keypointsSha256: sha256Schema,
    heldOutSha256: sha256Schema
  })
});

type MigrationTraceInput = {
  candidate: unknown;
  participation: unknown;
  fullFlowReceipt: unknown;
  cameraStates?: unknown;
  fingerprints: {
    participationSha256: string;
    candidateSha256: string;
    fullFlowReceiptSha256: string;
  };
};

function typicalSampleCadenceMs(times: number[]) {
  const gaps = times.slice(1).map((timeMs, index) => timeMs - times[index]!).filter((gap) => gap > 0).toSorted((left, right) => left - right);
  return gaps.length ? gaps[Math.floor(gaps.length / 2)]! : 0;
}

export function verifyFilmMigrationTrace(input: MigrationTraceInput) {
  const candidate = filmIdentityCandidateSchema.parse(input.candidate);
  const participation = filmParticipationLedgerSchema.parse(input.participation);
  const fullFlowReceipt = fullFlowReceiptSchema.safeParse(input.fullFlowReceipt);
  const cameraStates = z.array(cameraStateSchema).parse(input.cameraStates ?? []);
  const fingerprints = z.object({
    participationSha256: sha256Schema,
    candidateSha256: sha256Schema,
    fullFlowReceiptSha256: sha256Schema
  }).parse(input.fingerprints);
  const issues: string[] = [];
  const participationReceipt = verifyFilmParticipationLedger(participation, candidate.source);
  if (!participationReceipt.ok) issues.push(...participationReceipt.issues);
  if (participation.sourceSha256 !== candidate.source.sha256) issues.push('Migration participation and candidate source fingerprints do not match.');
  if (!fullFlowReceipt.success) {
    issues.push('The migration candidate lacks a passing fail-closed full-flow receipt.');
  } else {
    if (fullFlowReceipt.data.sourceSha256 !== candidate.source.sha256) issues.push('Full-flow receipt source fingerprint does not match the migration candidate.');
    if (fullFlowReceipt.data.candidateFingerprint !== filmIdentityCandidateFingerprint(candidate)) issues.push('Full-flow receipt candidate fingerprint does not match the migration candidate.');
  }

  const activeIntervals = participation.intervals.filter((interval) => interval.state === 'active');
  const activeFrames = candidate.frames.filter((frame) => activeIntervals.some((interval) => frame.timeMs >= interval.startMs && frame.timeMs <= interval.endMs));
  const resolvedActiveFrames = activeFrames.filter((frame) => frame.targetStatus === 'resolved');
  const coverage = activeFrames.length ? resolvedActiveFrames.length / activeFrames.length : 0;
  if (coverage < 0.9) issues.push(`Active-visible identity coverage ${Math.round(coverage * 1_000) / 10}% is below 90%.`);
  const cadenceMs = typicalSampleCadenceMs(candidate.frames.map((frame) => frame.timeMs));
  const unresolvedGaps: Array<{ startMs: number; endMs: number; durationMs: number; sampleCount: number }> = [];
  let pathSegmentCount = 0;
  for (const interval of activeIntervals) {
    const frames = candidate.frames.filter((frame) => frame.timeMs >= interval.startMs && frame.timeMs <= interval.endMs);
    let inResolvedSegment = false;
    let unresolvedGap: { startMs: number; endMs: number; sampleCount: number } | undefined;
    for (const frame of frames) {
      if (frame.targetStatus === 'resolved') {
        if (!inResolvedSegment) pathSegmentCount += 1;
        inResolvedSegment = true;
        if (unresolvedGap) {
          unresolvedGaps.push({ ...unresolvedGap, durationMs: unresolvedGap.endMs - unresolvedGap.startMs + cadenceMs });
          unresolvedGap = undefined;
        }
        continue;
      }
      inResolvedSegment = false;
      if (unresolvedGap) {
        unresolvedGap.endMs = frame.timeMs;
        unresolvedGap.sampleCount += 1;
      } else {
        unresolvedGap = { startMs: frame.timeMs, endMs: frame.timeMs, sampleCount: 1 };
      }
    }
    if (unresolvedGap) unresolvedGaps.push({ ...unresolvedGap, durationMs: unresolvedGap.endMs - unresolvedGap.startMs + cadenceMs });
  }
  const longestUnresolvedGapMs = unresolvedGaps.reduce((longest, gap) => Math.max(longest, gap.durationMs), 0);
  const resolvedTargets = resolvedActiveFrames.flatMap((frame) => {
    const target = frame.players.find((player) => player.team === 'target');
    return target ? [{ frame, target }] : [];
  });
  const passingCameraStates = cameraStates.filter((state) => state.calibration.sourceSha256 === candidate.source.sha256);
  for (const { frame, target } of resolvedTargets) {
    if (target.projection !== 'calibrated') continue;
    const cameraState = passingCameraStates.find((state) => frame.timeMs >= state.startMs && frame.timeMs <= state.endMs);
    if (!cameraState) issues.push(`Calibrated target at ${frame.timeMs}ms has no passing source-bound camera-state receipt.`);
  }
  const calibratedCoordinates = resolvedTargets.filter(({ target }) => target.projection === 'calibrated').length;
  const estimatedCoordinates = resolvedTargets.length - calibratedCoordinates;

  const promotable = issues.length === 0;
  return {
    version: 1,
    profile: FILM_MIGRATION_TRACE_PROFILE,
    ok: promotable,
    promotable,
    decision: promotable ? 'promotable' : 'reject',
    issues,
    sourceSha256: candidate.source.sha256,
    sourceRevision: candidate.derivedFromRevision,
    candidateFingerprint: filmIdentityCandidateFingerprint(candidate),
    fingerprints,
    activeVisible: {
      frameCount: activeFrames.length,
      resolved: resolvedActiveFrames.length,
      coverage,
      pathSegmentCount,
      longestUnresolvedGapMs,
      unresolvedGaps
    },
    coordinates: {
      estimated: estimatedCoordinates,
      calibrated: calibratedCoordinates,
      passingCameraStates: passingCameraStates.length
    }
  };
}
