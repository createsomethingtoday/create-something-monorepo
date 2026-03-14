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
  const hookLogPath = join(tempRoot, 'hook.log');
  const completionMessage = 'Applied safe fix and reran targeted verification.';

  await writeFile(
    fakeCodexPath,
    `import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin });

function send(message) {
  process.stdout.write(JSON.stringify(message) + '\\n');
}

rl.on('line', (line) => {
  const message = JSON.parse(line);
  if (typeof message.id !== 'number') {
    return;
  }

  if (message.method === 'initialize') {
    send({ id: message.id, result: { ok: true } });
    return;
  }

  if (message.method === 'thread/start') {
    send({ id: message.id, result: { thread: { id: 'thread-1' } } });
    return;
  }

  if (message.method === 'turn/start') {
    send({ id: message.id, result: { turn: { id: 'turn-1' } } });
    send({
      method: 'item/started',
      params: {
        item: {
          id: 'msg-1',
          type: 'agentMessage',
          text: '',
        },
      },
    });
    send({
      method: 'thread/tokenUsage/updated',
      params: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20,
      },
    });
    send({
      method: 'item/agentMessage/delta',
      params: {
        itemId: 'msg-1',
        delta: ${JSON.stringify(completionMessage)},
      },
    });
    send({
      method: 'item/completed',
      params: {
        item: {
          id: 'msg-1',
          type: 'agentMessage',
          text: ${JSON.stringify(completionMessage)},
        },
      },
    });
    send({
      method: 'turn/completed',
      params: {
        turn: {
          id: 'turn-1',
        },
      },
    });
  }
});
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
codex:
  command: ${JSON.stringify(codexCommand)}
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

  const workspaceEntries = await readdir(workspacesRoot);
  assert.deepEqual(workspaceEntries, []);
});
