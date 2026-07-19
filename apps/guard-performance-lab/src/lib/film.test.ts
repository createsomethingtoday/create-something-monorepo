import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FILM_BENCHMARK_PROFILE, FILM_IDENTITY_BENCHMARK_PROFILE, captureFilmAnalysis, capturedFilmAnalysisSchema, deriveFilmIdentityCandidate, finalizeFilmIdentityRevision, filmFrameAt, resolveFilmTrafficAt, scoreFilmBenchmark, scoreFilmIdentityBenchmark, scoreFilmTeamBenchmark, validateFilmBenchmark, validateFilmIdentityBenchmark, validateFilmTeamBenchmark, verifyFilmIdentityCandidate } from './film.js';

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

  it('stops #13 traffic while substituted out and resumes the wake only after verified re-entry', () => {
    const revision3 = capturedFilmAnalysisSchema.parse({
      version: 1,
      source,
      profile: FILM_BENCHMARK_PROFILE,
      analysis: {
        revision: 3,
        executionCount: 1,
        analyzedAt: '2026-07-19T20:00:00.000Z',
        derivedFromRevision: 2,
        personDetectionExecuted: false,
        identityExecutionCount: 1,
        identityPolicy: 'direct-number-or-bounded-continuity-fail-closed-v1',
        identityVerification: {
          benchmarkProfile: FILM_IDENTITY_BENCHMARK_PROFILE,
          candidateFingerprint: 'fnv1a32-test',
          positiveRecall: 1,
          hardNegativePrecision: 1,
          substitutionAccuracy: 1,
          correctionOverlayCount: 0
        }
      },
      frames: [
        { timeMs: 0, players: [{ trackId: 'p-13-a', team: 'target', court: [10, 20], confidence: 1 }] },
        { timeMs: 1000, players: [{ trackId: 'p-13-a', team: 'target', court: [12, 20], confidence: 1 }] },
        { timeMs: 2000, targetStatus: 'inactive', players: [] },
        { timeMs: 3000, players: [{ trackId: 'p-13-b', team: 'target', court: [16, 20], confidence: 1 }] },
        { timeMs: 4000, players: [{ trackId: 'p-13-b', team: 'target', court: [18, 20], confidence: 1 }] }
      ]
    });

    expect(revision3.analysis).toMatchObject({ revision: 3, derivedFromRevision: 2, personDetectionExecuted: false, identityExecutionCount: 1 });
    expect(revision3.frames[2]?.targetStatus).toBe('inactive');
    expect(resolveFilmTrafficAt(revision3, 4000, 5000).targetWake.map((segment) => segment.map((sample) => sample.timeMs))).toEqual([[0, 1000], [3000, 4000]]);
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

describe('real-source #13 identity benchmark contract', () => {
  const realFixture = JSON.parse(readFileSync(new URL('../../fixtures/film/player-13-identity-benchmark.json', import.meta.url), 'utf8'));
  const positive = Array.from({ length: 30 }, (_, index) => ({
    id: `positive-${index}`,
    segmentId: `on-court-${Math.floor(index / 10) + 1}`,
    timeMs: 100_000 + index * 100,
    associationTimeMs: 100_000 + index * 100,
    trackId: `p-${index}`,
    cropBounds: [100, 200, 200, 400],
    courtMembership: 'foreground-court',
    expectedIdentity: '13',
    visibleNumber: '13',
    participation: 'active',
    negativeClass: null,
    provenance: { method: 'direct-number-review', reviewer: 'codex', cropBounds: [100, 200, 200, 400], sourceFrame: `positive-${index}.jpg` }
  }));
  const negativeClasses = ['5', '11', '15', 'unreadable', 'substitution', 'tracker-handoff'] as const;
  const negative = Array.from({ length: 30 }, (_, index) => ({
    id: `negative-${index}`,
    segmentId: `negative-${negativeClasses[index % negativeClasses.length]}`,
    timeMs: 200_000 + index * 100,
    associationTimeMs: 200_000 + index * 100,
    trackId: `n-${index}`,
    cropBounds: [300, 200, 400, 400],
    courtMembership: 'foreground-court',
    expectedIdentity: negativeClasses[index % negativeClasses.length] === 'substitution' ? '13' : negativeClasses[index % negativeClasses.length] === 'unreadable' ? 'unreadable' : 'not-13',
    visibleNumber: negativeClasses[index % negativeClasses.length] === 'substitution' ? '13' : negativeClasses[index % negativeClasses.length] === 'tracker-handoff' ? 'unreadable' : negativeClasses[index % negativeClasses.length],
    participation: negativeClasses[index % negativeClasses.length] === 'substitution' ? 'inactive' : 'active',
    negativeClass: negativeClasses[index % negativeClasses.length],
    provenance: { method: 'direct-number-review', reviewer: 'codex', cropBounds: [300, 200, 400, 400], sourceFrame: `negative-${index}.jpg` }
  }));
  const identityBenchmark = {
    version: 1,
    profile: FILM_IDENTITY_BENCHMARK_PROFILE,
    sourceSha256: 'a'.repeat(64),
    derivedFromRevision: 2,
    personDetectionExecuted: false,
    annotations: [...positive, ...negative]
  };

  it('accepts the locked real-source fixture without person detection or correction overlays', () => {
    expect(validateFilmIdentityBenchmark(realFixture)).toMatchObject({ ok: true, positiveCount: 33, negativeCount: 31, positiveSegmentCount: 4 });
    expect(realFixture).toMatchObject({ sourceSha256: '94cb743b7ffe129ec30f8614ea48196245402adc6bf560b96a91ba5d388e95c0', derivedFromRevision: 2, personDetectionExecuted: false });
  });

  it('requires 30 readable #13 crops across three active segments plus every hard-negative class', () => {
    expect(validateFilmIdentityBenchmark(identityBenchmark)).toMatchObject({ ok: true, positiveCount: 30, negativeCount: 30, positiveSegmentCount: 3 });
    expect(validateFilmIdentityBenchmark({ ...identityBenchmark, annotations: identityBenchmark.annotations.filter((sample) => sample.segmentId !== 'on-court-3') }).issues.join(' ')).toContain('three on-court segments');
    expect(validateFilmIdentityBenchmark({ ...identityBenchmark, annotations: identityBenchmark.annotations.filter((sample) => sample.negativeClass !== 'tracker-handoff') }).issues.join(' ')).toContain('tracker-handoff');
  });

  it('rejects the old target path and passes only evidence-backed #13 plus inactive substitution states', () => {
    const oldTargetPath = identityBenchmark.annotations.map((sample) => ({ id: sample.id, predictedIdentity: '13', targetStatus: 'resolved', evidence: 'none', corrected: false }));
    const failed = scoreFilmIdentityBenchmark(identityBenchmark, oldTargetPath);
    expect(failed.ok).toBe(false);
    expect(failed.hardNegativePrecision).toBe(0);
    expect(failed.issues.join(' ')).toContain('hard-negative precision');
    expect(failed.issues.join(' ')).toContain('substitution');

    const evidenceBacked = identityBenchmark.annotations.map((sample) => ({
      id: sample.id,
      predictedIdentity: sample.expectedIdentity === '13' ? '13' : sample.expectedIdentity === 'not-13' ? 'not-13' : 'unresolved',
      targetStatus: sample.participation === 'inactive' ? 'inactive' : sample.expectedIdentity === '13' ? 'resolved' : 'unresolved',
      evidence: sample.expectedIdentity === '13' ? 'direct-number' : 'none',
      corrected: false
    }));
    expect(scoreFilmIdentityBenchmark(identityBenchmark, evidenceBacked)).toMatchObject({ ok: true, positiveRecall: 1, hardNegativePrecision: 1, substitutionAccuracy: 1 });
  });
});

describe('identity-only candidate derivation', () => {
  it('relabels only an explicitly evidenced revision-2 teammate and fails closed everywhere else', () => {
    const revision2 = capturedFilmAnalysisSchema.parse({
      version: 1,
      source,
      profile: FILM_BENCHMARK_PROFILE,
      analysis: { revision: 2, executionCount: 1, analyzedAt: '2026-07-19T19:00:00.000Z' },
      frames: [
        { timeMs: 0, players: [{ trackId: 'old-wrong', team: 'target', court: [40, 20], confidence: 0.7 }, { trackId: 'p-13', team: 'teammate', court: [10, 20], confidence: 0.9 }] },
        { timeMs: 1000, players: [{ trackId: 'p-5', team: 'teammate', court: [20, 20], confidence: 0.9 }] },
        { timeMs: 2000, players: [{ trackId: 'p-13-next', team: 'teammate', court: [30, 20], confidence: 0.9 }] }
      ]
    });
    const candidate = deriveFilmIdentityCandidate(revision2, [
      { timeMs: 0, trackId: 'p-13', targetStatus: 'resolved', evidence: { method: 'direct-number', anchorId: 'positive-0' } },
      { timeMs: 2000, targetStatus: 'inactive', evidence: { method: 'substitution', anchorId: 'substitution-0' } }
    ]);

    expect(candidate).toMatchObject({ derivedFromRevision: 2, personDetectionExecuted: false });
    expect(candidate).not.toHaveProperty('analysis.revision');
    expect(candidate.frames[0]?.players.find((player) => player.team === 'target')).toMatchObject({ trackId: 'p-13', court: [10, 20] });
    expect(candidate.frames[0]?.players.find((player) => player.trackId === 'old-wrong')?.team).toBe('teammate');
    expect(candidate.frames[1]).toMatchObject({ targetStatus: 'unresolved' });
    expect(candidate.frames[1]?.players.some((player) => player.team === 'target')).toBe(false);
    expect(candidate.frames[2]).toMatchObject({ targetStatus: 'inactive' });
    expect(candidate.frames[2]?.players.some((player) => player.team === 'target')).toBe(false);
  });

  it('verifies preserved revision-2 traffic before finalizing exactly one identity-only revision 3 receipt', () => {
    const revision2 = capturedFilmAnalysisSchema.parse({
      version: 1,
      source,
      profile: FILM_BENCHMARK_PROFILE,
      analysis: { revision: 2, executionCount: 1, analyzedAt: '2026-07-19T19:00:00.000Z', classification: { executionCount: 1 } },
      frames: [
        { timeMs: 0, players: [{ trackId: 'wrong-old-target', team: 'target', court: [40, 20], confidence: 0.7 }, { trackId: 'p-13', team: 'teammate', court: [10, 20], confidence: 0.9 }] },
        { timeMs: 1000, players: [{ trackId: 'p-5', team: 'teammate', court: [20, 20], confidence: 0.9 }] },
        { timeMs: 2000, players: [{ trackId: 'p-13-next', team: 'teammate', court: [30, 20], confidence: 0.9 }] }
      ]
    });
    const candidate = deriveFilmIdentityCandidate(revision2, [
      { timeMs: 0, trackId: 'p-13', targetStatus: 'resolved', evidence: { method: 'direct-number', anchorId: 'positive-0' } },
      { timeMs: 2000, targetStatus: 'inactive', evidence: { method: 'substitution', anchorId: 'substitution-0' } }
    ]);
    const fixture = {
      version: 1,
      profile: FILM_IDENTITY_BENCHMARK_PROFILE,
      sourceSha256: source.sha256,
      derivedFromRevision: 2,
      personDetectionExecuted: false,
      annotations: [
        ...Array.from({ length: 30 }, (_, index) => ({
          id: `positive-${index}`,
          segmentId: `segment-${Math.floor(index / 10)}`,
          timeMs: index,
          associationTimeMs: 0,
          trackId: 'p-13',
          cropBounds: [1, 1, 2, 2],
          courtMembership: 'foreground-court',
          expectedIdentity: '13',
          visibleNumber: '13',
          participation: 'active',
          negativeClass: null,
          provenance: { method: 'direct-number-review', reviewer: 'codex', cropBounds: [1, 1, 2, 2], sourceFrame: `positive-${index}.jpg` }
        })),
        ...(['5', '11', '15', 'unreadable', 'tracker-handoff'] as const).flatMap((negativeClass, classIndex) => Array.from({ length: 5 }, (_, index) => ({
          id: `${negativeClass}-${index}`,
          segmentId: `negative-${negativeClass}`,
          timeMs: 100 + classIndex * 10 + index,
          associationTimeMs: 1000,
          trackId: 'p-5',
          cropBounds: [1, 1, 2, 2],
          courtMembership: 'foreground-court',
          expectedIdentity: negativeClass === 'unreadable' ? 'unreadable' : 'not-13',
          visibleNumber: negativeClass === 'tracker-handoff' ? 'unreadable' : negativeClass,
          participation: 'active',
          negativeClass,
          provenance: { method: 'direct-number-review', reviewer: 'codex', cropBounds: [1, 1, 2, 2], sourceFrame: `${negativeClass}-${index}.jpg` }
        }))),
        ...Array.from({ length: 5 }, (_, index) => ({
          id: `substitution-${index}`,
          segmentId: 'substitution',
          timeMs: 200 + index,
          associationTimeMs: 2000,
          trackId: 'p-13-next',
          cropBounds: [1, 1, 2, 2],
          courtMembership: 'foreground-court',
          expectedIdentity: '13',
          visibleNumber: '13',
          participation: 'inactive',
          negativeClass: 'substitution',
          provenance: { method: 'direct-number-review', reviewer: 'codex', cropBounds: [1, 1, 2, 2], sourceFrame: `substitution-${index}.jpg` }
        }))
      ]
    };

    const receipt = verifyFilmIdentityCandidate(revision2, candidate, fixture);
    expect(receipt).toMatchObject({ ok: true, invariantIssues: [], positiveRecall: 1, hardNegativePrecision: 1, substitutionAccuracy: 1, correctionOverlayCount: 0 });
    const revision3 = finalizeFilmIdentityRevision(revision2, candidate, receipt, '2026-07-19T20:00:00.000Z');
    expect(revision3.analysis).toMatchObject({ revision: 3, executionCount: 1, derivedFromRevision: 2, personDetectionExecuted: false, identityExecutionCount: 1 });
    expect(revision3.frames).toEqual(candidate.frames);

    const changedCourt = structuredClone(candidate);
    changedCourt.frames[0].players[0].court[0] += 1;
    expect(verifyFilmIdentityCandidate(revision2, changedCourt, fixture).invariantIssues.join(' ')).toContain('court coordinates');
    expect(() => finalizeFilmIdentityRevision(revision2, changedCourt, verifyFilmIdentityCandidate(revision2, changedCourt, fixture), '2026-07-19T20:00:00.000Z')).toThrow(/passing identity verification receipt/i);
  });
});
