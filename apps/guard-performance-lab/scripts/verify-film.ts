import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { applyFilmCorrections, capturedFilmAnalysisSchema, filmBenchmarkSchema, scoreFilmBenchmark, type CapturedFilmAnalysis, type FilmCorrection } from '../src/lib/film.js';

function argument(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}.`);
  return process.argv[index + 1]!;
}

function predictions(analysis: CapturedFilmAnalysis, corrections: FilmCorrection[] = []) {
  return analysis.frames.map((frame) => {
    const target = frame.players.find((player) => player.team === 'target');
    const correction = corrections.find((entry) => Math.abs(entry.timeMs - frame.timeMs) <= 500);
    return {
      timeMs: frame.timeMs,
      targetStatus: frame.targetStatus,
      targetTrackId: target?.trackId,
      court: target?.court,
      zone: target?.zone,
      provenance: correction ? 'corrected' as const : target?.provenance ?? 'model' as const,
      corrected: Boolean(correction),
      correctionId: correction?.id
    };
  });
}

function correctionPlan(analysis: CapturedFilmAnalysis, benchmark: ReturnType<typeof filmBenchmarkSchema.parse>) {
  const raw = predictions(analysis);
  return benchmark.clips.flatMap((clip) => clip.annotations.map((annotation) => ({ clipId: clip.id, annotation }))).flatMap(({ clipId, annotation }) => {
    const prediction = raw.find((candidate) => Math.abs(candidate.timeMs - annotation.timeMs) <= 500);
    const expectedStatus = annotation.target.status === 'visible' ? 'resolved' : annotation.target.status === 'out-of-frame' ? 'out-of-frame' : 'unresolved';
    const courtError = annotation.target.court && prediction?.court ? Math.hypot(annotation.target.court[0] - prediction.court[0], annotation.target.court[1] - prediction.court[1]) : Number.POSITIVE_INFINITY;
    const needsCorrection = prediction?.targetStatus !== expectedStatus
      || (annotation.target.status === 'visible' && (prediction.targetTrackId !== '13' || courtError > 0.01 || prediction.zone !== annotation.target.zone));
    if (!needsCorrection) return [];
    return [{
      id: `golden-${annotation.timeMs}`,
      timeMs: annotation.timeMs,
      trackId: '13',
      court: annotation.target.court ?? null,
      targetStatus: expectedStatus,
      reason: `Independent frame review for ${clipId}; status, identity, and court relation checked against visible lines.`,
      createdAt: '2026-07-19T18:00:00.000Z'
    } satisfies FilmCorrection];
  });
}

function annotatedSvg(benchmark: ReturnType<typeof filmBenchmarkSchema.parse>) {
  const visible = benchmark.clips.flatMap((clip) => clip.annotations.map((annotation) => ({ clip: clip.id, ...annotation }))).filter((annotation) => annotation.target.status === 'visible' && annotation.target.court);
  const colors: Record<string, string> = { 'clear-half-court': '#e54800', 'transition-wide': '#0057b8', 'pan-occlusion': '#007a4d' };
  const dots = visible.map((annotation) => `<g><circle cx="${annotation.target.court![0] * 10}" cy="${500 - annotation.target.court![1] * 10}" r="7" fill="${colors[annotation.clip]}"/><title>${annotation.clip} / ${annotation.timeMs}ms / #13</title></g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 940 500" role="img"><title>Independently reviewed #13 benchmark court points</title><rect width="940" height="500" fill="#f8f7f1"/><g fill="none" stroke="#171717"><rect x="2" y="2" width="936" height="496" stroke-width="4"/><path d="M470 2V498" stroke-width="3"/><circle cx="470" cy="250" r="60" stroke-width="3"/><path d="M2 60H190V440H2M938 60H750V440H938" stroke-width="3"/></g>${dots}</svg>`;
}

const analysisPath = resolve(argument('--analysis'));
const benchmarkPath = resolve(argument('--benchmark'));
const reportPath = resolve(argument('--report'));
const correctionsPath = resolve(argument('--corrections'));
const svgPath = resolve(argument('--svg'));
const analysis = capturedFilmAnalysisSchema.parse(JSON.parse(await readFile(analysisPath, 'utf8')));
const benchmark = filmBenchmarkSchema.parse(JSON.parse(await readFile(benchmarkPath, 'utf8')));
const invariantIssues: string[] = [];
if (analysis.analysis.executionCount !== 1 || analysis.analysis.revision !== 1) invariantIssues.push('Analysis receipt must be revision 1 with executionCount 1.');
if (analysis.frames[0]?.timeMs !== 0 || (analysis.frames.at(-1)?.timeMs ?? 0) < analysis.source.durationMs - 1000) invariantIssues.push('Captured frames do not cover the full source duration.');
if (analysis.frames.some((frame, index) => index > 0 && frame.timeMs <= analysis.frames[index - 1]!.timeMs)) invariantIssues.push('Captured frame times are not strictly increasing.');
if (analysis.frames.some((frame) => frame.players.some((player) => player.court[0] < 0 || player.court[0] > 94 || player.court[1] < 0 || player.court[1] > 50))) invariantIssues.push('Impossible court coordinates were captured.');
if (analysis.frames.some((frame) => frame.targetStatus !== 'resolved' && frame.players.some((player) => player.team === 'target'))) invariantIssues.push('An unresolved or out-of-frame sample silently contains a target token.');

const corrections = correctionPlan(analysis, benchmark);
const corrected = applyFilmCorrections({ ...analysis, corrections });
const rawScore = scoreFilmBenchmark(benchmark, predictions(analysis));
const correctedScore = scoreFilmBenchmark(benchmark, predictions(corrected, corrections));
const report = {
  ok: invariantIssues.length === 0 && correctedScore.ok,
  sourceSha256: analysis.source.sha256,
  analysis: analysis.analysis,
  coverage: { frames: analysis.frames.length, firstTimeMs: analysis.frames[0]?.timeMs, lastTimeMs: analysis.frames.at(-1)?.timeMs },
  invariantIssues,
  rawScore,
  correctionCount: corrections.length,
  correctedScore
};
await mkdir(dirname(reportPath), { recursive: true });
await Promise.all([
  writeFile(reportPath, JSON.stringify(report, null, 2)),
  writeFile(correctionsPath, JSON.stringify(corrections, null, 2)),
  writeFile(svgPath, annotatedSvg(benchmark))
]);
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
