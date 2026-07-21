import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { exportFilmAnalysisFromWorkspace, serializedJson } from '../src/lib/film-export.js';

function argument(name: string, fallback?: string) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : fallback;
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

async function atomicWrite(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, serializedJson(value), { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, path);
}

const workspacePath = resolve(argument('--data'));
const revision = Number(argument('--revision'));
if (![1, 2, 3, 4].includes(revision)) throw new Error('--revision must be 1, 2, 3, or 4.');
const analysisIdIndex = process.argv.indexOf('--analysis-id');
const analysisId = analysisIdIndex >= 0 ? process.argv[analysisIdIndex + 1] : undefined;
const exported = exportFilmAnalysisFromWorkspace(JSON.parse(await readFile(workspacePath, 'utf8')), {
  sourceSha256: argument('--source-sha256'),
  revision: revision as 1 | 2 | 3 | 4,
  analysisId
});
const analysisOutput = resolve(argument('--analysis-output'));
const correctionsOutput = resolve(argument('--corrections-output'));
const receiptOutput = resolve(argument('--receipt-output'));
await Promise.all([
  atomicWrite(analysisOutput, exported.analysis),
  atomicWrite(correctionsOutput, exported.corrections),
  atomicWrite(receiptOutput, exported.receipt)
]);
console.log(JSON.stringify({
  ok: true,
  analysisOutput,
  correctionsOutput,
  receiptOutput,
  sourceSha256: exported.receipt.sourceSha256,
  analysisRevision: exported.receipt.analysisRevision,
  frameCount: exported.receipt.frameCount,
  correctionCount: exported.receipt.correctionCount,
  analysisSha256: exported.receipt.analysisSha256,
  correctionsSha256: exported.receipt.correctionsSha256
}, null, 2));
