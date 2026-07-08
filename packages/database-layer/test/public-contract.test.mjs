import assert from 'node:assert/strict';
import test from 'node:test';

import { databaseLayerDemoState, getDatabaseLayerRecord } from '../dist/index.js';

test('Substrate is the first-class database-layer runtime profile', () => {
  assert.equal(databaseLayerDemoState.runtime.name, 'Substrate');
  assert.equal(databaseLayerDemoState.runtime.posture, 'first-class');
  assert.match(databaseLayerDemoState.runtime.apiBoundary, /HTTP\/JSON/);
  assert.match(databaseLayerDemoState.runtime.mcpBoundary, /same record model/);
  assert.match(databaseLayerDemoState.runtime.uiBoundary, /not a second source of truth/);
});

test('database-layer demo state covers UI, API, MCP, and agent surfaces', () => {
  const surfaces = new Set(databaseLayerDemoState.capabilities.map((capability) => capability.surface));

  assert.deepEqual([...surfaces].sort(), ['API', 'Agent', 'MCP', 'UI']);
});

test('performance budgets define an Obsidian-like operator baseline without overclaiming', () => {
  assert.ok(databaseLayerDemoState.performanceBudgets.length >= 4);
  assert.ok(
    databaseLayerDemoState.performanceBudgets.some((budget) =>
      /Obsidian-like/.test(`${budget.baseline} ${budget.detail}`)
    )
  );
  assert.ok(
    databaseLayerDemoState.performanceBudgets.every((budget) =>
      ['local', 'cloud', 'agent'].includes(budget.surface)
    )
  );
});

test('system-design principles keep topology, execution, judgment, and UI explicit', () => {
  const principles = databaseLayerDemoState.systemDesignPrinciples.map((principle) => principle.label);

  assert.ok(principles.includes('Topology is data'));
  assert.ok(principles.includes('Execution is inspectable'));
  assert.ok(principles.includes('Judgment is attached'));
  assert.ok(principles.includes('UI is a projection'));
});

test('record helper reads records from the exported working set', () => {
  const record = getDatabaseLayerRecord('src_mcp_app_governance');

  assert.equal(record?.title, 'App Governance MCP');
  assert.equal(record?.bindingHealth, 'bound');
});
