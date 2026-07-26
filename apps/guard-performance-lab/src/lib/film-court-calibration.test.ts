import { describe, expect, it } from 'vitest';
import { applyFilmCourtCalibration } from './film-court-calibration.js';

const sha256 = 'a'.repeat(64);
const source = {
  version: 1,
  profile: 'guard-player-trace-v1',
  source: { sha256, durationMs: 2_000, width: 1920, height: 1080, fps: 30, byteSize: 1, linkedPath: '/private/source.mp4' },
  analysis: {
    revision: 3,
    executionCount: 1,
    analyzedAt: '2026-07-20T00:00:00Z',
    derivedFromRevision: 2,
    personDetectionExecuted: false,
    identityExecutionCount: 1,
    identityPolicy: 'segmentation-mask-direct-reseed-fail-closed-v1',
    identityVerification: {
      benchmarkProfile: 'guard-player-13-identity-v3', candidateFingerprint: 'fixture', positiveRecall: 1,
      hardNegativePrecision: 1, substitutionAccuracy: 1, correctionOverlayCount: 0
    }
  },
  frames: [
    { timeMs: 0, targetStatus: 'resolved', playState: 'live-offense', players: [{ trackId: '13', team: 'target', court: [47, 25], image: [0.5, 0.5], confidence: 1, provenance: 'model', projection: 'estimated' }], ignored: [] },
    { timeMs: 1_000, targetStatus: 'resolved', playState: 'live-offense', players: [{ trackId: '13', team: 'target', court: [47, 25], image: [0.5, 0.5], confidence: 1, provenance: 'model', projection: 'estimated' }], ignored: [] }
  ]
};

const manifest = {
  version: 1,
  profile: 'fieldhouseusa-mansfield-high-school-84x50-v1',
  sourceSha256: sha256,
  personDetectionExecuted: false,
  cameraStates: [{
    id: 'camera-0', startMs: 0, endMs: 0, floorContactMethod: 'segmentation-mask-bottom',
    keypoints: [
      { id: 'a', image: [0, 1], court: [0, 0] }, { id: 'b', image: [0, 0], court: [0, 50] },
      { id: 'c', image: [1, 1], court: [84, 0] }, { id: 'd', image: [1, 0], court: [84, 50] }
    ],
    heldOut: [{ id: 'e', image: [0.5, 0.5], court: [42, 25] }, { id: 'f', image: [0.25, 0.5], court: [21, 25] }]
  }]
};

describe('source-bound Mansfield court calibration successor', () => {
  it('calibrates only covered source footpoints and preserves uncovered points as estimates', () => {
    const result = applyFilmCourtCalibration(source, manifest, '2026-07-20T01:00:00Z');
    expect(result.analysis).toMatchObject({
      revision: 4,
      derivedFromRevision: 3,
      personDetectionExecuted: false,
      courtCalibrationVerification: { passingCameraStates: 1, calibratedCoordinates: 1, estimatedCoordinates: 1, maximumStateP95ErrorFeet: 0 }
    });
    expect(result.frames[0]!.players[0]).toMatchObject({
      court: [42, 25], projection: 'calibrated', zone: 'center-circle',
      courtGeometry: { profile: manifest.profile, cameraStateId: 'camera-0', uncertaintyFeet: 0 }
    });
    expect(result.frames[1]!.players[0]).toMatchObject({ court: [47, 25], projection: 'estimated' });
  });

  it('rejects a camera state above the one-foot p95 gate', () => {
    const failing = structuredClone(manifest);
    failing.cameraStates[0]!.heldOut[1]!.court = [19, 25];
    expect(() => applyFilmCourtCalibration(source, failing)).toThrow(/one-foot p95/i);
  });
});
