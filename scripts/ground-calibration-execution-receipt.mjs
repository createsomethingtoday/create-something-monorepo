#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function parseArgs(argv) {
  const options = {};
  const args = argv.slice(2).filter((arg) => arg !== '--');
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--config' && args[index + 1]) options.config = args[++index];
    else if (arg === '--source-sha' && args[index + 1]) options.sourceSha = args[++index];
    else if (arg === '--exit-code' && args[index + 1]) options.exitCode = args[++index];
    else if (arg === '--log' && args[index + 1]) options.log = args[++index];
    else if (arg === '--output' && args[index + 1]) options.output = args[++index];
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  return options;
}

function usage() {
  console.log(`Usage:
  node scripts/ground-calibration-execution-receipt.mjs --config <config.json> --source-sha <sha> --exit-code <code> --log <cargo.log> --output <receipt.json>

Converts the exact-tag Ground calibration test result into a source-bound,
machine-readable receipt. The governed verifier makes the promotion decision.
`);
}

export function parseCargoTestSummary(log) {
  const matches = [
    ...log.matchAll(
      /test result: (ok|FAILED)\. (\d+) passed; (\d+) failed; (\d+) ignored; (\d+) measured; (\d+) filtered out/g
    )
  ];
  const match = matches.at(-1);
  if (!match) return null;
  return {
    status: match[1],
    passed: Number(match[2]),
    failed: Number(match[3]),
    ignored: Number(match[4]),
    measured: Number(match[5]),
    filtered_out: Number(match[6])
  };
}

export async function main(argv = process.argv) {
  const options = parseArgs(argv);
  if (options.help) {
    usage();
    return 0;
  }
  for (const name of ['config', 'sourceSha', 'exitCode', 'log', 'output']) {
    if (options[name] === undefined) {
      throw new Error(
        `Missing required --${name.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)}`
      );
    }
  }
  if (!/^[0-9a-f]{40}$/.test(options.sourceSha)) {
    throw new Error('--source-sha must be a full lowercase Git commit SHA');
  }
  const exitCode = Number(options.exitCode);
  if (!Number.isInteger(exitCode) || exitCode < 0) {
    throw new Error('--exit-code must be a non-negative integer');
  }

  const configPath = resolve(options.config);
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const repositoryRoot = resolve(dirname(configPath), '..');
  const actualSourceSha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repositoryRoot,
    encoding: 'utf8'
  }).trim();
  if (actualSourceSha !== options.sourceSha) {
    throw new Error(`--source-sha does not match checked-out source ${actualSourceSha}`);
  }

  const fixture = config?.calibration?.fixtureExecution;
  if (!fixture) throw new Error('Ground calibration fixture execution policy is missing');
  const command = `cargo test --manifest-path ${fixture.manifest} --test ${fixture.testTarget} -- --nocapture`;
  const log = await readFile(resolve(options.log), 'utf8');
  const summary = parseCargoTestSummary(log);
  const ready =
    exitCode === 0 &&
    summary?.status === 'ok' &&
    summary.passed >= fixture.minimumPassedTests &&
    summary.failed === 0;
  const receipt = {
    schema_version: fixture.receiptSchema,
    source_sha: options.sourceSha,
    manifest: fixture.manifest,
    test_target: fixture.testTarget,
    command,
    result: {
      completed: true,
      exit_code: exitCode,
      signal: null,
      summary_seen: summary !== null,
      passed: summary?.passed ?? null,
      failed: summary?.failed ?? null,
      ignored: summary?.ignored ?? null,
      measured: summary?.measured ?? null,
      filtered_out: summary?.filtered_out ?? null
    },
    ready
  };
  const serialized = `${JSON.stringify(receipt, null, 2)}\n`;
  await writeFile(resolve(options.output), serialized, { flag: 'wx' });
  process.stdout.write(serialized);
  return ready ? 0 : 1;
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
