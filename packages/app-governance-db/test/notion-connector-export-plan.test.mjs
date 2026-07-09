import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildConnectorBundle,
  buildConnectorSql,
  selectSources,
} from '../scripts/notion-connector-export-plan.mjs';

const config = JSON.parse(
  fs.readFileSync(new URL('../config/notion-connector-relation-sources.json', import.meta.url), 'utf8'),
);

test('Notion connector export manifest covers proven relation-bearing sources', () => {
  assert.deepEqual(
    config.sources.map((source) => source.name),
    [
      'Clients',
      'Engagements',
      'Workstreams',
      'Tasks / Actions',
      'Evidence',
      'Decisions',
      'Risks / Blockers',
      'Deliverables',
      'Delivery Milestones',
      'Agents',
      'MCP Services',
    ],
  );
  assert.deepEqual(
    selectSources(config, 'agents').map((source) => source.name),
    ['Agents'],
  );
});

test('Notion connector export planner builds relation-scoped SQL and empty import bundle', () => {
  const engagements = selectSources(config, 'Engagements')[0];
  assert.equal(
    buildConnectorSql(engagements),
    'SELECT "url", "Name", "Client", "Workstreams", "Tasks / Actions", "Deliverables", "Evidence", "Services used" FROM "collection://d3873b66-762c-4f3a-bd9e-97267f58faf5" LIMIT 1000;',
  );

  const tasks = selectSources(config, 'Tasks / Actions')[0];
  assert.equal(
    buildConnectorSql(tasks),
    'SELECT "url", "Action", "Client", "Deliverable", "Engagement", "Evidence", "Risk", "Workstream" FROM "collection://0fda6783-5c78-40b9-ba71-46b0f93f1c15" LIMIT 1000;',
  );

  const bundle = buildConnectorBundle(config, 'MCP Services');
  assert.deepEqual(bundle, {
    connector_exports: [
      {
        name: 'MCP Services',
        data_source_id: 'collection://d9c214ec-af88-4f25-ae64-3979a8b57ee3',
        relation_properties: ['Client', 'Agents', 'Engagements', 'Evidence'],
        query:
          'SELECT "url", "Name", "Client", "Agents", "Engagements", "Evidence" FROM "collection://d9c214ec-af88-4f25-ae64-3979a8b57ee3" LIMIT 1000;',
        rows: [],
      },
    ],
  });
});
