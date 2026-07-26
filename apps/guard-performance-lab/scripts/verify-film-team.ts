import { readFile, writeFile } from 'node:fs/promises';
import { filmTeamBenchmarkSchema, scoreFilmTeamBenchmark } from '../src/lib/film.js';

const [fixturePath, predictionsPath, reportPath] = process.argv.slice(2);
if (!fixturePath || !predictionsPath || !reportPath) throw new Error('Usage: verify-film-team <fixture.json> <predictions.json> <report.json>');
const fixture = filmTeamBenchmarkSchema.parse(JSON.parse(await readFile(fixturePath, 'utf8')));
const captured = JSON.parse(await readFile(predictionsPath, 'utf8')) as { sourceSha256?: string; correctionOverlayCount?: number; predictions?: unknown };
if (captured.sourceSha256 !== fixture.sourceSha256) throw new Error('Team prediction source hash does not match the fixture.');
if (captured.correctionOverlayCount !== 0) throw new Error('The team benchmark cannot score correction overlays.');
const report = scoreFilmTeamBenchmark(fixture, captured.predictions);
await writeFile(reportPath, `${JSON.stringify({ ...report, sourceSha256: fixture.sourceSha256, sampleCount: fixture.annotations.length, correctionOverlayCount: 0 }, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
