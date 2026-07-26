import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createFilmImportGate } from '../src/lib/film.js';

function argument(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}.`);
  return process.argv[index + 1]!;
}

function optionalArgument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const analysisPath = resolve(argument('--analysis'));
const correctionsPath = resolve(argument('--corrections'));
const outputPath = resolve(argument('--output'));
const benchmarkReportPath = optionalArgument('--benchmark-report');
const [analysisText, correctionsText, benchmarkReportText] = await Promise.all([
  readFile(analysisPath, 'utf8'),
  readFile(correctionsPath, 'utf8'),
  benchmarkReportPath ? readFile(resolve(benchmarkReportPath), 'utf8') : Promise.resolve(undefined)
]);
const gate = createFilmImportGate(
  JSON.parse(analysisText),
  JSON.parse(correctionsText),
  { analysisSha256: digest(analysisText), correctionsSha256: digest(correctionsText) },
  optionalArgument('--verified-at') ?? new Date().toISOString(),
  benchmarkReportText ? JSON.parse(benchmarkReportText) : undefined
);

await writeFile(outputPath, `${JSON.stringify(gate, null, 2)}\n`);
console.log(JSON.stringify({ ...gate, outputPath }, null, 2));
