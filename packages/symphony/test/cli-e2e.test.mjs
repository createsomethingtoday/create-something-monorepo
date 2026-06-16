import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const CLI_PATH = resolve(REPO_ROOT, 'packages/symphony/src/cli.js');
const TEST_TMP_ROOT = resolve(REPO_ROOT, '.codex-tmp', 'symphony-tests');

function quoteShell(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function createIssue() {
  return {
    id: 'issue-e2e-1',
    identifier: 'CRE-999',
    title: 'Verify Symphony once mode',
    description: 'Exercise the real CLI against a fake Linear and Codex runtime.',
    priority: 2,
    branchName: null,
    url: 'https://linear.app/createsomething/issue/CRE-999',
    createdAt: '2026-03-14T00:00:00.000Z',
    updatedAt: '2026-03-14T00:00:00.000Z',
    state: { id: 'state-todo', name: 'Todo', type: 'unstarted' },
    labels: { nodes: [{ name: 'code-quality' }] },
    inverseRelations: { nodes: [] },
    evidence: null,
  };
}

async function startFakeLinearServer(issue, operations) {
  const states = [
    { id: 'state-todo', name: 'Todo', type: 'unstarted' },
    { id: 'state-progress', name: 'In Progress', type: 'started' },
    { id: 'state-done', name: 'Done', type: 'completed' },
    { id: 'state-canceled', name: 'Canceled', type: 'canceled' },
  ];

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
    const operation = payload.query.match(/\b(?:query|mutation)\s+(\w+)/u)?.[1] ?? 'unknown';
    operations.push({ operation, variables: payload.variables ?? {} });

    let data;
    if (operation === 'SymphonyIssues') {
      const statesFilter = payload.variables?.states ?? [];
      data = {
        issues: {
          nodes: statesFilter.includes(issue.state.name) ? [issue] : [],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      };
    } else if (operation === 'SymphonyIssueStates') {
      const ids = payload.variables?.ids ?? [];
      data = { issues: { nodes: ids.includes(issue.id) ? [issue] : [] } };
    } else if (operation === 'SymphonyBootstrap') {
      data = {
        viewer: { id: 'viewer-1' },
        workflowStates: { nodes: states },
      };
    } else if (operation === 'SymphonyUpdateIssue') {
      const input = payload.variables?.input ?? {};
      if (input.stateId) {
        issue.state = states.find((state) => state.id === input.stateId) ?? issue.state;
      }
      if (Object.hasOwn(input, 'assigneeId')) {
        issue.assigneeId = input.assigneeId;
      }
      issue.updatedAt = '2026-03-14T00:01:00.000Z';
      data = { issueUpdate: { success: true, issue } };
    } else if (operation === 'SymphonyComment') {
      issue.evidence = payload.variables?.input?.body ?? null;
      data = { commentCreate: { success: true, comment: { id: 'comment-1' } } };
    } else {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ errors: [{ message: `Unexpected operation: ${operation}` }] }));
      return;
    }

    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ data }));
  });

  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
  const address = server.address();
  const endpoint = `http://127.0.0.1:${address.port}/graphql`;
  return { server, endpoint };
}

test('CLI once mode completes a Linear-backed issue end-to-end', async (t) => {
  await mkdir(TEST_TMP_ROOT, { recursive: true });
  const tempRoot = await mkdtemp(join(TEST_TMP_ROOT, 'symphony-e2e-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const issue = createIssue();
  const operations = [];
  const { server, endpoint } = await startFakeLinearServer(issue, operations);
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
    send({ method: 'item/started', params: { item: { id: 'msg-1', type: 'agentMessage', text: '' } } });
    send({ method: 'thread/tokenUsage/updated', params: { input_tokens: 12, output_tokens: 8, total_tokens: 20 } });
    send({ method: 'item/agentMessage/delta', params: { itemId: 'msg-1', delta: ${JSON.stringify(completionMessage)} } });
    send({ method: 'item/completed', params: { item: { id: 'msg-1', type: 'agentMessage', text: ${JSON.stringify(completionMessage)} } } });
    send({ method: 'turn/completed', params: { turn: { id: 'turn-1' } } });
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
  kind: linear
  endpoint: ${JSON.stringify(endpoint)}
  api_key: $LINEAR_API_KEY
  project_slug: test-project
  agent_id: symphony-code-quality
  label: code-quality
  active_states:
    - Todo
    - In Progress
  terminal_states:
    - Done
    - Canceled
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
  approval_policy: on-request
  thread_sandbox: workspace-write
  turn_sandbox_policy:
    type: workspaceWrite
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
      LINEAR_API_KEY: 'test-token',
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
  assert.equal(issue.state.name, 'Done');
  assert.match(issue.evidence, /Evidence:/);
  assert.match(issue.evidence, new RegExp(completionMessage));
  assert.ok(operations.some((entry) => entry.operation === 'SymphonyUpdateIssue'));
  assert.ok(operations.some((entry) => entry.operation === 'SymphonyComment'));

  const hookLog = await readFile(hookLogPath, 'utf8');
  assert.match(hookLog, /created/);
  assert.match(hookLog, /removed/);

  const workspaceEntries = await readdir(workspacesRoot);
  assert.deepEqual(workspaceEntries, []);
});
