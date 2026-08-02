import { describe, expect, it, vi } from 'vitest';

import {
  ALERT_SCAN_CRON,
  DAILY_DIGEST_CRON,
  buildDigest,
  evaluateAlerts,
  fetchWindowStats,
  runScheduled,
} from '../src/digest.js';
import type { Env } from '../src/types.js';

function makeEnv(overrides: Partial<Record<string, unknown>> = {}): Env {
  return {
    ANTHROPIC_API_KEY: 'must-not-appear',
    SEARCH_API_BASE: 'https://search.test',
    DAILY_BUDGET_MICRO_USD: '40000000',
    CF_ANALYTICS_API_TOKEN: 'token-must-not-appear-in-slack',
    ...overrides,
  } as unknown as Env;
}

function aeResponse(rows: Array<Record<string, string>>): Response {
  return new Response(JSON.stringify({ data: rows }), { status: 200 });
}

const emptyStats = { counts: {}, settledUsd: 0, denialReasons: {} };

describe('fetchWindowStats', () => {
  it('aggregates sample-weighted counts, spend, and denial reasons', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      aeResponse([
        { type: 'turn_settled', reason: '', n: '90', micro_usd: '23197781' },
        { type: 'turn_denied', reason: 'daily_budget', n: '51', micro_usd: '0' },
        { type: 'session_minted', reason: '', n: '60', micro_usd: '0' },
      ]),
    );

    const stats = await fetchWindowStats(makeEnv(), 24, fetcher as unknown as typeof fetch);

    expect(stats.counts.turn_settled).toBe(90);
    expect(stats.settledUsd).toBeCloseTo(23.197781);
    expect(stats.denialReasons.daily_budget).toBe(51);

    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/analytics_engine/sql');
    expect(String(init.body)).toContain("INTERVAL '24' HOUR");
    expect(String(init.body)).toContain('_sample_interval');
  });

  it('throws on a non-2xx SQL API response', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('nope', { status: 403 }));
    await expect(fetchWindowStats(makeEnv(), 1, fetcher as unknown as typeof fetch)).rejects.toThrow('403');
  });
});

describe('evaluateAlerts', () => {
  it('fires A1 when there are no turns in 24h', () => {
    const findings = evaluateAlerts(emptyStats, emptyStats, emptyStats, makeEnv());
    expect(findings.map((f) => f.rule)).toContain('A1 zero-traffic');
  });

  it('fires A2 only past the 20% failure rate with minimum sample', () => {
    const healthy24 = { counts: { turn_settled: 90 }, settledUsd: 10, denialReasons: {} };
    const failing6 = { counts: { turn_settled: 6, turn_failed: 4 }, settledUsd: 2, denialReasons: {} };
    const tinySample6 = { counts: { turn_settled: 1, turn_failed: 3 }, settledUsd: 0, denialReasons: {} };

    expect(
      evaluateAlerts(healthy24, failing6, emptyStats, makeEnv()).map((f) => f.rule),
    ).toContain('A2 error-rate');
    expect(
      evaluateAlerts(healthy24, tinySample6, emptyStats, makeEnv()).map((f) => f.rule),
    ).not.toContain('A2 error-rate');
  });

  it('fires A3 per denial reason and A4 past 80% of budget', () => {
    const spend24 = { counts: { turn_settled: 90 }, settledUsd: 33, denialReasons: {} };
    const denied1h = { counts: {}, settledUsd: 0, denialReasons: { daily_budget: 4 } };

    const rules = evaluateAlerts(spend24, emptyStats, denied1h, makeEnv()).map((f) => f.rule);
    expect(rules).toContain('A3 turn-denials');
    expect(rules).toContain('A4 spend'); // 33 > 0.8 * 40
  });

  it('stays quiet on a healthy window', () => {
    const healthy24 = { counts: { turn_settled: 90, session_minted: 60 }, settledUsd: 22, denialReasons: {} };
    const healthy6 = { counts: { turn_settled: 20 }, settledUsd: 5, denialReasons: {} };
    expect(evaluateAlerts(healthy24, healthy6, emptyStats, makeEnv())).toEqual([]);
  });
});

describe('buildDigest', () => {
  it('summarizes turns, denials, errors, and spend without leaking secrets', () => {
    const last24h = {
      counts: { turn_settled: 88, turn_failed: 2, session_minted: 60 },
      settledUsd: 23.28,
      denialReasons: { daily_budget: 51 },
    };
    const prev7d = { counts: { turn_settled: 540 }, settledUsd: 145, denialReasons: {} };

    const digest = buildDigest(last24h, prev7d, makeEnv());

    expect(digest).toContain('Turns: 88');
    expect(digest).toContain('daily_budget: 51');
    expect(digest).toContain('$23.28 of $40');
    expect(digest).not.toContain('must-not-appear');
  });
});

describe('runScheduled', () => {
  it('skips entirely without CF_ANALYTICS_API_TOKEN', async () => {
    const fetcher = vi.fn();
    await runScheduled(
      { cron: ALERT_SCAN_CRON } as ScheduledController,
      makeEnv({ CF_ANALYTICS_API_TOKEN: undefined }),
      fetcher as unknown as typeof fetch,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('posts alerts to Slack once and then respects the KV cooldown', async () => {
    const store = new Map<string, string>();
    const kv = {
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      put: vi.fn(async (key: string, value: string) => void store.set(key, value)),
    };
    const fetcher = vi.fn(async (url: string) => {
      if (String(url).includes('analytics_engine')) {
        return aeResponse([{ type: 'turn_denied', reason: 'daily_budget', n: '4', micro_usd: '0' }]);
      }
      return new Response('ok', { status: 200 });
    });
    const env = makeEnv({ ALERT_STATE: kv, SLACK_WEBHOOK_URL: 'https://hooks.slack.test/T/B/x' });

    await runScheduled({ cron: ALERT_SCAN_CRON } as ScheduledController, env, fetcher as unknown as typeof fetch);
    const slackCalls = () => fetcher.mock.calls.filter(([url]) => String(url).includes('hooks.slack.test'));
    // A1 (no settled turns) + A3 (daily_budget denial) both fire on this dataset.
    expect(slackCalls().length).toBe(2);
    expect(String(slackCalls()[1][1]?.body)).toContain('daily_budget');
    expect(JSON.stringify(slackCalls().map((c) => c[1]?.body))).not.toContain('token-must-not-appear');

    await runScheduled({ cron: ALERT_SCAN_CRON } as ScheduledController, env, fetcher as unknown as typeof fetch);
    expect(slackCalls().length).toBe(2); // cooldown suppressed the repeats
  });

  it('shadow-logs instead of posting when SLACK_WEBHOOK_URL is unset', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const fetcher = vi.fn(async () =>
      aeResponse([{ type: 'turn_settled', reason: '', n: '50', micro_usd: '12216628' }]),
    );

    await runScheduled(
      { cron: DAILY_DIGEST_CRON } as ScheduledController,
      makeEnv(),
      fetcher as unknown as typeof fetch,
    );

    const slackCalls = fetcher.mock.calls.filter(([url]) => !String(url).includes('analytics_engine'));
    expect(slackCalls).toEqual([]);
    expect(log.mock.calls.some(([line]) => String(line).includes('[telemetry shadow]'))).toBe(true);
    log.mockRestore();
  });
});

describe('keysEqual', () => {
  it('accepts only exact matches and rejects empty keys', async () => {
    const { keysEqual } = await import('../src/digest.js');
    expect(keysEqual('abc123', 'abc123')).toBe(true);
    expect(keysEqual('abc123', 'abc124')).toBe(false);
    expect(keysEqual('abc', 'abc123')).toBe(false);
    expect(keysEqual('', '')).toBe(false);
  });
});

describe('buildSummary', () => {
  it('returns aggregate windows and budget without secrets', async () => {
    const { buildSummary } = await import('../src/digest.js');
    const fetcher = vi.fn().mockImplementation(async () =>
      aeResponse([
        { type: 'turn_settled', reason: '', n: '50', micro_usd: '12216628' },
        { type: 'turn_denied', reason: 'daily_budget', n: '3', micro_usd: '0' },
        { type: 'session_minted', reason: '', n: '40', micro_usd: '0' },
      ]),
    );

    const summary = await buildSummary(makeEnv(), new Date('2026-08-02T15:00:00Z'), fetcher as unknown as typeof fetch);

    expect(summary.window_24h.turns_settled).toBe(50);
    expect(summary.window_24h.turns_denied.daily_budget).toBe(3);
    expect(summary.window_24h.spend_usd).toBeCloseTo(12.2166, 3);
    expect(summary.daily_budget_usd).toBe(40);
    expect(JSON.stringify(summary)).not.toContain('token-must-not-appear');
  });
});
