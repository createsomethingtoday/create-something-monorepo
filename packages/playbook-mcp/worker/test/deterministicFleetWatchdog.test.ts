import assert from 'node:assert/strict';
import test from 'node:test';

import { runDeterministicFleetWatchdog } from '../deterministicFleetWatchdog.js';
import { runScheduledDeterministicFleetWatchdog } from '../scheduledFleetWatchdog.js';

function mcpText(value: unknown): unknown {
  return {
    content: [{ type: 'text', text: JSON.stringify(value) }]
  };
}

test('scheduled fleet watchdog gathers all required telemetry without a model credential', async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const fixtures: Record<string, unknown> = {
    query_health: mcpText([
      {
        server: 'halfdozen-gmail-sync',
        status: 'healthy',
        invocations: 12,
        errors: 0,
        errorRate: '0%',
        avgDuration: '120ms',
        lastActivity: '2026-07-13T01:00:00.000Z',
        tools: []
      }
    ]),
    query_errors: mcpText({ window: '24h', totalErrors: 0, uniquePatterns: 0, errors: [] }),
    query_activity: mcpText({ count: 1, invocations: [{ server: 'halfdozen-gmail-sync' }] }),
    query_trends: mcpText({
      periodsCompared: 3,
      trends: { 'halfdozen-gmail-sync': [{ period: '2026-07', runs: 12 }] }
    })
  };

  const result = await runDeterministicFleetWatchdog({
    callTool: async (name, args) => {
      calls.push({ name, args });
      return fixtures[name];
    }
  });

  assert.deepEqual(
    calls.map((call) => call.name),
    ['query_health', 'query_errors', 'query_activity', 'query_trends']
  );
  assert.deepEqual(
    calls.map((call) => call.args),
    [{ hours: 24 }, { hours: 24, limit: 50 }, { limit: 100 }, { periods: 3 }]
  );
  assert.equal(result.degraded, false);
  assert.equal(result.required_tool_coverage?.all_required_tools_successful, true);
  assert.match(String(result.final_output), /Fleet Watchdog: HEALTHY/);
  assert.match(String(result.final_output), /12 invocations, 0 errors/);
});

test('scheduled fleet watchdog reports a required telemetry failure after attempting every tool', async () => {
  const calls: string[] = [];
  const result = await runDeterministicFleetWatchdog({
    callTool: async (name) => {
      calls.push(name);
      if (name === 'query_errors') throw new Error('telemetry query timed out');
      if (name === 'query_health') return mcpText([]);
      if (name === 'query_activity') return mcpText({ count: 0, invocations: [] });
      return mcpText({ periodsCompared: 3, trends: {} });
    }
  });

  assert.deepEqual(calls, ['query_health', 'query_errors', 'query_activity', 'query_trends']);
  assert.equal(result.degraded, true);
  assert.deepEqual(result.required_tool_coverage?.missing_required_tool_success, ['query_errors']);
  assert.equal(result.failed_required_tool_calls[0]?.tool, 'query_errors');
  assert.match(result.failed_required_tool_calls[0]?.output_excerpt ?? '', /timed out/);
  assert.match(String(result.final_output), /query_errors failed/);
});

test('scheduled fleet watchdog names degraded services, recurring errors, usage regressions, and remediation', async () => {
  const fixtures: Record<string, unknown> = {
    query_health: mcpText([
      { server: 'halfdozen-gmail-sync', status: 'degraded', invocations: 10, errors: 2 },
      { server: 'halfdozen-notion-mcp', status: 'no-data', invocations: 0, errors: 0 }
    ]),
    query_errors: mcpText({
      window: '24h',
      totalErrors: 2,
      uniquePatterns: 1,
      errors: [
        {
          error: 'upstream timeout',
          occurrences: 2,
          servers: ['halfdozen-gmail-sync'],
          tools: ['sync_inbox'],
          latest: '5m ago'
        }
      ]
    }),
    query_activity: mcpText({ count: 10, invocations: [] }),
    query_trends: mcpText({
      periodsCompared: 3,
      trends: {
        'halfdozen-gmail-sync': [
          { period: '2026-06', runs: 5 },
          { period: '2026-05', runs: 10 }
        ]
      }
    })
  };

  const result = await runDeterministicFleetWatchdog({
    callTool: async (name) => fixtures[name],
    now: new Date('2026-07-29T18:00:00Z')
  });

  assert.equal(result.degraded, true);
  assert.match(result.degraded_reason ?? '', /halfdozen-gmail-sync \(degraded\)/);
  assert.match(result.degraded_reason ?? '', /halfdozen-notion-mcp \(no-data\)/);
  assert.match(result.final_output, /upstream timeout \(2 occurrences\)/);
  assert.match(result.final_output, /halfdozen-gmail-sync usage down 50%/);
  assert.match(
    result.final_output,
    /First remediation: inspect sync_inbox on halfdozen-gmail-sync/
  );
});

test('scheduled fleet watchdog does not call non-consecutive stored months a regression', async () => {
  const fixtures: Record<string, unknown> = {
    query_health: mcpText([
      { server: 'halfdozen-gmail-sync', status: 'healthy', invocations: 1, errors: 0 }
    ]),
    query_errors: mcpText({ window: '24h', totalErrors: 0, uniquePatterns: 0, errors: [] }),
    query_activity: mcpText({ count: 1, invocations: [] }),
    query_trends: mcpText({
      periodsCompared: 3,
      trends: {
        'halfdozen-gmail-sync': [
          { period: '2026-04', runs: 1 },
          { period: '2026-02', runs: 13 }
        ]
      }
    })
  };

  const result = await runDeterministicFleetWatchdog({
    callTool: async (name) => fixtures[name]
  });

  assert.match(result.final_output, /Period-over-period regressions: none/);
  assert.doesNotMatch(result.final_output, /usage down/);
});

test('scheduled fleet watchdog does not compare an incomplete current month with a closed month', async () => {
  const fixtures: Record<string, unknown> = {
    query_health: mcpText([
      { server: 'halfdozen-telemetry', status: 'healthy', invocations: 16, errors: 0 }
    ]),
    query_errors: mcpText({ window: '24h', totalErrors: 0, uniquePatterns: 0, errors: [] }),
    query_activity: mcpText({ count: 16, invocations: [] }),
    query_trends: mcpText({
      periodsCompared: 3,
      trends: {
        'halfdozen-telemetry': [
          { period: '2026-07', runs: 449 },
          { period: '2026-06', runs: 480 }
        ]
      }
    })
  };

  const result = await runDeterministicFleetWatchdog({
    callTool: async (name) => fixtures[name],
    now: new Date('2026-07-29T18:00:00Z')
  });

  assert.match(result.final_output, /Period-over-period regressions: none/);
  assert.doesNotMatch(result.final_output, /halfdozen-telemetry usage down/);
});

test('scheduled fleet watchdog ignores historical trends for servers outside active health coverage', async () => {
  const fixtures: Record<string, unknown> = {
    query_health: mcpText([
      { server: 'halfdozen-telemetry', status: 'healthy', invocations: 16, errors: 0 }
    ]),
    query_errors: mcpText({ window: '24h', totalErrors: 0, uniquePatterns: 0, errors: [] }),
    query_activity: mcpText({ count: 16, invocations: [] }),
    query_trends: mcpText({
      periodsCompared: 3,
      trends: {
        'halfdozen-dm-mcp': [
          { period: '2026-06', runs: 32 },
          { period: '2026-05', runs: 312 }
        ]
      }
    })
  };

  const result = await runDeterministicFleetWatchdog({
    callTool: async (name) => fixtures[name],
    now: new Date('2026-07-29T18:00:00Z')
  });

  assert.match(result.final_output, /Period-over-period regressions: none/);
  assert.doesNotMatch(result.final_output, /halfdozen-dm-mcp usage down/);
});

test('cron route succeeds without OPENAI_API_KEY by using the deterministic runner', async () => {
  const result = await runDeterministicFleetWatchdog({
    callTool: async (name) => {
      if (name === 'query_health') {
        return mcpText([
          { server: 'halfdozen-gmail-sync', status: 'healthy', invocations: 1, errors: 0 }
        ]);
      }
      if (name === 'query_errors') {
        return mcpText({ window: '24h', totalErrors: 0, uniquePatterns: 0, errors: [] });
      }
      if (name === 'query_activity') return mcpText({ count: 1, invocations: [] });
      return mcpText({ periodsCompared: 3, trends: {} });
    }
  });
  let deterministicRuns = 0;
  let recordedSuccess: boolean | undefined;
  let successNotifications = 0;
  let errorNotifications = 0;

  await runScheduledDeterministicFleetWatchdog({
    runId: 'run-1',
    route: 'cron:clients/halfdozen/agents/fleet-watchdog',
    scheduledTimeMs: Date.UTC(2026, 6, 13, 4, 0, 0),
    run: async () => {
      deterministicRuns += 1;
      return result;
    },
    record: async (evidence) => {
      recordedSuccess = evidence.success;
    },
    notifySuccess: () => {
      successNotifications += 1;
    },
    notifyError: () => {
      errorNotifications += 1;
    }
  });

  assert.equal(deterministicRuns, 1);
  assert.equal(recordedSuccess, true);
  assert.equal(successNotifications, 1);
  assert.equal(errorNotifications, 0);
});

test('scheduled fleet watchdog treats an empty health dataset as explicit missing data', async () => {
  const result = await runDeterministicFleetWatchdog({
    callTool: async (name) => {
      if (name === 'query_health') return mcpText([]);
      if (name === 'query_errors') {
        return mcpText({ window: '24h', totalErrors: 0, uniquePatterns: 0, errors: [] });
      }
      if (name === 'query_activity') return mcpText({ count: 0, invocations: [] });
      return mcpText({ periodsCompared: 3, trends: {} });
    }
  });

  assert.equal(result.degraded, true);
  assert.match(result.degraded_reason ?? '', /query_health returned no server records/);
  assert.match(result.final_output, /First remediation: verify telemetry query_health data/);
});

test('scheduled fleet watchdog treats MCP isError results as failed required tools', async () => {
  const result = await runDeterministicFleetWatchdog({
    callTool: async (name) => {
      if (name === 'query_health') {
        return mcpText([
          { server: 'halfdozen-gmail-sync', status: 'healthy', invocations: 1, errors: 0 }
        ]);
      }
      if (name === 'query_errors') {
        return { isError: true, content: [{ type: 'text', text: 'D1 query unavailable' }] };
      }
      if (name === 'query_activity') return mcpText({ count: 1, invocations: [] });
      return mcpText({ periodsCompared: 3, trends: {} });
    }
  });

  assert.deepEqual(result.required_tool_coverage.missing_required_tool_success, ['query_errors']);
  assert.equal(result.failed_required_tool_calls[0]?.tool, 'query_errors');
  assert.match(result.failed_required_tool_calls[0]?.output_excerpt ?? '', /D1 query unavailable/);
});
