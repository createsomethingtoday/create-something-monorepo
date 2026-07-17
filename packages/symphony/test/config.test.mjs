import assert from 'node:assert/strict';
import test from 'node:test';

import { resolve_service_config, validate_dispatch_config } from '../src/config.js';

test('resolve_service_config defaults Codex policy to allowed workspace-write settings', () => {
  const config = resolve_service_config({
    path: '/tmp/workflow.md',
    config: {
      tracker: {
        kind: 'linear',
        endpoint: 'https://api.linear.app/graphql',
        api_key: 'test-token',
        project_slug: 'test-project',
      },
    },
    prompt_template: 'test prompt',
  });

  assert.equal(config.codex.approval_policy, 'on-request');
  assert.equal(config.codex.thread_sandbox, 'workspace-write');
  assert.deepEqual(config.codex.turn_sandbox_policy, { type: 'workspaceWrite' });
  assert.equal(config.completion.mode, 'evidence_only');
  assert.equal(config.completion.handoff_state, 'In Review');
});

test('validate_dispatch_config rejects active completion handoff states', () => {
  const config = resolve_service_config({
    path: '/tmp/workflow.md',
    config: {
      tracker: {
        kind: 'linear',
        endpoint: 'https://api.linear.app/graphql',
        api_key: 'test-token',
        project_slug: 'test-project',
      },
      completion: {
        handoff_state: 'In Progress',
      },
    },
    prompt_template: 'test prompt',
  });

  assert.throws(
    () => validate_dispatch_config(config),
    (error) => error?.code === 'unsafe_completion_handoff_state',
  );
});

test('validate_dispatch_config rejects unknown completion modes', () => {
  const config = resolve_service_config({
    path: '/tmp/workflow.md',
    config: {
      tracker: {
        kind: 'linear',
        endpoint: 'https://api.linear.app/graphql',
        api_key: 'test-token',
        project_slug: 'test-project',
      },
      completion: {
        mode: 'worker_exit_magic',
      },
    },
    prompt_template: 'test prompt',
  });

  assert.throws(
    () => validate_dispatch_config(config),
    (error) => error?.code === 'unsupported_completion_mode',
  );
});
