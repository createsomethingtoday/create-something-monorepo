import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { applyFilmCourtCalibration } from '../src/lib/film-court-calibration.js';

function argument(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}.`);
  return process.argv[index + 1]!;
}

const sourcePath = resolve(argument('--source-revision'));
const manifestPath = resolve(argument('--manifest'));
const outputPath = resolve(argument('--output'));
const analyzedAt = argument('--analyzed-at');
const [source, manifest] = await Promise.all([
  readFile(sourcePath, 'utf8').then(JSON.parse),
  readFile(manifestPath, 'utf8').then(JSON.parse)
]);
const revision = applyFilmCourtCalibration(source, manifest, analyzedAt);
await writeFile(outputPath, `${JSON.stringify(revision, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
console.log(JSON.stringify({
  ok: true,
  revision: revision.analysis.revision,
  derivedFromRevision: revision.analysis.derivedFromRevision,
  personDetectionExecuted: revision.analysis.personDetectionExecuted,
  courtCalibration: revision.analysis.courtCalibrationVerification,
  outputPath
}, null, 2));
