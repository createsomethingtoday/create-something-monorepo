import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { verifyFilmFullFlow } from '../src/lib/film-full-flow.js';

function argument(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}.`);
  return resolve(process.argv[index + 1]!);
}

const paths = {
  baseline: argument('--analysis'),
  candidate: argument('--candidate'),
  participation: argument('--participation'),
  maskTrack: argument('--mask-track'),
  identityReceipt: argument('--identity-receipt'),
  output: argument('--output')
};
const [analysisBytes, candidateBytes, participationBytes, maskTrackBytes, identityReceiptBytes] = await Promise.all([
  readFile(paths.baseline), readFile(paths.candidate), readFile(paths.participation), readFile(paths.maskTrack), readFile(paths.identityReceipt)
]);
const parse = (bytes: Buffer) => JSON.parse(bytes.toString('utf8'));
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const receipt = verifyFilmFullFlow({
  baseline: parse(analysisBytes),
  candidate: parse(candidateBytes),
  participation: parse(participationBytes),
  maskTrack: parse(maskTrackBytes),
  identityReceipt: parse(identityReceiptBytes),
  fingerprints: {
    analysisSha256: sha256(analysisBytes),
    participationSha256: sha256(participationBytes),
    maskTrackSha256: sha256(maskTrackBytes),
    candidateSha256: sha256(candidateBytes)
  }
});
await writeFile(paths.output, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
if (!receipt.ok) process.exitCode = 1;
