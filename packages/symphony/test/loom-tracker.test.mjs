import assert from 'node:assert/strict';
import test from 'node:test';

import { LoomTrackerClient } from '../src/tracker/loom.js';

function createConfig(overrides = {}) {
  return {
    tracker: {
      kind: 'loom',
      endpoint: 'https://loom.example/mcp',
      api_key: 'test-token',
      project_slug: '',
      repo: null,
      label: null,
      labels: ['code-quality'],
      agent_id: 'symphony-code-quality',
      active_states: ['ready', 'claimed'],
      terminal_states: ['done', 'cancelled'],
      network_timeout_ms: 1_000,
      page_size: 50,
      ...overrides,
    },
  };
}

function createLogger() {
  return {
    debug() {},
    info() {},
    warn() {},
    error() {},
  };
}

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    async text() {
      return JSON.stringify(body);
    },
  };
}

test('LoomTrackerClient filters candidates by label and claimed agent', async () => {
  const fetchCalls = [];
  const fetchImpl = async (_url, options) => {
    const payload = JSON.parse(options.body);
    fetchCalls.push(payload);
    const status = payload.params.arguments.status;

    if (payload.params.name !== 'loom_list') {
      throw new Error(`Unexpected tool: ${payload.params.name}`);
    }

    if (status === 'ready') {
      return jsonResponse({
        result: {
          structuredContent: {
            items: [
              {
                id: 'lm-ready-1',
                title: 'Fix repo lint drift',
                status: 'ready',
                priority: 'high',
                labels: ['code-quality', 'lint'],
                created_at: '2026-03-12T00:00:00.000Z',
                updated_at: '2026-03-12T01:00:00.000Z',
              },
              {
                id: 'lm-ready-2',
                title: 'Ignore unrelated task',
                status: 'ready',
                priority: 'normal',
                labels: ['docs'],
                created_at: '2026-03-12T00:00:00.000Z',
                updated_at: '2026-03-12T01:00:00.000Z',
              },
            ],
          },
        },
      });
    }

    if (status === 'claimed') {
      return jsonResponse({
        result: {
          structuredContent: {
            items: [
              {
                id: 'lm-claimed-1',
                title: 'Resume code-quality task',
                status: 'claimed',
                agent: 'symphony-code-quality',
                priority: 'critical',
                labels: ['code-quality'],
                created_at: '2026-03-12T00:00:00.000Z',
                updated_at: '2026-03-12T01:00:00.000Z',
              },
              {
                id: 'lm-claimed-2',
                title: 'Claimed by someone else',
                status: 'claimed',
                agent: 'other-agent',
                priority: 'critical',
                labels: ['code-quality'],
                created_at: '2026-03-12T00:00:00.000Z',
                updated_at: '2026-03-12T01:00:00.000Z',
              },
            ],
          },
        },
      });
    }

    throw new Error(`Unexpected status: ${status}`);
  };

  const tracker = new LoomTrackerClient(createConfig(), createLogger(), fetchImpl);
  const issues = await tracker.fetch_candidate_issues();

  assert.deepEqual(
    issues.map((issue) => [issue.id, issue.state, issue.priority]),
    [
      ['lm-ready-1', 'ready', 2],
      ['lm-claimed-1', 'claimed', 1],
    ],
  );
  assert.equal(fetchCalls.length, 2);
});

test('LoomTrackerClient claims and completes tasks through MCP tools', async () => {
  const state = {
    id: 'lm-work-1',
    title: 'Fix MCP contract drift',
    description: 'Tighten the failing contract tests.',
    status: 'ready',
    priority: 'high',
    labels: ['code-quality', 'mcp'],
    created_at: '2026-03-12T00:00:00.000Z',
    updated_at: '2026-03-12T01:00:00.000Z',
    agent: null,
  };
  const toolCalls = [];
  const fetchImpl = async (_url, options) => {
    const payload = JSON.parse(options.body);
    toolCalls.push(payload);

    if (payload.params.name === 'loom_claim') {
      state.status = 'claimed';
      state.agent = payload.params.arguments.agent;
      return jsonResponse({ result: { structuredContent: { claimed: state.id } } });
    }

    if (payload.params.name === 'loom_complete') {
      state.status = 'done';
      state.evidence = payload.params.arguments.evidence;
      return jsonResponse({ result: { structuredContent: { completed: state.id } } });
    }

    if (payload.params.name === 'loom_get') {
      return jsonResponse({
        result: {
          structuredContent: {
            ...state,
            dependencies: [],
          },
        },
      });
    }

    throw new Error(`Unexpected tool: ${payload.params.name}`);
  };

  const tracker = new LoomTrackerClient(createConfig(), createLogger(), fetchImpl);
  const claimed = await tracker.claim_issue({
    id: state.id,
    identifier: state.id,
    title: state.title,
    description: state.description,
    priority: 2,
    state: 'ready',
    branch_name: null,
    url: null,
    labels: ['code-quality', 'mcp'],
    blocked_by: [],
    created_at: state.created_at,
    updated_at: state.updated_at,
  });

  assert.equal(claimed.state, 'claimed');

  const completed = await tracker.complete_issue(claimed, {
    turn_count: 2,
    message: 'Applied the fix and reran the targeted MCP contract checks.',
  });

  assert.equal(completed?.state, 'done');
  assert.equal(state.evidence, 'Applied the fix and reran the targeted MCP contract checks.');
  assert.deepEqual(
    toolCalls.map((entry) => entry.params.name),
    ['loom_claim', 'loom_get', 'loom_complete', 'loom_get'],
  );
});
