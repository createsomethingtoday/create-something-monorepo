import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import test from 'node:test';

import { create_codex_cli_runner_run } from '../src/runners/codex-cli.js';

const TEST_TMP_ROOT = resolve(process.cwd(), '.codex-tmp', 'symphony-tests');

function quoteShell(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

test('codex cli runner completes a bounded turn and returns final message', async (t) => {
  await mkdir(TEST_TMP_ROOT, { recursive: true });
  const tempRoot = await mkdtemp(join(TEST_TMP_ROOT, 'codex-cli-runner-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const fakeCodexPath = join(tempRoot, 'fake-codex-exec.mjs');
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
writeFileSync(outputPath, 'CLI runner completed task');
process.stdout.write(JSON.stringify({ type: 'turn.complete', promptLength: prompt.length }) + '\\n');
`,
    'utf8',
  );

  const events = [];
  const hookCalls = [];
  const run = create_codex_cli_runner_run(
    {
      id: 'lm-cli-1',
      identifier: 'lm-cli-1',
      title: 'Run codex cli task',
      state: 'ready',
    },
    null,
    {
      path: tempRoot,
    },
    'Handle {{ issue.identifier }} safely.',
    {
      tracker: {
        active_states: ['ready', 'claimed'],
      },
      agent: {
        max_turns: 1,
      },
      execution: {
        runner: 'codex-cli',
        command: `${quoteShell(process.execPath)} ${quoteShell(fakeCodexPath)}`,
      },
      codex: {
        thread_sandbox: 'danger-full-access',
        approval_policy: 'never',
      },
    },
    {
      fetch_issue_states_by_ids: async () => [
        {
          id: 'lm-cli-1',
          identifier: 'lm-cli-1',
          title: 'Run codex cli task',
          state: 'done',
        },
      ],
    },
    {
      run_before_run: async () => {
        hookCalls.push('before');
      },
      run_after_run: async () => {
        hookCalls.push('after');
      },
    },
    {
      warn() {},
    },
    (event) => events.push(event),
  );

  const result = await run.promise;

  assert.equal(result.status, 'completed');
  assert.equal(result.turn_count, 1);
  assert.equal(result.final_message, 'CLI runner completed task');
  assert.deepEqual(hookCalls, ['before', 'after']);
  assert.equal(events[0]?.event, 'session_started');
  assert.equal(events[1]?.event, 'turn_started');
  assert.equal(events.at(-1)?.event, 'turn_completed');
  assert.equal(await readFile(join(tempRoot, '.symphony-codex-cli-last-message.txt'), 'utf8'), 'CLI runner completed task');
});

test('codex cli runner fails timed out turns and kills the child process', async (t) => {
  await mkdir(TEST_TMP_ROOT, { recursive: true });
  const tempRoot = await mkdtemp(join(TEST_TMP_ROOT, 'codex-cli-timeout-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const fakeCodexPath = join(tempRoot, 'fake-codex-hang.mjs');
  const pidPath = join(tempRoot, 'child.pid');
  await writeFile(
    fakeCodexPath,
    `import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output-last-message');
const outputPath = outputIndex === -1 ? null : args[outputIndex + 1];
writeFileSync(${JSON.stringify(pidPath)}, String(process.pid));
process.on('SIGTERM', () => {
  process.exit(0);
});
if (outputPath) {
  // Intentionally never write the final message file.
}
setInterval(() => {}, 1000);
`,
    'utf8',
  );

  const warnings = [];
  const run = create_codex_cli_runner_run(
    {
      id: 'lm-cli-timeout',
      identifier: 'lm-cli-timeout',
      title: 'Run codex cli timeout task',
      state: 'ready',
    },
    null,
    {
      path: tempRoot,
    },
    'Handle {{ issue.identifier }} safely.',
    {
      tracker: {
        active_states: ['ready', 'claimed'],
      },
      agent: {
        max_turns: 1,
      },
      execution: {
        runner: 'codex-cli',
        command: `${quoteShell(process.execPath)} ${quoteShell(fakeCodexPath)}`,
      },
      codex: {
        thread_sandbox: 'danger-full-access',
        approval_policy: 'never',
        turn_timeout_ms: 100,
      },
    },
    {
      fetch_issue_states_by_ids: async () => [
        {
          id: 'lm-cli-timeout',
          identifier: 'lm-cli-timeout',
          title: 'Run codex cli timeout task',
          state: 'claimed',
        },
      ],
    },
    {
      run_before_run: async () => {},
      run_after_run: async () => {},
    },
    {
      warn(message, context) {
        warnings.push({ message, context });
      },
    },
    () => {},
  );

  const result = await run.promise;

  assert.equal(result.status, 'failed');
  assert.match(result.error, /Turn timed out after 100ms/);
  assert.equal(warnings.at(-1)?.message, 'codex cli runner failed');

  const childPid = Number((await readFile(pidPath, 'utf8')).trim());
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.throws(() => process.kill(childPid, 0), { code: 'ESRCH' });
});

test('codex cli runner terminate cancels the active turn and stops the child process', async (t) => {
  await mkdir(TEST_TMP_ROOT, { recursive: true });
  const tempRoot = await mkdtemp(join(TEST_TMP_ROOT, 'codex-cli-cancel-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const fakeCodexPath = join(tempRoot, 'fake-codex-cancel.mjs');
  const pidPath = join(tempRoot, 'child.pid');
  await writeFile(
    fakeCodexPath,
    `import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output-last-message');
const outputPath = outputIndex === -1 ? null : args[outputIndex + 1];
writeFileSync(${JSON.stringify(pidPath)}, String(process.pid));
process.on('SIGTERM', () => {
  process.exit(0);
});
if (outputPath) {
  // Intentionally never write the final message file.
}
setInterval(() => {}, 1000);
`,
    'utf8',
  );

  const hookCalls = [];
  const run = create_codex_cli_runner_run(
    {
      id: 'lm-cli-cancel',
      identifier: 'lm-cli-cancel',
      title: 'Run codex cli cancel task',
      state: 'ready',
    },
    null,
    {
      path: tempRoot,
    },
    'Handle {{ issue.identifier }} safely.',
    {
      tracker: {
        active_states: ['ready', 'claimed'],
      },
      agent: {
        max_turns: 1,
      },
      execution: {
        runner: 'codex-cli',
        command: `${quoteShell(process.execPath)} ${quoteShell(fakeCodexPath)}`,
      },
      codex: {
        thread_sandbox: 'danger-full-access',
        approval_policy: 'never',
        turn_timeout_ms: 5_000,
      },
    },
    {
      fetch_issue_states_by_ids: async () => [
        {
          id: 'lm-cli-cancel',
          identifier: 'lm-cli-cancel',
          title: 'Run codex cli cancel task',
          state: 'claimed',
        },
      ],
    },
    {
      run_before_run: async () => {
        hookCalls.push('before');
      },
      run_after_run: async () => {
        hookCalls.push('after');
      },
    },
    {
      warn() {},
    },
    () => {},
  );

  await new Promise((resolve) => setTimeout(resolve, 100));
  await run.terminate('manual cancel');
  const result = await run.promise;

  assert.equal(result.status, 'cancelled');
  assert.equal(result.error, 'manual cancel');
  assert.deepEqual(hookCalls, ['before', 'after']);

  const childPid = Number((await readFile(pidPath, 'utf8')).trim());
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.throws(() => process.kill(childPid, 0), { code: 'ESRCH' });
});
