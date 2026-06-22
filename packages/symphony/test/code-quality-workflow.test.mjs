import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import test from 'node:test';

import { WorkflowManager } from '../src/workflow.js';

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));

const logger = {
  info() {},
  warn() {},
  error() {}
};

test('code-quality workflow only dispatches explicitly active Linear issues', async () => {
  const workflow = new WorkflowManager({
    workflow_path: resolve(REPO_ROOT, 'automation/symphony/code-quality/WORKFLOW.md'),
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      LINEAR_API_KEY: 'test-token'
    },
    logger
  });

  const { config } = await workflow.initialize();

  assert.deepEqual(config.tracker.active_states, ['In Progress']);
  assert.equal(config.tracker.label, 'code-quality');
});
