import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { applyFilmIdentityAssignments } from '../src/lib/film.js';

function argument(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}.`);
  return resolve(process.argv[index + 1]!);
}

const candidatePath = argument('--candidate');
const assignmentsPath = argument('--assignments');
const outputPath = argument('--output');
const [candidate, assignments] = await Promise.all([
  readFile(candidatePath, 'utf8').then(JSON.parse),
  readFile(assignmentsPath, 'utf8').then(JSON.parse)
]);
const layered = applyFilmIdentityAssignments(candidate, assignments);
await writeFile(outputPath, `${JSON.stringify(layered, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  outputPath,
  assignmentCount: assignments.length,
  resolvedFrames: layered.frames.filter((frame) => frame.targetStatus === 'resolved').length,
  inactiveFrames: layered.frames.filter((frame) => frame.targetStatus === 'inactive').length
}, null, 2));
