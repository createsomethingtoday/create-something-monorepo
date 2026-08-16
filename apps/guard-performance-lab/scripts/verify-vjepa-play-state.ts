import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  evaluateVjepaPlayStateCandidate,
  filmVjepaPlayStateCandidateSchema
} from '../src/lib/film-vjepa.js';
import { filmPlayStateLedgerSchema } from '../src/lib/film.js';

function argument(name: string, fallback?: string) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  if (fallback) return fallback;
  throw new Error(`Missing required argument ${name}.`);
}

function sha256(value: Buffer | string) {
  return createHash('sha256').update(value).digest('hex');
}

const packageDirectory = resolve(import.meta.dirname, '..');
const candidatePath = resolve(
  argument('--candidate', resolve(packageDirectory, '.data/vjepa2-bakeoff/candidate.json'))
);
const ledgerPath = resolve(
  argument('--ledger', resolve(packageDirectory, 'fixtures/film/player-13-play-state-ledger.json'))
);
const outputPath = resolve(
  argument('--output', resolve(packageDirectory, '.data/vjepa2-bakeoff/receipt.json'))
);
const [candidateBytes, ledgerBytes] = await Promise.all([
  readFile(candidatePath),
  readFile(ledgerPath)
]);
const candidate = filmVjepaPlayStateCandidateSchema.parse(JSON.parse(candidateBytes.toString()));
const ledger = filmPlayStateLedgerSchema.parse(JSON.parse(ledgerBytes.toString()));
const evaluation = evaluateVjepaPlayStateCandidate(candidate, ledger);
const intervalCount = (split: 'train' | 'heldout') =>
  new Set(
    candidate.windows.filter((window) => window.split === split).map((window) => window.intervalId)
  ).size;
const receipt = {
  version: 1,
  profile: 'guard-vjepa-play-state-bakeoff-receipt-v1',
  generatedAt: new Date().toISOString(),
  inputs: {
    candidatePath,
    candidateSha256: sha256(candidateBytes),
    ledgerPath,
    ledgerSha256: sha256(ledgerBytes),
    sourceSha256: candidate.sourceSha256
  },
  input: candidate.input,
  model: candidate.model,
  authority: candidate.authority,
  coverage: {
    trainingIntervals: intervalCount('train'),
    heldOutIntervals: intervalCount('heldout'),
    trainingWindows: candidate.windows.filter((window) => window.split === 'train').length,
    heldOutWindows: candidate.windows.filter((window) => window.split === 'heldout').length
  },
  thresholds: { macroF1: 0.8, liveRecall: 0.8, stoppedRecall: 0.9, heldOutIntervalsPerLabel: 2 },
  ...evaluation
};
const temporaryPath = `${outputPath}.tmp`;
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(temporaryPath, `${JSON.stringify(receipt, null, 2)}\n`);
await rename(temporaryPath, outputPath);
console.log(
  JSON.stringify({
    output: outputPath,
    receiptSha256: sha256(await readFile(outputPath)),
    ...evaluation
  })
);
