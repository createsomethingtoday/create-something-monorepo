import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { reviewFilmMaskTrackStint } from '../src/lib/film.js';

function argument(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}.`);
  return process.argv[index + 1]!;
}

const inputPath = resolve(argument('--input'));
const outputPath = resolve(argument('--output'));
const reviewed = reviewFilmMaskTrackStint(JSON.parse(await readFile(inputPath, 'utf8')), {
  segmentId: argument('--segment-id'),
  startMs: Number(argument('--start-ms')),
  endMs: Number(argument('--end-ms')),
  evidence: argument('--evidence')
});

await writeFile(outputPath, `${JSON.stringify(reviewed, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  outputPath,
  segmentId: reviewed.segments[0]?.id,
  startMs: reviewed.segments[0]?.startMs,
  endMs: reviewed.segments[0]?.endMs,
  sampleCount: reviewed.segments[0]?.samples.length ?? 0
}, null, 2));
