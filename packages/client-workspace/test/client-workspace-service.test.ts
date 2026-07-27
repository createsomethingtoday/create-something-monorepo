import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  ClientWorkspaceService,
  ClientWorkspaceServiceError
} from '../src/lib/server/client-workspace-service.js';
import type {
  CodexConnection,
  CodexServerMessage,
  StartThreadOptions,
  StartTurnOptions
} from '../src/lib/server/sessions/workspace-session.js';
import { WorkspaceRegistry } from '../src/lib/server/workspaces/registry.js';

class FakeConnection implements CodexConnection {
  turnOptions: StartTurnOptions | undefined;
  responses: unknown[] = [];
  closed = false;
  #listener: ((message: CodexServerMessage) => void) | undefined;

  onMessage(listener: (message: CodexServerMessage) => void): void {
    this.#listener = listener;
  }

  async startThread(_options: StartThreadOptions): Promise<{ threadId: string }> {
    return { threadId: 'thread-service' };
  }

  async startTurn(options: StartTurnOptions): Promise<{ turnId: string }> {
    this.turnOptions = options;
    return { turnId: 'turn-service' };
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

async function withService(
  run: (context: {
    service: ClientWorkspaceService;
    connection: FakeConnection;
    registry: WorkspaceRegistry;
    seedRoot: string;
    stateRoot: string;
  }) => Promise<void>,
  editableRoots = ['src']
) {
  const root = join(tmpdir(), `client-workspace-service-${crypto.randomUUID()}`);
  const sourceRoot = join(root, 'managed', 'demo');
  const seedRoot = join(root, 'seed');
  const stateRoot = join(root, 'state');
  await mkdir(join(sourceRoot, 'src'), { recursive: true });
  await mkdir(join(seedRoot, 'demo', 'src'), { recursive: true });
  await writeFile(join(seedRoot, 'demo', 'src', 'page.svelte'), '<h1>Seed</h1>\n', 'utf8');
  const registry = new WorkspaceRegistry({
    managedRoot: join(root, 'managed'),
    definitions: [
      {
        id: 'demo',
        label: 'Demo',
        sourceRoot,
        editableRoots,
        preview: { command: 'pnpm', args: ['dev'], port: 4310 }
      }
    ]
  });
  const connection = new FakeConnection();
  const service = new ClientWorkspaceService({
    registry,
    stateRoot,
    connectCodex: async () => connection
  });

  try {
    await run({ service, connection, registry, seedRoot, stateRoot });
  } finally {
    await service.close();
    await rm(root, { recursive: true, force: true });
  }
}

test('service captures a baseline when the verified delivery makes its root editable', async () => {
  await withService(async ({ service }) => {
    const created = await service.createSession('demo');

    assert.equal(created.receipt.status, 'ready');
    assert.equal(await service.workspaceDiff(created.receipt.sessionId), '');
  }, ['.']);
});

test('service creates a sanitized workspace session and starts a private image turn', async () => {
  await withService(async ({ service, connection, stateRoot }) => {
    const created = await service.createSession('demo');
    assert.equal(created.workspace.id, 'demo');
    assert.equal(created.receipt.status, 'ready');
    assert.equal(JSON.stringify(created).includes(stateRoot), false);

    const attachment = await service.storeAttachment(
      created.receipt.sessionId,
      new File([Buffer.from('image')], 'reference.png', { type: 'image/png' })
    );
    await service.startTurn(created.receipt.sessionId, {
      text: 'Use the reference image.',
      attachment
    });
    assert.equal(connection.turnOptions?.input[1]?.type, 'localImage');
    const publicReceipt = JSON.stringify(service.receipt(created.receipt.sessionId));
    assert.equal(publicReceipt.includes(stateRoot), false);
    assert.equal(publicReceipt.includes('thread-service'), false);
    assert.equal(publicReceipt.includes('turn-service'), false);
  });
});

test('service forwards normalized events and opaque approvals to subscribers', async () => {
  await withService(async ({ service, connection }) => {
    const created = await service.createSession('demo');
    const events: Array<{ type?: string; approvalId?: string }> = [];
    const unsubscribe = service.subscribe(created.receipt.sessionId, (event) => events.push(event));
    await service.startTurn(created.receipt.sessionId, { text: 'Run the check.' });
    connection.emit({
      id: 88,
      method: 'item/commandExecution/requestApproval',
      params: { command: 'pnpm check' }
    });
    const approval = events.find((event) => event.type === 'approval.requested');
    assert.ok(approval?.approvalId);
    await service.respondToApproval(created.receipt.sessionId, approval.approvalId, 'accept');
    assert.deepEqual(connection.responses, [{ id: 88, result: { decision: 'accept' } }]);
    unsubscribe();
  });
});

test('service closes active session authority while preserving its terminal receipt', async () => {
  await withService(async ({ service, connection }) => {
    const created = await service.createSession('demo');
    const events: Array<{ type?: string }> = [];
    service.subscribe(created.receipt.sessionId, (event) => events.push(event));

    await service.closeSession(created.receipt.sessionId);

    assert.equal(connection.closed, true);
    assert.equal(events.at(-1)?.type, 'session.closed');
    assert.throws(
      () => service.receipt(created.receipt.sessionId),
      (error: unknown) =>
        error instanceof ClientWorkspaceServiceError && error.code === 'session_not_found'
    );
    const persisted = await service.sessionState(created.receipt.sessionId);
    assert.equal(persisted.receipt.status, 'closed');
  });
});

test('service rejects unknown sessions and unsupported uploads without creating authority', async () => {
  await withService(async ({ service }) => {
    assert.throws(
      () => service.receipt('session-missing'),
      (error: unknown) =>
        error instanceof ClientWorkspaceServiceError && error.code === 'session_not_found'
    );

    const created = await service.createSession('demo');
    await assert.rejects(
      service.storeAttachment(
        created.receipt.sessionId,
        new File([Buffer.from('<svg/>')], 'reference.svg', { type: 'image/svg+xml' })
      ),
      (error: unknown) =>
        error instanceof ClientWorkspaceServiceError && error.code === 'invalid_upload'
    );
  });
});

test('service reports a session-baseline diff for an edited untracked fixture', async () => {
  await withService(async ({ service, stateRoot }) => {
    const sourceFile = join(stateRoot, '..', 'managed', 'demo', 'src', 'page.svelte');
    await writeFile(sourceFile, '<h1>Before</h1>\n', 'utf8');
    const created = await service.createSession('demo');
    await writeFile(sourceFile, '<h1>After</h1>\n', 'utf8');

    const diff = await service.workspaceDiff(created.receipt.sessionId);

    assert.match(diff, /-<h1>Before<\/h1>/);
    assert.match(diff, /\+<h1>After<\/h1>/);
    assert.equal(diff.includes(stateRoot), false);
  });
});

test('service restores a persisted receipt and baseline after the runtime restarts', async () => {
  await withService(async ({ service, connection, registry, stateRoot }) => {
    const sourceFile = join(stateRoot, '..', 'managed', 'demo', 'src', 'page.svelte');
    await writeFile(sourceFile, '<h1>Before</h1>\n', 'utf8');
    const created = await service.createSession('demo');
    await writeFile(sourceFile, '<h1>After restart</h1>\n', 'utf8');

    const restarted = new ClientWorkspaceService({
      registry,
      stateRoot,
      connectCodex: async () => connection
    });
    try {
      const restored = await restarted.sessionState(created.receipt.sessionId);
      assert.equal(restored.active, false);
      assert.equal(restored.workspaceId, 'demo');
      assert.equal(restored.receipt.sessionId, created.receipt.sessionId);
      assert.equal(restored.receipt.status, 'ready');
      assert.match(await restarted.workspaceDiff(created.receipt.sessionId), /\+<h1>After restart<\/h1>/);
    } finally {
      await restarted.close();
    }
  });
});

test('service reset restores only the immutable seed and removes prior session authority', async () => {
  await withService(async ({ service, seedRoot, stateRoot }) => {
    const sourceFile = join(stateRoot, '..', 'managed', 'demo', 'src', 'page.svelte');
    await writeFile(sourceFile, '<h1>Edited</h1>\n', 'utf8');
    const created = await service.createSession('demo');

    await service.resetWorkspace('demo', seedRoot);

    assert.equal(await readFile(sourceFile, 'utf8'), '<h1>Seed</h1>\n');
    await assert.rejects(
      service.sessionState(created.receipt.sessionId),
      (error: unknown) =>
        error instanceof ClientWorkspaceServiceError && error.code === 'session_not_found'
    );
  });
});
