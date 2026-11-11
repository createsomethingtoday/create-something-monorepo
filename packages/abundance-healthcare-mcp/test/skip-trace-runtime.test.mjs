import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(new URL('../worker/package.json', import.meta.url));
const wrangler = require.resolve('wrangler');
const { Miniflare } = createRequire(wrangler)('miniflare');
test('real workerd singleton DO: privacy preflight, duplicate dispatch, persisted projection and budget', async () => {
  const bundle = mkdtempSync(join(tmpdir(), 'skip-runtime-'));
  execFileSync(process.execPath, [wrangler, 'deploy', '--dry-run', '--outdir', bundle], {
    cwd: new URL('../worker', import.meta.url),
    stdio: 'pipe',
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }
  });
  let posts = 0;
  const mf = new Miniflare({
    modules: [{ type: 'ESModule', path: join(bundle, 'index.js') }],
    modulesRoot: bundle,
    compatibilityDate: '2026-07-15',
    compatibilityFlags: ['nodejs_compat'],
    durableObjects: {
      SKIP_TRACE: { className: 'SkipTraceProfiles', useSQLite: true },
      PDL_PROFILES: { className: 'PdlProfiles', useSQLite: true },
      MCP_OBJECT: { className: 'AbundanceHealthcareMCP', useSQLite: true }
    },
    bindings: {
      APIFY_API_TOKEN: 'synthetic',
      APIFY_PRIVACY_DATASET_ID: 'sentinel',
      APIFY_DAILY_BUDGET_USD: '0.1'
    },
    outboundService: async (request) => {
      const u = new URL(request.url);
      if (u.pathname === '/v2/users/me') return Response.json({ data: { id: 'owner' } });
      if (u.pathname === '/v2/datasets/sentinel/items')
        return request.headers.has('Authorization')
          ? Response.json([])
          : Response.json(
              {
                error: {
                  type: 'insufficient-permissions',
                  message:
                    "Insufficient permissions for the dataset. Make sure you're passing a correct API token and that it has the required permissions."
                }
              },
              { status: 403 }
            );
      if (u.pathname === '/v2/datasets/sentinel')
        return request.headers.has('Authorization')
          ? Response.json({
              data: {
                id: 'sentinel',
                itemCount: 0,
                generalAccess: 'FOLLOW_USER_SETTING',
                userId: 'owner'
              }
            })
          : new Response(null, { status: 403 });
      if (request.method === 'POST') {
        posts++;
        assert.equal(u.searchParams.get('forcePermissionLevel'), 'LIMITED_PERMISSIONS');
        return Response.json({
          data: { id: 'run1', defaultDatasetId: 'dataset1', userId: 'owner' }
        });
      }
      if (request.method === 'PUT') return Response.json({ data: {} });
      if (u.pathname.endsWith('/items'))
        return Response.json([
          {
            'Search Option': 'Name+CityStateZip Search',
            'Input Given': 'Synthetic Middle Example; Austin, TX',
            'First Name': 'Synthetic',
            'Last Name': 'Example',
            'Address Region': 'TX',
            'Email-1': 'synthetic@example.test',
            'Phone-1': '(512) 555-0100',
            'Person Link': 'https://example.test/synthetic',
            DOB: 'FORBIDDEN'
          }
        ]);
      if (u.pathname.includes('/datasets/'))
        return Response.json({
          data: { id: 'dataset1', userId: 'owner', generalAccess: 'RESTRICTED' }
        });
      return Response.json({
        data: {
          generalAccess: 'RESTRICTED',
          userId: 'owner',
          id: 'run1',
          actId: 'vmf6h5lxPAkB1W2gT',
          defaultDatasetId: 'dataset1',
          buildNumber: '0.0.192',
          status: 'SUCCEEDED',
          usageTotalUsd: 0.07
        }
      });
    }
  });
  try {
    const ns = await mf.getDurableObjectNamespace('SKIP_TRACE');
    const stub = ns.get(ns.idFromName('npg-skip-trace-v1'));
    const body = {
      npi: '1234567890',
      first: 'Synthetic',
      full_name: 'Synthetic Middle Example',
      last: 'Example',
      practice_city: 'Austin',
      practice_state: 'TX',
      confirm_paid_enrichment: true
    };
    const invoke = (b) =>
      stub.fetch('https://skip.internal/enrich', { method: 'POST', body: JSON.stringify(b) });
    const responses = await Promise.all([invoke(body), invoke(body)]);
    assert.ok(responses.every((r) => r.ok));
    const result = await (await invoke(body)).json();
    assert.equal(result.status, 'review_required');
    assert.deepEqual(result.contacts.phones, ['+15125550100']);
    assert.ok(!JSON.stringify(result).includes('FORBIDDEN'));
    assert.equal(posts, 1);
    assert.equal((await invoke({ ...body, npi: '9999999999' })).status, 503);
  } finally {
    await mf.dispose();
    rmSync(bundle, { recursive: true, force: true });
  }
});
