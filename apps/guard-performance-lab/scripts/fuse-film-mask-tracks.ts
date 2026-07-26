import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { bindFilmMaskTrackParticipation, capturedFilmAnalysisSchema, combineFilmMaskTracks, fuseFilmMaskTrack } from '../src/lib/film.js';
import { filmParticipationLedgerSchema, verifyFilmParticipationLedger } from '../src/lib/film-participation.js';

function argument(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}.`);
  return resolve(process.argv[index + 1]!);
}

function repeatedArguments(name: string) {
  return process.argv.flatMap((value, index) => value === name && process.argv[index + 1] ? [resolve(process.argv[index + 1]!)] : []);
}

function optionalArgument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? resolve(process.argv[index + 1]!) : undefined;
}

const analysisPath = argument('--analysis');
const receiptPaths = repeatedArguments('--mask-track');
const receiptOutputPath = argument('--receipt-output');
const candidateOutputPath = argument('--candidate-output');
const participationLedgerPath = optionalArgument('--participation-ledger');
if (receiptPaths.length === 0) throw new Error('At least one --mask-track receipt is required.');

const [analysisInput, participationInput, ...receipts] = await Promise.all([
  readFile(analysisPath, 'utf8').then(JSON.parse),
  participationLedgerPath ? readFile(participationLedgerPath, 'utf8').then(JSON.parse) : Promise.resolve(undefined),
  ...receiptPaths.map((path) => readFile(path, 'utf8').then(JSON.parse))
]);
const analysis = capturedFilmAnalysisSchema.parse(analysisInput);
const diagnosticCombined = combineFilmMaskTracks(receipts);
let combined = diagnosticCombined;
if (participationInput) {
  const participation = filmParticipationLedgerSchema.parse(participationInput);
  const participationReceipt = verifyFilmParticipationLedger(participation, analysis.source);
  if (!participationReceipt.ok) throw new Error(`Invalid participation ledger: ${participationReceipt.issues.join(' ')}`);
  combined = bindFilmMaskTrackParticipation(diagnosticCombined, participation.intervals.map((interval) => ({
    startMs: interval.startMs,
    endMs: interval.endMs,
    state: interval.state,
    evidence: JSON.stringify({ intervalId: interval.id, ...interval.evidence })
  })));
}
const candidate = fuseFilmMaskTrack(analysis, combined);
const statusCount = (status: string) => candidate.frames.filter((frame) => frame.targetStatus === status).length;
const coverage = {
  frameCount: candidate.frames.length,
  resolvedFrames: statusCount('resolved'),
  unresolvedFrames: statusCount('unresolved'),
  inactiveFrames: statusCount('inactive'),
  outOfFrameFrames: statusCount('out-of-frame')
};
await Promise.all([
  writeFile(receiptOutputPath, `${JSON.stringify(combined, null, 2)}\n`),
  writeFile(candidateOutputPath, `${JSON.stringify(candidate, null, 2)}\n`)
]);
console.log(JSON.stringify({
  ok: true,
  receiptOutputPath,
  candidateOutputPath,
  segmentCount: combined.segments.length,
  sampleCount: combined.segments.reduce((count, segment) => count + segment.samples.length, 0),
  participationLedgerPath: participationLedgerPath ?? null,
  coverage
}, null, 2));
