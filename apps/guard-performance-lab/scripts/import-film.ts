import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { capturedFilmAnalysisSchema, filmCorrectionSchema, validateFilmImportGate } from '../src/lib/film.js';
import { LabService } from '../src/lib/server/lab-service.js';
import { JsonFileLabStore } from '../src/lib/server/store.js';

function argument(name: string, fallback?: string) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : fallback;
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
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
const playerId = argument('--player', 'developing-guard');
const title = argument('--title', 'Burton Angels Summer League / player #13');
const dataPath = resolve(argument('--data'));
const service = new LabService(new JsonFileLabStore(dataPath));
const workspace = (await service.getWorkspace()).workspace;
if (!workspace.players.some((player) => player.id === playerId)) throw new Error(`Player ${playerId} does not exist in the private workspace.`);
const playStateFingerprint = analysis.analysis.playStateVerification?.ledgerFingerprint ?? null;
let record = workspace.filmAnalyses.find((item) => item.playerId === playerId && item.source.sha256 === analysis.source.sha256 && item.analysis.revision === analysis.analysis.revision
  && (item.analysis.playStateVerification?.ledgerFingerprint ?? null) === playStateFingerprint);
if (!record) {
  const attached = await service.attachFilmAnalysis(playerId, title, analysis);
  record = attached.workspace.filmAnalyses.find((item) => item.playerId === playerId && item.source.sha256 === analysis.source.sha256 && item.analysis.revision === analysis.analysis.revision
    && (item.analysis.playStateVerification?.ledgerFingerprint ?? null) === playStateFingerprint)!;
}
for (const correction of corrections) {
  const current = (await service.getPlayerWorkspace(playerId)).workspace.filmAnalyses.find((item) => item.id === record.id)!;
  if (current.corrections.some((item) => item.timeMs === correction.timeMs && item.reason === correction.reason)) continue;
  await service.correctFilmAnalysis(playerId, record.id, correction);
}
const finalRecord = (await service.getPlayerWorkspace(playerId)).workspace.filmAnalyses.find((item) => item.id === record.id)!;
console.log(JSON.stringify({ ok: true, dataPath, playerId, analysisId: finalRecord.id, executionCount: finalRecord.analysis.executionCount, frames: finalRecord.frames.length, corrections: finalRecord.corrections.length }, null, 2));
