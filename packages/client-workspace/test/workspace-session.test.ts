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
  type StartThreadOptions,
  type StartTurnOptions
} from '../src/lib/server/sessions/workspace-session.js';
import { WorkspaceRegistry } from '../src/lib/server/workspaces/registry.js';

class FakeCodexConnection implements CodexConnection {
  threadOptions: StartThreadOptions | undefined;
  turnOptions: StartTurnOptions | undefined;
  responses: Array<{ id: number | string; result: unknown }> = [];
  closed = false;
  #listener: ((message: CodexServerMessage) => void) | undefined;

  onMessage(listener: (message: CodexServerMessage) => void): void {
    this.#listener = listener;
  }

  async startThread(options: StartThreadOptions): Promise<{ threadId: string }> {
    this.threadOptions = options;
    return { threadId: 'thread-demo' };
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
      writableRoots: [sourceRoot],
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
  await withSession(async ({ session, codex }) => {
    const events: Array<{ type?: string; approvalId?: string }> = [];
    session.subscribe((event) => events.push(event));
    await session.open();
    await session.startTurn({ text: 'Run the focused check.' });

    codex.emit({
      id: 91,
      method: 'item/commandExecution/requestApproval',
      params: { command: 'pnpm check' }
    });
    const approval = events.find((event) => event.type === 'approval.requested');
    assert.ok(approval?.approvalId);

    await session.respondToApproval(approval.approvalId, 'decline');
    assert.deepEqual(codex.responses, [{ id: 91, result: { decision: 'decline' } }]);

    await assert.rejects(
      session.respondToApproval(approval.approvalId, 'accept'),
      (error: unknown) =>
        error instanceof WorkspaceSessionError && error.code === 'approval_not_found'
    );
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
