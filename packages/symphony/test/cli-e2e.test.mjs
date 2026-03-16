import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const CLI_PATH = resolve(REPO_ROOT, 'packages/symphony/src/cli.js');
const TEST_TMP_ROOT = resolve(REPO_ROOT, '.codex-tmp', 'symphony-tests');

function quoteShell(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function createTask() {
  return {
    id: 'lm-e2e-1',
    title: 'Verify Symphony once mode',
    description: 'Exercise the real CLI against a fake Loom and Codex runtime.',
    status: 'ready',
    priority: 'high',
    labels: ['code-quality'],
    created_at: '2026-03-14T00:00:00.000Z',
    updated_at: '2026-03-14T00:00:00.000Z',
    dependencies: [],
    agent: null,
    evidence: null,
  };
}

function createToolResult(id, structuredContent) {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      structuredContent,
    },
  };
}

async function startFakeLoomServer(task, toolCalls) {
  const server = createServer(async (request, response) => {
    if (request.method !== 'POST') {
      response.writeHead(404).end();
      return;
    }

    let body = '';
    for await (const chunk of request) {
      body += String(chunk);
    }

    const payload = JSON.parse(body);
    const name = payload?.params?.name;
    const args = payload?.params?.arguments ?? {};
    toolCalls.push({ name, args });

    let structuredContent;

    if (name === 'loom_list') {
      const status = args.status;
      if (status === 'ready' && task.status === 'ready') {
        structuredContent = { items: [task] };
      } else if (status === 'claimed' && task.status === 'claimed') {
        structuredContent = { items: [task] };
      } else if (status === 'done' && task.status === 'done') {
        structuredContent = { items: [task] };
      } else {
        structuredContent = { items: [] };
      }
    } else if (name === 'loom_claim') {
      task.status = 'claimed';
      task.agent = args.agent;
      task.updated_at = '2026-03-14T00:01:00.000Z';
      structuredContent = { claimed: task.id };
    } else if (name === 'loom_get') {
      structuredContent = task;
    } else if (name === 'loom_complete') {
      task.status = 'done';
      task.evidence = args.evidence;
      task.updated_at = '2026-03-14T00:02:00.000Z';
      structuredContent = { completed: task.id };
    } else if (name === 'loom_release') {
      task.status = 'ready';
      task.agent = null;
      structuredContent = { released: task.id };
    } else {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: `Unexpected tool: ${name}` }));
      return;
    }

    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(createToolResult(payload.id, structuredContent)));
  });

  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
  const address = server.address();
  const endpoint = `http://127.0.0.1:${address.port}/mcp`;
  return { server, endpoint };
}

test('CLI once mode completes a Loom-backed task end-to-end', async (t) => {
  await mkdir(TEST_TMP_ROOT, { recursive: true });
  const tempRoot = await mkdtemp(join(TEST_TMP_ROOT, 'symphony-e2e-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const task = createTask();
  const toolCalls = [];
  const { server, endpoint } = await startFakeLoomServer(task, toolCalls);
  t.after(async () => {
    await new Promise((resolvePromise, rejectPromise) => {
      server.close((error) => (error ? rejectPromise(error) : resolvePromise()));
    });
  });

  const fakeCodexPath = join(tempRoot, 'fake-codex.mjs');
  const workflowPath = join(tempRoot, 'WORKFLOW.md');
  const workspacesRoot = join(tempRoot, 'workspaces');
  const telemetryRoot = join(tempRoot, 'logs');
  const hookLogPath = join(tempRoot, 'hook.log');
  const completionMessage = 'Applied safe fix and reran targeted verification.';

  await writeFile(
    fakeCodexPath,
    `import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output-last-message');
const outputPath = outputIndex === -1 ? null : args[outputIndex + 1];
let prompt = '';
for await (const chunk of process.stdin) {
  prompt += String(chunk);
}
if (!outputPath) {
  process.stderr.write('missing output path\\n');
  process.exit(2);
}
writeFileSync(outputPath, ${JSON.stringify(completionMessage)});
process.stdout.write(JSON.stringify({ type: 'turn.complete', promptLength: prompt.length }) + '\\n');
`,
    'utf8',
  );

  const codexCommand = `${quoteShell(process.execPath)} ${quoteShell(fakeCodexPath)}`;
  const hookLogShell = quoteShell(hookLogPath);

  await writeFile(
    workflowPath,
    `---
tracker:
  kind: loom
  endpoint: ${JSON.stringify(endpoint)}
  api_key: $LOOM_MCP_API_TOKEN
  agent_id: symphony-code-quality
  label: code-quality
  active_states:
    - ready
    - claimed
  terminal_states:
    - done
    - cancelled
polling:
  interval_ms: 25
workspace:
  root: ${JSON.stringify(workspacesRoot)}
hooks:
  after_create: ${JSON.stringify(`printf 'created\\n' >> ${hookLogShell}`)}
  before_remove: ${JSON.stringify(`printf 'removed\\n' >> ${hookLogShell}`)}
  timeout_ms: 5000
agent:
  max_concurrent_agents: 1
  max_turns: 1
  max_retry_backoff_ms: 100
execution:
  runner: codex-cli
  command: ${JSON.stringify(codexCommand)}
codex:
  approval_policy: never
  thread_sandbox: danger-full-access
  turn_sandbox_policy:
    type: dangerFullAccess
  turn_timeout_ms: 5000
  read_timeout_ms: 5000
  stall_timeout_ms: 5000
server:
  port:
---
You are the integration-test Symphony worker.

Issue: {{ issue.identifier }} :: {{ issue.title }}
`,
    'utf8',
  );

  const child = spawn(process.execPath, [CLI_PATH, workflowPath, '--once'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      LOOM_MCP_API_TOKEN: 'test-token',
      PATH: process.env.PATH ?? '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });

  const exitCode = await new Promise((resolvePromise, rejectPromise) => {
    child.once('error', rejectPromise);
    child.once('exit', (code) => resolvePromise(code));
  });

  assert.equal(exitCode, 0, `stdout:\n${stdout}\n\nstderr:\n${stderr}`);
  assert.equal(task.status, 'done');
  assert.equal(task.evidence, completionMessage);
  assert.ok(toolCalls.some((entry) => entry.name === 'loom_claim'));
  assert.ok(toolCalls.some((entry) => entry.name === 'loom_complete'));
  assert.ok(!toolCalls.some((entry) => entry.name === 'loom_release'));

  const hookLog = await readFile(hookLogPath, 'utf8');
  assert.match(hookLog, /created/);
  assert.match(hookLog, /removed/);

  const telemetryPath = join(telemetryRoot, 'code-quality', 'lm-e2e-1.jsonl');
  const telemetry = await readFile(telemetryPath, 'utf8');
  assert.match(telemetry, /"phase":"claim"/);
  assert.match(telemetry, /"phase":"worktree_create"/);
  assert.match(telemetry, /"phase":"codex_start","status":"succeeded"/);
  assert.match(telemetry, /"phase":"codex_turn","status":"started"/);
  assert.match(telemetry, /"phase":"codex_turn","status":"succeeded"/);
  assert.match(telemetry, /"phase":"complete"/);

  const workspaceEntries = await readdir(workspacesRoot);
  assert.deepEqual(workspaceEntries, []);
});

test('CLI once mode retries a stalled turn and completes on a later attempt', async (t) => {
  await mkdir(TEST_TMP_ROOT, { recursive: true });
  const tempRoot = await mkdtemp(join(TEST_TMP_ROOT, 'symphony-e2e-stall-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const task = createTask();
  const toolCalls = [];
  const { server, endpoint } = await startFakeLoomServer(task, toolCalls);
  t.after(async () => {
    await new Promise((resolvePromise, rejectPromise) => {
      server.close((error) => (error ? rejectPromise(error) : resolvePromise()));
    });
  });

  const fakeCodexPath = join(tempRoot, 'fake-codex-stall-then-complete.mjs');
  const workflowPath = join(tempRoot, 'WORKFLOW.md');
  const workspacesRoot = join(tempRoot, 'workspaces');
  const telemetryRoot = join(tempRoot, 'logs');
  const turnCounterPath = join(tempRoot, 'turn-count.txt');
  const completionMessage = 'Recovered after stalled first turn and completed verification.';

  await writeFile(
    fakeCodexPath,
    `import { existsSync, readFileSync, writeFileSync } from 'node:fs';
 
const counterPath = ${JSON.stringify(turnCounterPath)};

function nextAttempt() {
  const current = existsSync(counterPath) ? Number(readFileSync(counterPath, 'utf8')) || 0 : 0;
  const next = current + 1;
  writeFileSync(counterPath, String(next));
  return next;
}

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output-last-message');
const outputPath = outputIndex === -1 ? null : args[outputIndex + 1];
let prompt = '';
for await (const chunk of process.stdin) {
  prompt += String(chunk);
}
const attempt = nextAttempt();

if (attempt === 1) {
  process.on('SIGTERM', () => process.exit(0));
  setInterval(() => {}, 1000);
  await new Promise(() => {});
}

if (!outputPath) {
  process.stderr.write('missing output path\\n');
  process.exit(2);
}

writeFileSync(outputPath, ${JSON.stringify(completionMessage)});
process.stdout.write(JSON.stringify({ type: 'turn.complete', promptLength: prompt.length, attempt }) + '\\n');
`,
    'utf8',
  );

  const codexCommand = `${quoteShell(process.execPath)} ${quoteShell(fakeCodexPath)}`;

  await writeFile(
    workflowPath,
    `---
tracker:
  kind: loom
  endpoint: ${JSON.stringify(endpoint)}
  api_key: $LOOM_MCP_API_TOKEN
  agent_id: symphony-code-quality
  label: code-quality
  active_states:
    - ready
    - claimed
  terminal_states:
    - done
    - cancelled
polling:
  interval_ms: 25
workspace:
  root: ${JSON.stringify(workspacesRoot)}
agent:
  max_concurrent_agents: 1
  max_turns: 1
  max_retry_backoff_ms: 25
execution:
  runner: codex-cli
  command: ${JSON.stringify(codexCommand)}
codex:
  approval_policy: never
  thread_sandbox: danger-full-access
  turn_sandbox_policy:
    type: dangerFullAccess
  turn_timeout_ms: 5000
  read_timeout_ms: 5000
  stall_timeout_ms: 100
server:
  port:
---
You are the integration-test Symphony worker.

Issue: {{ issue.identifier }} :: {{ issue.title }}
`,
    'utf8',
  );

  const child = spawn(process.execPath, [CLI_PATH, workflowPath, '--once'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      LOOM_MCP_API_TOKEN: 'test-token',
      PATH: process.env.PATH ?? '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });

  const exitCode = await new Promise((resolvePromise, rejectPromise) => {
    child.once('error', rejectPromise);
    child.once('exit', (code) => resolvePromise(code));
  });

  assert.equal(exitCode, 0, `stdout:\n${stdout}\n\nstderr:\n${stderr}`);
  assert.equal(task.status, 'done');
  assert.equal(task.evidence, completionMessage);
  assert.ok(toolCalls.some((entry) => entry.name === 'loom_claim'));
  assert.ok(toolCalls.some((entry) => entry.name === 'loom_complete'));
  assert.ok(toolCalls.some((entry) => entry.name === 'loom_list' && entry.args.status === 'claimed'));

  const telemetryPath = join(telemetryRoot, 'code-quality', 'lm-e2e-1.jsonl');
  const telemetry = await readFile(telemetryPath, 'utf8');
  assert.match(telemetry, /"phase":"retry_scheduled","status":"started"/);
  assert.match(telemetry, /"phase":"codex_turn","status":"failed"/);
  assert.match(telemetry, /"phase":"codex_turn","status":"succeeded"/);

  const codexStarts = [...telemetry.matchAll(/"phase":"codex_start","status":"succeeded"/g)].length;
  assert.ok(codexStarts >= 2, `expected at least 2 codex_start successes, got ${codexStarts}`);

  const turnAttempts = await readFile(turnCounterPath, 'utf8');
  assert.equal(turnAttempts.trim(), '2');

  const workspaceEntries = await readdir(workspacesRoot);
  assert.deepEqual(workspaceEntries, []);
});

test('CLI status reports the latest task summary from telemetry', async (t) => {
  await mkdir(TEST_TMP_ROOT, { recursive: true });
  const tempRoot = await mkdtemp(join(TEST_TMP_ROOT, 'symphony-status-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const workflowPath = join(tempRoot, 'WORKFLOW.md');
  const workspacesRoot = join(tempRoot, 'workspaces', 'code-quality');
  const telemetryLaneRoot = join(tempRoot, 'logs', 'code-quality');
  const taskId = 'lm-status-1';
  const workspacePath = join(workspacesRoot, 'lm-status-1');

  await mkdir(telemetryLaneRoot, { recursive: true });
  await writeFile(
    workflowPath,
    `---
tracker:
  kind: loom
  endpoint: https://loom.example.test/mcp
  api_key: $LOOM_MCP_API_TOKEN
  agent_id: symphony-code-quality
  label: code-quality
workspace:
  root: ${JSON.stringify(workspacesRoot)}
execution:
  runner: codex-cli
---
Status view only.
`,
    'utf8',
  );

  const telemetryPath = join(telemetryLaneRoot, `${taskId}.jsonl`);
  const telemetryLines = [
    {
      timestamp: '2026-03-15T03:00:00.000Z',
      run_id: 'sym-old',
      lane: 'code-quality',
      agent_id: 'symphony-code-quality',
      correlation_id: taskId,
      task_id: taskId,
      phase: 'complete',
      status: 'succeeded',
      workspace_path: workspacePath,
    },
    {
      timestamp: '2026-03-15T03:10:00.000Z',
      run_id: 'sym-new',
      lane: 'code-quality',
      agent_id: 'symphony-code-quality',
      correlation_id: taskId,
      task_id: taskId,
      phase: 'codex_start',
      status: 'succeeded',
      workspace_path: workspacePath,
    },
    {
      timestamp: '2026-03-15T03:12:00.000Z',
      run_id: 'sym-new',
      lane: 'code-quality',
      agent_id: 'symphony-code-quality',
      correlation_id: taskId,
      task_id: taskId,
      phase: 'codex_turn',
      status: 'failed',
      workspace_path: workspacePath,
      error: {
        class: 'StalledSessionError',
        message: 'stalled session',
        retryable: true,
      },
    },
  ];
  await writeFile(telemetryPath, `${telemetryLines.map((line) => JSON.stringify(line)).join('\n')}\n`, 'utf8');

  const child = spawn(process.execPath, [CLI_PATH, 'status', workflowPath, '--task-id', taskId, '--json'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      LOOM_MCP_API_TOKEN: 'test-token',
      PATH: process.env.PATH ?? '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });

  const exitCode = await new Promise((resolvePromise, rejectPromise) => {
    child.once('error', rejectPromise);
    child.once('exit', (code) => resolvePromise(code));
  });

  assert.equal(exitCode, 0, `stdout:\n${stdout}\n\nstderr:\n${stderr}`);
  const report = JSON.parse(stdout);
  assert.equal(report.lane, 'code-quality');
  assert.equal(report.task_id, taskId);
  assert.equal(report.tasks.length, 1);
  assert.equal(report.tasks[0].task_id, taskId);
  assert.equal(report.tasks[0].phase, 'codex_turn');
  assert.equal(report.tasks[0].status, 'failed');
  assert.equal(report.tasks[0].last_successful_phase, 'codex_start');
  assert.equal(report.tasks[0].workspace_path, workspacePath);
  assert.equal(report.tasks[0].last_error.class, 'StalledSessionError');
});
