#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { summarizeLedger } from './ground-adjudication.mjs';
import {
  evaluateGroundCalibration,
  evaluateGroundCalibrationExecution
} from './ground-ga-policy.mjs';

function parseArgs(argv) {
  const options = {};
  const args = argv.slice(2).filter((arg) => arg !== '--');
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--config' && args[index + 1]) options.config = args[++index];
    else if (arg === '--source-sha' && args[index + 1]) options.sourceSha = args[++index];
    else if (arg === '--release-tag' && args[index + 1]) options.releaseTag = args[++index];
    else if (arg === '--execution' && args[index + 1]) options.execution = args[++index];
    else if (arg === '--output' && args[index + 1]) options.output = args[++index];
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  return options;
}

function usage() {
  console.log(`Usage:
  node scripts/ground-calibration-verify.mjs --config <config.json> --source-sha <sha> --release-tag <tag> --execution <receipt.json> --output <receipt.json>

Requires a successful fixture execution from the exact release source, recomputes
the governed Ground calibration, and exits nonzero when either gate is not ready.
`);
}

export async function main(argv = process.argv) {
  const options = parseArgs(argv);
  if (options.help) {
    usage();
    return 0;
  }
  for (const name of ['config', 'sourceSha', 'releaseTag', 'execution', 'output']) {
    if (!options[name])
      throw new Error(`Missing required --${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`);
  }
  if (!/^[0-9a-f]{40}$/.test(options.sourceSha)) {
    throw new Error('--source-sha must be a full lowercase Git commit SHA');
  }

  const configPath = resolve(options.config);
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const repositoryRoot = resolve(dirname(configPath), '..');
  const ledgerPath = resolve(repositoryRoot, config?.calibration?.ledger ?? '');
  const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
  let fixtureExecution = null;
  try {
    fixtureExecution = JSON.parse(await readFile(resolve(options.execution), 'utf8'));
  } catch {
    // A missing or malformed execution receipt is represented by the fail-closed
    // policy reasons below so the release receipt itself can still be preserved.
  }
  const calibration = summarizeLedger(ledger);
  const evaluated = evaluateGroundCalibration(config, calibration);
  const expectedTag = `ground-v${evaluated.version}`;
  if (options.releaseTag !== expectedTag) {
    throw new Error(`--release-tag must equal ${expectedTag}`);
  }
  const executionReasons = evaluateGroundCalibrationExecution(
    config,
    fixtureExecution,
    options.sourceSha
  );
  const reasons = [...new Set([...evaluated.promotion.reasons, ...executionReasons])];
  const receipt = {
    schema_version: 'ground-calibration-release-receipt.v1',
    mode: evaluated.mode,
    version: evaluated.version,
    source_sha: options.sourceSha,
    release_tag: options.releaseTag,
    fixture_execution: fixtureExecution,
    calibration: evaluated.calibration,
    promotion: { ready: reasons.length === 0, reasons }
  };
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
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
