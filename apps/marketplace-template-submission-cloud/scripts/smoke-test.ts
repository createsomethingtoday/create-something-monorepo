#!/usr/bin/env tsx
/**
 * Post-deploy smoke test for marketplace-template-submission-cloud.
 *
 * Usage:
 *   pnpm exec tsx scripts/smoke-test.ts <base-url>
 *
 * Example:
 *   pnpm exec tsx scripts/smoke-test.ts https://submission.webflow.app
 *
 * Exercises every intake endpoint with a safe probe payload. Does NOT fire
 * the Airtable webhook end-to-end — the /api/intake/creator and template
 * handlers are exercised with deliberately invalid payloads (missing
 * required fields) so we verify route liveness + input validation without
 * writing records to the Automation pipeline.
 *
 * For a true end-to-end dryrun that does hit the webhook, use the
 * test-webhook-dryrun.ts pattern from webflow-dashboard-cloud.
 */

const baseUrl = (process.argv[2] || '').replace(/\/$/, '');
if (!baseUrl) {
  console.error('usage: tsx scripts/smoke-test.ts <base-url>');
  process.exit(2);
}

type Probe = {
  name: string;
  path: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  expectStatuses: number[];
  expectJson?: (data: unknown) => string | null;
};

const probes: Probe[] = [
  {
    name: 'GET /',
    path: '/',
    method: 'GET',
    expectStatuses: [200, 307, 308],
  },
  {
    name: 'GET /submit',
    path: '/submit',
    method: 'GET',
    expectStatuses: [200],
  },
  {
    name: 'POST /api/intake/check-email (malformed)',
    path: '/api/intake/check-email',
    body: {},
    expectStatuses: [400, 403],
  },
  {
    name: 'POST /api/intake/check-creator (malformed)',
    path: '/api/intake/check-creator',
    body: {},
    expectStatuses: [400, 403],
  },
  {
    name: 'POST /api/intake/check-template-name (malformed)',
    path: '/api/intake/check-template-name',
    body: {},
    expectStatuses: [400, 403],
  },
  {
    name: 'POST /api/intake/validate-published-url (malformed)',
    path: '/api/intake/validate-published-url',
    body: {},
    expectStatuses: [400, 403],
  },
  {
    name: 'POST /api/intake/creator (malformed — should reject before webhook)',
    path: '/api/intake/creator',
    body: { primaryEmail: '', webflowEmail: '' },
    expectStatuses: [400, 403],
    expectJson: (data) => {
      const obj = data as { error?: string };
      if (!obj.error) return 'expected error field';
      return null;
    },
  },
  {
    name: 'POST /api/intake/template (malformed — should reject before webhook)',
    path: '/api/intake/template',
    body: { creatorEmail: '' },
    expectStatuses: [400, 403],
    expectJson: (data) => {
      const obj = data as { error?: string };
      if (!obj.error) return 'expected error field';
      return null;
    },
  },
];

const results: { probe: Probe; pass: boolean; status: number; note?: string }[] = [];

async function main() {
    for (const probe of probes) {
    const url = `${baseUrl}${probe.path}`;
    const method = probe.method ?? 'POST';

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers:
          method === 'POST'
            ? { 'Content-Type': 'application/json', Origin: baseUrl }
            : { Origin: baseUrl },
        body: method === 'POST' ? JSON.stringify(probe.body ?? {}) : undefined,
        redirect: 'manual',
      });
    } catch (err) {
      results.push({
        probe,
        pass: false,
        status: 0,
        note: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    const statusOk = probe.expectStatuses.includes(response.status);
    let jsonNote: string | null = null;
    if (probe.expectJson && response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json().catch(() => null);
      jsonNote = data ? probe.expectJson(data) : 'response was not JSON';
    }

    results.push({
      probe,
      pass: statusOk && !jsonNote,
      status: response.status,
      note: jsonNote ?? undefined,
    });
  }
}

const pad = (s: string, n: number) => (s.length >= n ? s : s + ' '.repeat(n - s.length));

main().then(() => {
  console.log(`\nSmoke test: ${baseUrl}\n`);
  for (const r of results) {
    const mark = r.pass ? '✓' : '✗';
    const status = String(r.status).padStart(3);
    const name = pad(r.probe.name, 60);
    const note = r.note ? ` — ${r.note}` : '';
    console.log(`  ${mark} ${status}  ${name}${note}`);
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);

  if (failed.length > 0) {
    process.exit(1);
  }
});

export {};
