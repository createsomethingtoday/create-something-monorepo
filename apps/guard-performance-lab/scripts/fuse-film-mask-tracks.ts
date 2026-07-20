import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { combineFilmMaskTracks, fuseFilmMaskTrack } from '../src/lib/film.js';

function argument(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}.`);
  return resolve(process.argv[index + 1]!);
}

function repeatedArguments(name: string) {
  return process.argv.flatMap((value, index) => value === name && process.argv[index + 1] ? [resolve(process.argv[index + 1]!)] : []);
}

const analysisPath = argument('--analysis');
const receiptPaths = repeatedArguments('--mask-track');
const receiptOutputPath = argument('--receipt-output');
const candidateOutputPath = argument('--candidate-output');
if (receiptPaths.length === 0) throw new Error('At least one --mask-track receipt is required.');

const [analysis, ...receipts] = await Promise.all([
  readFile(analysisPath, 'utf8').then(JSON.parse),
  ...receiptPaths.map((path) => readFile(path, 'utf8').then(JSON.parse))
]);
const combined = combineFilmMaskTracks(receipts);
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
  coverage
}, null, 2));
