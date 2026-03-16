import assert from 'node:assert/strict';
import test from 'node:test';

import { resolve_service_config } from '../src/config.js';

test('resolve_service_config defaults turn sandbox policy for omitted workflows', () => {
  const config = resolve_service_config({
    path: '/tmp/workflow.md',
    config: {
      tracker: {
        kind: 'loom',
        endpoint: 'https://loom.example/mcp',
        api_key: 'test-token',
      },
    },
    prompt_template: 'test prompt',
  });

  assert.deepEqual(config.codex.turn_sandbox_policy, { type: 'dangerFullAccess' });
  assert.equal(config.workspace.mode, 'isolated');
  assert.equal(config.workspace.dependency_mode, 'install-if-missing');
});

test('resolve_service_config defaults execution runner to codex-cli', () => {
  const config = resolve_service_config({
    path: '/tmp/workflow.md',
    config: {
      tracker: {
        kind: 'loom',
        endpoint: 'https://loom.example/mcp',
        api_key: 'test-token',
      },
    },
    prompt_template: 'test prompt',
  });

  assert.equal(config.execution.runner, 'codex-cli');
  assert.equal(config.execution.command, null);
  assert.equal(config.workspace.mode, 'isolated');
  assert.equal(config.workspace.dependency_mode, 'install-if-missing');
});

test('resolve_service_config preserves explicit execution runner and command', () => {
  const config = resolve_service_config({
    path: '/tmp/workflow.md',
    config: {
      tracker: {
        kind: 'loom',
        endpoint: 'https://loom.example/mcp',
        api_key: 'test-token',
      },
      execution: {
        runner: 'codex-cli',
        command: 'codex exec --sandbox workspace-write',
      },
    },
    prompt_template: 'test prompt',
  });

  assert.equal(config.execution.runner, 'codex-cli');
  assert.equal(config.execution.command, 'codex exec --sandbox workspace-write');
  assert.equal(config.workspace.mode, 'isolated');
  assert.equal(config.workspace.dependency_mode, 'install-if-missing');
});

test('resolve_service_config preserves explicit workspace mode and dependency mode', () => {
  const config = resolve_service_config({
    path: '/tmp/workflow.md',
    config: {
      tracker: {
        kind: 'loom',
        endpoint: 'https://loom.example/mcp',
        api_key: 'test-token',
      },
      workspace: {
        mode: 'lightweight',
        dependency_mode: 'reuse',
      },
    },
    prompt_template: 'test prompt',
  });

  assert.equal(config.workspace.mode, 'lightweight');
  assert.equal(config.workspace.dependency_mode, 'reuse');
});
