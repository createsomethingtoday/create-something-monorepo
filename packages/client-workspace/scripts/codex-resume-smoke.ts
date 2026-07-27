import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { connectCodexAppServer } from '../src/lib/server/codex/app-server.js';
import type {
  CodexConnection,
  CodexServerMessage
} from '../src/lib/server/sessions/workspace-session.js';

async function runTurn(
  connection: CodexConnection,
  threadId: string,
  writableRoot: string,
  text: string
): Promise<string> {
  let output = '';
  const terminal = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('codex_turn_timeout')), 120_000);
    connection.onMessage((message: CodexServerMessage) => {
      if (message.method === 'item/agentMessage/delta') {
        const delta = message.params?.delta;
        if (typeof delta === 'string') output += delta;
      }
      if (message.method === 'turn/completed') {
        clearTimeout(timeout);
        const turn = message.params?.turn;
        if (turn && typeof turn === 'object' && 'status' in turn && turn.status === 'failed') {
          reject(new Error('codex_turn_failed'));
        } else {
          resolve();
        }
      }
    });
  });
  await connection.startTurn({
    threadId,
    input: [{ type: 'text', text }],
    approvalPolicy: 'untrusted',
    sandboxPolicy: {
      type: 'workspaceWrite',
      writableRoots: [writableRoot],
      networkAccess: false
    }
  });
  await terminal;
  return output;
}

const root = await mkdtemp(join(tmpdir(), 'client-workspace-codex-resume-'));
const writableRoot = join(root, 'src');
await mkdir(writableRoot);
let first: CodexConnection | undefined;
let second: CodexConnection | undefined;

try {
  first = await connectCodexAppServer();
  const started = await first.startThread({
    cwd: root,
    approvalPolicy: 'untrusted',
    developerInstructions: 'Do not inspect or modify files. Answer the user directly.'
  });
  const firstOutput = await runTurn(
    first,
    started.threadId,
    writableRoot,
    'Reply with exactly CONTINUITY_ONE.'
  );
  assert.match(firstOutput, /CONTINUITY_ONE/);
  first.close();
  first = undefined;

  second = await connectCodexAppServer();
  const resumed = await second.resumeThread({
    threadId: started.threadId,
    cwd: root,
    writableRoots: [writableRoot],
    approvalPolicy: 'untrusted',
    developerInstructions: 'Do not inspect or modify files. Answer the user directly.'
  });
  assert.equal(resumed.threadId, started.threadId);
  const secondOutput = await runTurn(
    second,
    resumed.threadId,
    writableRoot,
    'What exact marker did I ask for in the previous turn? Reply with only that marker.'
  );
  assert.match(secondOutput, /CONTINUITY_ONE/);

  process.stdout.write(
    `${JSON.stringify({
      schema: 'create-something/codex-resume-smoke@1',
      threadDigest: createHash('sha256').update(started.threadId).digest('hex'),
      firstTurnObserved: firstOutput.includes('CONTINUITY_ONE'),
      resumedTurnObserved: secondOutput.includes('CONTINUITY_ONE')
    })}\n`
  );
} finally {
  first?.close();
  second?.close();
  await rm(root, { recursive: true, force: true });
}
