import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { finalizeFilmIdentityRevision } from '../src/lib/film.js';

function argument(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}.`);
  return process.argv[index + 1]!;
}

function optionalArgument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : undefined;
}

const sourceRevisionPath = resolve(optionalArgument('--source-revision') ?? argument('--revision2'));
const candidatePath = resolve(argument('--candidate'));
const receiptPath = resolve(argument('--receipt'));
const outputPath = resolve(argument('--output'));
const analyzedAt = argument('--analyzed-at');
const fullFlowReceiptPath = optionalArgument('--full-flow-receipt');
const migrationTraceReceiptPath = optionalArgument('--migration-trace-receipt');
const [sourceRevision, candidate, receipt, fullFlowReceiptText, migrationTraceReceipt] = await Promise.all([
  readFile(sourceRevisionPath, 'utf8').then(JSON.parse),
  readFile(candidatePath, 'utf8').then(JSON.parse),
  readFile(receiptPath, 'utf8').then(JSON.parse),
  fullFlowReceiptPath ? readFile(resolve(fullFlowReceiptPath), 'utf8') : Promise.resolve(undefined),
  migrationTraceReceiptPath ? readFile(resolve(migrationTraceReceiptPath), 'utf8').then(JSON.parse) : Promise.resolve(undefined)
]);
const fullFlowReceipt = fullFlowReceiptText ? JSON.parse(fullFlowReceiptText) : undefined;
if (migrationTraceReceipt && (!fullFlowReceiptText || migrationTraceReceipt.fingerprints?.fullFlowReceiptSha256 !== createHash('sha256').update(fullFlowReceiptText).digest('hex'))) {
  throw new Error('The migration-trace receipt does not bind the exact full-flow receipt bytes.');
}
const nextRevision = finalizeFilmIdentityRevision(sourceRevision, candidate, receipt, analyzedAt, fullFlowReceipt, migrationTraceReceipt);
await writeFile(outputPath, `${JSON.stringify(nextRevision, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  revision: nextRevision.analysis.revision,
  executionCount: nextRevision.analysis.executionCount,
  identityExecutionCount: nextRevision.analysis.identityExecutionCount,
  derivedFromRevision: nextRevision.analysis.derivedFromRevision,
  personDetectionExecuted: nextRevision.analysis.personDetectionExecuted,
  fullFlowProfile: nextRevision.analysis.fullFlowVerification?.profile ?? null,
  migrationTraceProfile: nextRevision.analysis.migrationTraceVerification?.profile ?? null,
  activeVisibleCoverage: nextRevision.analysis.migrationTraceVerification?.coverage ?? null,
  frames: nextRevision.frames.length,
  outputPath
}, null, 2));
