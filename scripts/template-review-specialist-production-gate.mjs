#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const DEFAULT_BASE = 'output/specialized-models/template-review-specialist';
const DEFAULT_JSON = `${DEFAULT_BASE}/production-gate.json`;
const DEFAULT_MD = `${DEFAULT_BASE}/production-gate.md`;

function parseArgs(argv) {
  const args = {
    live: false,
    out: DEFAULT_JSON,
    markdown: DEFAULT_MD,
    issue: process.env.LINEAR_ISSUE_ID || 'CRE-860',
    liveCorpusApproval: undefined
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    switch (arg) {
      case '--':
        break;
      case '--no-live':
        args.live = false;
        break;
      case '--live':
        args.live = true;
        break;
      case '--live-corpus-approval':
        args.liveCorpusApproval = readFlag(arg, next);
        index += 1;
        break;
      case '--out':
        args.out = readFlag(arg, next);
        index += 1;
        break;
      case '--markdown':
        args.markdown = readFlag(arg, next);
        index += 1;
        break;
      case '--issue':
        args.issue = readFlag(arg, next);
        index += 1;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown flag: ${arg}`);
    }
  }

  if (args.live && !args.liveCorpusApproval) {
    throw new Error(
      '--live requires --live-corpus-approval <reference> so corpus inclusion has an explicit approval record.'
    );
  }

  return args;
}

function readFlag(flag, value) {
  if (!value || value.trim().length === 0) throw new Error(`Missing value for ${flag}.`);
  return value.trim();
}

function printHelp() {
  console.log(`Usage: pnpm specialist:template-review:production-gate [--live]

Runs the production gate for the Template Review Specialist data flywheel and
writes an evidence packet to:
  ${DEFAULT_JSON}
  ${DEFAULT_MD}

The default gate is local and request-free. For separately approved live evidence,
run through Infisical so Dify, OpenAI, and Langfuse credentials are available:
  infisical run --env=prod --path=/ --recursive -- pnpm specialist:template-review:production-gate -- --live --live-corpus-approval CRE-123
`);
}

function runStep(name, command, args) {
  const startedAt = new Date();
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 1024 * 1024 * 20
  });
  const endedAt = new Date();
  const exitCode = result.status ?? (result.signal ? 128 : 1);

  return {
    name,
    command: [command, ...args].join(' '),
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_ms: endedAt.getTime() - startedAt.getTime(),
    exit_code: exitCode,
    ok: exitCode === 0,
    stdout_tail: tail(result.stdout || ''),
    stderr_tail: tail(result.stderr || '')
  };
}

function tail(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  return lines.slice(-40).join('\n');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function secretPatternDetected(paths) {
  const pattern =
    /\b(app-[A-Za-z0-9_-]{12,}|sk-[A-Za-z0-9_-]{12,}|lf_[A-Za-z0-9_-]{12,}|secret_[A-Za-z0-9_-]{12,}|bearer\s+[A-Za-z0-9._-]{20,})/i;
  return paths.some((path) => pattern.test(readFileSync(path, 'utf8')));
}

function writeEvidence(args, evidence) {
  mkdirSync(dirname(resolve(args.out)), { recursive: true });
  writeFileSync(args.out, JSON.stringify(evidence, null, 2) + '\n');

  const telemetry = evidence.telemetry;
  const markdown = [
    '# Template Review Specialist Production Gate',
    '',
    `Generated: ${evidence.generated_at}`,
    `Result: ${evidence.ok ? 'passed' : 'failed'}`,
    `Live mode: ${evidence.live}`,
    '',
    '## Summary',
    '',
    `- Training examples: ${telemetry?.corpus?.training_examples ?? 'unknown'}`,
    `- Approved corrections: ${telemetry?.corpus?.approved_corrections_in_ledger ?? 'unknown'}`,
    `- Trace join coverage: ${telemetry?.trace_coverage?.trace_join_coverage ?? 'unknown'}`,
    `- Readiness stage: ${telemetry?.readiness?.stage ?? 'unknown'}`,
    `- Next correction target: ${telemetry?.readiness?.next_target_approved_corrections ?? 'none'}`,
    `- OpenAI fine-tune status: ${telemetry?.provider?.openai_fine_tune_status ?? 'unknown'}`,
    `- Secret-pattern detected: ${evidence.secret_pattern_detected}`,
    '',
    '## Steps',
    '',
    ...evidence.steps.map((step) =>
      [
        `### ${step.name}`,
        '',
        `- Result: ${step.ok ? 'passed' : 'failed'}`,
        `- Duration: ${step.duration_ms}ms`,
        `- Command: \`${step.command}\``,
        '',
        step.stdout_tail ? '```text\n' + step.stdout_tail + '\n```' : '',
        step.stderr_tail ? '```text\n' + step.stderr_tail + '\n```' : ''
      ]
        .filter(Boolean)
        .join('\n')
    ),
    ''
  ].join('\n');

  mkdirSync(dirname(resolve(args.markdown)), { recursive: true });
  writeFileSync(args.markdown, markdown);
}

function main() {
  const args = parseArgs(process.argv);
  const steps = [];

  steps.push(
    runStep('corrections_check', 'pnpm', [
      'specialist:template-review:corrections',
      '--',
      '--check'
    ])
  );

  if (args.live) {
    steps.push(
      runStep('dataset_rebuild_live', 'pnpm', [
        'specialist:template-review:dataset',
        '--',
        '--include-tool-cases',
        '--live',
        '--live-corpus-approval',
        args.liveCorpusApproval
      ])
    );
  } else {
    steps.push(
      runStep('dataset_rebuild_static', 'pnpm', [
        'specialist:template-review:dataset',
        '--',
        '--include-tool-cases'
      ])
    );
  }

  steps.push(runStep('telemetry_summary', 'pnpm', ['specialist:template-review:telemetry']));
  steps.push(
    runStep('fine_tune_dry_run', 'pnpm', ['specialist:template-review:finetune', '--', '--dry-run'])
  );
  steps.push(
    runStep('dataset_langfuse_eval', 'pnpm', [
      'langfuse:eval:dify:template-review-specialist-dataset:local'
    ])
  );

  if (args.live) {
    steps.push(
      runStep('runtime_langfuse_eval', 'pnpm', [
        'langfuse:eval:dify:template-review-specialist-runtime:local'
      ])
    );
    steps.push(
      runStep('template_review_hub_langfuse_eval', 'pnpm', [
        'langfuse:eval:dify:template-review-hub:local'
      ])
    );
  }

  const telemetryPath = `${DEFAULT_BASE}/telemetry-summary.json`;
  const manifestPath = `${DEFAULT_BASE}/dataset-manifest.json`;
  const trainingPath = `${DEFAULT_BASE}/openai-training.jsonl`;
  const telemetry = readJson(telemetryPath);
  const manifest = readJson(manifestPath);
  const secretPattern = secretPatternDetected([telemetryPath, manifestPath, trainingPath]);

  const evidence = {
    generated_at: new Date().toISOString(),
    issue: args.issue,
    live: args.live,
    live_corpus_approval: args.liveCorpusApproval ?? null,
    ok: steps.every((step) => step.ok) && !secretPattern,
    secret_pattern_detected: secretPattern,
    telemetry,
    manifest_summary: {
      example_count: manifest.example_count,
      sources: manifest.sources,
      langfuse: manifest.langfuse,
      evaluation: manifest.evaluation
    },
    steps
  };

  writeEvidence(args, evidence);
  console.log(
    JSON.stringify(
      {
        ok: evidence.ok,
        out: args.out,
        markdown: args.markdown,
        steps: steps.map((step) => ({
          name: step.name,
          ok: step.ok,
          duration_ms: step.duration_ms
        })),
        readiness: telemetry.readiness
      },
      null,
      2
    )
  );

  if (!evidence.ok) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
