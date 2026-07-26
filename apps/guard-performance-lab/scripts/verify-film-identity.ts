import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { capturedFilmAnalysisSchema, filmIdentityBenchmarkSchema, scoreFilmIdentityBenchmark, verifyFilmIdentityCandidate } from '../src/lib/film.js';

function argument(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}.`);
  return resolve(process.argv[index + 1]!);
}

function optionalArgument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? resolve(process.argv[index + 1]!) : undefined;
}

const analysisPath = argument('--analysis');
const fixturePath = argument('--fixture');
const reportPath = argument('--report');
const candidatePath = optionalArgument('--candidate');
const analysis = capturedFilmAnalysisSchema.parse(JSON.parse(await readFile(analysisPath, 'utf8')));
const fixture = filmIdentityBenchmarkSchema.parse(JSON.parse(await readFile(fixturePath, 'utf8')));

let report;
if (candidatePath) {
  const candidate = JSON.parse(await readFile(candidatePath, 'utf8'));
  report = {
    mode: 'identity-candidate',
    analysisRevision: analysis.analysis.revision,
    ...verifyFilmIdentityCandidate(analysis, candidate, fixture)
  };
} else {
  const predictions = fixture.annotations.map((annotation) => ({
    id: annotation.id,
    predictedIdentity: annotation.participation === 'inactive' || annotation.negativeClass !== null ? '13' as const : 'unresolved' as const,
    targetStatus: annotation.participation === 'inactive' ? 'resolved' as const : annotation.negativeClass !== null ? 'resolved' as const : 'unresolved' as const,
    evidence: 'none' as const,
    corrected: true
  }));
  const score = scoreFilmIdentityBenchmark(fixture, predictions);
  report = {
    ok: false,
    mode: 'legacy-identity-baseline',
    analysisRevision: analysis.analysis.revision,
    sourceSha256: analysis.source.sha256,
    correctionOverlayCount: analysis.corrections?.length ?? 0,
    ...score,
    knownIdentityFailures: [
      { timeRange: '04:00-04:10', trackId: 'p-0378', observedNumber: '11', failure: 'The historical target benchmark follows #11.' },
      { timeRange: '28:19-28:20', trackId: 'p-2560', observedNumbers: ['15', '5'], failure: 'One tracker ID hands off from #15 to #5 and cannot serve as identity.' },
      { timeRange: '28:25', observedNumber: '5', failure: 'The historical identity seed follows #5.' },
      { timeRange: '49:30', trackId: 'p-4435', observedNumber: '15', failure: 'The user-reviewed historical target crop is #15, not #13.' },
      { timeRange: '17:40, 19:00, 32:05, 51:40', observedNumber: '13', failure: 'The historical identity policy has no independently proven coverage for the true #13 anchors.' }
    ]
  };
}

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
