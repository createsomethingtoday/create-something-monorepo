import assert from 'node:assert/strict';
import test from 'node:test';

import { LinearTrackerClient } from '../src/tracker/linear.js';

function createConfig(overrides = {}) {
  return {
    tracker: {
      endpoint: 'https://linear.example/graphql',
      api_key: 'test-token',
      project_slug: 'test-project',
      label: 'code-quality',
      labels: [],
      active_states: ['Todo', 'In Progress'],
      terminal_states: ['Done'],
      network_timeout_ms: 30_000,
      page_size: 50,
      ...overrides
    }
  };
}

function createIssue(identifier, labels) {
  return {
    id: `id-${identifier}`,
    identifier,
    title: `Issue ${identifier}`,
    description: null,
    priority: 3,
    branchName: null,
    url: `https://linear.example/${identifier}`,
    createdAt: '2026-06-22T00:00:00.000Z',
    updatedAt: '2026-06-22T00:00:00.000Z',
    state: { id: 'state-todo', name: 'Todo', type: 'unstarted' },
    labels: { nodes: labels.map((name) => ({ name })) },
    inverseRelations: { nodes: [] }
  };
}

function createFetch(nodes) {
  return async () =>
    new Response(
      JSON.stringify({
        data: {
          issues: {
            nodes,
            pageInfo: {
              hasNextPage: false,
              endCursor: null
            }
          }
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
}

const logger = {
  info() {},
  warn() {},
  error() {}
};

test('fetch_candidate_issues filters by tracker label before dispatch', async () => {
  const client = new LinearTrackerClient(
    createConfig({ label: 'code-quality' }),
    logger,
    createFetch([
      createIssue('CRE-167', ['code-quality']),
      createIssue('CRE-42', ['linear-coordination'])
    ])
  );

  const candidates = await client.fetch_candidate_issues();

  assert.deepEqual(
    candidates.map((issue) => issue.identifier),
    ['CRE-167']
  );
});

test('fetch_candidate_issues requires all configured tracker labels', async () => {
  const client = new LinearTrackerClient(
    createConfig({ label: null, labels: ['code-quality', 'urgent'] }),
    logger,
    createFetch([
      createIssue('CRE-1', ['code-quality', 'urgent']),
      createIssue('CRE-2', ['code-quality']),
      createIssue('CRE-3', ['urgent'])
    ])
  );

  const candidates = await client.fetch_candidate_issues();

  assert.deepEqual(
    candidates.map((issue) => issue.identifier),
    ['CRE-1']
  );
});
