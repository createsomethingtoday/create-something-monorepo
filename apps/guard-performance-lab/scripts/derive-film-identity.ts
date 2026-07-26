import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { deriveFilmIdentityCandidate } from '../src/lib/film.js';

function argument(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}.`);
  return resolve(process.argv[index + 1]!);
}

const revision2Path = argument('--revision2');
const assignmentsPath = argument('--assignments');
const outputPath = argument('--output');
const revision2 = JSON.parse(await readFile(revision2Path, 'utf8'));
const assignments = JSON.parse(await readFile(assignmentsPath, 'utf8'));
const candidate = deriveFilmIdentityCandidate(revision2, assignments);
await writeFile(outputPath, `${JSON.stringify(candidate, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  derivedFromRevision: candidate.derivedFromRevision,
  personDetectionExecuted: candidate.personDetectionExecuted,
  frames: candidate.frames.length,
  resolvedFrames: candidate.frames.filter((frame) => frame.targetStatus === 'resolved').length,
  inactiveFrames: candidate.frames.filter((frame) => frame.targetStatus === 'inactive').length,
  outputPath
}, null, 2));
