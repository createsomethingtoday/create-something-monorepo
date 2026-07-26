import { z } from 'zod';

export const FILM_PARTICIPATION_PROFILE = 'guard-player-participation-v1';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const reviewerSchema = z.enum(['user', 'codex']);
const participationStateSchema = z.enum(['active', 'inactive', 'out-of-frame', 'unknown']);
const sourceEvidenceSchema = z.object({
  method: z.enum(['direct-number-review', 'bounded-source-review', 'substitution-review', 'out-of-frame-review', 'unreviewed']),
  reviewer: reviewerSchema,
  note: z.string().trim().min(1),
  sourceFrames: z.array(z.string().min(1)).optional()
});

const participationIntervalSchema = z.object({
  id: z.string().min(1),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  state: participationStateSchema,
  evidence: sourceEvidenceSchema
});

const reviewedFrameSchema = z.object({
  timeMs: z.number().int().nonnegative(),
  reviewer: reviewerSchema,
  note: z.string().trim().min(1),
  sourceFrame: z.string().min(1)
});

const activeStintSchema = z.object({
  id: z.string().min(1),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  entrySeed: z.object({
    timeMs: z.number().int().nonnegative(),
    cropBounds: z.tuple([
      z.number().int().nonnegative(),
      z.number().int().nonnegative(),
      z.number().int().positive(),
      z.number().int().positive()
    ]),
    reviewer: reviewerSchema,
    sourceFrame: z.string().min(1)
  }),
  exitBoundary: reviewedFrameSchema.extend({ state: z.enum(['inactive', 'out-of-frame', 'unknown']) }),
  heldOut: z.array(reviewedFrameSchema).min(2)
});

export const filmParticipationLedgerSchema = z.object({
  version: z.literal(1),
  profile: z.literal(FILM_PARTICIPATION_PROFILE),
  sourceSha256: sha256Schema,
  durationMs: z.number().int().positive(),
  intervals: z.array(participationIntervalSchema).min(1),
  stints: z.array(activeStintSchema)
});

type SourceReceipt = { sha256: string; durationMs: number };

function sourceFrameMatches(frame: string, sourceSha256: string, timeMs: number) {
  return frame.startsWith(`source-sha256://${sourceSha256}?`) && new URL(frame).searchParams.get('timeMs') === String(timeMs);
}

export function verifyFilmParticipationLedger(input: unknown, source: SourceReceipt) {
  const parsed = filmParticipationLedgerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, issues: parsed.error.issues.map((issue) => issue.message), intervalCount: 0, stintCount: 0, heldOutCount: 0, coveredDurationMs: 0 };
  }

  const ledger = parsed.data;
  const issues: string[] = [];
  if (ledger.sourceSha256 !== source.sha256) issues.push('Participation ledger source hash does not match the supplied film source.');
  if (ledger.durationMs !== source.durationMs) issues.push(`Participation ledger duration ${ledger.durationMs}ms does not match source duration ${source.durationMs}ms.`);

  const intervals = [...ledger.intervals].sort((left, right) => left.startMs - right.startMs);
  const intervalIds = new Set<string>();
  for (let index = 0; index < intervals.length; index += 1) {
    const interval = intervals[index]!;
    if (intervalIds.has(interval.id)) issues.push(`Duplicate participation interval id: ${interval.id}.`);
    intervalIds.add(interval.id);
    if (interval.endMs < interval.startMs) issues.push(`Participation interval ${interval.id} ends before it starts.`);
    const expectedStart = index === 0 ? 0 : intervals[index - 1]!.endMs + 1;
    if (interval.startMs !== expectedStart) issues.push(`Participation ledger has a gap or overlap before ${interval.id}; expected ${expectedStart}ms and received ${interval.startMs}ms.`);
    if (interval.state === 'unknown' && interval.evidence.method !== 'unreviewed') issues.push(`Unknown interval ${interval.id} must use unreviewed evidence.`);
    if (interval.state !== 'unknown' && interval.evidence.method === 'unreviewed') issues.push(`Non-unknown interval ${interval.id} requires reviewed source evidence.`);
    if (interval.state === 'inactive' && interval.evidence.method !== 'substitution-review') issues.push(`Inactive interval ${interval.id} requires substitution-review evidence.`);
    if (interval.state === 'out-of-frame' && interval.evidence.method !== 'out-of-frame-review') issues.push(`Out-of-frame interval ${interval.id} requires out-of-frame-review evidence.`);
    if (interval.state !== 'unknown') {
      if (!interval.evidence.sourceFrames?.length) issues.push(`Reviewed interval ${interval.id} requires at least one source frame.`);
      for (const frame of interval.evidence.sourceFrames ?? []) {
        if (!frame.startsWith(`source-sha256://${ledger.sourceSha256}?`)) issues.push(`Interval ${interval.id} contains a source frame from a different source.`);
      }
    }
  }
  if (intervals.at(-1)?.endMs !== ledger.durationMs) issues.push(`Participation ledger must cover through ${ledger.durationMs}ms.`);

  const activeIntervals = intervals.filter((interval) => interval.state === 'active');
  const stintIds = new Set<string>();
  const heldOutTimes = new Set<number>();
  for (const stint of ledger.stints) {
    if (stintIds.has(stint.id)) issues.push(`Duplicate active stint id: ${stint.id}.`);
    stintIds.add(stint.id);
    const interval = activeIntervals.find((candidate) => candidate.startMs === stint.startMs && candidate.endMs === stint.endMs);
    if (!interval) issues.push(`Active stint ${stint.id} does not exactly match one active participation interval.`);
    if (stint.entrySeed.timeMs !== stint.startMs) issues.push(`Active stint ${stint.id} requires a direct-number entry seed at ${stint.startMs}ms.`);
    if (!sourceFrameMatches(stint.entrySeed.sourceFrame, ledger.sourceSha256, stint.entrySeed.timeMs)) issues.push(`Active stint ${stint.id} entry seed is not bound to its exact source time.`);
    const expectedExitTime = stint.endMs + 1;
    if (stint.exitBoundary.timeMs !== expectedExitTime) issues.push(`Active stint ${stint.id} exit boundary must be ${expectedExitTime}ms.`);
    if (!sourceFrameMatches(stint.exitBoundary.sourceFrame, ledger.sourceSha256, stint.exitBoundary.timeMs)) issues.push(`Active stint ${stint.id} exit boundary is not bound to its exact source time.`);
    const nextInterval = intervals.find((candidate) => candidate.startMs === expectedExitTime);
    if (nextInterval && nextInterval.state !== stint.exitBoundary.state) issues.push(`Active stint ${stint.id} exit state disagrees with the next participation interval.`);
    const localHeldOut = new Set<number>();
    for (const heldOut of stint.heldOut) {
      if (heldOut.timeMs === stint.entrySeed.timeMs) issues.push(`Active stint ${stint.id} reuses the entry seed as a held-out review.`);
      if (heldOut.timeMs < stint.startMs || heldOut.timeMs > stint.endMs) issues.push(`Active stint ${stint.id} has a held-out review outside its interval.`);
      if (localHeldOut.has(heldOut.timeMs)) issues.push(`Active stint ${stint.id} repeats held-out time ${heldOut.timeMs}ms.`);
      if (heldOutTimes.has(heldOut.timeMs)) issues.push(`Held-out time ${heldOut.timeMs}ms is reused across active stints.`);
      localHeldOut.add(heldOut.timeMs);
      heldOutTimes.add(heldOut.timeMs);
      if (!sourceFrameMatches(heldOut.sourceFrame, ledger.sourceSha256, heldOut.timeMs)) issues.push(`Active stint ${stint.id} held-out review at ${heldOut.timeMs}ms is not bound to its exact source time.`);
    }
  }
  for (const interval of activeIntervals) {
    if (!ledger.stints.some((stint) => stint.startMs === interval.startMs && stint.endMs === interval.endMs)) issues.push(`Active interval ${interval.id} has no direct-number-seeded stint.`);
  }

  return {
    ok: issues.length === 0,
    issues,
    intervalCount: intervals.length,
    stintCount: ledger.stints.length,
    heldOutCount: heldOutTimes.size,
    coveredDurationMs: intervals.reduce((total, interval) => total + Math.max(0, interval.endMs - interval.startMs + 1), 0)
  };
}
