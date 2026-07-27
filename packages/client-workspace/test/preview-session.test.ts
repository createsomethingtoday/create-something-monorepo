import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { PreviewSession, PreviewSessionError } from '../src/lib/server/preview/preview-session.js';
import { WorkspaceRegistry } from '../src/lib/server/workspaces/registry.js';

const demoRoot = fileURLToPath(new URL('../clients/demo-frontend', import.meta.url));

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
  const registry = new WorkspaceRegistry({
    managedRoot: fileURLToPath(new URL('../clients', import.meta.url)),
    definitions: [
      {
        id: 'demo',
        label: 'Demo',
        sourceRoot: demoRoot,
        editableRoots: ['src'],
        preview: {
          command: process.execPath,
          args: [fixture, String(port), mode, demoRoot],
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

    const privateModuleResponse = await preview.proxy(
      new Request('http://workspace.test/api/workspaces/demo/preview/leak.js')
    );
    const privateModule = await privateModuleResponse.text();
    assert.equal(privateModule.includes(demoRoot), false);
    assert.equal(privateModule.includes('/@fs/'), false);
    const privateModulePath = privateModule.match(
      /\/api\/workspaces\/demo\/preview\/__preview_module__\/[a-f0-9-]+/
    )?.[0];
    assert.ok(privateModulePath);
    const resolvedModuleResponse = await preview.proxy(
      new Request(`http://workspace.test${privateModulePath}`)
    );
    assert.equal(await resolvedModuleResponse.text(), 'export const previewModule = true;');

    const viteClientResponse = await preview.proxy(
      new Request('http://workspace.test/api/workspaces/demo/preview/@vite/client')
    );
    const viteClient = await viteClientResponse.text();
    assert.equal(viteClient.includes('transport.connect(createHMRHandler(handleMessage))'), false);
    assert.equal(viteClient.includes('export { createHotContext }'), true);

    await assert.rejects(
      preview.proxy(
        new Request('http://workspace.test/api/workspaces/demo/preview/__preview_module__/unknown')
      ),
      (error: unknown) =>
        error instanceof PreviewSessionError && error.code === 'preview_path_escape'
    );

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
    (error: unknown) => error instanceof PreviewSessionError && error.code === 'preview_crashed'
  );
  assert.equal(preview.status().state, 'crashed');
  preview.close();
});

test('preview times out and cleans up a process that never becomes ready', async () => {
  const preview = await previewFor('hang', 80);
  await assert.rejects(
    preview.start(),
    (error: unknown) => error instanceof PreviewSessionError && error.code === 'preview_timeout'
  );
  assert.equal(preview.status().state, 'blocked');
  preview.close();
});

test('static delivery preview serves only declared workspace files without a child process', async () => {
  const managedRoot = mkdtempSync(join(tmpdir(), 'client-workspace-static-preview-'));
  const sourceRoot = join(managedRoot, 'acme');
  mkdirSync(join(sourceRoot, 'assets'), { recursive: true });
  writeFileSync(
    join(sourceRoot, 'index.html'),
    '<!doctype html><link rel="stylesheet" href="assets/site.css"><h1>Delivered</h1>'
  );
  writeFileSync(join(sourceRoot, 'assets', 'site.css'), 'h1 { color: tomato; }');
  const outsidePreview = join(managedRoot, 'outside-preview.txt');
  writeFileSync(outsidePreview, 'private local content');
  symlinkSync(outsidePreview, join(sourceRoot, 'assets', 'outside-preview.txt'));
  const registry = new WorkspaceRegistry({
    managedRoot,
    definitions: [
      {
        id: 'acme',
        label: 'Acme',
        sourceRoot,
        editableRoots: ['.'],
        preview: { kind: 'static', root: '.', entry: 'index.html' }
      }
    ]
  });
  const preview = new PreviewSession({ workspace: registry.resolve('acme') });
  assert.equal((await preview.start()).state, 'ready');
  const entry = await preview.proxy(
    new Request('http://workspace.test/api/workspaces/acme/preview')
  );
  assert.match(await entry.text(), /Delivered/);
  assert.equal(entry.headers.get('content-type'), 'text/html; charset=utf-8');
  const asset = await preview.proxy(
    new Request('http://workspace.test/api/workspaces/acme/preview/assets/site.css')
  );
  assert.equal(await asset.text(), 'h1 { color: tomato; }');
  await assert.rejects(
    preview.proxy(
      new Request(
        'http://workspace.test/api/workspaces/acme/preview/assets/outside-preview.txt'
      )
    ),
    (error: unknown) =>
      error instanceof PreviewSessionError && error.code === 'preview_path_escape'
  );
  await assert.rejects(
    preview.proxy(new Request('http://workspace.test/api/workspaces/acme/preview/%2e%2e/secret')),
    (error: unknown) => error instanceof PreviewSessionError && error.code === 'preview_path_escape'
  );
  preview.close();
});
