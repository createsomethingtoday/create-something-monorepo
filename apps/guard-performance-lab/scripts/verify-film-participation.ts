import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { verifyFilmParticipationLedger } from '../src/lib/film-participation.js';

function argument(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}.`);
  return process.argv[index + 1]!;
}

const ledgerPath = resolve(argument('--ledger'));
const sourceSha256 = argument('--source-sha256');
const durationMs = Number(argument('--duration-ms'));
const receipt = verifyFilmParticipationLedger(JSON.parse(await readFile(ledgerPath, 'utf8')), { sha256: sourceSha256, durationMs });
console.log(JSON.stringify({ ledgerPath, ...receipt }, null, 2));
if (!receipt.ok) process.exitCode = 1;
