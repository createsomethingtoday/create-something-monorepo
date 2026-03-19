#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const DEFAULT_ARTIFACT_DIR = path.join(ROOT, '.loom', 'checkpoints');

function usage() {
  console.log(`Usage:
  node scripts/loom/deploy-checkpoint.mjs --task-id <id> --surface <name> --environment <env> --rollback-reference <ref> [options] -- <command> [args...]

Options:
  --task-id <id>               Loom task id
  --surface <name>             Package, app, or runtime surface being deployed
  --environment <env>          Deployment target, usually dev, preview, or prod
  --rollback-reference <ref>   Last known-good deploy, revert commit, or rollback note
  --deploy-url <url>           Optional deployed URL
  --deployment-id <id>         Optional runtime deployment identifier
  --log-path <path>            Optional log path
  --verification-note <text>   Optional verification note
  --artifact-dir <path>        Optional artifact output directory
  --complete-on-success        Mark the Loom task done after a successful deploy
  --json                       Emit JSON summary after success

Examples:
  node scripts/loom/deploy-checkpoint.mjs \\
    --task-id lm-123 \\
    --surface agency \\
    --environment dev \\
    --rollback-reference main \\
    -- node scripts/run-wrangler.mjs --cwd packages/agency pages deploy .svelte-kit/cloudflare --project-name=create-something-agency --branch=dev

  pnpm loom:deploy:checkpoint --task-id lm-123 --surface agency --environment preview --rollback-reference main --deploy-url https://preview.example.com -- pnpm exec wrangler pages deploy packages/agency/.svelte-kit/cloudflare --project-name=create-something-agency --branch=preview
`);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
}

function parseArgs(argv) {
  const options = {
    completeOnSuccess: false,
    json: false,
    artifactDir: DEFAULT_ARTIFACT_DIR,
  };
  const command = [];

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      command.push(...argv.slice(index + 1));
      break;
    }

    if (arg === '--task-id' && argv[index + 1]) {
      options.taskId = argv[++index];
      continue;
    }
    if (arg === '--surface' && argv[index + 1]) {
      options.surface = argv[++index];
      continue;
    }
    if (arg === '--environment' && argv[index + 1]) {
      options.environment = argv[++index];
      continue;
    }
    if (arg === '--rollback-reference' && argv[index + 1]) {
      options.rollbackReference = argv[++index];
      continue;
    }
    if (arg === '--deploy-url' && argv[index + 1]) {
      options.deployUrl = argv[++index];
      continue;
    }
    if (arg === '--deployment-id' && argv[index + 1]) {
      options.deploymentId = argv[++index];
      continue;
    }
    if (arg === '--log-path' && argv[index + 1]) {
      options.logPath = argv[++index];
      continue;
    }
    if (arg === '--verification-note' && argv[index + 1]) {
      options.verificationNote = argv[++index];
      continue;
    }
    if (arg === '--artifact-dir' && argv[index + 1]) {
      options.artifactDir = path.resolve(argv[++index]);
      continue;
    }
    if (arg === '--complete-on-success') {
      options.completeOnSuccess = true;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { options, command };
}

function required(name, value) {
  if (!value) {
    throw new Error(`Missing required option: ${name}`);
  }
  return value;
}

function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(command[0], command.slice(1), {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      resolve({
        code: code ?? 1,
        signal: signal ?? null,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

function readGit(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function collectGitMetadata(cwd) {
  const commit = readGit(['rev-parse', 'HEAD'], cwd);
  const shortCommit = readGit(['rev-parse', '--short', 'HEAD'], cwd);
  const branch = readGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  const dirtyOutput = readGit(['status', '--porcelain'], cwd);

  if (!commit && !branch) {
    return null;
  }

  return {
    commit,
    short_commit: shortCommit,
    branch,
    dirty: Boolean(dirtyOutput),
  };
}

function buildArtifactPath(options, startedAt) {
  const timestamp = startedAt.toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}-${slugify(options.taskId)}-${slugify(options.surface)}-${slugify(options.environment)}.json`;
  return path.join(options.artifactDir, slugify(options.taskId), filename);
}

function buildSummary({ options, artifactPath, git, result }) {
  const parts = [
    `deploy checkpoint`,
    `task=${options.taskId}`,
    `surface=${options.surface}`,
    `env=${options.environment}`,
    `status=${result.code === 0 ? 'succeeded' : 'failed'}`,
  ];

  if (git?.short_commit) parts.push(`commit=${git.short_commit}`);
  if (options.deploymentId) parts.push(`deployment=${options.deploymentId}`);
  if (options.deployUrl) parts.push(`url=${options.deployUrl}`);
  parts.push(`rollback=${options.rollbackReference}`);
  parts.push(`artifact=${path.relative(ROOT, artifactPath)}`);

  return parts.join(' | ');
}

function buildArtifact({ options, command, startedAt, finishedAt, artifactPath, git, result, summary }) {
  return {
    schema_version: 1,
    kind: 'deploy_checkpoint',
    task_id: options.taskId,
    surface: options.surface,
    environment: options.environment,
    status: result.code === 0 ? 'succeeded' : 'failed',
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_ms: result.durationMs,
    command,
    cwd: process.cwd(),
    host: os.hostname(),
    user: os.userInfo().username,
    deploy_url: options.deployUrl ?? null,
    deployment_id: options.deploymentId ?? null,
    log_path: options.logPath ?? null,
    verification_note: options.verificationNote ?? null,
    rollback_reference: options.rollbackReference,
    artifact_path: artifactPath,
    git,
    loom: {
      remote_append_only_checkpoint_supported: false,
      complete_on_success_requested: options.completeOnSuccess,
      recommended_evidence_summary: summary,
    },
    result: {
      exit_code: result.code,
      signal: result.signal,
    },
  };
}

function writeArtifact(artifactPath, artifact) {
  try {
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to write deploy checkpoint artifact at ${artifactPath}: ${message}`);
  }
}

async function markTaskDone(taskId, evidence) {
  const command = [
    process.execPath,
    path.join(ROOT, 'scripts', 'loom', 'remote.mjs'),
    'done',
    '--task-id',
    taskId,
    '--evidence',
    evidence,
  ];

  const result = await runCommand(command, ROOT);
  if (result.code !== 0) {
    throw new Error(`Failed to complete Loom task ${taskId}.`);
  }
}

async function main() {
  const { options, command } = parseArgs(process.argv);

  if (options.help) {
    usage();
    process.exit(0);
  }

  required('--task-id', options.taskId);
  required('--surface', options.surface);
  required('--environment', options.environment);
  required('--rollback-reference', options.rollbackReference);

  if (command.length === 0) {
    throw new Error('Missing deploy command after --');
  }

  const startedAt = new Date();
  const result = await runCommand(command, process.cwd());
  const finishedAt = new Date();
  const git = collectGitMetadata(process.cwd());
  const artifactPath = buildArtifactPath(options, startedAt);
  const summary = buildSummary({ options, artifactPath, git, result });
  const artifact = buildArtifact({
    options,
    command,
    startedAt,
    finishedAt,
    artifactPath,
    git,
    result,
    summary,
  });

  writeArtifact(artifactPath, artifact);

  if (result.code !== 0) {
    console.error(summary);
    console.error(`Checkpoint artifact: ${artifactPath}`);
    process.exit(result.code);
  }

  if (options.completeOnSuccess) {
    await markTaskDone(options.taskId, summary);
  } else {
    console.log(summary);
    console.log(`Checkpoint artifact: ${artifactPath}`);
    console.log('Remote Loom does not yet support append-only checkpoint evidence via the repo CLI.');
    console.log('Use the checkpoint artifact for inner-loop DEV history, and attach the summary when the task is completed or promoted.');
  }

  if (options.json) {
    console.log(JSON.stringify(artifact, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
