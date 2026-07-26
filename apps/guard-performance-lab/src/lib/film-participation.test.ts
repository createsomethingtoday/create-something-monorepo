import { describe, expect, it } from 'vitest';
import { verifyFilmParticipationLedger } from './film-participation.js';

const sourceSha256 = '9'.repeat(64);
const frame = (timeMs: number, crop?: string) =>
  `source-sha256://${sourceSha256}?timeMs=${timeMs}${crop ? `&crop=${crop}` : ''}`;

function completeLedger() {
  return {
    version: 1,
    profile: 'guard-player-participation-v1',
    sourceSha256,
    durationMs: 9_999,
    intervals: [
      {
        id: 'unknown-opening', startMs: 0, endMs: 999, state: 'unknown',
        evidence: { method: 'unreviewed', reviewer: 'codex', note: 'No visible entry is proven.' }
      },
      {
        id: 'active-first', startMs: 1_000, endMs: 4_999, state: 'active',
        evidence: { method: 'bounded-source-review', reviewer: 'codex', note: '#13 is in the foreground five.', sourceFrames: [frame(1_000)] }
      },
      {
        id: 'inactive-bench', startMs: 5_000, endMs: 7_999, state: 'inactive',
        evidence: { method: 'substitution-review', reviewer: 'codex', note: '#13 has left live traffic.', sourceFrames: [frame(5_000)] }
      },
      {
        id: 'out-final', startMs: 8_000, endMs: 9_999, state: 'out-of-frame',
        evidence: { method: 'out-of-frame-review', reviewer: 'codex', note: '#13 remains active but the camera excludes him.', sourceFrames: [frame(8_000)] }
      }
    ],
    stints: [
      {
        id: 'first', startMs: 1_000, endMs: 4_999,
        entrySeed: { timeMs: 1_000, cropBounds: [100, 200, 40, 120], reviewer: 'codex', sourceFrame: frame(1_000, '100,200,140,320') },
        exitBoundary: { timeMs: 5_000, state: 'inactive', reviewer: 'codex', note: '#13 crosses to the bench.', sourceFrame: frame(5_000) },
        heldOut: [
          { timeMs: 2_000, reviewer: 'codex', note: 'Mask remains on #13.', sourceFrame: frame(2_000) },
          { timeMs: 4_000, reviewer: 'codex', note: 'Mask remains on #13 before exit.', sourceFrame: frame(4_000) }
        ]
      }
    ]
  };
}

describe('film participation ledger', () => {
  it('accepts exact full-duration coverage with direct entry, reviewed exit, and disjoint held-outs', () => {
    expect(verifyFilmParticipationLedger(completeLedger(), { sha256: sourceSha256, durationMs: 9_999 })).toEqual({
      ok: true,
      issues: [],
      intervalCount: 4,
      stintCount: 1,
      heldOutCount: 2,
      coveredDurationMs: 10_000
    });
  });

  it('rejects a gap, a seedless active interval, and a held-out reused as its seed', () => {
    const ledger = completeLedger();
    ledger.intervals[1]!.startMs = 1_001;
    ledger.stints[0]!.startMs = 1_001;
    ledger.stints[0]!.entrySeed.timeMs = 2_000;

    const result = verifyFilmParticipationLedger(ledger, { sha256: sourceSha256, durationMs: 9_999 });

    expect(result.ok).toBe(false);
    expect(result.issues.join(' ')).toContain('expected 1000ms');
    expect(result.issues.join(' ')).toContain('direct-number entry seed');
    expect(result.issues.join(' ')).toContain('reuses the entry seed');
  });
});
