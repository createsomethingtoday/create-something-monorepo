import assert from 'node:assert/strict';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  PreviewSession,
  PreviewSessionError
} from '../src/lib/server/preview/preview-session.js';
import { WorkspaceRegistry } from '../src/lib/server/workspaces/registry.js';

async function availablePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function previewFor(mode: 'ready' | 'crash' | 'hang', readinessTimeoutMs = 1_000) {
  const port = await availablePort();
  const fixture = fileURLToPath(new URL('./fixtures/fake-preview-server.mjs', import.meta.url));
  const root = fileURLToPath(new URL('../clients/demo-frontend', import.meta.url));
  const registry = new WorkspaceRegistry({
    managedRoot: fileURLToPath(new URL('../clients', import.meta.url)),
    definitions: [
      {
        id: 'demo',
        label: 'Demo',
        sourceRoot: root,
        editableRoots: ['src'],
        preview: {
          command: process.execPath,
          args: [fixture, String(port), mode],
          port,
          healthPath: '/api/workspaces/demo/preview'
        }
      }
    ]
  });
  return new PreviewSession({ workspace: registry.resolve('demo'), readinessTimeoutMs });
}

test('preview starts one declared process, becomes ready, proxies only its owned path, and stops', async () => {
  const preview = await previewFor('ready');
  try {
    const first = await preview.start();
    const second = await preview.start();
    assert.equal(first.state, 'ready');
    assert.equal(second.startedAt, first.startedAt);
    assert.equal(first.previewPath, '/api/workspaces/demo/preview');
    assert.equal(JSON.stringify(first).includes('127.0.0.1'), false);

    const response = await preview.proxy(
      new Request('http://workspace.test/api/workspaces/demo/preview?screen=desktop')
    );
    assert.equal(await response.text(), 'preview:/api/workspaces/demo/preview?screen=desktop');

    await assert.rejects(
      preview.proxy(new Request('http://workspace.test/api/workspaces/other/preview/')),
      (error: unknown) =>
        error instanceof PreviewSessionError && error.code === 'preview_path_escape'
    );
    await assert.rejects(
      preview.proxy(
        new Request('http://workspace.test/api/workspaces/demo/preview/', { method: 'POST' })
      ),
      (error: unknown) =>
        error instanceof PreviewSessionError && error.code === 'preview_method_not_allowed'
    );
  } finally {
    preview.close();
  }
  assert.equal(preview.status().state, 'stopped');
});

test('preview reports a declared process that crashes before readiness', async () => {
  const preview = await previewFor('crash');
  await assert.rejects(
    preview.start(),
    (error: unknown) =>
      error instanceof PreviewSessionError && error.code === 'preview_crashed'
  );
  assert.equal(preview.status().state, 'crashed');
  preview.close();
});

test('preview times out and cleans up a process that never becomes ready', async () => {
  const preview = await previewFor('hang', 80);
  await assert.rejects(
    preview.start(),
    (error: unknown) =>
      error instanceof PreviewSessionError && error.code === 'preview_timeout'
  );
  assert.equal(preview.status().state, 'blocked');
  preview.close();
});
