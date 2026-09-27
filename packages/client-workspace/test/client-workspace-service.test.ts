import assert from 'node:assert/strict';
import fsPromises, { mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
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
  ResumeThreadOptions,
  StartThreadOptions,
  StartTurnOptions
} from '../src/lib/server/sessions/workspace-session.js';
import { WorkspaceRegistry } from '../src/lib/server/workspaces/registry.js';

class FakeConnection implements CodexConnection {
  turnOptions: StartTurnOptions | undefined;
  responses: unknown[] = [];
  closed = false;
  resumeOptions: ResumeThreadOptions | undefined;
  resumeFails = false;
  #listener: ((message: CodexServerMessage) => void) | undefined;

  onMessage(listener: (message: CodexServerMessage) => void): void {
    this.#listener = listener;
  }

  async startThread(_options: StartThreadOptions): Promise<{ threadId: string }> {
    return { threadId: 'thread-service' };
  }

  async resumeThread(options: ResumeThreadOptions): Promise<{ threadId: string }> {
    this.resumeOptions = options;
    if (this.resumeFails) throw new Error('thread_missing');
    return { threadId: options.threadId };
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
  await withService(
    async ({ service }) => {
      const created = await service.createSession('demo');

      assert.equal(created.receipt.status, 'ready');
      assert.equal(await service.workspaceDiff(created.receipt.sessionId), '');
    },
    ['.']
  );
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
    const exported = await service.exportReceipt(created.receipt.sessionId);
    assert.equal(exported.schema, 'create-something/client-workspace-receipt@1');
    assert.equal(JSON.stringify(exported).includes('thread-service'), false);
    assert.equal(JSON.stringify(exported).includes('turn-service'), false);
    assert.equal(JSON.stringify(exported).includes(stateRoot), false);
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

test('service surfaces and blocks changes outside declared editable roots', async () => {
  await withService(async ({ service, stateRoot }) => {
    const protectedFile = join(stateRoot, '..', 'managed', 'demo', 'package.json');
    await writeFile(protectedFile, '{"scripts":{"check":"safe"}}\n', 'utf8');
    const created = await service.createSession('demo');
    await writeFile(protectedFile, '{"scripts":{"check":"unsafe"}}\n', 'utf8');

    const diff = await service.workspaceDiff(created.receipt.sessionId);
    assert.match(diff, /WORKSPACE POLICY VIOLATION/);
    assert.match(diff, /CHANGED package\.json/);
    assert.equal(diff.includes(stateRoot), false);

    await assert.rejects(
      service.startTurn(created.receipt.sessionId, { text: 'Continue editing.' }),
      (error: unknown) =>
        error instanceof ClientWorkspaceServiceError && error.code === 'workspace_integrity_failed'
    );
  });
});

test('service resumes a persisted idle Codex thread and baseline after the runtime restarts', async () => {
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
      assert.equal(restored.active, true);
      assert.equal(restored.workspaceId, 'demo');
      assert.equal(restored.receipt.sessionId, created.receipt.sessionId);
      assert.equal(restored.receipt.status, 'ready');
      assert.equal(connection.resumeOptions?.threadId, 'thread-service');
      assert.deepEqual(connection.resumeOptions?.writableRoots, [
        join(stateRoot, '..', 'managed', 'demo', 'src')
      ]);
      assert.equal(JSON.stringify(restored).includes('thread-service'), false);
      assert.match(
        await restarted.workspaceDiff(created.receipt.sessionId),
        /\+<h1>After restart<\/h1>/
      );
    } finally {
      await restarted.close();
    }
  });
});

test('service leaves an interrupted turn inactive after restart', async () => {
  await withService(async ({ service, connection, registry, stateRoot }) => {
    const created = await service.createSession('demo');
    await service.startTurn(created.receipt.sessionId, { text: 'Begin the edit.' });
    const restartedConnection = new FakeConnection();
    const restarted = new ClientWorkspaceService({
      registry,
      stateRoot,
      connectCodex: async () => restartedConnection
    });
    try {
      const restored = await restarted.sessionState(created.receipt.sessionId);
      assert.equal(restored.active, false);
      assert.equal(restored.receipt.status, 'running');
      assert.equal(restartedConnection.resumeOptions, undefined);
      assert.equal(connection.turnOptions?.threadId, 'thread-service');
    } finally {
      await restarted.close();
    }
  });
});

test('service fails closed without erasing an idle receipt when Codex resume fails', async () => {
  await withService(async ({ service, registry, stateRoot }) => {
    const created = await service.createSession('demo');
    const restartedConnection = new FakeConnection();
    restartedConnection.resumeFails = true;
    const restarted = new ClientWorkspaceService({
      registry,
      stateRoot,
      connectCodex: async () => restartedConnection
    });
    try {
      await assert.rejects(
        restarted.sessionState(created.receipt.sessionId),
        (error: unknown) =>
          error instanceof ClientWorkspaceServiceError && error.code === 'session_resume_failed'
      );
      const receipt = JSON.parse(
        await readFile(join(stateRoot, 'receipts', `${created.receipt.sessionId}.json`), 'utf8')
      ) as { status: string; threadId?: string };
      assert.equal(receipt.status, 'ready');
      assert.equal(receipt.threadId, 'thread-service');
      assert.equal(restartedConnection.closed, true);
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


test('reset preserves unrelated workspace sessions and shared delivery state', async () => {
  await withService(async ({ service, registry, seedRoot, stateRoot }) => {
    const otherRoot = join(stateRoot, '..', 'managed', 'other');
    await mkdir(join(otherRoot, 'src'), { recursive: true });
    registry.register({ id: 'other', label: 'Other', sourceRoot: otherRoot,
      editableRoots: ['src'], preview: { command: 'pnpm', args: ['dev'], port: 4311 } });
    const other = await service.createSession('other');
    const demo = await service.createSession('demo');
    await service.closeSession(demo.receipt.sessionId);
    const attachment = await service.storeAttachment(other.receipt.sessionId,
      new File(['image'], 'proof.png', { type: 'image/png' }));
    await writeFile(join(stateRoot, 'delivery-record.json'), 'preserve');

    await service.resetWorkspace('demo', seedRoot);

    assert.equal((await service.exportReceipt(other.receipt.sessionId)).receipt.status, 'ready');
    assert.equal(JSON.parse(await readFile(join(stateRoot, 'receipts', `${other.receipt.sessionId}.json`), 'utf8')).workspaceId, 'other');
    assert.equal(await readFile(attachment.path, 'utf8'), 'image');
    assert.equal(await service.workspaceDiff(other.receipt.sessionId), '');
    assert.equal(await readFile(join(stateRoot, 'delivery-record.json'), 'utf8'), 'preserve');
    await assert.rejects(service.sessionState(demo.receipt.sessionId));
  });
});


test('reset rejects absent and mutable seed aliases before closing or deleting anything', async () => {
  await withService(async ({ service, connection, registry, seedRoot }) => {
    const sourceRoot = registry.resolve('demo').sourceRoot;
    const sourceFile = join(sourceRoot, 'src', 'page.svelte');
    await writeFile(sourceFile, '<h1>Keep my work</h1>');
    const created = await service.createSession('demo');
    const aliasRoot = join(seedRoot, 'alias');
    await mkdir(aliasRoot);
    await symlink(sourceRoot, join(aliasRoot, 'demo'));
    for (const invalidSeed of [join(seedRoot, 'missing'), join(sourceRoot, '..'), aliasRoot]) {
      await assert.rejects(service.resetWorkspace('demo', invalidSeed),
        (error: unknown) => error instanceof ClientWorkspaceServiceError && error.code === 'reset_unavailable');
      assert.equal(await readFile(sourceFile, 'utf8'), '<h1>Keep my work</h1>');
      assert.equal(connection.closed, false);
      assert.equal((await service.sessionState(created.receipt.sessionId)).active, true);
    }
  });
});


test('demo reset uses a bundled immutable baseline when no external seed is configured', async () => {
  await withService(async ({ service, registry }) => {
    const sourceRoot = registry.resolve('demo').sourceRoot;
    registry.register({ id: 'demo-frontend', label: 'Demo frontend', sourceRoot,
      editableRoots: ['src'], preview: { command: 'pnpm', args: ['dev'], port: 4310 } });
    await mkdir(join(sourceRoot, 'src', 'routes'), { recursive: true });
    await mkdir(join(sourceRoot, 'node_modules'), { recursive: true });
    await writeFile(join(sourceRoot, 'node_modules', 'installed-marker'), 'keep dependencies');
    const page = join(sourceRoot, 'src', 'routes', '+page.svelte');
    await writeFile(page, 'mutable edits are not a reset seed');
    await service.createSession('demo-frontend');
    await service.resetWorkspace('demo-frontend');
    const baseline = await readFile(page, 'utf8');
    assert.match(baseline, /Build what clients can see/);
    assert.doesNotMatch(baseline, /mutable edits/);
    assert.equal(await readFile(join(sourceRoot, 'node_modules', 'installed-marker'), 'utf8'), 'keep dependencies');
    await writeFile(page, 'another edit');
    await service.resetWorkspace('demo-frontend');
    assert.equal(await readFile(page, 'utf8'), baseline);
    await assert.rejects(service.resetWorkspace('demo'),
      (error: unknown) => error instanceof ClientWorkspaceServiceError && error.code === 'reset_unavailable');
  });
});


test('reset cleanup failure cannot resume old authority against replaced source and retains recovery files', async (t) => {
  await withService(async ({ service, registry, seedRoot, stateRoot }) => {
    const sourceRoot = registry.resolve('demo').sourceRoot;
    await writeFile(join(sourceRoot, 'src', 'page.svelte'), '<h1>Original</h1>');
    const created = await service.createSession('demo');
    const receiptPath = join(stateRoot, 'receipts', `${created.receipt.sessionId}.json`);
    const restartedConnection = new FakeConnection();
    const restarted = new ClientWorkspaceService({ registry, stateRoot,
      connectCodex: async () => restartedConnection });
    const originalRm = fsPromises.rm;
    let injected = false;
    const failure = t.mock.method(fsPromises, 'rm', async (...[path, options]: Parameters<typeof fsPromises.rm>) => {
      if (String(path) === receiptPath) {
        injected = true;
        throw Object.assign(new Error('injected receipt cleanup denial'), { code: 'EACCES' });
      }
      return originalRm(path, options);
    });
    syncBuiltinESMExports();
    try {
      await assert.rejects(restarted.resetWorkspace('demo', seedRoot), { code: 'EACCES' });
      assert.equal(injected, true);
      assert.equal(await readFile(join(sourceRoot, 'src', 'page.svelte'), 'utf8'), '<h1>Seed</h1>\n');
      const state = await restarted.sessionState(created.receipt.sessionId);
      assert.equal(state.active, false);
      assert.equal(state.receipt.status, 'closed');
      assert.equal(restartedConnection.resumeOptions, undefined);
      const persisted = JSON.parse(await readFile(receiptPath, 'utf8'));
      assert.equal(persisted.threadId, undefined);
      const backups = (await readdir(join(sourceRoot, '..'))).filter((name) => name.startsWith('.reset-'));
      assert.equal(backups.length, 1);
      const recoveryRoot = join(sourceRoot, '..', backups[0]!);
      assert.equal(await readFile(join(recoveryRoot, 'original', 'src', 'page.svelte'), 'utf8'), '<h1>Original</h1>');
      const recovery = JSON.parse(await readFile(join(recoveryRoot, 'reset.json'), 'utf8'));
      assert.equal(recovery.workspaceId, 'demo');
      assert.equal(recovery.phase, 'source_replaced');
    } finally {
      failure.mock.restore();
      syncBuiltinESMExports();
      await restarted.close();
    }
  });
});


test('reset rejects seed descendant links into mutable workspaces or outside the seed before mutation', async () => {
  await withService(async ({ service, connection, registry, seedRoot, stateRoot }) => {
    const sourceRoot = registry.resolve('demo').sourceRoot;
    const sourceFile = join(sourceRoot, 'src', 'page.svelte');
    await writeFile(sourceFile, '<h1>Keep</h1>');
    const otherRoot = join(sourceRoot, '..', 'other');
    await mkdir(join(otherRoot, 'src'), { recursive: true });
    const otherFile = join(otherRoot, 'src', 'private.txt');
    await writeFile(otherFile, 'other workspace');
    registry.register({ id: 'other', label: 'Other', sourceRoot: otherRoot,
      editableRoots: ['src'], preview: { command: 'pnpm', args: ['dev'], port: 4311 } });
    const session = await service.createSession('demo');
    const receiptBefore = await readFile(join(stateRoot, 'receipts', `${session.receipt.sessionId}.json`), 'utf8');
    const alias = join(seedRoot, 'demo', 'src', 'alias.txt');
    for (const target of [otherFile, otherRoot, '../../../managed/other/src/private.txt', stateRoot]) {
      await symlink(target, alias);
      await assert.rejects(service.resetWorkspace('demo', seedRoot),
        (error: unknown) => error instanceof ClientWorkspaceServiceError && error.code === 'reset_unavailable');
      assert.equal(await readFile(sourceFile, 'utf8'), '<h1>Keep</h1>');
      assert.equal(await readFile(otherFile, 'utf8'), 'other workspace');
      assert.equal(await readFile(join(stateRoot, 'receipts', `${session.receipt.sessionId}.json`), 'utf8'), receiptBefore);
      assert.equal(connection.closed, false);
      await rm(alias);
    }
  });
});


test('reset retains contained relative seed links within the replacement workspace', async () => {
  await withService(async ({ service, registry, seedRoot }) => {
    await symlink('page.svelte', join(seedRoot, 'demo', 'src', 'alias.svelte'));
    await symlink('../demo/src/page.svelte', join(seedRoot, 'demo', 'outer-alias.svelte'));
    await service.resetWorkspace('demo', seedRoot);
    const sourceRoot = registry.resolve('demo').sourceRoot;
    assert.equal(await realpath(join(sourceRoot, 'src', 'alias.svelte')),
      await realpath(join(sourceRoot, 'src', 'page.svelte')));
    assert.equal(await readFile(join(sourceRoot, 'src', 'alias.svelte'), 'utf8'), '<h1>Seed</h1>\n');
    assert.equal(await realpath(join(sourceRoot, 'outer-alias.svelte')),
      await realpath(join(sourceRoot, 'src', 'page.svelte')));
    assert.equal(await readFile(join(sourceRoot, 'outer-alias.svelte'), 'utf8'), '<h1>Seed</h1>\n');
  });
});


test('reset leaves original source and persisted authority intact if revocation cannot be saved', async (t) => {
  await withService(async ({ service, registry, seedRoot, stateRoot }) => {
    const sourceRoot = registry.resolve('demo').sourceRoot;
    await writeFile(join(sourceRoot, 'src', 'page.svelte'), '<h1>Original</h1>');
    const created = await service.createSession('demo');
    const receiptPath = join(stateRoot, 'receipts', `${created.receipt.sessionId}.json`);
    const receiptBefore = await readFile(receiptPath, 'utf8');
    const restarted = new ClientWorkspaceService({ registry, stateRoot,
      connectCodex: async () => new FakeConnection() });
    const originalRename = fsPromises.rename;
    let injected = false;
    const failure = t.mock.method(fsPromises, 'rename', async (...[from, to]: Parameters<typeof fsPromises.rename>) => {
      if (String(to) === receiptPath) {
        injected = true;
        throw Object.assign(new Error('injected revocation write denial'), { code: 'EACCES' });
      }
      return originalRename(from, to);
    });
    syncBuiltinESMExports();
    try {
      await assert.rejects(restarted.resetWorkspace('demo', seedRoot), { code: 'EACCES' });
      assert.equal(injected, true);
      assert.equal(await readFile(join(sourceRoot, 'src', 'page.svelte'), 'utf8'), '<h1>Original</h1>');
      assert.equal(await readFile(receiptPath, 'utf8'), receiptBefore);
    } finally {
      failure.mock.restore();
      syncBuiltinESMExports();
    }
    try {
      assert.equal((await restarted.sessionState(created.receipt.sessionId)).active, true);
    } finally {
      await restarted.close();
    }
  });
});

test('reset restores original source with authority revoked if the replacement rename fails', async (t) => {
  await withService(async ({ service, registry, seedRoot, stateRoot }) => {
    const sourceRoot = registry.resolve('demo').sourceRoot;
    await writeFile(join(sourceRoot, 'src', 'page.svelte'), '<h1>Original</h1>');
    const created = await service.createSession('demo');
    const originalRename = fsPromises.rename;
    let injected = false;
    const failure = t.mock.method(fsPromises, 'rename', async (...[from, to]: Parameters<typeof fsPromises.rename>) => {
      if (String(from).endsWith('/replacement') && String(to) === sourceRoot) {
        injected = true;
        throw Object.assign(new Error('injected source swap denial'), { code: 'EACCES' });
      }
      return originalRename(from, to);
    });
    syncBuiltinESMExports();
    try {
      await assert.rejects(service.resetWorkspace('demo', seedRoot), { code: 'EACCES' });
      assert.equal(injected, true);
      assert.equal(await readFile(join(sourceRoot, 'src', 'page.svelte'), 'utf8'), '<h1>Original</h1>');
      assert.equal((await service.sessionState(created.receipt.sessionId)).active, false);
      const receipt = JSON.parse(await readFile(join(stateRoot, 'receipts', `${created.receipt.sessionId}.json`), 'utf8'));
      assert.equal(receipt.threadId, undefined);
    } finally {
      failure.mock.restore();
      syncBuiltinESMExports();
    }
  });
});


function latch() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
}

test('reset excludes concurrent same-workspace creation and resumption through the source swap', async (t) => {
  await withService(async ({ service, registry, seedRoot }) => {
    const sourceRoot = registry.resolve('demo').sourceRoot;
    await writeFile(join(sourceRoot, 'src', 'page.svelte'), 'before concurrent reset');
    const old = await service.createSession('demo');
    const otherRoot = join(sourceRoot, '..', 'other');
    await mkdir(join(otherRoot, 'src'), { recursive: true });
    registry.register({ id: 'other', label: 'Other', sourceRoot: otherRoot,
      editableRoots: ['src'], preview: { command: 'pnpm', args: ['dev'], port: 4311 } });
    const atSwap = latch();
    const releaseSwap = latch();
    const originalRename = fsPromises.rename;
    const pause = t.mock.method(fsPromises, 'rename', async (...[from, to]: Parameters<typeof fsPromises.rename>) => {
      if (String(from) === sourceRoot) {
        atSwap.release();
        await releaseSwap.promise;
      }
      return originalRename(from, to);
    });
    syncBuiltinESMExports();
    const resetting = service.resetWorkspace('demo', seedRoot);
    try {
      await atSwap.promise;
      for (const operation of [
        () => service.createSession('demo'),
        () => service.sessionState(old.receipt.sessionId),
        () => service.resetWorkspace('demo', seedRoot)
      ]) {
        await assert.rejects(operation(),
          (error: unknown) => error instanceof ClientWorkspaceServiceError && error.code === 'workspace_resetting');
      }
      const other = await service.createSession('other');
      assert.equal(other.receipt.status, 'ready');
    } finally {
      releaseSwap.release();
      await resetting;
      pause.mock.restore();
      syncBuiltinESMExports();
    }
    await assert.rejects(service.sessionState(old.receipt.sessionId));
    const after = await service.createSession('demo');
    assert.equal(await service.workspaceDiff(after.receipt.sessionId), '');
    await writeFile(join(sourceRoot, 'src', 'page.svelte'), '<h1>After reset</h1>');
    const diff = await service.workspaceDiff(after.receipt.sessionId);
    assert.match(diff, /Seed/);
    assert.doesNotMatch(diff, /before concurrent reset/);
    assert.equal((await service.startTurn(after.receipt.sessionId, { text: 'Edit headline.' })).turnId, 'turn-service');
  });
});


test('reset waits for admitted creation and resumption before revoking their authority', async (t) => {
  for (const mode of ['create', 'resume'] as const) {
    await withService(async ({ service, registry, seedRoot, stateRoot }) => {
      const previous = mode === 'resume' ? await service.createSession('demo') : undefined;
      const connection = new FakeConnection();
      const atOpen = latch();
      const releaseOpen = latch();
      if (mode === 'create') {
        t.mock.method(connection, 'startThread', async () => {
          atOpen.release();
          await releaseOpen.promise;
          return { threadId: 'thread-delayed' };
        });
      } else {
        t.mock.method(connection, 'resumeThread', async (options: ResumeThreadOptions) => {
          atOpen.release();
          await releaseOpen.promise;
          return { threadId: options.threadId };
        });
      }
      const runtime = new ClientWorkspaceService({ registry, stateRoot, connectCodex: async () => connection });
      const opening = mode === 'create' ? runtime.createSession('demo') : runtime.sessionState(previous!.receipt.sessionId);
      await atOpen.promise;
      const resetting = runtime.resetWorkspace('demo', seedRoot);
      try {
        await assert.rejects(runtime.createSession('demo'),
          (error: unknown) => error instanceof ClientWorkspaceServiceError && error.code === 'workspace_resetting');
      } finally {
        releaseOpen.release();
      }
      try {
        const opened = await opening;
        await resetting;
        assert.equal(connection.closed, true);
        await assert.rejects(runtime.sessionState(opened.receipt.sessionId),
          (error: unknown) => error instanceof ClientWorkspaceServiceError && error.code === 'session_not_found');
      } finally {
        await runtime.close();
      }
    });
  }
});
