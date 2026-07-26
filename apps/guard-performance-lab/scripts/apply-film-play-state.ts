import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { applyFilmPlayStateLedger, capturedFilmAnalysisSchema, filmPlayStateLedgerSchema } from '../src/lib/film.js';

function argument(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}.`);
  return process.argv[index + 1]!;
}

const analysisPath = resolve(argument('--analysis'));
const ledgerPath = resolve(argument('--ledger'));
const outputPath = resolve(argument('--output'));
const receiptPath = resolve(argument('--receipt'));
const analysis = capturedFilmAnalysisSchema.parse(JSON.parse(await readFile(analysisPath, 'utf8')));
const ledger = filmPlayStateLedgerSchema.parse(JSON.parse(await readFile(ledgerPath, 'utf8')));
const enriched = applyFilmPlayStateLedger(analysis, ledger);
const receipt = {
  ok: true,
  sourceSha256: enriched.source.sha256,
  analysisRevision: enriched.analysis.revision,
  analysisExecutionCount: enriched.analysis.executionCount,
  identityCandidateFingerprint: enriched.analysis.identityVerification?.candidateFingerprint ?? null,
  playStateVerification: enriched.analysis.playStateVerification,
  output: outputPath
};

await Promise.all([
  mkdir(dirname(outputPath), { recursive: true }),
  mkdir(dirname(receiptPath), { recursive: true })
]);
await Promise.all([
  writeFile(outputPath, `${JSON.stringify(enriched, null, 2)}\n`),
  writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)
]);
console.log(JSON.stringify(receipt, null, 2));
