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

describe('publishSnapshot', () => {
  const summary = {
    generated_at: '2026-08-03T14:05:00.000Z',
    window_24h: {
      turns_settled: 76,
      turns_failed: 0,
      turns_denied: {},
      sessions_minted: 47,
      sessions_rejected: 0,
      spend_usd: 19.0514,
    },
    window_7d: { turns_settled: 556, turns_failed: 0, spend_usd: 138.3769 },
    daily_budget_usd: 40,
  };

  it('no-ops without a token so the alert scan still runs', async () => {
    const { publishSnapshot } = await import('../src/digest.js');
    const fetcher = vi.fn();
    expect(await publishSnapshot(makeEnv(), summary, fetcher as unknown as typeof fetch)).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('commits the summary with the current blob sha and leaks no secrets', async () => {
    const { publishSnapshot } = await import('../src/digest.js');
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') return new Response('{}', { status: 200 });
      return new Response(JSON.stringify({ sha: 'blob-sha-1' }), { status: 200 });
    });

    const env = makeEnv({ GITHUB_SNAPSHOT_TOKEN: 'ghp-must-not-appear', GITHUB_SNAPSHOT_REPO: 'owner/repo' });
    expect(await publishSnapshot(env, summary, fetcher as unknown as typeof fetch)).toBe(true);

    const put = fetcher.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PUT');
    expect(String(put?.[0])).toBe('https://api.github.com/repos/owner/repo/contents/summary.json');
    const body = JSON.parse(String((put?.[1] as RequestInit)?.body));
    expect(body.sha).toBe('blob-sha-1');
    expect(JSON.parse(atob(body.content)).window_24h.turns_settled).toBe(76);
    expect(body.content).not.toContain('ghp-must-not-appear');
  });

  it('creates the file when it does not exist yet', async () => {
    const { publishSnapshot } = await import('../src/digest.js');
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') return new Response('{}', { status: 201 });
      return new Response('Not Found', { status: 404 });
    });

    await publishSnapshot(
      makeEnv({ GITHUB_SNAPSHOT_TOKEN: 'ghp' }),
      summary,
      fetcher as unknown as typeof fetch,
    );

    const put = fetcher.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PUT');
    expect(JSON.parse(String((put?.[1] as RequestInit)?.body)).sha).toBeUndefined();
  });

  it('throws on a rejected write so the caller can log it', async () => {
    const { publishSnapshot } = await import('../src/digest.js');
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === 'PUT' ? new Response('nope', { status: 403 }) : new Response(JSON.stringify({ sha: 'x' })),
    );
    await expect(
      publishSnapshot(makeEnv({ GITHUB_SNAPSHOT_TOKEN: 'ghp' }), summary, fetcher as unknown as typeof fetch),
    ).rejects.toThrow('403');
  });

  it('publishes on the hourly scan without breaking alert delivery', async () => {
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('analytics_engine')) {
        return aeResponse([{ type: 'turn_settled', reason: '', n: '76', micro_usd: '19051400' }]);
      }
      if (String(url).includes('api.github.com')) {
        return init?.method === 'PUT'
          ? new Response('{}', { status: 200 })
          : new Response(JSON.stringify({ sha: 'blob-sha-1' }), { status: 200 });
      }
      return new Response('ok', { status: 200 });
    });

    await runScheduled(
      { cron: ALERT_SCAN_CRON } as ScheduledController,
      makeEnv({ GITHUB_SNAPSHOT_TOKEN: 'ghp' }),
      fetcher as unknown as typeof fetch,
    );

    const put = fetcher.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PUT');
    expect(JSON.parse(atob(JSON.parse(String((put?.[1] as RequestInit)?.body)).content)).window_24h.turns_settled).toBe(76);
  });

  it('keeps scanning alerts when GitHub fails', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const fetcher = vi.fn(async (url: string) => {
      if (String(url).includes('analytics_engine')) return aeResponse([]);
      if (String(url).includes('api.github.com')) return new Response('boom', { status: 500 });
      return new Response('ok', { status: 200 });
    });

    await runScheduled(
      { cron: ALERT_SCAN_CRON } as ScheduledController,
      makeEnv({ GITHUB_SNAPSHOT_TOKEN: 'ghp', SLACK_WEBHOOK_URL: 'https://hooks.slack.test/T/B/x' }),
      fetcher as unknown as typeof fetch,
    );

    expect(log.mock.calls.some(([line]) => String(line).includes('snapshot publish failed'))).toBe(true);
    // A1 zero-traffic still reached Slack.
    expect(fetcher.mock.calls.some(([url]) => String(url).includes('hooks.slack.test'))).toBe(true);
    log.mockRestore();
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


describe('snapshot recovery safety', () => {
  it.each([401, 403, 429, 500])('never writes after GitHub read status %s', async (status) => {
    const { publishSnapshot } = await import('../src/digest.js');
    const fetcher = vi.fn().mockResolvedValue(new Response('unavailable', { status }));
    await expect(publishSnapshot(makeEnv({ GITHUB_SNAPSHOT_TOKEN: 'fixture' }), {} as any, fetcher))
      .rejects.toThrow(String(status));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([{}, { sha: '' }, { sha: 42 }])('rejects an invalid existing-file response %j without writing', async (payload) => {
    const { publishSnapshot } = await import('../src/digest.js');
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload)));
    await expect(publishSnapshot(makeEnv({ GITHUB_SNAPSHOT_TOKEN: 'fixture' }), {} as any, fetcher))
      .rejects.toThrow('blob SHA');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('rejects a repository URL before sending credentials', async () => {
    const { publishSnapshot } = await import('../src/digest.js');
    const fetcher = vi.fn();
    await expect(publishSnapshot(makeEnv({ GITHUB_SNAPSHOT_TOKEN: 'fixture', GITHUB_SNAPSHOT_REPO: 'https://example.test/repo' }), {} as any, fetcher))
      .rejects.toThrow('Invalid snapshot repository');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('a failed 7-day snapshot query does not suppress hourly alerts', async () => {
    const calls: string[] = [];
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push(String(url));
      if (String(url).includes('analytics_engine')) {
        if (String(init?.body).includes("INTERVAL '168' HOUR")) return new Response('fail', { status: 500 });
        return aeResponse([]);
      }
      return new Response('{}');
    });
    await runScheduled({ cron: ALERT_SCAN_CRON } as ScheduledController,
      makeEnv({ GITHUB_SNAPSHOT_TOKEN: 'fixture', SLACK_WEBHOOK_URL: 'https://hooks.slack.test/fixture' }), fetcher);
    expect(calls.some((url) => url.includes('hooks.slack.test'))).toBe(true);
    expect(calls.some((url) => url.includes('api.github.com'))).toBe(false);
  });

  it('a disabled publisher performs only the original three hourly queries', async () => {
    const fetcher = vi.fn().mockImplementation(async () => aeResponse([]));
    await runScheduled({ cron: ALERT_SCAN_CRON } as ScheduledController, makeEnv(), fetcher);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
