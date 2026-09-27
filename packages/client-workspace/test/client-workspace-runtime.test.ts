import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { ClientWorkspaceServiceError } from '../src/lib/server/client-workspace-service.js';
import { ClientWorkspaceRuntime } from '../src/lib/server/runtime.js';

test('reset refuses previews admitted during the source swap and creates a fresh preview afterward', async () => {
  const root = await mkdtemp(join(tmpdir(), 'client-workspace-runtime-'));
  const priorState = process.env.CLIENT_WORKSPACE_STATE_ROOT;
  const priorManaged = process.env.CLIENT_WORKSPACE_MANAGED_ROOT;
  const priorDesktop = process.env.CLIENT_WORKSPACE_DESKTOP;
  process.env.CLIENT_WORKSPACE_STATE_ROOT = join(root, 'state');
  process.env.CLIENT_WORKSPACE_MANAGED_ROOT = join(root, 'managed');
  delete process.env.CLIENT_WORKSPACE_DESKTOP;
  const runtime = new ClientWorkspaceRuntime();
  if (priorState === undefined) delete process.env.CLIENT_WORKSPACE_STATE_ROOT;
  else process.env.CLIENT_WORKSPACE_STATE_ROOT = priorState;
  if (priorManaged === undefined) delete process.env.CLIENT_WORKSPACE_MANAGED_ROOT;
  else process.env.CLIENT_WORKSPACE_MANAGED_ROOT = priorManaged;
  if (priorDesktop === undefined) delete process.env.CLIENT_WORKSPACE_DESKTOP;
  else process.env.CLIENT_WORKSPACE_DESKTOP = priorDesktop;

  let finishReset: (() => void) | undefined;
  const resetHeld = new Promise<void>((resolve) => { finishReset = resolve; });
  const originalReset = runtime.service.resetWorkspace.bind(runtime.service);
  runtime.service.resetWorkspace = async () => { await resetHeld; };
  try {
    const before = runtime.preview('demo-frontend');
    const resetting = runtime.reset('demo-frontend');
    assert.equal(before.status().state, 'stopped');
    assert.throws(() => runtime.preview('demo-frontend'),
      (error: unknown) => error instanceof ClientWorkspaceServiceError && error.code === 'workspace_resetting');
    finishReset?.();
    await resetting;
    const after = runtime.preview('demo-frontend');
    assert.notEqual(after, before);
    assert.equal(after.status().state, 'idle');
  } finally {
    finishReset?.();
    runtime.service.resetWorkspace = originalReset;
    await runtime.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('managed connector registers only imported signed deliveries, without the demo', async () => {
  const root = await mkdtemp(join(tmpdir(), 'client-workspace-connector-'));
  const names = ['CLIENT_WORKSPACE_STATE_ROOT', 'CLIENT_WORKSPACE_MANAGED_ROOT',
    'CLIENT_WORKSPACE_DESKTOP', 'CLIENT_WORKSPACE_MANAGED_CONNECTOR'] as const;
  const previous = names.map((name) => process.env[name]);
  process.env.CLIENT_WORKSPACE_STATE_ROOT = join(root, 'state');
  process.env.CLIENT_WORKSPACE_MANAGED_ROOT = join(root, 'managed');
  delete process.env.CLIENT_WORKSPACE_DESKTOP;
  process.env.CLIENT_WORKSPACE_MANAGED_CONNECTOR = '1';
  try {
    const runtime = new ClientWorkspaceRuntime();
    assert.deepEqual(runtime.registry.list(), []);
    await runtime.close();
  } finally {
    names.forEach((name, index) => {
      if (previous[index] === undefined) delete process.env[name];
      else process.env[name] = previous[index];
    });
    await rm(root, { recursive: true, force: true });
  }
});
