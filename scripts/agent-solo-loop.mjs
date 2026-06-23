#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const DEFAULT_REQUIRED_FILES = [
  'AGENTS.md',
  'docs/guides/SOLO_OPERATOR_AGENT_LOOP.md',
  'docs/guides/CODING_AGENT_HARNESS_PATTERN.md',
  'docs/guides/GIT_LIGHT_AGENT_DELIVERY_WORKFLOW.md',
  'package.json',
];

export function parseArgs(argv) {
  const options = {
    check: false,
    json: false,
    strict: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    else if (arg === '--check') options.check = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--strict') options.strict = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function run(command, args, options = {}) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
    timeout: options.timeoutMs ?? 120_000,
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const output = `${stdout}${stderr}`.trim();

  return {
    command: [command, ...args].join(' '),
    ok: result.status === 0,
    exit_code: result.status,
    signal: result.signal,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    stdout,
    stderr,
    summary: options.summarize ? options.summarize(stdout, stderr, result.status === 0) : summarize(output),
  };
}

function summarize(output) {
  if (!output) return 'No output.';
  return output.split(/\r?\n/).filter(Boolean).slice(-8).join('\n');
}

export function classifyStatus(statusText) {
  const lines = statusText.split(/\r?\n/).filter(Boolean);
  const entries = lines.map((line) => ({
    raw: line,
    code: line.slice(0, 2),
    path: line.slice(3),
  }));

  return {
    clean: entries.length === 0,
    total: entries.length,
    staged: entries.filter((entry) => entry.code[0] !== ' ' && entry.code[0] !== '?').length,
    unstaged: entries.filter((entry) => entry.code[1] !== ' ' && entry.code[1] !== '?').length,
    untracked: entries.filter((entry) => entry.code === '??').length,
    entries,
  };
}

export function parseDivergence(statusLine) {
  const match = statusLine.match(/\[(?<content>[^\]]+)\]/);
  if (!match?.groups?.content) return { ahead: 0, behind: 0 };

  const ahead = match.groups.content.match(/ahead (?<count>\d+)/)?.groups?.count;
  const behind = match.groups.content.match(/behind (?<count>\d+)/)?.groups?.count;
  return {
    ahead: ahead ? Number(ahead) : 0,
    behind: behind ? Number(behind) : 0,
  };
}

export function decideSoloPosture({ status, divergence, strict }) {
  const warnings = [];
  if (!status.clean) {
    warnings.push(
      `Checkout has ${status.total} changed file(s): ${status.staged} staged, ${status.unstaged} unstaged, ${status.untracked} untracked.`,
    );
  }
  if (divergence.behind > 0) {
    warnings.push(`Checkout is behind upstream by ${divergence.behind} commit(s). Rebase or pull before production promotion.`);
  }
  if (divergence.ahead > 0) {
    warnings.push(`Checkout is ahead of upstream by ${divergence.ahead} commit(s). Push or preserve before switching lanes.`);
  }

  return {
    ok: strict ? status.clean && divergence.behind === 0 : true,
    mode: 'solo-operator',
    production_boundary: 'Use branch/PR/merge or an approved immutable release path before production promotion.',
    warnings,
  };
}

function step(id, label, result, ok = result.ok) {
  return {
    id,
    label,
    command: result.command,
    ok,
    exit_code: result.exit_code,
    signal: result.signal,
    started_at: result.started_at,
    completed_at: result.completed_at,
    summary: result.summary,
  };
}

function fileProbe(files) {
  return run('bash', ['-lc', files.map((file) => `test -f ${shellQuote(file)}`).join(' && ')], {
    summarize: (_stdout, stderr, ok) => (ok ? `Found ${files.length} solo-loop control file(s).` : summarize(stderr)),
  });
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function usage() {
  console.log(`Usage:
  node scripts/agent-solo-loop.mjs [--json] [--check] [--strict]

Peter Steinberger-inspired solo-operator loop readiness for this repo.

Default mode is read-only and never mutates git, Linear, or deployments.

Options:
  --check   Run fast repo-local validation commands for the solo-loop contract.
  --strict  Fail when checkout is dirty or behind upstream.
  --json    Print machine-readable output.
`);
}

function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    return;
  }

  const branch = run('git', ['status', '--short', '--branch']);
  const statusShort = run('git', ['status', '--short'], {
    summarize: (stdout) => (stdout.trim() ? stdout.trim() : 'Checkout is clean.'),
  });
  const status = classifyStatus(statusShort.stdout);
  const branchLine = branch.stdout.split(/\r?\n/)[0] ?? '';
  const divergence = parseDivergence(branchLine);
  const posture = decideSoloPosture({ status, divergence, strict: options.strict });

  const steps = [
    step('git-status', 'Inspect current checkout state', statusShort),
    step('control-files', 'Confirm solo-loop control files exist', fileProbe(DEFAULT_REQUIRED_FILES)),
  ];

  const hermesProbe = run('bash', ['-lc', `command -v ${shellQuote(process.env.HERMES_COMMAND || 'hermes')}`], {
    summarize: (stdout, _stderr, ok) =>
      ok
        ? `Hermes command resolved: ${stdout.trim()}`
        : 'Hermes command not found. Use Codex for the solo loop or set HERMES_COMMAND.',
  });
  steps.push(step('hermes-command', 'Check optional Hermes CLI availability', hermesProbe, true));

  const codexProbe = run('bash', ['-lc', 'command -v codex'], {
    summarize: (stdout, _stderr, ok) =>
      ok ? `Codex command resolved: ${stdout.trim()}` : 'Codex command not found on PATH.',
  });
  steps.push(step('codex-command', 'Check optional Codex CLI availability', codexProbe, true));

  if (options.check) {
    steps.push(
      step(
        'agent-legibility',
        'Run agent legibility check',
        run('node', ['scripts/agent-legibility-check.mjs', '--format', 'json'], {
          summarize: (stdout, stderr, ok) => {
            if (!ok) return summarize(`${stdout}${stderr}`);
            try {
              const payload = JSON.parse(stdout.slice(stdout.indexOf('{')));
              return `Agent legibility check passed for ${payload.audit?.target_count ?? 'unknown'} target(s).`;
            } catch {
              return summarize(stdout);
            }
          },
        }),
      ),
    );
    steps.push(
      step(
        'policy-artifacts',
        'Run policy artifact check',
        run('node', ['scripts/policy-artifact-check.mjs']),
      ),
    );
    steps.push(step('solo-loop-test', 'Run solo-loop unit tests', run('node', ['--test', 'scripts/test/agent-solo-loop.test.mjs'])));
  }

  const passed = posture.ok && steps.every((entry) => entry.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'solo-operator',
    passed,
    strict: options.strict,
    branch: branchLine.replace(/^##\s*/, ''),
    status,
    divergence,
    posture,
    recommended_loop: [
      'Run one current-checkout agent session for a small task.',
      'Keep the prompt short and point at the nearest CLI, doc, or failing command.',
      'Watch the stream; interrupt or redirect on drift.',
      'Ask for tests or write targeted tests in the same context.',
      'Use branch/PR or an approved immutable release path for production promotion.',
    ],
    steps,
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('# Solo Operator Agent Loop');
    console.log(`Generated: ${report.generated_at}`);
    console.log(`Result: ${passed ? 'passed' : 'failed'}`);
    console.log(`Branch: ${report.branch || 'unknown'}`);
    console.log('');
    if (posture.warnings.length > 0) {
      console.log('## Warnings');
      for (const warning of posture.warnings) console.log(`- ${warning}`);
      console.log('');
    }
    for (const entry of steps) {
      console.log(`## ${entry.ok ? 'PASS' : 'FAIL'} ${entry.label}`);
      console.log(`Command: ${entry.command}`);
      console.log(entry.summary);
      console.log('');
    }
    console.log('## Recommended Loop');
    for (const item of report.recommended_loop) console.log(`- ${item}`);
  }

  process.exit(passed ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
