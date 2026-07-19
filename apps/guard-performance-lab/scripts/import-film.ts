import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { capturedFilmAnalysisSchema, filmCorrectionSchema } from '../src/lib/film.js';
import { LabService } from '../src/lib/server/lab-service.js';
import { JsonFileLabStore } from '../src/lib/server/store.js';

function argument(name: string, fallback?: string) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : fallback;
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

const analysis = capturedFilmAnalysisSchema.parse(JSON.parse(await readFile(resolve(argument('--analysis')), 'utf8')));
const corrections = filmCorrectionSchema.array().parse(JSON.parse(await readFile(resolve(argument('--corrections')), 'utf8')));
const playerId = argument('--player', 'developing-guard');
const title = argument('--title', 'Burton Angels Summer League / player #13');
const dataPath = resolve(argument('--data'));
const service = new LabService(new JsonFileLabStore(dataPath));
const workspace = (await service.getWorkspace()).workspace;
if (!workspace.players.some((player) => player.id === playerId)) throw new Error(`Player ${playerId} does not exist in the private workspace.`);
let record = workspace.filmAnalyses.find((item) => item.playerId === playerId && item.source.sha256 === analysis.source.sha256 && item.analysis.revision === analysis.analysis.revision);
if (!record) {
  const attached = await service.attachFilmAnalysis(playerId, title, analysis);
  record = attached.workspace.filmAnalyses.find((item) => item.playerId === playerId && item.source.sha256 === analysis.source.sha256)!;
}
for (const correction of corrections) {
  const current = (await service.getPlayerWorkspace(playerId)).workspace.filmAnalyses.find((item) => item.id === record.id)!;
  if (current.corrections.some((item) => item.timeMs === correction.timeMs && item.reason === correction.reason)) continue;
  await service.correctFilmAnalysis(playerId, record.id, correction);
}
const finalRecord = (await service.getPlayerWorkspace(playerId)).workspace.filmAnalyses.find((item) => item.id === record.id)!;
console.log(JSON.stringify({ ok: true, dataPath, playerId, analysisId: finalRecord.id, executionCount: finalRecord.analysis.executionCount, frames: finalRecord.frames.length, corrections: finalRecord.corrections.length }, null, 2));
