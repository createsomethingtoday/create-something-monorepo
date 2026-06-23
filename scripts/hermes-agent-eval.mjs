#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const DEFAULT_TIMEOUT_MS = 15_000;

function parseArgs(argv) {
  const options = {
    command: process.env.HERMES_COMMAND || 'hermes',
    json: false,
    strict: false
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') options.json = true;
    else if (arg === '--strict') options.strict = true;
    else if (arg === '--command' && argv[index + 1]) options.command = argv[++index];
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function runShell(command, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const result = spawnSync('bash', ['-lc', command], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 5,
    timeout: timeoutMs
  });

  return {
    status: result.status,
    signal: result.signal,
    error: result.error ? result.error.message : null,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    timed_out: result.error?.code === 'ETIMEDOUT'
  };
}

function summarize(output) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return 'No output.';
  return lines.slice(0, 8).join('\n');
}

function step(id, label, command, result, ok, summary) {
  return {
    id,
    label,
    command,
    ok,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    exit_code: result?.status ?? null,
    signal: result?.signal ?? null,
    summary
  };
}

function usage() {
  console.log(`Usage:
  node scripts/hermes-agent-eval.mjs [--json] [--strict] [--command <hermes-command>]

Options:
  --strict   Fail when Hermes is not installed or does not answer basic CLI probes.
  --json     Print machine-readable report.

Environment:
  HERMES_COMMAND  Optional command path/name. Defaults to "hermes".
`);
}

function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    return;
  }

  const steps = [];
  const quotedCommand = shellQuote(options.command);

  const controlPlaneFiles = [
    'automation/symphony/code-quality/WORKFLOW.md',
    'scripts/agent-loop-pilot.mjs',
    'packages/symphony/src/cli.js'
  ];
  const controlPlaneProbe = runShell(
    `test -f ${controlPlaneFiles.map(shellQuote).join(' && test -f ')}`
  );
  steps.push(
    step(
      'control-plane-files',
      'Confirm Linear/Symphony control-plane files exist',
      `test -f ${controlPlaneFiles.join(' && test -f ')}`,
      controlPlaneProbe,
      controlPlaneProbe.status === 0,
      controlPlaneProbe.status === 0
        ? `Found ${controlPlaneFiles.length} required control-plane file(s).`
        : summarize(`${controlPlaneProbe.stdout}${controlPlaneProbe.stderr}`)
    )
  );

  const availability = runShell(`command -v ${quotedCommand}`);
  const hermesAvailable = availability.status === 0;
  steps.push(
    step(
      'hermes-command',
      'Check Hermes CLI availability',
      `command -v ${options.command}`,
      availability,
      hermesAvailable || !options.strict,
      hermesAvailable
        ? `Hermes command resolved: ${availability.stdout.trim()}`
        : options.strict
          ? `Hermes command not found: ${options.command}`
          : `Hermes command not found: ${options.command}. Non-strict evaluation records this as not production-ready without failing CI.`
    )
  );

  if (hermesAvailable) {
    const version = runShell(`${quotedCommand} --version`);
    steps.push(
      step(
        'hermes-version',
        'Read Hermes CLI version',
        `${options.command} --version`,
        version,
        version.status === 0,
        summarize(`${version.stdout}${version.stderr}`)
      )
    );

    const help = runShell(`${quotedCommand} --help`);
    steps.push(
      step(
        'hermes-help',
        'Read Hermes CLI help',
        `${options.command} --help`,
        help,
        help.status === 0,
        summarize(`${help.stdout}${help.stderr}`)
      )
    );
  }

  const passed = steps.every((entry) => entry.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: options.strict ? 'strict' : 'readiness',
    passed,
    hermes_available: hermesAvailable,
    production_ready: passed && hermesAvailable,
    command: options.command,
    steps
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('# Hermes Agent Loop Evaluation');
    console.log(`Generated: ${report.generated_at}`);
    console.log(`Result: ${report.passed ? 'passed' : 'failed'}`);
    console.log(`Production ready: ${report.production_ready ? 'yes' : 'no'}`);
    console.log('');
    for (const entry of steps) {
      console.log(`## ${entry.ok ? 'PASS' : 'FAIL'} ${entry.label}`);
      console.log(`Command: ${entry.command}`);
      console.log(entry.summary);
      console.log('');
    }
  }

  process.exit(passed ? 0 : 1);
}

main();
