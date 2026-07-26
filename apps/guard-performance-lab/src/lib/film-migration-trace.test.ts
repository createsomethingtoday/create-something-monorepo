import { describe, expect, it } from 'vitest';
import { FILM_BENCHMARK_PROFILE, filmIdentityCandidateFingerprint } from './film.js';
import { verifyFilmMigrationTrace } from './film-migration-trace.js';

function migrationFixture(resolvedActiveIndices: number[]) {
  const source = {
    sha256: 'a'.repeat(64),
    durationMs: 10_000,
    width: 1920,
    height: 1080,
    fps: 30,
    byteSize: 100,
    linkedPath: '/private/source.mp4'
  };
  const frames = Array.from({ length: 11 }, (_, index) => {
    const timeMs = index * 1_000;
    const active = index < 10;
    const resolved = active && resolvedActiveIndices.includes(index);
    return {
      timeMs,
      targetStatus: resolved ? 'resolved' as const : active ? 'unresolved' as const : 'inactive' as const,
      playState: 'unknown' as const,
      players: active
        ? [{ trackId: `p-${index}`, team: resolved ? 'target' as const : 'teammate' as const, court: [10 + index, 20] as [number, number], confidence: 0.95, provenance: 'model' as const, projection: 'estimated' as 'estimated' | 'calibrated' }]
        : [],
      ignored: [],
      identityEvidence: resolved
        ? { method: index === 0 ? 'direct-number' : 'segmentation-mask', segmentId: 'stint-1' }
        : active
          ? undefined
          : { method: 'substitution-ledger' }
    };
  });
  const candidate = {
    version: 1 as const,
    source,
    profile: FILM_BENCHMARK_PROFILE as typeof FILM_BENCHMARK_PROFILE,
    derivedFromRevision: 2 as const,
    personDetectionExecuted: false as const,
    identityPolicy: 'segmentation-mask-direct-reseed-fail-closed-v1' as const,
    frames
  };
  const sourceFrame = (timeMs: number) => `source-sha256://${source.sha256}?timeMs=${timeMs}`;
  const participation = {
    version: 1 as const,
    profile: 'guard-player-participation-v1' as const,
    sourceSha256: source.sha256,
    durationMs: source.durationMs,
    intervals: [
      { id: 'active-1', startMs: 0, endMs: 9_999, state: 'active' as const, evidence: { method: 'direct-number-review' as const, reviewer: 'codex' as const, note: 'Confirmed active and visible.', sourceFrames: [sourceFrame(0), sourceFrame(9_000)] } },
      { id: 'inactive-1', startMs: 10_000, endMs: 10_000, state: 'inactive' as const, evidence: { method: 'substitution-review' as const, reviewer: 'codex' as const, note: 'Confirmed substitution.', sourceFrames: [sourceFrame(10_000)] } }
    ],
    stints: [{
      id: 'stint-1',
      startMs: 0,
      endMs: 9_999,
      entrySeed: { timeMs: 0, cropBounds: [400, 300, 160, 440] as [number, number, number, number], reviewer: 'codex' as const, sourceFrame: sourceFrame(0) },
      exitBoundary: { timeMs: 10_000, state: 'inactive' as const, reviewer: 'codex' as const, note: 'Confirmed substitution.', sourceFrame: sourceFrame(10_000) },
      heldOut: [
        { timeMs: 3_000, reviewer: 'codex' as const, note: 'Interior held-out frame.', sourceFrame: sourceFrame(3_000) },
        { timeMs: 8_000, reviewer: 'codex' as const, note: 'Exit held-out frame.', sourceFrame: sourceFrame(8_000) }
      ]
    }]
  };
  return {
    candidate,
    participation,
    fullFlowReceipt: {
      profile: 'guard-player-13-full-flow-v1',
      ok: true,
      promotable: true,
      sourceSha256: source.sha256,
      sourceRevision: 2,
      candidateFingerprint: filmIdentityCandidateFingerprint(candidate),
      hardNegativeAssignments: 0,
      silentIdentitySwitches: 0,
      inactiveBridges: 0,
      opponentOrOtherCourtLeakage: 0
    },
    fingerprints: {
      participationSha256: 'b'.repeat(64),
      candidateSha256: 'c'.repeat(64),
      fullFlowReceiptSha256: 'd'.repeat(64)
    }
  };
}

describe('film migration trace verifier', () => {
  it('rejects a sparse trace below 90% of confirmed active-visible samples', () => {
    const receipt = verifyFilmMigrationTrace(migrationFixture([0, 1, 2, 3, 4, 5, 6, 7]));

    expect(receipt).toMatchObject({
      ok: false,
      promotable: false,
      activeVisible: { frameCount: 10, resolved: 8, coverage: 0.8 }
    });
    expect(receipt.issues).toContain('Active-visible identity coverage 80% is below 90%.');
  });

  it('emits a visible path break instead of bridging an unresolved active sample', () => {
    const receipt = verifyFilmMigrationTrace(migrationFixture([0, 1, 2, 3, 5, 6, 7, 8, 9]));

    expect(receipt).toMatchObject({
      ok: true,
      activeVisible: {
        frameCount: 10,
        resolved: 9,
        coverage: 0.9,
        pathSegmentCount: 2,
        longestUnresolvedGapMs: 1_000,
        unresolvedGaps: [{ startMs: 4_000, endMs: 4_000, durationMs: 1_000, sampleCount: 1 }]
      }
    });
  });

  it('rejects calibrated path points without a passing source-bound camera-state receipt', () => {
    const fixture = migrationFixture([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    fixture.candidate.frames[4]!.players[0]!.projection = 'calibrated';
    fixture.fullFlowReceipt.candidateFingerprint = filmIdentityCandidateFingerprint(fixture.candidate);
    const receipt = verifyFilmMigrationTrace(fixture);

    expect(receipt).toMatchObject({
      ok: false,
      coordinates: { estimated: 9, calibrated: 1, passingCameraStates: 0 }
    });
    expect(receipt.issues).toContain('Calibrated target at 4000ms has no passing source-bound camera-state receipt.');
  });

  it('accepts calibrated points only inside a passing held-out camera state', () => {
    const fixture = migrationFixture([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    fixture.candidate.frames[4]!.players[0]!.projection = 'calibrated';
    fixture.fullFlowReceipt.candidateFingerprint = filmIdentityCandidateFingerprint(fixture.candidate);
    const receipt = verifyFilmMigrationTrace({
      ...fixture,
      cameraStates: [{
        id: 'wide-1', startMs: 0, endMs: 9_999,
        calibration: {
          ok: true, sourceSha256: fixture.candidate.source.sha256,
          medianErrorFeet: 1.5, p95ErrorFeet: 3.5,
          keypointsSha256: 'e'.repeat(64), heldOutSha256: 'f'.repeat(64)
        }
      }]
    });

    expect(receipt).toMatchObject({ ok: true, coordinates: { estimated: 9, calibrated: 1, passingCameraStates: 1 } });
  });

  it('rejects a full-flow receipt bound to another identity candidate', () => {
    const fixture = migrationFixture([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    fixture.fullFlowReceipt.candidateFingerprint = 'fnv1a32-deadbeef';
    const receipt = verifyFilmMigrationTrace(fixture);

    expect(receipt.ok).toBe(false);
    expect(receipt.issues).toContain('Full-flow receipt candidate fingerprint does not match the migration candidate.');
  });
});
