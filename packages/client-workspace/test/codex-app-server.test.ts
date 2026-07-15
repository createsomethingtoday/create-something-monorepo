import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { connectCodexAppServer } from '../src/lib/server/codex/app-server.js';

test('Codex process adapter initializes, starts a thread and turn, and forwards notifications', async () => {
  const fakeServer = fileURLToPath(new URL('./fixtures/fake-codex-app-server.mjs', import.meta.url));
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
