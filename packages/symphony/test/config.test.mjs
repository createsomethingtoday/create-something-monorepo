import assert from 'node:assert/strict';
import test from 'node:test';

import { resolve_service_config } from '../src/config.js';

test('resolve_service_config defaults turn sandbox policy for omitted workflows', () => {
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

  assert.deepEqual(config.codex.turn_sandbox_policy, { type: 'dangerFullAccess' });
});
