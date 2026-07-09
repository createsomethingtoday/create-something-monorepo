import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { CodexAppServerClient } from './codex-client.js';

const execFileAsync = promisify(execFile);

function split_zero(value) {
  return value.split('\0').filter(Boolean);
}

async function git(cwd, args, encoding = 'utf8') {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    encoding,
    maxBuffer: 1024 * 1024 * 20,
  });
  return stdout;
}

export async function repository_fingerprint(cwd) {
  const [status, diff, cached, untrackedRaw] = await Promise.all([
    git(cwd, ['status', '--porcelain=v1', '-z']),
    git(cwd, ['diff', '--binary', 'HEAD']),
    git(cwd, ['diff', '--cached', '--binary', 'HEAD']),
    git(cwd, ['ls-files', '--others', '--exclude-standard', '-z']),
  ]);
  const hash = createHash('sha256');
  hash.update(status);
  hash.update(diff);
  hash.update(cached);
  for (const path of split_zero(untrackedRaw).sort()) {
    hash.update(path);
    hash.update(await readFile(resolve(cwd, path)));
  }
  return hash.digest('hex');
}

export async function repository_changed_paths(cwd) {
  const [tracked, untracked] = await Promise.all([
    git(cwd, ['diff', '--name-only', '-z', 'HEAD']),
    git(cwd, ['ls-files', '--others', '--exclude-standard', '-z']),
  ]);
  return [...new Set([...split_zero(tracked), ...split_zero(untracked)])].sort();
}

async function run_command(command, cwd, env) {
  const started = Date.now();
  const child = spawn('bash', ['-lc', command], {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += String(chunk); });
  child.stderr.on('data', (chunk) => { stderr += String(chunk); });
  const exit_code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
  return {
    command,
    exit_code,
    output: `${stdout}${stderr}`.trim(),
    duration_ms: Date.now() - started,
  };
}

function stage_prompt(issue, role, work_unit, prior_receipts) {
  return [
    `You are the ${role} stage for ${issue.identifier}: ${issue.title}.`,
    issue.description ? `Issue description:\n${issue.description}` : '',
    `Work-unit contract:\n${JSON.stringify(work_unit, null, 2)}`,
    prior_receipts.length
      ? `Prior stage receipts:\n${JSON.stringify(prior_receipts, null, 2)}`
      : 'There are no prior stage receipts.',
    role === 'reviewer'
      ? 'Inspect the worker patch and evidence. Do not edit any file. Return concrete findings or state that no actionable findings remain.'
      : role === 'integrator'
        ? 'Apply only actionable reviewer findings, keep the patch scoped, and leave the workspace ready for the declared verification.'
        : 'Implement the smallest defensible change required by the issue and work-unit contract.',
    'Finish with a concise evidence summary. Do not claim promotion or deployment authority.',
  ].filter(Boolean).join('\n\n');
}

function sandbox_config(config, sandbox) {
  const read_only = sandbox === 'read-only';
  return {
    ...config,
    codex: {
      ...config.codex,
      approval_policy: read_only ? 'never' : config.codex.approval_policy,
      thread_sandbox: read_only ? 'read-only' : 'workspace-write',
      turn_sandbox_policy: { type: read_only ? 'readOnly' : 'workspaceWrite' },
    },
  };
}

export function create_codex_stage_executor(options) {
  const { issue, workspace_path, config, logger, env = process.env } = options;
  const baseline_paths = repository_changed_paths(workspace_path);
  return async function execute_stage({ role, run_id, work_unit, sandbox, prior_receipts }) {
    const started_at = Date.now();
    const usage = { input: 0, output: 0, total: 0 };
    let human_intervention_count = 0;
    const client = new CodexAppServerClient({
      config: sandbox_config(config, sandbox),
      cwd: workspace_path,
      logger,
      env,
      on_event(event) {
        if (event.usage) {
          usage.input = event.usage.input_tokens;
          usage.output = event.usage.output_tokens;
          usage.total = event.usage.total_tokens;
        }
        if (event.event === 'turn_input_required') human_intervention_count += 1;
      },
    });
    let final_message = '';
    try {
      await client.start_session();
      const turn = await client.run_turn(
        stage_prompt(issue, role, work_unit, prior_receipts),
        `${issue.identifier} ${role}`,
      );
      final_message = turn.text?.trim() ?? '';
    } finally {
      await client.close();
    }

    const commands = [];
    for (const verification of work_unit.verification) {
      const result = await run_command(verification.command, workspace_path, env);
      commands.push({
        command: result.command,
        exit_code: result.exit_code,
        summary: result.exit_code === 0
          ? verification.evidence
          : result.output || `Command exited ${result.exit_code}.`,
      });
    }
    const passed = commands.every((entry) => entry.exit_code === 0);
    const initial_paths = await baseline_paths;
    const current_paths = await repository_changed_paths(workspace_path);
    const stage_paths = current_paths.filter((path) => !initial_paths.includes(path));
    return {
      schema_version: 'multi-agent-evidence-receipt.v1',
      run_id,
      role,
      work_unit_id: work_unit.id,
      linear: { issue: issue.identifier },
      status: passed ? 'passed' : 'failed',
      commands,
      changed_paths: role === 'reviewer' ? [] : stage_paths,
      evidence: final_message || `${role} stage completed without a final message.`,
      next_decision: passed
        ? `${role} stage may hand off to the next reviewed-loop decision.`
        : `${role} verification failed; stop and repair before continuing.`,
      metrics: {
        duration_ms: Date.now() - started_at,
        retry_count: 0,
        human_intervention_count,
        tokens: usage,
      },
    };
  };
}
