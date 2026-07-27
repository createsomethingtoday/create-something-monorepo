import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  connectCodexAppServer,
  probeCodexInstallation
} from '../src/lib/server/codex/app-server.js';

test('Codex process adapter initializes, starts a thread and turn, and forwards notifications', async () => {
  const fakeServer = fileURLToPath(
    new URL('./fixtures/fake-codex-app-server.mjs', import.meta.url)
  );
  const connection = await connectCodexAppServer({
    command: process.execPath,
    args: [fakeServer]
  });
  const messages: Array<{ method?: string }> = [];
  connection.onMessage((message) => messages.push(message));

  try {
    const thread = await connection.startThread({
      cwd: process.cwd(),
      model: 'gpt-5.5',
      approvalPolicy: 'untrusted',
      developerInstructions: 'Stay inside the workspace.'
    });
    const turn = await connection.startTurn({
      threadId: thread.threadId,
      input: [{ type: 'text', text: 'Make one edit.' }],
      approvalPolicy: 'untrusted',
      sandboxPolicy: {
        type: 'workspaceWrite',
        writableRoots: [process.cwd()],
        networkAccess: false
      }
    });

    assert.equal(thread.threadId, 'thread-from-process');
    assert.equal(turn.turnId, 'turn-from-process');
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(
      messages.map((message) => message.method),
      ['item/agentMessage/delta', 'turn/completed']
    );
  } finally {
    connection.close();
  }
});

test('Codex process adapter removes ephemeral auth after the child caches it', async () => {
  const fakeServer = fileURLToPath(
    new URL('./fixtures/fake-codex-app-server.mjs', import.meta.url)
  );
  const codexHome = await mkdtemp(join(tmpdir(), 'client-workspace-codex-auth-'));
  const authFile = join(codexHome, 'auth.json');
  await writeFile(authFile, '{"OPENAI_API_KEY":"test-only"}', { mode: 0o600 });

  const connection = await connectCodexAppServer({
    command: process.execPath,
    args: [fakeServer],
    environment: {
      ...process.env,
      CODEX_HOME: codexHome,
      OPENAI_API_KEY: 'must-not-reach-child',
      EXPECT_EPHEMERAL_CODEX_AUTH: '1'
    },
    ephemeralAuthFile: authFile
  });

  try {
    await assert.rejects(access(authFile), { code: 'ENOENT' });
    const thread = await connection.startThread({
      cwd: process.cwd(),
      model: 'gpt-5.5',
      approvalPolicy: 'untrusted',
      developerInstructions: 'Stay inside the workspace.'
    });
    assert.equal(thread.threadId, 'thread-from-process');
  } finally {
    connection.close();
    await rm(codexHome, { recursive: true, force: true });
  }
});

test('Codex preflight reports public capability and auth states without local paths', async () => {
  const fixture = fileURLToPath(new URL('./fixtures/fake-codex-cli.mjs', import.meta.url));
  const ready = await probeCodexInstallation({
    command: process.execPath,
    argsPrefix: [fixture],
    environment: { ...process.env, FAKE_CODEX_MODE: 'ready' }
  });
  assert.deepEqual(ready, { state: 'ready', version: '0.142.5', authMode: 'ChatGPT' });
  const outdated = await probeCodexInstallation({
    command: process.execPath,
    argsPrefix: [fixture],
    environment: { ...process.env, FAKE_CODEX_MODE: 'outdated' }
  });
  assert.deepEqual(outdated, { state: 'outdated', version: '0.120.0' });
  const unauthenticated = await probeCodexInstallation({
    command: process.execPath,
    argsPrefix: [fixture],
    environment: { ...process.env, FAKE_CODEX_MODE: 'unauthenticated' }
  });
  assert.deepEqual(unauthenticated, { state: 'unauthenticated', version: '0.142.5' });
  assert.equal(JSON.stringify([ready, outdated, unauthenticated]).includes(fixture), false);
});

test('Sandbox entrypoint authenticates Codex in memory and clears the inherited provider key', async () => {
  const entrypoint = await readFile(
    fileURLToPath(new URL('../cloudflare/start-client-workspace.sh', import.meta.url)),
    'utf8'
  );

  assert.match(entrypoint, /CODEX_HOME=.*\/dev\/shm/);
  assert.match(entrypoint, /codex login --with-api-key/);
  assert.match(entrypoint, /unset OPENAI_API_KEY/);
  assert.match(entrypoint, /CLIENT_WORKSPACE_EPHEMERAL_CODEX_AUTH/);
});
