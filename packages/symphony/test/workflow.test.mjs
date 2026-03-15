import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

import { load_workflow_definition } from '../src/workflow.js';

test('load_workflow_definition parses Symphony workflow front matter without yaml dependency', async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'symphony-workflow-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const workflowPath = join(tempRoot, 'WORKFLOW.md');
  await writeFile(
    workflowPath,
    `---
tracker:
  kind: loom
  endpoint: https://loom.example/mcp
  api_key: $LOOM_MCP_API_TOKEN
  active_states:
    - ready
    - claimed
hooks:
  after_create: "printf 'created\\\\n'"
agent:
  max_concurrent_agents: 2
codex:
  turn_sandbox_policy:
    type: dangerFullAccess
server:
  port: 4780
---
Hello {{ issue.identifier }}
`,
    'utf8',
  );

  const definition = await load_workflow_definition(workflowPath, tempRoot);
  assert.equal(definition.config.tracker.kind, 'loom');
  assert.equal(definition.config.tracker.endpoint, 'https://loom.example/mcp');
  assert.deepEqual(definition.config.tracker.active_states, ['ready', 'claimed']);
  assert.equal(definition.config.hooks.after_create, "printf 'created\\n'");
  assert.equal(definition.config.agent.max_concurrent_agents, 2);
  assert.equal(definition.config.server.port, 4780);
  assert.match(definition.prompt_template, /Hello/);
});
