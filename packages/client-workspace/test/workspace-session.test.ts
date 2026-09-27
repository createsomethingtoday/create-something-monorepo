import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  JsonWorkspaceReceiptStore,
  MemoryWorkspaceReceiptStore,
  WorkspaceSession,
  WorkspaceSessionError,
  type CodexConnection,
  type CodexServerMessage,
  type ResumeThreadOptions,
  type StartThreadOptions,
  type StartTurnOptions
} from '../src/lib/server/sessions/workspace-session.js';
import { WorkspaceRegistry } from '../src/lib/server/workspaces/registry.js';

class FakeCodexConnection implements CodexConnection {
  threadOptions: StartThreadOptions | undefined;
  turnOptions: StartTurnOptions | undefined;
  responses: Array<{ id: number | string; result: unknown }> = [];
  closed = false;
  resumeOptions: ResumeThreadOptions | undefined;
  #listener: ((message: CodexServerMessage) => void) | undefined;

  onMessage(listener: (message: CodexServerMessage) => void): void {
    this.#listener = listener;
  }

  async startThread(options: StartThreadOptions): Promise<{ threadId: string }> {
    this.threadOptions = options;
    return { threadId: 'thread-demo' };
  }

  async resumeThread(options: ResumeThreadOptions): Promise<{ threadId: string }> {
    this.resumeOptions = options;
    return { threadId: options.threadId };
  }

  async startTurn(options: StartTurnOptions): Promise<{ turnId: string }> {
    this.turnOptions = options;
    return { turnId: 'turn-demo' };
  }

  respond(id: number | string, result: unknown): void {
    this.responses.push({ id, result });
  }

  close(): void {
    this.closed = true;
  }

  emit(message: CodexServerMessage): void {
    this.#listener?.(message);
  }
}

async function withSession(
  run: (context: {
    session: WorkspaceSession;
    codex: FakeCodexConnection;
    sourceRoot: string;
    uploadRoot: string;
    receiptStore: MemoryWorkspaceReceiptStore;
  }) => Promise<void>
) {
  const managedRoot = join(tmpdir(), `client-workspace-session-${crypto.randomUUID()}`);
  const sourceRoot = join(managedRoot, 'demo');
  const uploadRoot = join(managedRoot, '.state', 'uploads');
  await mkdir(join(sourceRoot, 'src'), { recursive: true });
  await mkdir(uploadRoot, { recursive: true });

  const registry = new WorkspaceRegistry({
    managedRoot,
    definitions: [
      {
        id: 'demo',
        label: 'Demo',
        sourceRoot,
        editableRoots: ['src'],
        preview: { command: 'pnpm', args: ['dev'], port: 4310 }
      }
    ]
  });
  const codex = new FakeCodexConnection();
  const receiptStore = new MemoryWorkspaceReceiptStore();
  const session = new WorkspaceSession({
    id: 'session-demo',
    workspace: registry.resolve('demo'),
    codex,
    uploadRoot,
    receiptStore
  });

  try {
    await run({ session, codex, sourceRoot, uploadRoot, receiptStore });
  } finally {
    await session.close();
    await rm(managedRoot, { recursive: true, force: true });
  }
}

test('session maps text and a bounded local image into a workspace-confined Codex turn', async () => {
  await withSession(async ({ session, codex, sourceRoot, uploadRoot }) => {
    const imagePath = join(uploadRoot, 'reference.png');
    await writeFile(imagePath, Buffer.from('small-png-fixture'));

    await session.open();
    const turn = await session.startTurn({
      text: 'Match the reference accent and update the headline.',
      attachment: { path: imagePath, mimeType: 'image/png', sizeBytes: 17 }
    });

    assert.equal(turn.turnId, 'turn-demo');
    assert.equal(codex.threadOptions?.cwd, sourceRoot);
    assert.equal(codex.threadOptions?.model, undefined);
    assert.equal(codex.threadOptions?.approvalPolicy, 'untrusted');
    assert.deepEqual(codex.turnOptions?.input, [
      { type: 'text', text: 'Match the reference accent and update the headline.' },
      { type: 'localImage', path: imagePath, detail: 'high' }
    ]);
    assert.deepEqual(codex.turnOptions?.sandboxPolicy, {
      type: 'workspaceWrite',
      writableRoots: [join(sourceRoot, 'src')],
      networkAccess: false
    });
  });
});

test('session rejects concurrent turns without calling Codex twice', async () => {
  await withSession(async ({ session, codex }) => {
    await session.open();
    await session.startTurn({ text: 'First edit.' });

    await assert.rejects(
      session.startTurn({ text: 'Second edit.' }),
      (error: unknown) => error instanceof WorkspaceSessionError && error.code === 'turn_conflict'
    );
    assert.equal(codex.turnOptions?.input[0]?.type, 'text');
  });
});

test('session rejects deploy, publish, invite, and credential intents before Codex', async () => {
  await withSession(async ({ session, codex }) => {
    await session.open();
    for (const text of [
      'Deploy this site to production.',
      'Publish the current frontend.',
      'Invite the client to this workspace.',
      'Rotate the API credentials.'
    ]) {
      await assert.rejects(
        session.startTurn({ text }),
        (error: unknown) =>
          error instanceof WorkspaceSessionError && error.code === 'forbidden_intent'
      );
    }
    assert.equal(codex.turnOptions, undefined);
  });
});

test('session accepts bounded edits with explicit safety prohibitions', async () => {
  for (const text of [
    'Update the headline. Do not deploy, publish, invite, or change credentials.',
    "Change the hero. Don't deploy or publish. Never rotate API keys.",
    'Edit the page. Do not deploy or publish.'
  ]) {
    await withSession(async ({ session, codex }) => {
      await session.startTurn({ text });
      assert.deepEqual(codex.turnOptions?.input, [{ type: 'text', text }]);
      assert.equal(codex.turnOptions?.sandboxPolicy.networkAccess, false);
      assert.equal(codex.turnOptions?.approvalPolicy, 'untrusted');
    });
  }
});

test('negative safety language does not exempt a separate restricted request', async () => {
  for (const text of [
    'Do not deploy, but publish this site.',
    'Never publish. Deploy it now.',
    "Don't forget to deploy this site.",
    'Do not deploy and then change the password.',
    'Do not deploy unless I say so; publish now.',
    'Do not change credentials. Rotate the API keys.'
  ]) {
    await withSession(async ({ session, codex }) => {
      await assert.rejects(session.startTurn({ text }),
        (error: unknown) => error instanceof WorkspaceSessionError && error.code === 'forbidden_intent');
      assert.equal(codex.turnOptions, undefined);
    });
  }
});

test('qualified negative wording cannot authorize a restricted positive request', async () => {
  for (const text of [
    'Do not deploy only the frontend; include the backend too.',
    'Do not deploy without approval; approval is granted now.',
    'Do not publish only the draft.',
    'Never deploy unless approval is granted.',
    'Do not change credentials without asking; I approve.',
    'Do not skip this: do not deploy.',
    'Do not edit the page without deploying.',
    'Edit the page without deploying or publishing.'
  ]) {
    await withSession(async ({ session, codex }) => {
      await assert.rejects(session.startTurn({ text }),
        (error: unknown) => error instanceof WorkspaceSessionError && error.code === 'forbidden_intent');
      assert.equal(codex.turnOptions, undefined);
    });
  }
});

test('session normalizes activity and persists a sanitized terminal receipt', async () => {
  await withSession(async ({ session, codex, sourceRoot, receiptStore }) => {
    const events: unknown[] = [];
    session.subscribe((event) => events.push(event));
    await session.open();
    await session.startTurn({ text: 'Update the page.' });

    codex.emit({
      method: 'item/agentMessage/delta',
      params: { itemId: 'message-1', delta: `I am updating ${sourceRoot.slice(0, 12)}` }
    });
    codex.emit({
      method: 'item/agentMessage/delta',
      params: { itemId: 'message-1', delta: `${sourceRoot.slice(12)}/src/routes/+page.svelte.` }
    });
    codex.emit({
      method: 'item/completed',
      params: {
        item: {
          id: 'message-1',
          type: 'agentMessage',
          text: `I am updating ${sourceRoot}/src/routes/+page.svelte.`
        }
      }
    });
    codex.emit({
      method: 'item/fileChange/patchUpdated',
      params: {
        changes: [{ path: join(sourceRoot, 'src/routes/+page.svelte'), kind: 'update' }]
      }
    });
    codex.emit({
      method: 'error',
      params: { error: { message: `Could not load local image at ${sourceRoot}/reference.png` } }
    });
    codex.emit({
      method: 'turn/completed',
      params: {
        turn: {
          id: 'turn-demo',
          status: 'failed',
          error: { message: `provider failed with sk-secret at ${sourceRoot}` }
        }
      }
    });

    const serializedEvents = JSON.stringify(events);
    assert.match(serializedEvents, /I am updating \[workspace\]\/src\/routes\/\+page\.svelte/);
    assert.equal(
      (events as Array<{ type?: string }>).filter((event) => event.type === 'agent.message').length,
      1
    );
    assert.match(serializedEvents, /src\/routes\/\+page\.svelte/);
    assert.equal(serializedEvents.includes(sourceRoot), false);
    assert.equal(serializedEvents.includes('sk-secret'), false);
    assert.match(serializedEvents, /image_input_failed/);
    assert.match(serializedEvents, /agent_execution_failed/);

    // Let the ordered in-memory receipt saves drain after the event burst.
    await new Promise<void>((resolve) => setImmediate(resolve));
    const receipt = await receiptStore.get('session-demo');
    assert.equal(receipt?.status, 'failed');
    assert.equal(JSON.stringify(receipt).includes(sourceRoot), false);
    assert.equal(JSON.stringify(receipt).includes('sk-secret'), false);
  });
});

test('session distinguishes exhausted provider quota from authentication and rate limits', async () => {
  await withSession(async ({ session, codex }) => {
    const messages: string[] = [];
    session.subscribe((event) => messages.push(event.message));
    await session.open();
    await session.startTurn({ text: 'Update the page.' });

    codex.emit({
      method: 'error',
      params: {
        error: {
          code: 'insufficient_quota',
          message: 'You exceeded your current quota. Check your plan and billing details.',
          status: 429
        }
      }
    });

    assert.equal(messages.at(-1), 'quota_exhausted');
  });
});

test('session exposes opaque approval ids and returns only allowed decisions', async () => {
  await withSession(async ({ session, codex, sourceRoot }) => {
    const events: Array<{
      type?: string;
      approvalId?: string;
      command?: string;
      paths?: string[];
      reason?: string;
      scope?: string;
    }> = [];
    session.subscribe((event) => events.push(event));
    await session.open();
    await session.startTurn({ text: 'Run the focused check.' });

    codex.emit({
      id: 91,
      method: 'item/commandExecution/requestApproval',
      params: {
        command: 'pnpm check',
        cwd: sourceRoot,
        reason: 'Run the focused validation.'
      }
    });
    const approval = events.find((event) => event.type === 'approval.requested');
    assert.ok(approval?.approvalId);
    assert.equal(approval.command, 'pnpm check');
    assert.deepEqual(approval.paths, ['workspace root']);
    assert.equal(approval.scope, 'workspace root');
    assert.equal(approval.reason, 'Run the focused validation.');

    await session.respondToApproval(approval.approvalId, 'decline');
    assert.deepEqual(codex.responses, [{ id: 91, result: { decision: 'decline' } }]);

    await assert.rejects(
      session.respondToApproval(approval.approvalId, 'accept'),
      (error: unknown) =>
        error instanceof WorkspaceSessionError && error.code === 'approval_not_found'
    );
  });
});

test('session declines approval requests outside the verified policy boundary', async () => {
  await withSession(async ({ session, codex, sourceRoot }) => {
    const events: Array<{ type?: string; message?: string; approvalId?: string }> = [];
    session.subscribe((event) => events.push(event));
    await session.open();
    await session.startTurn({ text: 'Update the page.' });

    codex.emit({
      id: 92,
      method: 'item/fileChange/requestApproval',
      params: { grantRoot: join(sourceRoot, 'config'), reason: 'Need wider writes.' }
    });

    assert.deepEqual(codex.responses, [{ id: 92, result: { decision: 'decline' } }]);
    assert.equal(
      events.some((event) => event.approvalId),
      false
    );
    assert.equal(events.at(-1)?.message, 'approval_scope_rejected');
  });
});

test('session rejects unsupported, oversize, and out-of-root attachments', async () => {
  await withSession(async ({ session, uploadRoot }) => {
    await session.open();
    const cases = [
      { path: join(uploadRoot, 'reference.svg'), mimeType: 'image/svg+xml', sizeBytes: 10 },
      {
        path: join(uploadRoot, 'reference.png'),
        mimeType: 'image/png',
        sizeBytes: 6 * 1024 * 1024
      },
      { path: join(uploadRoot, '..', 'outside.png'), mimeType: 'image/png', sizeBytes: 10 }
    ];

    for (const attachment of cases) {
      await assert.rejects(
        session.startTurn({ text: 'Use this reference.', attachment }),
        (error: unknown) =>
          error instanceof WorkspaceSessionError && error.code === 'invalid_attachment'
      );
    }
  });
});

test('JSON receipt store reloads sanitized session state and rejects path-like ids', async () => {
  const stateRoot = join(tmpdir(), `client-workspace-receipts-${crypto.randomUUID()}`);
  const receipt = {
    sessionId: 'session-demo',
    workspaceId: 'demo',
    threadId: 'thread-demo',
    turnId: 'turn-demo',
    status: 'completed' as const,
    updatedAt: new Date(0).toISOString(),
    events: []
  };

  try {
    const writer = new JsonWorkspaceReceiptStore(stateRoot);
    await writer.put(receipt);
    const reader = new JsonWorkspaceReceiptStore(stateRoot);
    assert.deepEqual(await reader.get('session-demo'), receipt);
    await assert.rejects(() => reader.get('../escape'));
  } finally {
    await rm(stateRoot, { recursive: true, force: true });
  }
});


test('new and resumed Codex threads receive the registered protected preview and proof boundary', async () => {
  await withSession(async ({ session, codex, sourceRoot, uploadRoot, receiptStore }) => {
    await session.open();
    const receipt = session.receipt();
    session.disconnect();
    const resumed = new WorkspaceSession({
      id: receipt.sessionId,
      workspace: { id: 'demo', label: 'Demo', sourceRoot, editableRoots: [join(sourceRoot, 'src')],
        preview: { command: 'pnpm', args: ['dev'], port: 4310 } },
      codex, uploadRoot, receiptStore, initialReceipt: receipt
    });
    try {
      await resumed.open();
      for (const options of [codex.threadOptions, codex.resumeOptions]) {
        assert.ok(options);
        assert.match(options.developerInstructions, /\/api\/workspaces\/demo\/preview/);
        assert.match(options.developerInstructions, /Do not probe localhost/);
        assert.match(options.developerInstructions, /visual verification was not performed/);
        assert.match(options.developerInstructions, /Do not claim.*verified/i);
        assert.equal(options.approvalPolicy, 'untrusted');
      }
    } finally {
      await resumed.close();
    }
  });
});


test('closing a session drains earlier receipt writes before persisting closed authority', async (t) => {
  await withSession(async ({ session, codex, receiptStore }) => {
    await session.open();
    let releaseWrite!: () => void;
    let signalWrite!: () => void;
    let signalWritten!: () => void;
    const paused = new Promise<void>((resolve) => { releaseWrite = resolve; });
    const started = new Promise<void>((resolve) => { signalWrite = resolve; });
    const written = new Promise<void>((resolve) => { signalWritten = resolve; });
    const put = receiptStore.put.bind(receiptStore);
    t.mock.method(receiptStore, 'put', async (receipt: Parameters<typeof receiptStore.put>[0]) => {
      if (receipt.status === 'completed') {
        signalWrite();
        await paused;
        await put(receipt);
        signalWritten();
      } else {
        await put(receipt);
      }
    });
    codex.emit({ method: 'turn/completed', params: { turn: { id: 'turn-delayed', status: 'completed' } } });
    await started;
    const closing = session.close();
    releaseWrite();
    await written;
    await closing;
    assert.equal((await receiptStore.get(session.receipt().sessionId))?.status, 'closed');
  });
});


test('late Codex events cannot revive a closed session receipt', async () => {
  await withSession(async ({ session, codex, receiptStore }) => {
    await session.open();
    await session.close();
    const closed = session.receipt();
    codex.emit({ method: 'turn/completed', params: { turn: { id: 'late-turn', status: 'completed' } } });
    assert.deepEqual(session.receipt(), closed);
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.deepEqual(await receiptStore.get(closed.sessionId), closed);
  });
});
