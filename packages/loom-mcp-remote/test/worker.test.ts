import { describe, expect, it, vi } from 'vitest';

import { createTestEnv, callWorker, mcpCall, signedHeaders } from './support/worker.js';

function makeSnapshot(taskId: string, agentId = 'cursor') {
  return {
    snapshot_version: 'loom-remote-v2',
    generated_at: '2026-03-13T00:00:00.000Z',
    source: '/tmp/source',
    payload: {
      tasks: [
        {
          id: taskId,
          title: taskId === 'lm-ui' ? 'Build a UI shell' : 'Implement worker logic',
          description: taskId === 'lm-ui' ? 'Create a Svelte UI flow' : 'Add backend support',
          status: 'ready',
          priority: 'high',
          issue_type: 'feature',
          agent: null,
          labels_json: JSON.stringify(taskId === 'lm-ui' ? ['ui', 'svelte'] : ['workers', 'feature']),
          parent: null,
          evidence: null,
          actual_cost_usd: null,
          repo: 'create-something',
          close_reason: null,
          created_at: '2026-03-13T00:00:00.000Z',
          updated_at: '2026-03-13T00:00:00.000Z',
        },
      ],
      dependencies: [],
      sessions: [],
      checkpoints: [],
      agentProfiles: [
        {
          id: 'cursor',
          updated_at: '2026-03-13T00:00:00.000Z',
          profile_json: JSON.stringify({
            id: 'cursor',
            name: 'Cursor',
            cli_path: 'cursor',
            capabilities: {
              planning: 0.75,
              coding: 0.88,
              debugging: 0.85,
              ui: 0.95,
              docs: 0.7,
              refactor: 0.8,
              testing: 0.75,
              mcp: true,
              checkpoints: false,
              git_aware: true,
              sub_agents: false,
              max_context: 128000,
            },
            cost: {
              input_per_1k: 0.003,
              output_per_1k: 0.015,
              output_ratio: 2.5,
            },
            quality: {
              successes: 3,
              failures: 0,
              avg_duration_secs: 120,
              by_type: { ui: 0.9 },
            },
            max_concurrent: 2,
            active: 0,
            available: true,
            last_used: null,
          }),
        },
        {
          id: 'codex',
          updated_at: '2026-03-13T00:00:00.000Z',
          profile_json: JSON.stringify({
            id: 'codex',
            name: 'Codex CLI',
            cli_path: 'codex',
            capabilities: {
              planning: 0.7,
              coding: 0.85,
              debugging: 0.8,
              ui: 0.65,
              docs: 0.75,
              refactor: 0.75,
              testing: 0.9,
              mcp: true,
              checkpoints: false,
              git_aware: true,
              sub_agents: false,
              max_context: 128000,
            },
            cost: {
              input_per_1k: 0.005,
              output_per_1k: 0.015,
              output_ratio: 2.5,
            },
            quality: {
              successes: 5,
              failures: 1,
              avg_duration_secs: 240,
              by_type: { workers: 0.85 },
            },
            max_concurrent: 3,
            active: 0,
            available: true,
            last_used: null,
          }),
        },
      ],
      dispatchConfig: {
        agents: {
          cursor: { path: 'cursor', max_concurrent: 2, cost_per_1k: 0.02 },
          codex: { path: 'codex', max_concurrent: 3, cost_per_1k: 0.008 },
        },
        routing: {
          default: 'codex',
          labels: {
            ui: 'cursor',
          },
        },
      },
      modelsConfig: {
        models: {
          cursor: {
            family: 'claude',
            cli: 'cursor',
            name: 'Cursor',
            input_per_1k: 0.003,
            output_per_1k: 0.015,
            max_context: 128000,
            planning: 0.75,
            coding: 0.88,
            debugging: 0.85,
            ui: 0.95,
            docs: 0.7,
            refactor: 0.8,
            testing: 0.75,
            mcp: true,
            max_concurrent: 2,
          },
        },
      },
      runtimeSettings: {
        repoId: 'create-something',
        repoName: 'CREATE SOMETHING',
        issuePrefix: 'lm',
        notion: {
          databaseId: 'db-existing',
        },
      },
    },
  };
}

describe('loom-mcp-remote worker', () => {
  it('serves health and enforces auth on protected endpoints', async () => {
    const { env } = createTestEnv();

    const healthResponse = await callWorker(new Request('https://loom.test/health'), env);
    expect(healthResponse.status).toBe(200);
    const health = (await healthResponse.json()) as {
      status: string;
      auth: {
        mcp_bearer_required: boolean;
        admin_token_required: boolean;
      };
    };
    expect(health.status).toBe('ok');
    expect(health.auth.mcp_bearer_required).toBe(true);
    expect(health.auth.admin_token_required).toBe(true);

    const mcpResponse = await callWorker(
      new Request('https://loom.test/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: '1', method: 'tools/list' }),
      }),
      env,
    );
    expect(mcpResponse.status).toBe(401);

    const exportResponse = await callWorker(new Request('https://loom.test/admin/export'), env);
    expect(exportResponse.status).toBe(401);
  });

  it('rejects invalid signed migration imports', async () => {
    const { env } = createTestEnv();
    const body = JSON.stringify(makeSnapshot('lm-ui'));

    const response = await callWorker(
      new Request('https://loom.test/admin/migrate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.MIGRATION_ADMIN_TOKEN ?? ''}`,
          'Content-Type': 'application/json',
          'X-Migration-Signature': 'bad-signature',
        },
        body,
      }),
      env,
    );

    expect(response.status).toBe(401);
  });

  it('replaces imported state and serves routing/formula/notion tools from remote state', async () => {
    const { env } = createTestEnv({ notionToken: 'notion-secret' });
    const firstBody = JSON.stringify(makeSnapshot('lm-ui'));
    const firstImport = await callWorker(
      new Request('https://loom.test/admin/migrate', {
        method: 'POST',
        headers: signedHeaders(firstBody, env),
        body: firstBody,
      }),
      env,
    );
    expect(firstImport.status).toBe(200);

    const route = await mcpCall(env, 'loom_route', { task_id: 'lm-ui' });
    expect(route.agent_id).toBe('cursor');

    const formulas = await mcpCall(env, 'loom_formulas');
    expect(formulas.items.some((item: any) => item.name === 'cs-worker')).toBe(true);
    const formula = await mcpCall(env, 'loom_formula', { name: 'fleet-deploy' });
    expect(formula.name).toBe('fleet-deploy');

    const notionBefore = await mcpCall(env, 'loom_notion_status');
    expect(notionBefore.database_id).toBe('db-existing');
    expect(notionBefore.has_token).toBe(true);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url === 'https://api.notion.com/v1/databases') {
        return new Response(JSON.stringify({ id: 'db-new' }), { status: 200 });
      }
      if (url === 'https://api.notion.com/v1/databases/db-new/query') {
        return new Response(JSON.stringify({ results: [], has_more: false }), { status: 200 });
      }
      if (url === 'https://api.notion.com/v1/pages') {
        return new Response(JSON.stringify({ id: 'page-1' }), { status: 200 });
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    try {
      const initReject = await mcpCall(env, 'loom_notion_init', { parent_page_id: 'page-123', token: 'raw-token' }).catch(
        (error) => error,
      );
      expect(String(initReject)).toContain('Raw Notion token injection is disabled');

      const notionInit = await mcpCall(env, 'loom_notion_init', { parent_page_id: 'page-123' });
      expect(notionInit.database_id).toBe('db-new');

      const notionSync = await mcpCall(env, 'loom_notion_sync', { dry_run: true });
      expect(notionSync.total).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }

    const secondBody = JSON.stringify(makeSnapshot('lm-worker', 'codex'));
    const secondImport = await callWorker(
      new Request('https://loom.test/admin/migrate', {
        method: 'POST',
        headers: signedHeaders(secondBody, env),
        body: secondBody,
      }),
      env,
    );
    expect(secondImport.status).toBe(200);

    const exported = await callWorker(
      new Request('https://loom.test/admin/export', {
        headers: {
          Authorization: `Bearer ${env.MIGRATION_ADMIN_TOKEN ?? ''}`,
        },
      }),
      env,
    );
    const backup = (await exported.json()) as {
      payload: {
        tasks: Array<{ id: string }>;
      };
    };
    expect(backup.payload.tasks).toHaveLength(1);
    expect(backup.payload.tasks[0].id).toBe('lm-worker');

    const routedWorker = await mcpCall(env, 'loom_route', { task_id: 'lm-worker' });
    expect(routedWorker.agent_id).toBe('codex');
  });
});
