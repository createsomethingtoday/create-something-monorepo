import assert from 'node:assert/strict';
import { test } from 'node:test';

import { claimLinearIssue, fetchLinearOpenIssues, prepareLinearIssue } from '../src/linear-open.js';

function linearResponse(nodes: unknown[]): Response {
  return new Response(JSON.stringify({ data: { issues: { nodes } } }), {
    headers: { 'content-type': 'application/json' }
  });
}

test('fetches open Linear issues for the requested team', async () => {
  const calls: RequestInit[] = [];
  const queue = await fetchLinearOpenIssues({
    apiKey: 'linear-token',
    teamKey: 'CRE',
    limit: 2,
    now: () => new Date('2026-06-18T23:10:00.000Z'),
    fetch: async (_url, init) => {
      calls.push(init ?? {});
      return linearResponse([
        {
          identifier: 'CRE-1',
          title: 'Open item',
          url: 'https://linear.app/createsomething/issue/CRE-1',
          priority: 2,
          updatedAt: '2026-06-18T22:00:00.000Z',
          state: { name: 'Todo', type: 'unstarted' },
          assignee: { name: 'Micah Johnson' },
          team: { key: 'CRE' },
          project: { name: 'Operator' }
        },
        {
          identifier: 'CRE-2',
          title: 'Done item',
          url: 'https://linear.app/createsomething/issue/CRE-2',
          priority: 3,
          updatedAt: '2026-06-18T21:00:00.000Z',
          state: { name: 'Done', type: 'completed' },
          team: { key: 'CRE' }
        },
        {
          identifier: 'WEB-1',
          title: 'Other team',
          state: { name: 'Todo', type: 'unstarted' },
          team: { key: 'WEB' }
        }
      ]);
    }
  });

  assert.equal(new Headers(calls[0]?.headers).get('authorization'), 'linear-token');
  assert.equal(queue.generated_at, '2026-06-18T23:10:00.000Z');
  assert.deepEqual(queue.issues.map((issue) => issue.identifier), ['CRE-1']);
  assert.equal(queue.issues[0]?.assignee, 'Micah Johnson');
});

test('requires a Linear API key', async () => {
  await assert.rejects(() => fetchLinearOpenIssues({ apiKey: '' }), /LINEAR_API_KEY/);
});

test('claims an open CRE issue as the Linear viewer', async () => {
  const calls: Array<{ body: unknown; headers: Headers }> = [];
  const result = await claimLinearIssue({
    apiKey: 'linear-token',
    identifier: 'CRE-701',
    fetch: async (_url, init) => {
      calls.push({
        body: JSON.parse(String(init?.body)),
        headers: new Headers(init?.headers)
      });

      if (calls.length === 1) {
        return new Response(
          JSON.stringify({
            data: {
              viewer: { id: 'viewer-id', name: 'Micah Johnson' },
              issues: {
                nodes: [
                  {
                    id: 'issue-id',
                    identifier: 'CRE-701',
                    title: 'Operator brief',
                    url: 'https://linear.app/createsomething/issue/CRE-701',
                    priority: 3,
                    updatedAt: '2026-06-18T23:00:00.000Z',
                    state: { name: 'Todo', type: 'unstarted' },
                    team: { id: 'team-id', key: 'CRE' }
                  }
                ]
              },
              workflowStates: {
                nodes: [{ id: 'started-id', name: 'In Progress', type: 'started', team: { id: 'team-id', key: 'CRE' } }]
              }
            }
          })
        );
      }

      return new Response(
        JSON.stringify({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                identifier: 'CRE-701',
                title: 'Operator brief',
                url: 'https://linear.app/createsomething/issue/CRE-701',
                priority: 3,
                updatedAt: '2026-06-18T23:01:00.000Z',
                state: { name: 'In Progress', type: 'started' },
                assignee: { name: 'Micah Johnson' },
                project: { name: 'Even' }
              }
            }
          }
        })
      );
    }
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.headers.get('authorization'), 'linear-token');
  assert.deepEqual((calls[1]?.body as { variables: { input: unknown } }).variables.input, {
    assigneeId: 'viewer-id',
    stateId: 'started-id'
  });
  assert.equal(result.issue.identifier, 'CRE-701');
  assert.equal(result.issue.assignee, 'Micah Johnson');
  assert.equal(result.claimed_by, 'Micah Johnson');
});

test('claim rejects non-CRE identifiers', async () => {
  await assert.rejects(() => claimLinearIssue({ apiKey: 'linear-token', identifier: 'WEB-1' }), /Only CRE/);
});

test('prepares a read-only handoff packet for an open CRE issue', async () => {
  const result = await prepareLinearIssue({
    apiKey: 'linear-token',
    identifier: 'CRE-763',
    fetch: async (_url, init) => {
      assert.equal(new Headers(init?.headers).get('authorization'), 'linear-token');
      return new Response(
        JSON.stringify({
          data: {
            issues: {
              nodes: [
                {
                  identifier: 'CRE-763',
                  title: 'Build Even G2 operator routing agent endpoint',
                  url: 'https://linear.app/createsomething/issue/CRE-763',
                  priority: 2,
                  updatedAt: '2026-06-22T18:00:00.000Z',
                  state: { name: 'Todo', type: 'unstarted' },
                  assignee: null,
                  team: { key: 'CRE' },
                  project: { name: 'Even G2' }
                }
              ]
            }
          }
        })
      );
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.issue.identifier, 'CRE-763');
  assert.match(result.prep.headline, /CRE-763/);
  assert.match(result.prep.next_action, /Claim or assign/);
  assert.match(result.prep.handoff, /Owner: Unassigned/);
});

test('prep rejects non-CRE identifiers', async () => {
  await assert.rejects(() => prepareLinearIssue({ apiKey: 'linear-token', identifier: 'WEB-1' }), /Only CRE/);
});
