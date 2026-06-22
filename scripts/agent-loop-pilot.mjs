#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const args = new Set(process.argv.slice(2));
const dispatch = args.has('--dispatch');
const json = args.has('--json');

function runStep(id, label, command, commandArgs, options = {}) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const output = `${stdout}${stderr}`.trim();
  const ok = result.status === 0;

  return {
    id,
    label,
    command: [command, ...commandArgs].join(' '),
    ok,
    skipped: false,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    exit_code: result.status,
    summary: options.summarize ? options.summarize(stdout, stderr, ok) : summarizeOutput(output),
    output: options.includeOutput ? output : undefined
  };
}

function skippedStep(id, label, reason) {
  return {
    id,
    label,
    command: null,
    ok: true,
    skipped: true,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    exit_code: null,
    summary: reason
  };
}

function summarizeOutput(output) {
  if (!output) return 'No output.';
  const lines = output.split(/\r?\n/).filter(Boolean);
  return lines.slice(-8).join('\n');
}

function summarizeLinear(stdout, stderr, ok) {
  if (!ok) return summarizeOutput(`${stdout}${stderr}`.trim());

  const jsonStart = stdout.indexOf('[');
  if (jsonStart === -1) return 'Linear returned no issue list.';

  try {
    const issues = JSON.parse(stdout.slice(jsonStart));
    const identifiers = issues
      .slice(0, 8)
      .map((issue) => issue.identifier)
      .filter(Boolean);
    return `Linear ready returned ${issues.length} candidate issue(s): ${identifiers.join(', ') || 'none'}.`;
  } catch {
    return summarizeOutput(stdout);
  }
}

function summarizeLegibility(stdout, stderr, ok) {
  if (!ok) return summarizeOutput(`${stdout}${stderr}`.trim());
  try {
    const jsonStart = stdout.indexOf('{');
    const payload = JSON.parse(stdout.slice(jsonStart));
    return `Agent legibility check passed for ${payload.audit?.target_count ?? 'unknown'} target(s).`;
  } catch {
    return summarizeOutput(stdout);
  }
}

function main() {
  const steps = [];

  steps.push(
    runStep('git-status', 'Confirm checkout state', 'git', ['status', '--short'], {
      summarize: (stdout) =>
        stdout.trim()
          ? `Checkout has changes:\n${stdout.trim()}`
          : 'Checkout is clean before pilot checks.'
    })
  );

  steps.push(
    runStep(
      'agent-legibility',
      'Check package agent legibility contracts',
      'node',
      ['scripts/agent-legibility-check.mjs', '--format', 'json'],
      { summarize: summarizeLegibility }
    )
  );

  steps.push(
    runStep('policy-artifacts', 'Check policy artifact structure', 'node', [
      'scripts/policy-artifact-check.mjs'
    ])
  );

  steps.push(
    runStep('symphony-tests', 'Run Symphony package tests', 'pnpm', [
      '--filter',
      '@create-something/symphony',
      'test'
    ])
  );

  if (process.env.LINEAR_API_KEY) {
    steps.push(
      runStep(
        'linear-ready',
        'Inspect Linear ready queue',
        'node',
        ['scripts/linear/remote.mjs', 'ready'],
        {
          summarize: summarizeLinear
        }
      )
    );
  } else {
    steps.push(
      skippedStep(
        'linear-ready',
        'Inspect Linear ready queue',
        'Skipped because LINEAR_API_KEY is not set.'
      )
    );
  }

  if (dispatch) {
    steps.push(
      runStep(
        'symphony-dispatch',
        'Dispatch one bounded Symphony code-quality pass',
        'pnpm',
        ['symphony:code-quality:once'],
        { includeOutput: true }
      )
    );
  } else {
    steps.push(
      skippedStep(
        'symphony-dispatch',
        'Dispatch one bounded Symphony code-quality pass',
        'Skipped by default. Re-run with --dispatch to claim Linear work and start Codex workers.'
      )
    );
  }

  const passed = steps.every((step) => step.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: dispatch ? 'dispatch' : 'readiness',
    passed,
    steps
  };

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`# Agent Loop Pilot ${dispatch ? 'Dispatch' : 'Readiness'} Report`);
    console.log(`Generated: ${report.generated_at}`);
    console.log(`Result: ${passed ? 'passed' : 'failed'}`);
    console.log('');
    for (const step of steps) {
      console.log(`## ${step.ok ? 'PASS' : 'FAIL'} ${step.label}`);
      if (step.command) console.log(`Command: ${step.command}`);
      if (step.skipped) console.log('Status: skipped');
      console.log(step.summary);
      console.log('');
    }
  }

  process.exit(passed ? 0 : 1);
}

main();
