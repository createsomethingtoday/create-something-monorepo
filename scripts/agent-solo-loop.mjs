#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const DEFAULT_REQUIRED_FILES = [
  'AGENTS.md',
  'docs/guides/SOLO_OPERATOR_AGENT_LOOP.md',
  'docs/guides/CODING_AGENT_HARNESS_PATTERN.md',
  'docs/guides/GIT_LIGHT_AGENT_DELIVERY_WORKFLOW.md',
  'package.json'
];

export function parseArgs(argv) {
  const options = {
    check: false,
    homeBase: false,
    json: false,
    strict: false,
    starter: false
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    else if (arg === '--check') options.check = true;
    else if (arg === '--home-base') options.homeBase = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--strict') options.strict = true;
    else if (arg === '--starter' || arg === '--prompt') options.starter = true;
    else if (arg === '--task') {
      index += 1;
      options.task = readOptionValue(arg, argv[index]);
      options.starter = true;
    } else if (arg.startsWith('--task=')) {
      options.task = arg.slice('--task='.length);
      options.starter = true;
    } else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function readOptionValue(flag, value) {
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
  return value;
}

function run(command, args, options = {}) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
    timeout: options.timeoutMs ?? 120_000
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
    summary: options.summarize
      ? options.summarize(stdout, stderr, result.status === 0)
      : summarize(output)
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
    path: line.slice(3)
  }));

  return {
    clean: entries.length === 0,
    total: entries.length,
    staged: entries.filter((entry) => entry.code[0] !== ' ' && entry.code[0] !== '?').length,
    unstaged: entries.filter((entry) => entry.code[1] !== ' ' && entry.code[1] !== '?').length,
    untracked: entries.filter((entry) => entry.code === '??').length,
    entries
  };
}

export function parseDivergence(statusLine) {
  const match = statusLine.match(/\[(?<content>[^\]]+)\]/);
  if (!match?.groups?.content) return { ahead: 0, behind: 0 };

  const ahead = match.groups.content.match(/ahead (?<count>\d+)/)?.groups?.count;
  const behind = match.groups.content.match(/behind (?<count>\d+)/)?.groups?.count;
  return {
    ahead: ahead ? Number(ahead) : 0,
    behind: behind ? Number(behind) : 0
  };
}

export function decideSoloPosture({ status, divergence, strict }) {
  const warnings = [];
  if (!status.clean) {
    warnings.push(
      `Checkout has ${status.total} changed file(s): ${status.staged} staged, ${status.unstaged} unstaged, ${status.untracked} untracked.`
    );
  }
  if (divergence.behind > 0) {
    warnings.push(
      `Checkout is behind upstream by ${divergence.behind} commit(s). Rebase or pull before production promotion.`
    );
  }
  if (divergence.ahead > 0) {
    warnings.push(
      `Checkout is ahead of upstream by ${divergence.ahead} commit(s). Push or preserve before switching lanes.`
    );
  }

  return {
    ok: strict ? status.clean && divergence.behind === 0 : true,
    mode: 'solo-operator',
    production_boundary:
      'Use branch/PR/merge or an approved immutable release path before production promotion.',
    warnings
  };
}

export function decideHomeBasePosture({
  status,
  divergence,
  branch,
  upstream,
  head,
  originMain
}) {
  const reasons = [];
  if (!status.clean) {
    reasons.push(`Home base has ${status.total} changed file(s).`);
  }
  if (branch !== 'main') {
    reasons.push(`Home base must use branch main; found ${branch || 'detached HEAD'}.`);
  }
  if (upstream !== 'origin/main') {
    reasons.push(`Home base must track origin/main; found ${upstream || 'no upstream'}.`);
  }
  if (divergence.ahead > 0 || divergence.behind > 0) {
    reasons.push(
      `Home base diverges from origin/main: ahead ${divergence.ahead}, behind ${divergence.behind}.`
    );
  }
  if (!head || !originMain || head !== originMain) {
    reasons.push(
      `Home base HEAD ${head || 'unavailable'} does not equal origin/main ${originMain || 'unavailable'}.`
    );
  }

  return {
    ok: reasons.length === 0,
    mode: 'main-home-base',
    reasons,
    production_boundary:
      'Use an isolated tracked worktree and the normal review path for shared or production-bound work.'
  };
}

export function buildStarterPrompt({
  task,
  branch = 'unknown',
  warnings = []
}) {
  const taskText =
    task?.trim() ||
    '[Replace this with one compact task, including the nearest file, command, error, or smoke target.]';
  const warningText =
    warnings.length > 0
      ? `\nCurrent checkout warnings:\n${warnings.map((warning) => `- ${warning}`).join('\n')}\n`
      : '';

  return `You are running the CREATE SOMETHING solo-operator loop.

Task:
${taskText}

Worker:
Use Codex as the implementation worker from this checkout.

Current branch:
${branch || 'unknown'}${warningText}
Operating constraints:
- Work in the current checkout unless the operator explicitly asks for a Linear issue or isolated worktree.
- Start with repo-local evidence: nearest CLI, test, smoke, doc, route, or failing command.
- Keep changes narrow and reversible; do not refactor unrelated surfaces.
- Prefer targeted tests or the smallest useful smoke before finishing.
- Do not mutate production, rotate secrets, deploy, merge, or push without explicit promotion approval.
- Production promotion requires branch, PR, merge, deploy, and rollback evidence, or an approved immutable release path with equivalent evidence.
- Before finishing, report files changed, commands run, validation result, remaining risks, and the recommended next loop.`;
}

export function buildLaunchCommand() {
  return 'codex # paste the starter prompt into the session';
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
    summary: result.summary
  };
}

function fileProbe(files) {
  return run('bash', ['-lc', files.map((file) => `test -f ${shellQuote(file)}`).join(' && ')], {
    summarize: (_stdout, stderr, ok) =>
      ok ? `Found ${files.length} solo-loop control file(s).` : summarize(stderr)
  });
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function usage() {
  console.log(`Usage:
  node scripts/agent-solo-loop.mjs [--json] [--check] [--strict] [--home-base]
  node scripts/agent-solo-loop.mjs --starter [--task "..."]

Peter Steinberger-inspired solo-operator loop readiness for this repo.

Default mode is read-only and never mutates git, Linear, or deployments.

Options:
  --check              Run fast repo-local validation commands and an advisory Ground review.
  --home-base          Require clean main at the exact origin/main SHA.
  --strict             Fail when checkout is dirty or behind upstream.
  --json               Print machine-readable output.
  --starter, --prompt  Include an inspectable starter prompt and launch command.
  --task <text>        Task text to embed in the starter prompt.
`);
}

function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    return;
  }

  const branchStatus = run('git', ['status', '--short', '--branch']);
  const branchName = run('git', ['branch', '--show-current']);
  const upstream = run('git', [
    'rev-parse',
    '--abbrev-ref',
    '--symbolic-full-name',
    '@{upstream}'
  ]);
  const head = run('git', ['rev-parse', 'HEAD']);
  const originMain = run('git', ['rev-parse', 'origin/main']);
  const statusShort = run('git', ['status', '--short'], {
    summarize: (stdout) => (stdout.trim() ? stdout.trim() : 'Checkout is clean.')
  });
  const status = classifyStatus(statusShort.stdout);
  const branchLine = branchStatus.stdout.split(/\r?\n/)[0] ?? '';
  const divergence = parseDivergence(branchLine);
  const homeBase = {
    branch: branchName.ok ? branchName.stdout.trim() : '',
    upstream: upstream.ok ? upstream.stdout.trim() : '',
    head: head.ok ? head.stdout.trim() : '',
    origin_main: originMain.ok ? originMain.stdout.trim() : ''
  };
  const posture = options.homeBase
    ? decideHomeBasePosture({
        status,
        divergence,
        branch: homeBase.branch,
        upstream: homeBase.upstream,
        head: homeBase.head,
        originMain: homeBase.origin_main
      })
    : decideSoloPosture({ status, divergence, strict: options.strict });
  const postureMessages = posture.warnings ?? posture.reasons ?? [];

  const steps = [
    step('git-status', 'Inspect current checkout state', statusShort),
    step(
      'control-files',
      'Confirm solo-loop control files exist',
      fileProbe(DEFAULT_REQUIRED_FILES)
    )
  ];

  const codexProbe = run('bash', ['-lc', 'command -v codex'], {
    summarize: (stdout, _stderr, ok) =>
      ok ? `Codex command resolved: ${stdout.trim()}` : 'Codex command not found on PATH.'
  });
  steps.push(step('codex-command', 'Check optional Codex CLI availability', codexProbe, true));

  if (options.check) {
    steps.push(
      step(
        'ground-review',
        'Run advisory Ground changed-code review',
        run('node', ['scripts/ground-review.mjs', '--format', 'json'], {
          summarize: (stdout, stderr, ok) => {
            if (!ok)
              return `Advisory Ground review unavailable: ${summarize(`${stdout}${stderr}`)}`;
            try {
              const receipt = JSON.parse(stdout);
              return `Ground review ${receipt.status}: ${receipt.coverage?.discovered_changed_files ?? 0} changed, ${receipt.coverage?.analyzable_changed_files ?? 0} analyzable, ${receipt.findings?.length ?? 0} finding(s).`;
            } catch {
              return summarize(stdout);
            }
          }
        }),
        true
      )
    );
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
          }
        })
      )
    );
    steps.push(
      step(
        'policy-artifacts',
        'Run policy artifact check',
        run('node', ['scripts/policy-artifact-check.mjs'])
      )
    );
    steps.push(
      step(
        'solo-loop-test',
        'Run solo-loop unit tests',
        run('node', ['--test', 'scripts/test/agent-solo-loop.test.mjs'])
      )
    );
  }

  const passed = posture.ok && steps.every((entry) => entry.ok);
  const starter =
    options.starter || options.task
      ? {
          provider: 'codex',
          launch_command: buildLaunchCommand(),
          prompt: buildStarterPrompt({
            task: options.task,
            branch: branchLine.replace(/^##\s*/, ''),
            warnings: postureMessages
          })
        }
      : null;
  const report = {
    generated_at: new Date().toISOString(),
    mode: posture.mode,
    passed,
    strict: options.strict,
    home_base: homeBase,
    branch: branchLine.replace(/^##\s*/, ''),
    status,
    divergence,
    posture,
    recommended_loop: [
      'Run one current-checkout agent session for a small task.',
      'Keep the prompt short and point at the nearest CLI, doc, or failing command.',
      'Watch the stream; interrupt or redirect on drift.',
      'Ask for tests or write targeted tests in the same context.',
      'Use branch/PR or an approved immutable release path for production promotion.'
    ],
    starter,
    steps
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('# Solo Operator Agent Loop');
    console.log(`Generated: ${report.generated_at}`);
    console.log(`Result: ${passed ? 'passed' : 'failed'}`);
    console.log(`Branch: ${report.branch || 'unknown'}`);
    console.log('');
    if (postureMessages.length > 0) {
      console.log(options.homeBase ? '## Home Base Failures' : '## Warnings');
      for (const warning of postureMessages) console.log(`- ${warning}`);
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
    if (starter) {
      console.log('');
      console.log('## Starter Launch');
      console.log(starter.launch_command);
      console.log('');
      console.log('## Starter Prompt');
      console.log(starter.prompt);
    }
  }

  process.exit(passed ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
