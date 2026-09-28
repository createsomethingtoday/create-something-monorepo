import assert from 'node:assert/strict';
import { mkdir, realpath, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { loadLocalCheckout } from '../src/lib/server/workspaces/local-checkout.js';
import { PreviewSession } from '../src/lib/server/preview/preview-session.js';
import { WorkspaceRegistry } from '../src/lib/server/workspaces/registry.js';

test('enrolled checkout requires a canonical repo and explicit editable roots', async () => {
  const root = join(tmpdir(), `local-checkout-${crypto.randomUUID()}`);
  await mkdir(join(root, '.git'), { recursive: true });
  await mkdir(join(root, 'src'), { recursive: true });
  try {
    const config = { id: 'grantbot', label: 'GiGi engineering', root: await realpath(root), editableRoots: ['src'] };
    assert.deepEqual(loadLocalCheckout(JSON.stringify(config)), {
      id: 'grantbot', label: 'GiGi engineering', sourceRoot: config.root,
      editableRoots: ['src'], preview: { kind: 'none' }
    });
    const definition = loadLocalCheckout(JSON.stringify(config));
    assert.ok(definition);
    const registry = new WorkspaceRegistry({
      managedRoot: join(root, 'managed'), definitions: [definition], allowedLocalRoots: [config.root]
    });
    const preview = new PreviewSession({ workspace: registry.resolve('grantbot') });
    assert.equal((await preview.start()).state, 'not-applicable');
    await assert.rejects(preview.proxy(new Request('http://localhost/api/workspaces/grantbot/preview')));
    assert.throws(() => loadLocalCheckout(JSON.stringify({ ...config, editableRoots: ['../secret'] })));
    assert.throws(() => loadLocalCheckout(JSON.stringify({ ...config, command: 'sh' })));
    const link = `${root}-link`;
    await symlink(root, link);
    try { assert.throws(() => loadLocalCheckout(JSON.stringify({ ...config, root: link }))); }
    finally { await rm(link); }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
