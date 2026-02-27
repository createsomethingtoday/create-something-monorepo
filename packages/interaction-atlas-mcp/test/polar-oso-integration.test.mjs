import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../dist/server.js';
import { InteractionAtlasAuthProvider } from '../dist/auth.js';

class FakePreparedStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.args = [];
  }

  bind(...args) {
    this.args = args;
    return this;
  }

  async first() {
    const sql = this.sql;

    if (sql.includes('FROM judgment_account_access')) {
      const [accountId] = this.args;
      return this.db.accountAccess.get(accountId) ?? null;
    }

    if (sql.includes('FROM judgment_engine_rollout')) {
      const [accountId, entityType, entityId] = this.args;
      return this.db.rollout.get(this.db.key(accountId, entityType, entityId)) ?? null;
    }

    if (sql.includes('FROM judgment_policy_selection')) return null;
    if (sql.includes('FROM judgment_policy_versions')) return null;
    if (sql.includes('SELECT default_version_id FROM atlas_version_selection')) return null;

    if (sql.includes('FROM atlas_versions') && sql.includes('commit_sha = ?')) {
      const [accountId, entityType, entityId, commitSha, policyVersionId] = this.args;
      return {
        id: `ver_${entityType}_${entityId}_fixed`,
        account_id: accountId,
        entity_type: entityType,
        entity_id: entityId,
        commit_sha: commitSha,
        runtime_ref: null,
        policy_version_id: policyVersionId,
        parent_version_id: null,
        created_at: this.db.now(),
      };
    }

    if (sql.includes('SELECT id FROM atlas_versions')) return null;

    if (sql.includes('SELECT * FROM atlas_versions') && sql.includes('ORDER BY created_at DESC')) {
      const [accountId, entityType, entityId] = this.args;
      return {
        id: `ver_${entityType}_${entityId}_latest`,
        account_id: accountId,
        entity_type: entityType,
        entity_id: entityId,
        commit_sha: 'unknown',
        runtime_ref: null,
        policy_version_id: `default-${entityId}`,
        parent_version_id: null,
        created_at: this.db.now(),
      };
    }

    if (sql.includes('FROM judgment_engine_events') && sql.includes('COUNT(*) AS total')) {
      const rows = this.db.filteredEvents(this.args);
      return {
        total: rows.length,
        fallback_total: rows.reduce((sum, row) => sum + Number(row.fallback_used ?? 0), 0),
        mismatch_total: rows.reduce((sum, row) => sum + Number(row.mismatch ?? 0), 0),
      };
    }

    if (sql.includes('FROM judgment_engine_events') && sql.includes('blocked_total')) {
      const [accountId, cutoff] = this.args;
      const blocked = this.db.events.filter(
        (row) =>
          row.account_id === accountId &&
          row.created_at >= cutoff &&
          row.final_decision === 'block',
      );
      const distinctTools = new Set(blocked.map((row) => row.tool_name)).size;
      return {
        blocked_total: blocked.length,
        distinct_tools: distinctTools,
      };
    }

    return null;
  }

  async all() {
    const sql = this.sql;

    if (sql.includes('SELECT latency_ms') && sql.includes('FROM judgment_engine_events')) {
      const rows = this.db.filteredEvents(this.args);
      return {
        results: rows.map((row) => ({ latency_ms: row.latency_ms })),
      };
    }

    if (sql.includes('SELECT final_decision AS key') && sql.includes('FROM judgment_engine_events')) {
      const rows = this.db.filteredEvents(this.args);
      const counts = new Map();
      for (const row of rows) {
        counts.set(row.final_decision, (counts.get(row.final_decision) ?? 0) + 1);
      }
      return {
        results: [...counts.entries()].map(([key, count]) => ({ key, count })),
      };
    }

    if (sql.includes('FROM judgment_security_incidents')) {
      const [accountId, limit] = this.args;
      const rows = this.db.incidents
        .filter((row) => row.account_id === accountId)
        .sort((a, b) => b.created_at - a.created_at)
        .slice(0, Number(limit));
      return { results: rows };
    }

    return { results: [] };
  }

  async run() {
    const sql = this.sql;

    if (sql.includes('INSERT INTO judgment_engine_rollout')) {
      const [accountId, entityType, entityId, mode, canaryPercent, mismatchThreshold, fallbackRateThreshold, updatedBy, updatedAt] = this.args;
      this.db.rollout.set(this.db.key(accountId, entityType, entityId), {
        account_id: accountId,
        entity_type: entityType,
        entity_id: entityId,
        mode,
        canary_percent: canaryPercent,
        mismatch_threshold: mismatchThreshold,
        fallback_rate_threshold: fallbackRateThreshold,
        updated_by: updatedBy,
        updated_at: updatedAt,
      });
    }

    if (sql.includes('INSERT INTO judgment_engine_events')) {
      const withCorrelation = sql.includes('correlation_id');
      const data = withCorrelation
        ? {
            id: this.args[0],
            correlation_id: this.args[1],
            account_id: this.args[2],
            entity_type: this.args[3],
            entity_id: this.args[4],
            tool_name: this.args[5],
            rollout_mode: this.args[6],
            canary_percent: this.args[7],
            sampled_polar: this.args[8],
            mismatch: this.args[9],
            evaluation_path: this.args[10],
            fallback_used: this.args[11],
            legacy_decision: this.args[12],
            polar_decision: this.args[13],
            final_decision: this.args[14],
            latency_ms: this.args[15],
            created_at: this.args[16],
          }
        : {
            id: this.args[0],
            correlation_id: 'unknown',
            account_id: this.args[1],
            entity_type: this.args[2],
            entity_id: this.args[3],
            tool_name: this.args[4],
            rollout_mode: this.args[5],
            canary_percent: this.args[6],
            sampled_polar: this.args[7],
            mismatch: this.args[8],
            evaluation_path: this.args[9],
            fallback_used: this.args[10],
            legacy_decision: this.args[11],
            polar_decision: this.args[12],
            final_decision: this.args[13],
            latency_ms: this.args[14],
            created_at: this.args[15],
          };
      this.db.events.push(data);
    }

    if (sql.includes('INSERT INTO judgment_account_access')) {
      const [accountId, mode, reason, incidentId, updatedBy, updatedAt, expiresAt] = this.args;
      this.db.accountAccess.set(accountId, {
        account_id: accountId,
        mode,
        reason,
        incident_id: incidentId,
        updated_by: updatedBy,
        updated_at: updatedAt,
        expires_at: expiresAt,
      });
    }

    if (sql.includes('INSERT INTO judgment_security_incidents')) {
      this.db.incidents.push({
        id: this.args[0],
        account_id: this.args[1],
        incident_type: this.args[2],
        severity: this.args[3],
        action_mode: this.args[4],
        reason: this.args[5],
        signal_json: this.args[6],
        status: this.args[7],
        correlation_id: this.args[8],
        created_at: this.args[9],
        resolved_at: this.args[10],
        resolved_by: this.args[11],
      });
    }

    return { success: true };
  }
}

class FakeD1Database {
  constructor() {
    this.rollout = new Map();
    this.events = [];
    this.accountAccess = new Map();
    this.incidents = [];
  }

  key(accountId, entityType, entityId) {
    return `${accountId}::${entityType}::${entityId}`;
  }

  now() {
    return Math.floor(Date.now() / 1000);
  }

  filteredEvents(args) {
    if (args.length >= 4) {
      const [accountId, entityType, entityId, cutoff] = args;
      return this.events.filter(
        (row) =>
          row.account_id === accountId &&
          row.entity_type === entityType &&
          row.entity_id === entityId &&
          row.created_at >= cutoff,
      );
    }

    if (args.length >= 2) {
      const [accountId, cutoff] = args;
      return this.events.filter((row) => row.account_id === accountId && row.created_at >= cutoff);
    }

    return [];
  }

  prepare(sql) {
    return new FakePreparedStatement(this, sql);
  }
}

async function callTool(server, env, name, args, headers = {}) {
  const request = new Request('https://example.test/mcp', {
    method: 'POST',
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `${name}-1`,
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    }),
  });

  const response = await server.handleRequest(request, env);
  assert.equal(response.status, 200);
  const payload = JSON.parse(await response.text());
  assert.ok(payload.result, JSON.stringify(payload));
  const text = payload.result.content?.[0]?.text;
  return text ? JSON.parse(text) : payload.result;
}

async function callRpc(server, env, name, args, headers = {}) {
  const request = new Request('https://example.test/mcp', {
    method: 'POST',
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `${name}-rpc`,
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    }),
  });

  const response = await server.handleRequest(request, env);
  assert.equal(response.status, 200);
  return JSON.parse(await response.text());
}

function extractRpcErrorMessage(payload) {
  if (payload?.error?.message) return String(payload.error.message);
  if (payload?.result?.isError === true) {
    const text = payload.result.content?.[0]?.text;
    if (typeof text === 'string') return text;
  }
  return null;
}

test('auth provider exposes Oso env metadata in account context', async () => {
  const provider = new InteractionAtlasAuthProvider();
  const request = new Request('https://example.test/mcp', {
    headers: { 'x-api-key': 'test-key' },
  });

  const ctx = await provider.resolve(request, {
    API_KEYS: 'test-key:default:operator',
    OSO_URL: 'https://cloud.osohq.com',
    OSO_API_KEY: 'oso-test-token',
    OSO_BOOTSTRAP_POLICY: 'true',
    ENGINE_FALLBACK_ENABLED: 'true',
    OSO_FETCH_TIMEOUT_MS: '1200',
    MCP_TOOL_ACCESS_MODE: 'read_only',
  });

  assert.equal(ctx.accountId, 'default');
  assert.equal(ctx.metadata.OSO_URL, 'https://cloud.osohq.com');
  assert.equal(ctx.metadata.OSO_API_KEY, 'oso-test-token');
  assert.equal(ctx.metadata.OSO_BOOTSTRAP_POLICY, 'true');
  assert.equal(ctx.metadata.ENGINE_FALLBACK_ENABLED, 'true');
  assert.equal(ctx.metadata.OSO_FETCH_TIMEOUT_MS, 1200);
  assert.equal(ctx.metadata.MCP_TOOL_ACCESS_MODE, 'read_only');
  assert.equal(ctx.policy.constraints.mcpToolAccessMode, 'read_only');
});

test('rollout set/get controls policy engine mode for MCP tools', async () => {
  const db = new FakeD1Database();
  const server = createServer();
  const env = {
    API_KEYS: 'test-key:default:operator',
    DB: db,
  };
  const headers = { 'x-api-key': 'test-key' };

  const setResult = await callTool(server, env, 'judgment_engine_rollout_set', {
    entity_type: 'agent',
    entity_id: 'inbox-triage',
    mode: 'polar_enforce',
    canary_percent: 100,
    mismatch_threshold: 1,
    fallback_rate_threshold: 1,
  }, headers);

  assert.equal(setResult.rollout.mode, 'polar_enforce');
  assert.equal(setResult.rollout.canary_percent, 100);

  const getResult = await callTool(server, env, 'judgment_engine_rollout_get', {
    entity_type: 'agent',
    entity_id: 'inbox-triage',
  }, headers);

  assert.equal(getResult.rollout.mode, 'polar_enforce');
  assert.equal(getResult.rollout.canary_percent, 100);
});

test('workflow_get uses polar decision metadata when rollout enforces polar and Oso is unavailable', async () => {
  const db = new FakeD1Database();
  const server = createServer();
  const env = {
    API_KEYS: 'test-key:default:operator',
    DB: db,
  };
  const headers = { 'x-api-key': 'test-key' };

  await callTool(
    server,
    env,
    'judgment_engine_rollout_set',
    {
      entity_type: 'agent',
      entity_id: 'inbox-triage',
      mode: 'polar_enforce',
      canary_percent: 100,
      mismatch_threshold: 1,
      fallback_rate_threshold: 1,
    },
    headers,
  );

  const payload = await callTool(server, env, 'workflow_get', {
    workflow_id: 'inbox-triage',
  }, headers);

  assert.equal(payload.workflow_id, 'inbox-triage');
  assert.equal(payload.judgmentDecision.engine, 'polar_v1');
  assert.equal(payload.judgmentDecision.evaluationPath, 'fallback');
  assert.match(payload.judgmentDecision.fallbackReason ?? '', /Missing Oso config/i);
  assert.equal(typeof payload.judgmentDecision.policyHash, 'string');
  assert.equal(typeof payload.judgmentDecision.compilerVersion, 'string');
});

test('workflow_get remains legacy-enforced when rollout mode is legacy_enforce', async () => {
  const db = new FakeD1Database();
  const server = createServer();
  const env = {
    API_KEYS: 'test-key:default:operator',
    DB: db,
  };
  const headers = { 'x-api-key': 'test-key' };

  await callTool(
    server,
    env,
    'judgment_engine_rollout_set',
    {
      entity_type: 'agent',
      entity_id: 'inbox-triage',
      mode: 'legacy_enforce',
      canary_percent: 0,
      mismatch_threshold: 1,
      fallback_rate_threshold: 1,
    },
    headers,
  );

  const payload = await callTool(server, env, 'workflow_get', {
    workflow_id: 'inbox-triage',
  }, headers);

  assert.equal(payload.judgmentDecision.engine, 'legacy_v1');
  assert.equal(payload.judgmentDecision.evaluationPath, 'legacy');
  assert.match(payload.judgmentDecision.fallbackReason ?? '', /Missing Oso config|circuit breaker/i);
});

test('security kill switch off disables MCP tool calling', async () => {
  const db = new FakeD1Database();
  const server = createServer();
  const env = {
    API_KEYS: 'test-key:default:operator',
    MCP_TOOL_ACCESS_MODE: 'off',
    DB: db,
  };
  const headers = { 'x-api-key': 'test-key' };

  const payload = await callRpc(server, env, 'workflow_list', {}, headers);
  const message = extractRpcErrorMessage(payload);
  assert.ok(message, JSON.stringify(payload));
  assert.match(message, /method not found|unknown tool|tool .* not found/i);
});

test('security kill switch read_only allows read tools and blocks write tools', async () => {
  const db = new FakeD1Database();
  const server = createServer();
  const env = {
    API_KEYS: 'test-key:default:operator',
    MCP_TOOL_ACCESS_MODE: 'read_only',
    DB: db,
  };
  const headers = { 'x-api-key': 'test-key' };

  const readPayload = await callTool(server, env, 'workflow_list', {}, headers);
  assert.equal(readPayload.accountId, 'default');
  assert.ok(Array.isArray(readPayload.workflows));

  const writePayload = await callRpc(server, env, 'judgment_policy_save', {
    entity_type: 'agent',
    entity_id: 'inbox-triage',
    policy: {
      id: 'test-policy',
      name: 'Test Policy',
      rules: [
        {
          id: 'rule-1',
          priority: 10,
          when: {},
          then: { decision: 'allow', reason: 'allow for test' },
        },
      ],
    },
  }, headers);
  const message = extractRpcErrorMessage(writePayload);
  assert.ok(message, JSON.stringify(writePayload));
  assert.match(message, /method not found|unknown tool|tool .* not found/i);
});

test('security status and manual access control tools persist account posture', async () => {
  const db = new FakeD1Database();
  const server = createServer();
  const env = {
    API_KEYS: 'test-key:default:operator',
    DB: db,
  };
  const headers = { 'x-api-key': 'test-key' };

  const setPayload = await callTool(server, env, 'judgment_security_access_set', {
    mode: 'read_only',
    reason: 'manual containment test',
  }, headers);
  assert.equal(setPayload.access.mode, 'read_only');

  const statusPayload = await callTool(server, env, 'judgment_security_status_get', {
    limit: 5,
  }, headers);
  assert.equal(statusPayload.access.mode, 'read_only');
  assert.ok(Array.isArray(statusPayload.incidents));
});

test('abuse guard auto-kills access and records an incident for repeated blocked calls', async () => {
  const db = new FakeD1Database();
  const server = createServer();
  const env = {
    DB: db,
    ABUSE_GUARD_ENABLED: 'true',
    ABUSE_WINDOW_SECONDS: '600',
    ABUSE_BLOCK_THRESHOLD: '2',
    ABUSE_DISTINCT_TOOLS_THRESHOLD: '1',
  };

  await callTool(server, env, 'workflow_map_from_tool_sequence', {
    workflow_id: 'fleet-watchdog',
    sequence: [{ tool: 'notion_upsert_page' }],
    add_human_review: true,
  });
  await callTool(server, env, 'workflow_map_from_tool_sequence', {
    workflow_id: 'fleet-watchdog',
    sequence: [{ tool: 'notion_upsert_page' }],
    add_human_review: true,
  });

  const accountAccess = db.accountAccess.get('public');
  assert.ok(accountAccess, 'expected public account access row to exist');
  assert.equal(accountAccess.mode, 'off');
  assert.match(accountAccess.reason ?? '', /abuse pattern detected/i);
  assert.ok(db.incidents.length >= 1, 'expected at least one incident record');
  assert.equal(db.incidents[0].account_id, 'public');
  assert.equal(db.incidents[0].action_mode, 'off');
  assert.match(db.incidents[0].reason, /abuse pattern detected/i);

  const postKillPayload = await callRpc(server, env, 'workflow_list', {});
  const message = extractRpcErrorMessage(postKillPayload);
  assert.ok(message, JSON.stringify(postKillPayload));
  assert.match(message, /method not found|unknown tool|tool .* not found/i);
});
