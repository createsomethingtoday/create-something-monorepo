import { z } from 'zod';
import { filmPlayStateLedgerSchema } from './film.js';

export const FILM_VJEPA_PLAY_STATE_PROFILE = 'guard-vjepa-play-state-candidate-v1' as const;
export type VjepaPlayStateLabel = 'live-basketball' | 'stopped-basketball';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const playStateLabelSchema = z.enum(['live-basketball', 'stopped-basketball']);

export const filmVjepaPlayStateCandidateSchema = z.object({
  version: z.literal(1),
  profile: z.literal(FILM_VJEPA_PLAY_STATE_PROFILE),
  sourceSha256: sha256Schema,
  input: z.discriminatedUnion('binding', [
    z.object({ binding: z.literal('exact-source-bytes'), sha256: sha256Schema }),
    z.object({
      binding: z.literal('youtube-remux'),
      sha256: sha256Schema,
      youtubeVideoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
      durationMs: z.number().int().positive(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      fps: z.number().positive()
    })
  ]),
  model: z.object({
    family: z.literal('V-JEPA 2.1'),
    architecture: z.literal('vit_base_384'),
    codeSha256: sha256Schema,
    checkpointSha256: sha256Schema,
    device: z.enum(['mps', 'cpu', 'cuda'])
  }),
  authority: z.object({
    identity: z.literal('none'),
    positions: z.literal('none'),
    autoApply: z.literal(false)
  }),
  labels: z.tuple([z.literal('live-basketball'), z.literal('stopped-basketball')]),
  windows: z.array(
    z.object({
      id: z.string().min(1),
      intervalId: z.string().min(1),
      startMs: z.number().int().nonnegative(),
      endMs: z.number().int().nonnegative(),
      split: z.enum(['train', 'heldout']),
      predictedLabel: playStateLabelSchema,
      confidence: z.number().min(0).max(1),
      embeddingSha256: sha256Schema
    })
  )
});

export function evaluateVjepaPlayStateCandidate(candidateInput: unknown, ledgerInput: unknown) {
  const candidate = filmVjepaPlayStateCandidateSchema.parse(candidateInput);
  const ledger = filmPlayStateLedgerSchema.parse(ledgerInput);
  if (candidate.sourceSha256 !== ledger.sourceSha256) {
    throw new Error('V-JEPA candidate source hash does not match the reviewed play-state ledger.');
  }
  if (
    candidate.input.binding === 'exact-source-bytes' &&
    candidate.input.sha256 !== candidate.sourceSha256
  ) {
    throw new Error('V-JEPA exact-source input hash does not match its canonical source hash.');
  }
  const trainingIntervals = new Set(
    candidate.windows
      .filter((window) => window.split === 'train')
      .map((window) => window.intervalId)
  );
  const heldOutIntervals = new Set(
    candidate.windows
      .filter((window) => window.split === 'heldout')
      .map((window) => window.intervalId)
  );
  const overlap = [...trainingIntervals]
    .filter((intervalId) => heldOutIntervals.has(intervalId))
    .sort();
  if (overlap.length)
    throw new Error(`V-JEPA training and held-out intervals overlap: ${overlap.join(', ')}.`);
  const reviewedIntervals = new Map(
    ledger.intervals
      .filter(
        (interval) => interval.state !== 'unknown' && interval.evidence.method === 'source-review'
      )
      .map((interval) => [interval.id, interval])
  );
  const expectedLabel = (
    state: z.infer<typeof filmPlayStateLedgerSchema>['intervals'][number]['state']
  ): VjepaPlayStateLabel =>
    ['live-offense', 'live-defense', 'transition-offense', 'transition-defense'].includes(state)
      ? 'live-basketball'
      : 'stopped-basketball';
  const reviewedWindows = candidate.windows.map((window) => {
    const interval = reviewedIntervals.get(window.intervalId);
    if (!interval)
      throw new Error(
        `V-JEPA window ${window.id} does not belong to a reviewed non-unknown play-state interval.`
      );
    if (
      window.startMs < interval.startMs ||
      window.endMs > interval.endMs ||
      window.endMs < window.startMs
    ) {
      throw new Error(
        `V-JEPA window ${window.id} crosses its reviewed play-state interval boundary.`
      );
    }
    return { ...window, expectedLabel: expectedLabel(interval.state) };
  });
  const heldOut = reviewedWindows.filter((window) => window.split === 'heldout');

  const score = (label: VjepaPlayStateLabel) => {
    const truePositive = heldOut.filter(
      (window) => window.expectedLabel === label && window.predictedLabel === label
    ).length;
    const falseNegative = heldOut.filter(
      (window) => window.expectedLabel === label && window.predictedLabel !== label
    ).length;
    const falsePositive = heldOut.filter(
      (window) => window.expectedLabel !== label && window.predictedLabel === label
    ).length;
    const recall = truePositive + falseNegative ? truePositive / (truePositive + falseNegative) : 0;
    const precision =
      truePositive + falsePositive ? truePositive / (truePositive + falsePositive) : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    return { recall, f1 };
  };
  const live = score('live-basketball');
  const stopped = score('stopped-basketball');
  const metrics = {
    heldOutWindowCount: heldOut.length,
    macroF1: (live.f1 + stopped.f1) / 2,
    liveRecall: live.recall,
    stoppedRecall: stopped.recall
  };
  const heldOutIntervalsByLabel = (label: VjepaPlayStateLabel) =>
    new Set(
      heldOut.filter((window) => window.expectedLabel === label).map((window) => window.intervalId)
    ).size;
  const adoptAssistiveProposals =
    heldOutIntervalsByLabel('live-basketball') >= 2 &&
    heldOutIntervalsByLabel('stopped-basketball') >= 2 &&
    metrics.macroF1 >= 0.8 &&
    metrics.liveRecall >= 0.8 &&
    metrics.stoppedRecall >= 0.9;
  return {
    ok: true as const,
    metrics,
    decision: {
      adoptAssistiveProposals,
      disposition: adoptAssistiveProposals
        ? ('assistive-play-state-proposals' as const)
        : ('retain-manual-review' as const),
      identityAuthority: 'none' as const,
      positionAuthority: 'none' as const,
      autoApply: false as const
    }
  };
}
