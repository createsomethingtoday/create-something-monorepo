#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { evaluateGroundGa } from './ground-ga-policy.mjs';

function parseArgs(argv) {
  const options = {};
  const args = argv.slice(2).filter((arg) => arg !== '--');
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--config' && args[index + 1]) options.config = args[++index];
    else if (arg === '--calibration' && args[index + 1]) options.calibration = args[++index];
    else if (arg === '--evidence' && args[index + 1]) options.evidence = args[++index];
    else if (arg === '--output' && args[index + 1]) options.output = args[++index];
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  return options;
}

function usage() {
  console.log(`Usage:
  node scripts/ground-ga-verify.mjs --config <config.json> --calibration <summary.json> --evidence <evidence.json> --output <receipt.json>

Combines the independently generated Ground calibration, release/package/client,
and real-browser evidence into one fail-closed promotion receipt.
`);
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function main(argv = process.argv) {
  const options = parseArgs(argv);
  if (options.help) {
    usage();
    return 0;
  }
  for (const name of ['config', 'calibration', 'evidence', 'output']) {
    if (!options[name]) throw new Error(`Missing required --${name}`);
  }
  const [config, calibration, evidence] = await Promise.all([
    readJson(options.config),
    readJson(options.calibration),
    readJson(options.evidence)
  ]);
  const receipt = evaluateGroundGa(config, calibration, evidence);
  const serialized = `${JSON.stringify(receipt, null, 2)}\n`;
  await writeFile(options.output, serialized, { flag: 'wx' });
  process.stdout.write(serialized);
  return receipt.promotion.ready ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
    .then((status) => {
      process.exitCode = status;
    })
    .catch((error) => {
      console.error(
        `Ground GA verification failed: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exitCode = 1;
    });
}
