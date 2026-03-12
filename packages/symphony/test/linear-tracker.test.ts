import { describe, expect, it, vi } from 'vitest';
import { MemoryLogger } from '../src/logger.js';
import { LinearTrackerClient } from '../src/tracker/linear.js';
import type { ServiceConfig } from '../src/types.js';

function createConfig(): ServiceConfig {
  return {
    workflow_path: '/tmp/WORKFLOW.md',
    tracker: {
      kind: 'linear',
      endpoint: 'https://api.linear.app/graphql',
      api_key: 'linear-token',
      project_slug: 'repo-project',
      active_states: ['Todo', 'In Progress'],
      terminal_states: ['Done'],
      network_timeout_ms: 30_000,
      page_size: 50,
    },
    polling: { interval_ms: 30_000 },
    workspace: { root: '/tmp/symphony' },
    hooks: {
      after_create: null,
      before_run: null,
      after_run: null,
      before_remove: null,
      timeout_ms: 60_000,
    },
    agent: {
      max_concurrent_agents: 2,
      max_turns: 20,
      max_retry_backoff_ms: 300_000,
      max_concurrent_agents_by_state: {},
    },
    codex: {
      command: 'codex app-server',
      approval_policy: 'never',
      thread_sandbox: 'danger-full-access',
      turn_sandbox_policy: { type: 'dangerFullAccess' },
      turn_timeout_ms: 1_000,
      read_timeout_ms: 1_000,
      stall_timeout_ms: 1_000,
    },
    server: { port: null },
  };
}

describe('linear tracker', () => {
  it('fetches paginated candidate issues and normalizes labels/blockers', async () => {
    const bodies: Array<{ query: string; variables: Record<string, unknown> }> = [];
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      if (bodies.length === 1) {
        return new Response(
          JSON.stringify({
            data: {
              issues: {
                nodes: [
                  {
                    id: '1',
                    identifier: 'ABC-1',
                    title: 'First',
                    description: null,
                    priority: 2,
                    branchName: 'abc-1',
                    url: 'https://linear.app',
                    createdAt: '2026-01-01T00:00:00Z',
                    updatedAt: '2026-01-02T00:00:00Z',
                    state: { name: 'Todo' },
                    labels: { nodes: [{ name: 'Bug' }, { name: 'P1' }] },
                    inverseRelations: {
                      nodes: [{ type: 'blocks', issue: { id: '9', identifier: 'ABC-9', state: { name: 'In Progress' } } }],
                    },
                  },
                ],
                pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
              },
            },
          }),
          { status: 200 }
        );
      }

      return new Response(
        JSON.stringify({
          data: {
            issues: {
              nodes: [
                {
                  id: '2',
                  identifier: 'ABC-2',
                  title: 'Second',
                  description: 'Next',
                  priority: 1,
                  branchName: null,
                  url: null,
                  createdAt: '2026-01-03T00:00:00Z',
                  updatedAt: '2026-01-04T00:00:00Z',
                  state: { name: 'In Progress' },
                  labels: { nodes: [] },
                  inverseRelations: { nodes: [] },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        }),
        { status: 200 }
      );
    });

    const client = new LinearTrackerClient(createConfig(), new MemoryLogger(), fetchMock as typeof fetch);
    const issues = await client.fetch_candidate_issues();

    expect(bodies[0].query).toContain('slugId');
    expect(issues).toHaveLength(2);
    expect(issues[0].labels).toEqual(['bug', 'p1']);
    expect(issues[0].blocked_by).toEqual([{ id: '9', identifier: 'ABC-9', state: 'In Progress' }]);
  });

  it('uses GraphQL [ID!] typing for issue-state refresh', async () => {
    let query = '';
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      query = body.query;
      return new Response(JSON.stringify({ data: { issues: { nodes: [] } } }), { status: 200 });
    });

    const client = new LinearTrackerClient(createConfig(), new MemoryLogger(), fetchMock as typeof fetch);
    await client.fetch_issue_states_by_ids(['1']);
    expect(query).toContain('($ids: [ID!])');
  });

  it('maps GraphQL errors to a typed tracker error', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ errors: [{ message: 'boom' }] }), { status: 200 }));
    const client = new LinearTrackerClient(createConfig(), new MemoryLogger(), fetchMock as typeof fetch);

    await expect(client.fetch_candidate_issues()).rejects.toMatchObject({
      code: 'linear_graphql_errors',
    });
  });
});
