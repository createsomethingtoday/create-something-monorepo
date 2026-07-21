import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { filmPlayReviewPacketSchema } from '../src/lib/film-play-review.js';
import { LabService } from '../src/lib/server/lab-service.js';
import { JsonFileLabStore } from '../src/lib/server/store.js';

function argument(name: string, fallback?: string) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : fallback;
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

const dataPath = resolve(argument('--data'));
const playerId = argument('--player', 'developing-guard');
const packet = filmPlayReviewPacketSchema.parse(JSON.parse(await readFile(resolve(argument('--review')), 'utf8')));
const service = new LabService(new JsonFileLabStore(dataPath));
const workspace = (await service.getWorkspace()).workspace;
const analysis = workspace.filmAnalyses.find((record) =>
  record.playerId === playerId
  && record.source.sha256 === packet.sourceSha256
  && record.analysis.revision === packet.analysisRevision
);
if (!analysis) throw new Error('The private workspace does not contain the source-bound analysis revision for this review.');
if ((analysis.playReviews ?? []).some((review) => review.profile === packet.profile && review.sourceSha256 === packet.sourceSha256)) {
  console.log(JSON.stringify({ ok: true, noOp: true, dataPath, playerId, analysisId: analysis.id, cardCount: packet.cards.length }, null, 2));
  process.exit(0);
}
const result = await service.attachFilmPlayReview(playerId, analysis.id, packet);
const stored = result.workspace.filmAnalyses.find((record) => record.id === analysis.id)!;
console.log(JSON.stringify({
  ok: true,
  noOp: false,
  dataPath,
  playerId,
  analysisId: analysis.id,
  analysisExecutionCount: stored.analysis.executionCount,
  reviewCount: stored.playReviews?.length ?? 0,
  cardCount: stored.playReviews?.at(-1)?.cards.length ?? 0
}, null, 2));
