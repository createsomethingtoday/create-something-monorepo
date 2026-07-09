#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import {
  resolve_service_config,
  validate_dispatch_config
} from '../packages/symphony/src/config.js';
import { MemoryLogger } from '../packages/symphony/src/logger.js';
import { LinearTrackerClient } from '../packages/symphony/src/tracker/linear.js';
import { load_workflow_definition } from '../packages/symphony/src/workflow.js';

const args = new Set(process.argv.slice(2));
const dispatch = args.has('--dispatch');
const json = args.has('--json');
const CODE_QUALITY_WORKFLOW = 'automation/symphony/code-quality/WORKFLOW.md';
export const agentWorkUnitContractPaths = [
  'automation/agent-contracts/examples/code-quality.work-unit.json',
  'automation/agent-contracts/examples/reviewer-integrator.work-unit.json',
  'automation/agent-contracts/examples/code-quality.evidence-receipt.json'
];
const MODEL_API_KEY_ENV_NAMES = new Set([
  'AI_GATEWAY_API_KEY',
  'ANTHROPIC_API_KEY',
  'AZURE_OPENAI_API_KEY',
  'COHERE_API_KEY',
  'DEEPSEEK_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'GROQ_API_KEY',
  'MISTRAL_API_KEY',
  'MOONSHOT_API_KEY',
  'OPENAI_API_KEY',
  'PERPLEXITY_API_KEY',
  'TOGETHER_API_KEY',
  'XAI_API_KEY'
]);

export function isModelApiKeyEnvName(name) {
  return MODEL_API_KEY_ENV_NAMES.has(name) || name.endsWith('_OPENAI_API_KEY');
}

export function buildAccountBasedLoopEnv(env = process.env) {
  const next = { ...env };
  const removedKeys = [];
  for (const key of Object.keys(next)) {
    if (isModelApiKeyEnvName(key)) {
      delete next[key];
      removedKeys.push(key);
    }
  }
  return { env: next, removedKeys: removedKeys.sort() };
}

function runStep(id, label, command, commandArgs, options = {}) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    env: options.env ?? process.env,
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

function accountAuthGuardStep(removedKeys) {
  return {
    id: 'account-auth-guard',
    label: 'Prepare account-based model auth environment',
    command: null,
    ok: true,
    skipped: false,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    exit_code: 0,
    summary: removedKeys.length
      ? `Removed model API-key env var(s) from worker dispatch: ${removedKeys.join(', ')}.`
      : 'No model API-key env vars were present in the worker dispatch environment.',
    removed_model_api_key_env_vars: removedKeys
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

async function runAsyncStep(id, label, callback) {
  const startedAt = new Date().toISOString();
  try {
    const result = await callback();
    return {
      id,
      label,
      command: result.command ?? null,
      ok: true,
      skipped: false,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      exit_code: 0,
      summary: result.summary,
      ...result.extra
    };
  } catch (error) {
    return {
      id,
      label,
      command: null,
      ok: false,
      skipped: false,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      exit_code: 1,
      summary: error instanceof Error ? error.message : String(error)
    };
  }
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

async function inspectSymphonyCandidates() {
  const definition = await load_workflow_definition(CODE_QUALITY_WORKFLOW, process.cwd());
  const config = resolve_service_config(definition, process.cwd(), process.env);
  validate_dispatch_config(config);
  const tracker = new LinearTrackerClient(config, new MemoryLogger());
  const candidates = await tracker.fetch_candidate_issues();
  const identifiers = candidates
    .slice(0, 8)
    .map((issue) => issue.identifier)
    .filter(Boolean);
  const labels =
    [config.tracker.label, ...config.tracker.labels].filter(Boolean).join(', ') || 'none';
  const summary = [
    `Symphony returned ${candidates.length} dispatchable candidate issue(s): ${identifiers.join(', ') || 'none'}.`,
    `Filter: project_slug=${config.tracker.project_slug}; active_states=${config.tracker.active_states.join(', ')}; labels=${labels}.`
  ].join('\n');
  return {
    command: `fetch Symphony candidates from ${CODE_QUALITY_WORKFLOW}`,
    summary,
    extra: {
      candidate_count: candidates.length,
      candidate_identifiers: identifiers
    }
  };
}

async function main() {
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
    runStep(
      'work-unit-contracts',
      'Check multi-agent work-unit and evidence contracts',
      'node',
      ['scripts/agent-work-unit-verify.mjs', ...agentWorkUnitContractPaths]
    )
  );

  steps.push(
    runStep('symphony-tests', 'Run Symphony package tests', 'corepack', [
      'pnpm',
      '--filter',
      '@create-something/symphony',
      'test'
    ])
  );

  if (process.env.LINEAR_API_KEY) {
    steps.push(
      await runAsyncStep(
        'symphony-candidates',
        'Inspect Symphony dispatchable code-quality queue',
        inspectSymphonyCandidates
      )
    );

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
        'symphony-candidates',
        'Inspect Symphony dispatchable code-quality queue',
        'Skipped because LINEAR_API_KEY is not set.'
      )
    );

    steps.push(
      skippedStep(
        'linear-ready',
        'Inspect Linear ready queue',
        'Skipped because LINEAR_API_KEY is not set.'
      )
    );
  }

  if (dispatch) {
    const candidateStep = steps.find((step) => step.id === 'symphony-candidates');
    if (candidateStep && candidateStep.ok && candidateStep.candidate_count === 0) {
      steps.push(
        skippedStep(
          'symphony-dispatch',
          'Dispatch one bounded Symphony code-quality pass',
          'Skipped because Symphony returned 0 dispatchable candidate issue(s).'
        )
      );
    } else {
      const accountEnv = buildAccountBasedLoopEnv(process.env);
      steps.push(accountAuthGuardStep(accountEnv.removedKeys));
      steps.push(
        runStep(
          'symphony-dispatch',
          'Dispatch one bounded Symphony code-quality pass',
          'corepack',
          ['pnpm', 'symphony:code-quality:once'],
          { env: accountEnv.env, includeOutput: true }
        )
      );
    }
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
