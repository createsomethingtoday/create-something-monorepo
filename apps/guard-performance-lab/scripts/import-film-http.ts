import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { capturedFilmAnalysisSchema, filmCorrectionSchema, validateFilmImportGate } from '../src/lib/film.js';

function argument(name: string, fallback?: string) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : fallback;
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function optionalArgument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const [analysisText, correctionsText, gateText] = await Promise.all([
  readFile(resolve(argument('--analysis')), 'utf8'),
  readFile(resolve(argument('--corrections')), 'utf8'),
  readFile(resolve(argument('--gate')), 'utf8')
]);
const analysis = capturedFilmAnalysisSchema.parse(JSON.parse(analysisText));
const corrections = filmCorrectionSchema.array().parse(JSON.parse(correctionsText));
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
validateFilmImportGate(analysis, corrections, JSON.parse(gateText), { analysisSha256: digest(analysisText), correctionsSha256: digest(correctionsText) });
const url = new URL('/api/workspace/command', argument('--url', 'http://127.0.0.1:4173'));
const playerId = argument('--player', 'developing-guard');
const tokenUrl = optionalArgument('--token-url');
let authorization: string | undefined;
if (tokenUrl) {
  const response = await fetch(tokenUrl);
  const result = await response.json() as { access_token?: string; error?: string };
  if (!response.ok || !result.access_token) throw new Error(`${response.status}: ${result.error ?? 'Access-token fixture failed.'}`);
  authorization = `Bearer ${result.access_token}`;
}
async function command(body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(authorization ? { authorization } : {}) },
    body: JSON.stringify(body),
  });
  const result = await response.json() as { ok?: boolean; error?: string; workspace?: { filmAnalyses?: Array<{ id: string; source: { sha256: string }; analysis: { revision: number }; corrections: unknown[] }> } };
  if (!response.ok || !result.ok) throw new Error(`${response.status}: ${result.error ?? 'HTTP import failed.'}`);
  return result;
}
let workspace = await command({ action: 'attach-film-analysis', playerId, title: argument('--title', 'Burton Angels Summer League / player #13'), analysis });
const playStateFingerprint = analysis.analysis.playStateVerification?.ledgerFingerprint ?? null;
const record = workspace.workspace?.filmAnalyses?.find((item) => item.source.sha256 === analysis.source.sha256 && item.analysis.revision === analysis.analysis.revision
  && ((item.analysis as typeof analysis.analysis).playStateVerification?.ledgerFingerprint ?? null) === playStateFingerprint);
if (!record) throw new Error('Attached film analysis was not returned by the scoped workspace.');
for (const correction of corrections) {
  workspace = await command({ action: 'correct-film-analysis', playerId, analysisId: record.id, correction });
}
const finalRecord = workspace.workspace?.filmAnalyses?.find((item) => item.id === record.id);
console.log(JSON.stringify({ ok: true, url: url.origin, analysisId: record.id, executionCount: analysis.analysis.executionCount, frames: analysis.frames.length, corrections: finalRecord?.corrections.length }, null, 2));
