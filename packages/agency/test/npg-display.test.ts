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
