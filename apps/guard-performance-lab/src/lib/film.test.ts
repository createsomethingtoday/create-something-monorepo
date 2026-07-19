import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FILM_BENCHMARK_PROFILE, captureFilmAnalysis, capturedFilmAnalysisSchema, filmFrameAt, resolveFilmTrafficAt, scoreFilmBenchmark, scoreFilmTeamBenchmark, validateFilmBenchmark, validateFilmTeamBenchmark } from './film.js';

const source = { sha256: 'a'.repeat(64), durationMs: 5000, width: 1920, height: 1080, fps: 30, byteSize: 1000, linkedPath: '/private/source.mp4' };
const annotations = (startMs: number) => Array.from({ length: 20 }, (_, index) => ({ timeMs: startMs + index * 1000, target: { status: 'visible' as const, court: [index, 10] as [number, number], zone: 'frontcourt', trackId: '13', provenance: 'manual' as const } }));
const benchmark = { profile: FILM_BENCHMARK_PROFILE, clips: [
  { id: 'clear-half-court', startMs: 235000, endMs: 255000, annotations: annotations(235000) },
  { id: 'transition-wide', startMs: 1700000, endMs: 1720000, annotations: annotations(1700000) },
  { id: 'pan-occlusion', startMs: 2325000, endMs: 2345000, annotations: annotations(2325000) }
] };

describe('film benchmark contract', () => {
  it('requires the fixed three-clip golden benchmark', () => {
    expect(validateFilmBenchmark(benchmark)).toMatchObject({ ok: true, sampleCount: 60 });
    const missing = { ...benchmark, clips: benchmark.clips.slice(0, 2) };
    const result = validateFilmBenchmark(missing);
    expect(result.ok).toBe(false);
    expect(result.issues.join(' ')).toContain('pan-occlusion');
  });

  it('accepts the independently reviewed #13 fixture with all 60 required samples', () => {
    const fixture = JSON.parse(readFileSync(new URL('../../fixtures/film/player-13-golden.json', import.meta.url), 'utf8'));
    expect(validateFilmBenchmark(fixture)).toMatchObject({ ok: true, sampleCount: 60 });
    expect(fixture.clips.flatMap((clip: { annotations: Array<{ target: { status: string } }> }) => clip.annotations).filter((sample: { target: { status: string } }) => sample.target.status === 'visible')).toHaveLength(14);
  });

  it('captures one immutable analysis revision and reads it deterministically', () => {
    const captured = captureFilmAnalysis({ source, analyzedAt: '2026-07-19T12:00:00.000Z', frames: [
      { timeMs: 0, players: [{ trackId: '13', team: 'target', court: [10, 20], confidence: 0.9 }] },
      { timeMs: 1000, players: [{ trackId: '13', team: 'target', court: [12, 20], confidence: 0.9 }] }
    ] });
    expect(captured.analysis).toEqual({ revision: 1, executionCount: 1, analyzedAt: '2026-07-19T12:00:00.000Z' });
    expect(filmFrameAt(captured, 999)?.timeMs).toBe(0);
    expect(filmFrameAt(captured, 999)).toEqual(filmFrameAt(captured, 999));
    expect(captured.analysis.executionCount).toBe(1);
  });

  it('accepts a separate revision 2 while retaining ignored opposite-court audit evidence', () => {
    const revision1 = captureFilmAnalysis({ source, frames: [{ timeMs: 0, players: [] }] });
    const revision2 = { ...revision1, analysis: { ...revision1.analysis, revision: 2 as const }, frames: [{ timeMs: 0, targetStatus: 'out-of-frame' as const, players: [], ignored: [{ trackId: 'far-1', role: 'ignore' as const, image: [0.1, 0.5] as [number, number], confidence: 0.9, courtMembership: 'opposite-court' as const, reason: 'outside-foreground-court-calibration', classification: {} }] }] };
    expect(capturedFilmAnalysisSchema.parse(revision1).analysis.revision).toBe(1);
    expect(capturedFilmAnalysisSchema.parse(revision2)).toMatchObject({ analysis: { revision: 2, executionCount: 1 }, frames: [{ players: [], ignored: [{ courtMembership: 'opposite-court' }] }] });
    expect(resolveFilmTrafficAt(capturedFilmAnalysisSchema.parse(revision2), 0).players).toHaveLength(0);
  });

  it('scrubs player traffic both ways and breaks the target wake at unresolved gaps', () => {
    const captured = captureFilmAnalysis({ source, frames: [
      { timeMs: 0, players: [{ trackId: '13', team: 'target', court: [10, 20], confidence: 0.9 }, { trackId: 'opp-1', team: 'opponent', court: [30, 15], confidence: 0.8 }] },
      { timeMs: 1000, players: [{ trackId: '13', team: 'target', court: [12, 20], confidence: 0.9 }] },
      { timeMs: 2000, targetStatus: 'unresolved', players: [] },
      { timeMs: 3000, players: [{ trackId: '13', team: 'target', court: [16, 20], confidence: 0.9 }] },
      { timeMs: 4000, players: [{ trackId: '13', team: 'target', court: [18, 20], confidence: 0.9 }] }
    ] });
    const forward = resolveFilmTrafficAt(captured, 3500, 5000);
    const backward = resolveFilmTrafficAt(captured, 500, 5000);
    expect(forward.players.find((player) => player.team === 'target')?.court).toEqual([17, 20]);
    expect(forward.targetWake.map((segment) => segment.map((sample) => sample.timeMs))).toEqual([[0, 1000], [3000, 3500]]);
    expect(resolveFilmTrafficAt(captured, 3500, 5000)).toEqual(forward);
    expect(backward.players.find((player) => player.team === 'target')?.court).toEqual([11, 20]);
    expect(captured.analysis.executionCount).toBe(1);
  });

  it('enforces fixed identity, court-error, zone, and correction-provenance gates', () => {
    const predictions = benchmark.clips.flatMap((clip) => clip.annotations.map((annotation) => ({
      timeMs: annotation.timeMs,
      targetStatus: 'resolved' as const,
      targetTrackId: '13',
      court: annotation.target.court!,
      zone: annotation.target.zone!,
      provenance: 'model' as const
    })));
    const passing = scoreFilmBenchmark(benchmark, predictions);
    expect(passing).toMatchObject({ ok: true, visibleAccuracy: 1, medianCourtErrorFeet: 0, p95CourtErrorFeet: 0, zoneAccuracy: 1 });

    const inaccurate = predictions.map((prediction) => ({ ...prediction, court: [prediction.court[0] + 5, prediction.court[1]] as [number, number] }));
    const failed = scoreFilmBenchmark(benchmark, inaccurate);
    expect(failed.ok).toBe(false);
    expect(failed.issues.join(' ')).toContain('median court error');

    const unprovenCorrection = predictions.map((prediction, index) => index === 0 ? { ...prediction, corrected: true } : prediction);
    const correctionFailure = scoreFilmBenchmark(benchmark, unprovenCorrection);
    expect(correctionFailure.ok).toBe(false);
    expect(correctionFailure.issues.join(' ')).toContain('Correction provenance');
  });
});

describe('foreground-court team benchmark contract', () => {
  const fixture = JSON.parse(readFileSync(new URL('../../fixtures/film/player-team-benchmark.json', import.meta.url), 'utf8'));

  it('requires real crops, all roles, crop provenance, opposite-court negatives, and the exact 28:18 regression', () => {
    expect(validateFilmTeamBenchmark(fixture)).toMatchObject({ ok: true, sampleCount: 70 });
    const missingOppositeCourt = { ...fixture, annotations: fixture.annotations.filter((sample: { courtMembership: string }) => sample.courtMembership !== 'opposite-court') };
    expect(validateFilmTeamBenchmark(missingOppositeCourt).issues.join(' ')).toContain('opposite-court');
    const badCrop = structuredClone(fixture);
    badCrop.annotations[0].provenance.cropBounds[0] += 1;
    expect(validateFilmTeamBenchmark(badCrop).issues.join(' ')).toContain('crop provenance');
  });

  it('reproduces the old whole-box white-threshold failure without correction overlays', () => {
    const predictions = fixture.annotations.map((sample: { id: string; provenance: { legacyWholeBoxWhiteRatio: number } }) => ({
      id: sample.id,
      predictedRole: sample.provenance.legacyWholeBoxWhiteRatio >= 0.13 ? 'teammate' : 'opponent',
      courtMembership: 'foreground-court',
      confidence: 0.5
    }));
    const result = scoreFilmTeamBenchmark(fixture, predictions);
    expect(result.ok).toBe(false);
    expect(result.opponentRecall).toBeLessThan(0.5);
    expect(result.ignoreRecall).toBe(0);
    expect(result.oppositeCourtRecall).toBe(0);
    expect(result.regressionCorrect).toBe(0.5);
    expect(result.issues.join(' ')).toContain('Opponent recall');
    expect(result.issues.join(' ')).toContain('Opposite-court rejection');
  });

  it('fails closed when a prediction is missing or a class gate regresses', () => {
    const predictions = fixture.annotations.map((sample: { id: string; expectedRole: string; courtMembership: string }) => ({ id: sample.id, predictedRole: sample.expectedRole, courtMembership: sample.courtMembership, confidence: 1 }));
    expect(scoreFilmTeamBenchmark(fixture, predictions)).toMatchObject({ ok: true, teammateRecall: 1, opponentRecall: 1, ignoreRecall: 1, oppositeCourtRecall: 1, regressionCorrect: 1 });
    expect(scoreFilmTeamBenchmark(fixture, predictions.slice(1)).issues.join(' ')).toContain('Missing team prediction');
    const relabeled = predictions.map((prediction: { id: string; predictedRole: string }) => prediction.id === '1698000-0' ? { ...prediction, predictedRole: 'teammate' } : prediction);
    expect(scoreFilmTeamBenchmark(fixture, relabeled).issues.join(' ')).toContain('28:18');
  });
});
