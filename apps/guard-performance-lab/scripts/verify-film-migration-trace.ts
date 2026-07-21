import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { verifyFilmMigrationTrace } from '../src/lib/film-migration-trace.js';

function argument(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}.`);
  return resolve(process.argv[index + 1]!);
}

function optionalArgument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? resolve(process.argv[index + 1]!) : undefined;
}

const paths = {
  candidate: argument('--candidate'),
  participation: argument('--participation'),
  fullFlowReceipt: argument('--full-flow-receipt'),
  cameraStates: optionalArgument('--camera-states'),
  output: argument('--output')
};
const [candidateBytes, participationBytes, fullFlowReceiptBytes, cameraStateBytes] = await Promise.all([
  readFile(paths.candidate),
  readFile(paths.participation),
  readFile(paths.fullFlowReceipt),
  paths.cameraStates ? readFile(paths.cameraStates) : undefined
]);
const parse = (bytes: Buffer) => JSON.parse(bytes.toString('utf8'));
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const receipt = verifyFilmMigrationTrace({
  candidate: parse(candidateBytes),
  participation: parse(participationBytes),
  fullFlowReceipt: parse(fullFlowReceiptBytes),
  cameraStates: cameraStateBytes ? parse(cameraStateBytes) : undefined,
  fingerprints: {
    participationSha256: sha256(participationBytes),
    candidateSha256: sha256(candidateBytes),
    fullFlowReceiptSha256: sha256(fullFlowReceiptBytes)
  }
});
await writeFile(paths.output, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
if (!receipt.ok) process.exitCode = 1;
