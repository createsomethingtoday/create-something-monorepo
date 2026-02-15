import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const CLI = join(HERE, '..', 'dist', 'cli.js');

function writeFakeCodex(binDir) {
  const path = join(binDir, 'codex');
  const script = `#!/usr/bin/env node
// Minimal fake of \`codex app-server\` for CI-safe tests. Speaks JSONL (JSON-RPC-ish) over stdio.
const readline = require('node:readline');

const args = process.argv.slice(2);
if (args[0] !== 'app-server') {
  console.error('fake codex only supports: codex app-server');
  process.exit(2);
}

const scenario = process.env.FAKE_CODEX_SCENARIO || 'decline';
const threadId = 'thr_test';
const turnId = 'turn_test';
const approvalReqId = 101;
const itemId = 'call_test_1';

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\\n');
}

let pendingApproval = false;

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }

  // Client response to our server-initiated approval request.
  if (msg && msg.id !== undefined && msg.method === undefined && msg.result !== undefined && pendingApproval && msg.id === approvalReqId) {
    pendingApproval = false;
    const decision = msg.result && msg.result.decision;
    const decisionStr = typeof decision === 'string' ? decision : 'object';
    const declined = decisionStr === 'decline' || decisionStr === 'cancel';

    send({
      method: 'item/completed',
      params: {
        threadId,
        turnId,
        item: {
          type: 'commandExecution',
          id: itemId,
          command: scenario === 'autoApprove' ? 'bash -lc \"cat README.md\"' : 'bash -lc \"python -c \\'print(1)\\'\"',
          cwd: process.cwd(),
          status: declined ? 'declined' : 'completed',
          commandActions: scenario === 'autoApprove'
            ? [{ type: 'read', command: 'cat README.md', name: 'cat', path: 'README.md' }]
            : [{ type: 'unknown', command: 'python -c \\'print(1)\\'' }],
          aggregatedOutput: declined ? null : 'FAKE_OUTPUT\\n',
          exitCode: declined ? null : 0,
          durationMs: 1
        }
      }
    });

    send({
      method: 'item/started',
      params: {
        threadId,
        turnId,
        item: { type: 'agentMessage', id: 'msg_1', text: declined ? 'declined' : 'accepted' }
      }
    });
    send({
      method: 'item/completed',
      params: {
        threadId,
        turnId,
        item: { type: 'agentMessage', id: 'msg_1', text: declined ? 'declined' : 'accepted' }
      }
    });
    send({ method: 'turn/completed', params: { threadId, turn: { id: turnId, status: 'completed', items: [], error: null } } });
    process.exit(0);
    return;
  }

  // Client request.
  if (msg && msg.id !== undefined && msg.method) {
    if (msg.method === 'initialize') {
      send({ id: msg.id, result: { ok: true } });
      return;
    }
    if (msg.method === 'thread/start') {
      send({ id: msg.id, result: { thread: { id: threadId } } });
      return;
    }
    if (msg.method === 'turn/start') {
      send({ id: msg.id, result: { turn: { id: turnId, status: 'inProgress', items: [], error: null } } });

      // Begin a mocked approval flow.
      send({
        method: 'item/started',
        params: {
          threadId,
          turnId,
          item: {
            type: 'commandExecution',
            id: itemId,
            command: scenario === 'autoApprove' ? 'bash -lc \"cat README.md\"' : 'bash -lc \"python -c \\'print(1)\\'\"',
            cwd: process.cwd(),
            status: 'inProgress',
            commandActions: scenario === 'autoApprove'
              ? [{ type: 'read', command: 'cat README.md', name: 'cat', path: 'README.md' }]
              : [{ type: 'unknown', command: 'python -c \\'print(1)\\'' }]
          }
        }
      });

      pendingApproval = true;
      send({
        id: approvalReqId,
        method: 'item/commandExecution/requestApproval',
        params: {
          itemId,
          threadId,
          turnId,
          reason: null,
          proposedExecpolicyAmendment: scenario === 'autoApprove' ? ['cat', 'README.md'] : ['python', '-c', 'print(1)']
        }
      });
      return;
    }
  }
});
`;

  writeFileSync(path, script, 'utf-8');
  chmodSync(path, 0o755);
  return path;
}

function runCli(args, cwd, envExtra) {
  const res = spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, ...envExtra },
    timeout: 10_000,
  });
  return {
    code: res.status ?? -1,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
    signal: res.signal ?? null,
  };
}

test('cs-judge run handles command approval (non-interactive decline)', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'cs-judge-'));
  try {
    const binDir = join(cwd, 'bin');
    mkdirSync(binDir, { recursive: true });
    writeFakeCodex(binDir);

    const r = runCli(
      ['run', '--cwd', cwd, '--policy', 'safe', '--non-interactive', '--prompt', 'Run: python -c \"print(1)\"'],
      cwd,
      {
        HOME: cwd,
        PATH: `${binDir}:${process.env.PATH ?? ''}`,
        FAKE_CODEX_SCENARIO: 'decline',
      }
    );
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.signal, null);
    assert.match(r.stdout, /Turn status: completed/);

    const andonPath = join(cwd, '.judgment', 'andon.jsonl');
    assert.ok(existsSync(andonPath), 'expected Andon log to be written');
    const [rec] = readFileSync(andonPath, 'utf-8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l));
    assert.equal(rec.kind, 'commandExecution');
    assert.equal(rec.phase, 'approval');
    assert.equal(rec.decision, 'decline');
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('cs-judge run auto-approves when commandActions are allow-listed', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'cs-judge-'));
  try {
    const binDir = join(cwd, 'bin');
    mkdirSync(binDir, { recursive: true });
    writeFakeCodex(binDir);

    const r = runCli(
      ['run', '--cwd', cwd, '--policy', 'safe', '--non-interactive', '--prompt', 'Run: cat README.md'],
      cwd,
      {
        HOME: cwd,
        PATH: `${binDir}:${process.env.PATH ?? ''}`,
        FAKE_CODEX_SCENARIO: 'autoApprove',
      }
    );
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.signal, null);
    assert.match(r.stdout, /Turn status: completed/);

    const andonPath = join(cwd, '.judgment', 'andon.jsonl');
    assert.ok(existsSync(andonPath), 'expected Andon log to be written');
    const [rec] = readFileSync(andonPath, 'utf-8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l));
    assert.equal(rec.kind, 'commandExecution');
    assert.equal(rec.phase, 'approval');
    assert.equal(rec.decision, 'acceptForSession');
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

