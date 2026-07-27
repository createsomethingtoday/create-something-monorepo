import assert from 'node:assert/strict';
import { mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  WorkspaceRegistry,
  WorkspaceRegistryError
} from '../src/lib/server/workspaces/registry.js';
import { createDefaultWorkspaceRegistry } from '../src/lib/server/workspaces/default-registry.js';

async function withManagedRoot(run: (root: string) => Promise<void>) {
  const root = join(tmpdir(), `client-workspace-registry-${crypto.randomUUID()}`);
  const demoRoot = join(root, 'demo');
  await mkdir(demoRoot, { recursive: true });
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('registry exposes only client-safe metadata for an allowlisted workspace', async () => {
  await withManagedRoot(async (managedRoot) => {
    const sourceRoot = join(managedRoot, 'demo');
    const registry = new WorkspaceRegistry({
      managedRoot,
      definitions: [
        {
          id: 'demo',
          label: 'Demo storefront',
          sourceRoot,
          editableRoots: ['src'],
          preview: { command: 'pnpm', args: ['dev'], port: 4310 }
        }
      ]
    });

    assert.deepEqual(registry.list(), [
      { id: 'demo', label: 'Demo storefront', previewPath: '/api/workspaces/demo/preview' }
    ]);
    assert.equal(JSON.stringify(registry.list()).includes(sourceRoot), false);
    assert.equal(JSON.stringify(registry.list()).includes('pnpm'), false);
  });
});

test('registry rejects unknown workspaces through the public lookup', async () => {
  await withManagedRoot(async (managedRoot) => {
    const registry = new WorkspaceRegistry({ managedRoot, definitions: [] });

    assert.throws(
      () => registry.get('missing'),
      (error: unknown) =>
        error instanceof WorkspaceRegistryError && error.code === 'workspace_not_found'
    );
  });
});

test('registry confines requested files to declared editable roots', async () => {
  await withManagedRoot(async (managedRoot) => {
    const registry = new WorkspaceRegistry({
      managedRoot,
      definitions: [
        {
          id: 'demo',
          label: 'Demo storefront',
          sourceRoot: join(managedRoot, 'demo'),
          editableRoots: ['src'],
          preview: { command: 'pnpm', args: ['dev'], port: 4310 }
        }
      ]
    });

    assert.equal(
      registry.resolveEditablePath('demo', 'src/routes/+page.svelte'),
      join(managedRoot, 'demo', 'src/routes/+page.svelte')
    );
    for (const candidate of ['../outside.txt', 'static/secret.txt', '/etc/passwd']) {
      assert.throws(
        () => registry.resolveEditablePath('demo', candidate),
        (error: unknown) =>
          error instanceof WorkspaceRegistryError && error.code === 'workspace_path_escape'
      );
    }
  });
});

test('registry rejects a symlink escape nested under an editable root', async () => {
  await withManagedRoot(async (managedRoot) => {
    const sourceRoot = join(managedRoot, 'demo');
    const outsideRoot = join(managedRoot, '..', `outside-${crypto.randomUUID()}`);
    await mkdir(join(sourceRoot, 'src'), { recursive: true });
    await mkdir(outsideRoot, { recursive: true });
    await symlink(outsideRoot, join(sourceRoot, 'src', 'escape'));
    const registry = new WorkspaceRegistry({
      managedRoot,
      definitions: [
        {
          id: 'demo',
          label: 'Demo storefront',
          sourceRoot,
          editableRoots: ['src'],
          preview: { command: 'pnpm', args: ['dev'], port: 4310 }
        }
      ]
    });

    try {
      assert.throws(
        () => registry.resolveEditablePath('demo', 'src/escape/private.txt'),
        (error: unknown) =>
          error instanceof WorkspaceRegistryError && error.code === 'workspace_path_escape'
      );
    } finally {
      await rm(outsideRoot, { recursive: true, force: true });
    }
  });
});

test('registry rejects definitions outside the managed workspace root', async () => {
  await withManagedRoot(async (managedRoot) => {
    assert.throws(
      () =>
        new WorkspaceRegistry({
          managedRoot,
          definitions: [
            {
              id: 'outside',
              label: 'Outside',
              sourceRoot: join(managedRoot, '..', 'outside'),
              editableRoots: ['src'],
              preview: { command: 'pnpm', args: ['dev'], port: 4310 }
            }
          ]
        }),
      (error: unknown) =>
        error instanceof WorkspaceRegistryError && error.code === 'workspace_root_escape'
    );
  });
});

test('default registry relocates the immutable demo into the declared container root', () => {
  const registry = createDefaultWorkspaceRegistry({ managedRoot: '/workspace/projects' });

  assert.deepEqual(registry.list(), [
    {
      id: 'demo-frontend',
      label: 'Demo frontend',
      previewPath: '/api/workspaces/demo-frontend/preview'
    }
  ]);
  assert.equal(registry.resolve('demo-frontend').sourceRoot, '/workspace/projects/demo-frontend');
});
