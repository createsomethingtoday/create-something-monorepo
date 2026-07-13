import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { buildUnitEconomicsReport, renderUnitEconomicsMarkdown } from '../src/unit-economics.js';

type CliOptions = {
  collector: string;
  reviewer: string;
  rateCard: string;
  scenario: string;
  outDir: string;
};

function parseArgs(argv: string[]): CliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      console.log(`Usage:
  pnpm unit-economics:report -- --collector <receipt.json> --reviewer <receipt.json> --rate-card <rates.json> --scenario <scenario.json> --out <dir>`);
      process.exit(0);
    }
    const next = argv[index + 1];
    if (!arg?.startsWith('--') || !next) throw new Error(`Expected --flag <value>, received: ${arg ?? ''}`);
    values.set(arg, next);
    index += 1;
  }

  const required = ['--collector', '--reviewer', '--rate-card', '--scenario', '--out'] as const;
  for (const flag of required) {
    if (!values.get(flag)) throw new Error(`Missing required ${flag} <value>.`);
  }
  return {
    collector: values.get('--collector')!,
    reviewer: values.get('--reviewer')!,
    rateCard: values.get('--rate-card')!,
    scenario: values.get('--scenario')!,
    outDir: values.get('--out')!,
  };
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = buildUnitEconomicsReport({
    collector: await readJson(options.collector),
    reviewer: await readJson(options.reviewer),
    rateCard: await readJson(options.rateCard),
    scenario: await readJson(options.scenario),
  });
  await mkdir(options.outDir, { recursive: true });
  const jsonPath = path.join(options.outDir, 'template-review-unit-economics.json');
  const markdownPath = path.join(options.outDir, 'template-review-unit-economics.md');
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(markdownPath, renderUnitEconomicsMarkdown(report));
  console.log(JSON.stringify({ ok: true, json: jsonPath, markdown: markdownPath }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
