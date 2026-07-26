import { describe, expect, it } from 'vitest';
import { captureFilmAnalysis, FILM_BENCHMARK_PROFILE, FILM_IDENTITY_BENCHMARK_PROFILE, FILM_MASK_TRACK_PROFILE, filmIdentityCandidateFingerprint } from './film.js';
import { verifyFilmFullFlow } from './film-full-flow.js';

describe('film full-flow verifier', () => {
  it('requires exact ledger state accounting and binds every reviewed stint to the candidate', () => {
    const source = { sha256: 'a'.repeat(64), durationMs: 2000, width: 1920, height: 1080, fps: 30, byteSize: 100, linkedPath: '/private/source.mp4' };
    const baseline = captureFilmAnalysis({ source, frames: [
      { timeMs: 0, targetStatus: 'unresolved', players: [{ trackId: 'p-13', team: 'teammate', court: [10, 20], image: [0.25, 0.7], confidence: 0.9 }] },
      { timeMs: 500, targetStatus: 'unresolved', players: [{ trackId: 'p-13', team: 'teammate', court: [11, 20], image: [0.26, 0.7], confidence: 0.9 }] },
      { timeMs: 1000, targetStatus: 'unresolved', players: [] },
      { timeMs: 2000, targetStatus: 'unresolved', players: [] }
    ] });
    const candidate = {
      version: 1 as const, source, profile: FILM_BENCHMARK_PROFILE as typeof FILM_BENCHMARK_PROFILE, derivedFromRevision: 1 as const,
      personDetectionExecuted: false as const, identityPolicy: 'segmentation-mask-direct-reseed-fail-closed-v1' as const,
      frames: [
        { ...baseline.frames[0]!, targetStatus: 'resolved' as const, players: baseline.frames[0]!.players.map((player) => ({ ...player, team: 'target' as const })), identityEvidence: { method: 'direct-number' } },
        { ...baseline.frames[1]!, targetStatus: 'resolved' as const, players: baseline.frames[1]!.players.map((player) => ({ ...player, team: 'target' as const })), identityEvidence: { method: 'segmentation-mask', segmentId: 'stint-1' } },
        { ...baseline.frames[2]!, targetStatus: 'unresolved' as const },
        { ...baseline.frames[3]!, targetStatus: 'inactive' as const, identityEvidence: { method: 'substitution-ledger' } }
      ]
    };
    const sourceFrame = (timeMs: number) => `source-sha256://${source.sha256}?timeMs=${timeMs}`;
    const ledger = {
      version: 1, profile: 'guard-player-participation-v1', sourceSha256: source.sha256, durationMs: source.durationMs,
      intervals: [
        { id: 'active', startMs: 0, endMs: 999, state: 'active', evidence: { method: 'direct-number-review', reviewer: 'codex', note: 'reviewed', sourceFrames: [sourceFrame(0)] } },
        { id: 'unknown', startMs: 1000, endMs: 1999, state: 'unknown', evidence: { method: 'unreviewed', reviewer: 'codex', note: 'unproven' } },
        { id: 'inactive', startMs: 2000, endMs: 2000, state: 'inactive', evidence: { method: 'substitution-review', reviewer: 'codex', note: 'reviewed bench', sourceFrames: [sourceFrame(2000)] } }
      ],
      stints: [{
        id: 'stint-1', startMs: 0, endMs: 999,
        entrySeed: { timeMs: 0, cropBounds: [400, 300, 160, 440], reviewer: 'codex', sourceFrame: sourceFrame(0) },
        exitBoundary: { timeMs: 1000, state: 'unknown', reviewer: 'codex', note: 'exit', sourceFrame: sourceFrame(1000) },
        heldOut: [
          { timeMs: 250, reviewer: 'codex', note: 'held out one', sourceFrame: sourceFrame(250) },
          { timeMs: 750, reviewer: 'codex', note: 'held out two', sourceFrame: sourceFrame(750) }
        ]
      }]
    };
    const maskTrack = {
      version: 1, profile: FILM_MASK_TRACK_PROFILE, sourceSha256: source.sha256, coordinateSpace: { width: 1920, height: 1080 },
      engine: { name: 'sam2.1-video-local', model: 'sam2.1_hiera_small', modelSha256: 'b'.repeat(64), device: 'mps' },
      participation: [{ startMs: 0, endMs: 999, state: 'active', evidence: 'reviewed' }],
      segments: [{ id: 'stint-1', startMs: 0, endMs: 999, seed: { timeMs: 0, box: [400, 300, 160, 440], reviewer: 'codex' }, samples: [
        { timeMs: 0, box: [400, 300, 160, 440], foot: [480, 740], confidence: 1, provenance: 'seed' },
        { timeMs: 500, box: [420, 300, 160, 440], foot: [500, 740], confidence: 0.98, provenance: 'propagated' }
      ] }]
    };
    const identityReceipt = { ok: true, benchmarkProfile: FILM_IDENTITY_BENCHMARK_PROFILE, sourceSha256: source.sha256, candidateFingerprint: filmIdentityCandidateFingerprint(candidate), correctionOverlayCount: 0, invariantIssues: [], positiveRecall: 1, hardNegativePrecision: 1, substitutionAccuracy: 1, scoreIssues: [] };
    const receipt = verifyFilmFullFlow({ baseline, candidate, participation: ledger, maskTrack, identityReceipt, fingerprints: { analysisSha256: 'c'.repeat(64), participationSha256: 'd'.repeat(64), maskTrackSha256: 'e'.repeat(64), candidateSha256: 'f'.repeat(64) } });
    expect(receipt).toMatchObject({ ok: true, promotable: true, stateTotals: { frameCount: 4, resolved: 2, unresolved: 1, inactive: 1, outOfFrame: 0 }, reviewedStints: 1, heldOutChecks: 2, hardNegativeAssignments: 0, inactiveBridges: 0, opponentOrOtherCourtLeakage: 0 });

    const unsafe = structuredClone(candidate);
    unsafe.frames[2]!.targetStatus = 'resolved';
    unsafe.frames[2]!.players = [{ trackId: 'leak', team: 'target', court: [20, 20], confidence: 0.9, provenance: 'model' }];
    expect(verifyFilmFullFlow({ baseline, candidate: unsafe, participation: ledger, maskTrack, identityReceipt, fingerprints: { analysisSha256: 'c'.repeat(64), participationSha256: 'd'.repeat(64), maskTrackSha256: 'e'.repeat(64), candidateSha256: 'f'.repeat(64) } }).promotable).toBe(false);
  });
});
