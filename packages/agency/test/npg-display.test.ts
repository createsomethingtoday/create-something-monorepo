import assert from 'node:assert/strict';
import test from 'node:test';
import * as display from '../src/lib/npg/display.ts';
import { readFileSync } from 'node:fs';

test('Skip Trace contacts display only as exact review-required vendor evidence', () => {
  const data = {
    id: 'skiptrace-fixture',
    npi: '1234567890',
    status: 'review_required',
    charge_usd: 0.05,
    charge_reconciled: true,
    contacts: {
      emails: ['synthetic-person@example.invalid'],
      phones: ['synthetic-phone'],
      home_city: 'Example',
      home_state: 'MO'
    },
    provenance: {
      source: 'Apify one-api/skip-trace',
      actor: 'one-api/skip-trace',
      build: 'fixture',
      retrieved_at: '2026-11-11',
      ownership: 'unverified',
      consent: 'unverified',
      geography: 'registry_practice_not_home',
      readiness: 'blocked'
    },
    reason: 'Manual recruiter review required.'
  };
  assert.equal(
    display.actionLabel('enrich_candidate_skip_trace'),
    'Look up one candidate with Skip Trace'
  );
  const artifact = display.sourceArtifact(data);
  assert.ok(artifact.fields.some((field) => field.value === '0.05'));
  assert.ok(artifact.fields.some((field) => field.value === 'Manual recruiter review required.'));
  const section = artifact.sections.find((item) => /Skip Trace vendor contacts/.test(item.title));
  assert.ok(section?.fields.some((field) => field.value === 'synthetic-person@example.invalid'));
  assert.match(section!.title, /ownership and consent unverified/);
  assert.match(section!.title, /recruiting readiness blocked/);
  for (const status of [
    'blocked_review',
    'pending',
    'billing_review',
    'privacy_blocked',
    'association_failure',
    'ambiguous',
    'matched'
  ])
    assert.ok(
      !display
        .sourceArtifact({ ...data, status })
        .sections.some((item) => /Skip Trace/.test(item.title)),
      status
    );
  assert.ok(
    !display
      .sourceArtifact({ ...data, provenance: { source: 'another vendor' } })
      .sections.some((item) => /Skip Trace/.test(item.title))
  );
});

test('saved drafts recover from malformed shapes and retain only bounded string drafts', () => {
  for (const raw of ['null', '[]', '42', '"text"', '{bad', '{"new":42}'])
    assert.deepEqual({ ...display.readDrafts(raw) }, {});
  const id = '0d0822cf-c2ac-4713-a6ba-fef887b7bccc';
  const drafts = display.readDrafts(
    JSON.stringify({ new: 'Start here', [id]: 'Saved question', other: 'ignore', __proto__: null })
  );
  assert.deepEqual({ ...drafts }, { new: 'Start here', [id]: 'Saved question' });
  assert.deepEqual({ ...display.readDrafts(JSON.stringify({ new: 'x'.repeat(6001) })) }, {});
});

test('coverage projects nested snapshot evidence without substituting broad snapshot counts', () => {
  const artifact = display.sourceArtifact({
    total: 200,
    limit: 50,
    offset: 0,
    run: {
      id: 'snapshot-all-np',
      taxonomy_scope: 'all_np_taxonomies',
      source_published_at: '2026-09-14',
      provider_count: 500000
    },
    report: {
      persona: { taxonomy_code: '363LF0000X' },
      market_coverage_status: 'degraded',
      direct_outreach_status: 'blocked',
      completeness: { practice_phone_count: 150 },
      source: { latest_fetched_at: '2026-09-14', coverage_limit_reached: true },
      limitations: ['Certification unknown']
    }
  });
  assert.equal(artifact.total, 200);
  assert.equal(artifact.shown, null);
  for (const value of [
    'snapshot-all-np',
    '363LF0000X',
    'all_np_taxonomies',
    '2026-09-14',
    'degraded',
    'blocked',
    '150',
    'Yes',
    'Certification unknown'
  ])
    assert.ok(
      artifact.fields.some((field) => field.value === value),
      `Missing ${value}`
    );
  assert.ok(artifact.fields.some((field) => /Snapshot.*scope/i.test(field.label)));
});

test('registry and matched vendor evidence remain separate and preserve unknown authority', () => {
  const artifact = display.sourceArtifact({
    status: 'matched',
    source: 'People Data Labs',
    retrieved_at: '2026-11-11',
    registry: {
      npi: '1234567890',
      practice_phone: 'public-registry-phone',
      contact_route_status: 'public_registry_unverified'
    },
    professional: { job_title: 'Nurse practitioner' },
    provenance: { verification: 'unverified', consent_basis: 'not_recorded' }
  });
  assert.ok(artifact.fields.some((field) => field.value === '2026-11-11'));
  assert.ok(artifact.fields.some((field) => field.value === 'not_recorded'));
  assert.ok(
    artifact.sections.some(
      (section) =>
        /registry/i.test(section.title) &&
        section.fields.some((field) => field.value === 'public_registry_unverified')
    )
  );
  assert.ok(
    artifact.sections.some(
      (section) =>
        /vendor/i.test(section.title) &&
        section.fields.some((field) => field.value === 'Nurse practitioner')
    )
  );
  const ambiguous = display.sourceArtifact({
    status: 'ambiguous',
    professional: { work_email: 'unconfirmed@example.test' }
  });
  assert.equal(ambiguous.sections.length, 0);
  const practitioner = display.sourceArtifact({
    provider: { npi: '1234567890', source_fetched_at: '2026-09-14' },
    readiness: { stage: 'coverage_candidate', blocking_reasons: ['License unknown'] }
  });
  assert.ok(
    practitioner.sections.some((section) =>
      section.fields.some((field) => field.value === 'License unknown')
    )
  );
});

test('source artifact distinguishes returned page from matching total without inferring missing counts', () => {
  const data = {
    run_id: 'snapshot-1',
    total: 231,
    results: [{ npi: '1234567890' }],
    source_published_at: '2026-11-10',
    taxonomy_scope: 'all_np_taxonomies',
    unresolved_address_count: 17,
    limitation: 'Certification unknown',
    completeness: 'incomplete_geocoding'
  };
  const artifact = display.sourceArtifact(data);
  assert.equal(artifact.total, 231);
  assert.equal(artifact.shown, 1);
  assert.ok(artifact.fields.some((f) => f.value === 'snapshot-1'));
  assert.ok(artifact.fields.some((f) => f.value === 'Certification unknown'));
  assert.ok(artifact.fields.some((f) => f.value === '17'));
  assert.equal(display.sourceArtifact({ status: 'unavailable' }).total, null);
  assert.equal(display.sourceArtifact({ limit: 50 }).shown, null);
  assert.equal(display.sourceArtifact({ results: [] }).shown, 0);
});

test('source artifact reads structured MCP content, preserving safe full export queries', () => {
  const href =
    '/delivery/abundance/sourcing.csv?run_id=abc&taxonomy_code=363LF0000X%2C363LA2200X&offset=0';
  const artifact = display.sourceArtifact({
    content: [
      {
        type: 'text',
        text: JSON.stringify({ total: 20, displayed: 2, csv_download_url: href, status: 'partial' })
      }
    ]
  });
  assert.equal(artifact.total, 20);
  assert.equal(artifact.shown, 2);
  assert.equal(artifact.links[0], href);
  assert.ok(artifact.fields.some((f) => f.value === 'partial'));
  assert.deepEqual(display.sourceArtifact({ csv_download_url: 'javascript:alert(1)' }).links, []);
});

test('NPG uses a dedicated Astryx document without injecting its reset into Agency layouts', () => {
  const layout = readFileSync(new URL('../src/routes/+layout.svelte', import.meta.url), 'utf8');
  const workspace = readFileSync(
    new URL('../src/lib/npg/astryx/Workspace.tsx', import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(layout, /isNpgChatRoute|@astryxdesign/);
  assert.match(workspace, /<AppShell/);
  assert.match(workspace, /<ThreadSurface/);
  assert.doesNotMatch(workspace, /<ChatLayout/);
  assert.match(workspace, /<ChatComposerInput/);
  assert.doesNotMatch(workspace, /<main\b|isStopShown=|isStreaming=\{true\}/);
});

test('chat availability does not imply paid provider readiness', () => {
  assert.equal(display.conversationStatus('idle'), 'Chat ready');
  const ui = readFileSync(
    new URL('../src/lib/npg/astryx/Workspace.tsx', import.meta.url),
    'utf8'
  ).replace(/\s+/g, ' ');
  assert.match(ui, /Enrichment availability/);
  assert.match(ui, /Complete enrichment attempts PDL, Clay, Exa/);
  assert.match(ui, /There are no application spending limits/);
  assert.match(ui, /Skip Trace review/);
  assert.match(ui, /unknown estimate does not block your review/);
  assert.doesNotMatch(ui, /: 'Ready'/);
});

test('complete profile keeps provider evidence separate and hides ambiguous contacts', () => {
  const artifact = display.sourceArtifact({
    status: 'partial',
    npi: '1234567890',
    uncertain_dispatch: false,
    unstarted: ['exa'],
    providers: {
      pdl: {
        status: 'matched',
        professional: { name: 'Example', evidence: 'PDL evidence' },
        personal_contact: { email: 'pdl@example.invalid' }
      },
      clay: { status: 'pending', id: 'clay-job' },
      apify: { status: 'ambiguous', contacts: { emails: ['hidden@example.invalid'] } }
    }
  });
  assert.ok(artifact.sections.some((s) => s.title.startsWith('PDL · Vendor-reported personal')));
  assert.ok(
    artifact.sections.some(
      (s) =>
        s.title.startsWith('Clay · provider outcome') &&
        s.fields.some((f) => f.value === 'clay-job')
    )
  );
  assert.ok(artifact.sections.some((s) => s.title === 'Exa · not started or no result supplied'));
  assert.ok(!JSON.stringify(artifact.sections).includes('hidden@example.invalid'));
  assert.ok(artifact.fields.some((f) => f.label.startsWith('unstarted') && f.value === 'exa'));
});

test('review separates confirmed USD, unknown estimates and historical spend', () => {
  const fields = display.reviewFields({
    confirmedTrackedUsd: 0.2,
    estimatedUsd: null,
    pendingReceipts: 2,
    historicalSpend: 'Unknown',
    providerEstimates: [
      { provider: 'pdl', estimated_usd: null },
      { provider: 'apify', estimated_usd: 0.2 }
    ],
    maximumCost: 100,
    remaining: 99
  });
  assert.ok(
    fields.some((f) => f.label === 'Confirmed tracked subtotal (USD)' && f.value === '$0.20 USD')
  );
  assert.ok(fields.some((f) => f.label === 'Estimate (USD)' && f.value === 'Unknown'));
  assert.ok(
    fields.some(
      (f) => f.label === 'Provider estimates' && f.value.includes('PDL: Estimate unknown')
    )
  );
  assert.ok(!fields.some((f) => /maximum|remaining|allowance/i.test(f.label)));
});

test('confirmed subcent USD receipts remain visible without rounding to zero', () => {
  assert.equal(display.formatUsd(0.007), '$0.007 USD');
  assert.equal(display.formatUsd(0.001), '$0.001 USD');
  assert.equal(display.formatUsd(1), '$1.00 USD');
  assert.equal(display.formatUsd(0.0000001), '<$0.000001 USD');
  const spend = display
    .sourceArtifact({
      spend_tracking: { actual_usd: 0.007, estimated_usd: null, pending_receipts: 1 }
    })
    .sections.find((s) => s.title.startsWith('Spend tracking'));
  assert.ok(spend?.fields.some((f) => f.value === '$0.007 USD'));
});
test('only exact known receipt recovery is allowed from an uncertain conversation', () => {
  const view: any = {
    id: 'fixture',
    version: 1,
    status: 'ambiguous',
    messages: [],
    pending: null,
    sources: [
      {
        tool: 'enrich_candidate_complete_profile',
        data: {
          npi: '1234567890',
          providers: {
            apify: {
              npi: '1234567890',
              id: 'a'.repeat(64),
              run_id: 'ExistingSkipRun',
              status: 'pending',
              charge_reconciled: false
            }
          }
        }
      }
    ]
  };
  assert.equal((display as any).canRefreshSkipTrace(view), true);
  assert.equal((display as any).canSendNpgMessage(view, 'Refresh Skip Trace'), true);
  assert.equal((display as any).canSendNpgMessage(view, 'Enrich another person'), false);
  view.sources[0].data.providers.apify.npi = '9999999999';
  assert.equal((display as any).canRefreshSkipTrace(view), false);
});
test('cached prior run charge is not displayed as this operation spend', () => {
  const artifact = display.sourceArtifact({
    providers: {
      apify: { status: 'no_contact', cached: true, charge_usd: 0.007, charge_reconciled: true }
    }
  });
  const row = artifact.sections.find((s) => s.title.startsWith('Skip Trace · provider outcome'));
  assert.ok(
    row?.fields.some(
      (f) => f.label === 'Confirmed USD · no new charge (cached)' && f.value === '$0.00 USD'
    )
  );
});

test('explicit original cache status controls per-operation confirmed spend after receipt refresh', () => {
  for (const cached of [false, true]) {
    const row = display
      .sourceArtifact({
        providers: {
          apify: {
            status: 'pending',
            cached: true,
            operation_cache_hit: cached,
            operation_charge_usd: cached ? 0 : 0.01,
            charge_usd: 0.01,
            charge_reconciled: false
          }
        }
      })
      .sections.find((s) => s.title.startsWith('Skip Trace · provider outcome'));
    assert.ok(
      row?.fields.some(
        (f) =>
          f.label.startsWith('Confirmed USD') && f.value === (cached ? '$0.00 USD' : '$0.01 USD')
      )
    );
  }
});
