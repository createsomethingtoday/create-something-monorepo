import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { finalizeFilmIdentityRevision } from '../src/lib/film.js';

function argument(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}.`);
  return process.argv[index + 1]!;
}

const revision2Path = resolve(argument('--revision2'));
const candidatePath = resolve(argument('--candidate'));
const receiptPath = resolve(argument('--receipt'));
const outputPath = resolve(argument('--output'));
const analyzedAt = argument('--analyzed-at');
const [revision2, candidate, receipt] = await Promise.all([
  readFile(revision2Path, 'utf8').then(JSON.parse),
  readFile(candidatePath, 'utf8').then(JSON.parse),
  readFile(receiptPath, 'utf8').then(JSON.parse)
]);
const revision3 = finalizeFilmIdentityRevision(revision2, candidate, receipt, analyzedAt);
await writeFile(outputPath, `${JSON.stringify(revision3, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  revision: revision3.analysis.revision,
  executionCount: revision3.analysis.executionCount,
  identityExecutionCount: revision3.analysis.identityExecutionCount,
  derivedFromRevision: revision3.analysis.derivedFromRevision,
  personDetectionExecuted: revision3.analysis.personDetectionExecuted,
  frames: revision3.frames.length,
  outputPath
}, null, 2));
