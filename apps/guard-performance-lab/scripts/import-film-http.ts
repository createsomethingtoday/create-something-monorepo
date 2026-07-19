import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { capturedFilmAnalysisSchema, filmCorrectionSchema } from '../src/lib/film.js';

function argument(name: string, fallback?: string) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : fallback;
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

const analysis = capturedFilmAnalysisSchema.parse(JSON.parse(await readFile(resolve(argument('--analysis')), 'utf8')));
const corrections = filmCorrectionSchema.array().parse(JSON.parse(await readFile(resolve(argument('--corrections')), 'utf8')));
const url = new URL('/api/workspace/command', argument('--url', 'http://127.0.0.1:4173'));
const playerId = argument('--player', 'developing-guard');
async function command(body: unknown) {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json() as { ok?: boolean; error?: string; workspace?: { filmAnalyses?: Array<{ id: string; source: { sha256: string }; corrections: unknown[] }> } };
  if (!response.ok || !result.ok) throw new Error(`${response.status}: ${result.error ?? 'HTTP import failed.'}`);
  return result;
}
let workspace = await command({ action: 'attach-film-analysis', playerId, title: argument('--title', 'Burton Angels Summer League / player #13'), analysis });
const record = workspace.workspace?.filmAnalyses?.find((item) => item.source.sha256 === analysis.source.sha256);
if (!record) throw new Error('Attached film analysis was not returned by the scoped workspace.');
for (const correction of corrections) {
  workspace = await command({ action: 'correct-film-analysis', playerId, analysisId: record.id, correction });
}
const finalRecord = workspace.workspace?.filmAnalyses?.find((item) => item.id === record.id);
console.log(JSON.stringify({ ok: true, url: url.origin, analysisId: record.id, executionCount: analysis.analysis.executionCount, frames: analysis.frames.length, corrections: finalRecord?.corrections.length }, null, 2));
