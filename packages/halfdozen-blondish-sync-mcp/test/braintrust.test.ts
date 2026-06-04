import assert from 'node:assert/strict';
import test from 'node:test';
import { braintrustHealth, summarizeBraintrustPayload } from '../src/braintrust.js';
import type { Env, SyncResult } from '../src/types.js';

test('summarizeBraintrustPayload emits counts and drift categories without row payloads', () => {
  const result: SyncResult = {
    ok: true,
    action: 'audit',
    created: 0,
    updated: 0,
    skipped: 3,
    errors: [],
    details: {
      source_rows_checked: 19,
      target_rows_checked: 620,
      matched_rows: 19,
      missing_hd_rows: [
        { source_page_id: 'source-page-a', ext_page_id: 'ST-ISH-9', ticket: 'Merchandise Funnel' },
      ],
      duplicate_hd_matches: [],
      contract_field_drifts: [
        { target_page_id: 'target-page-a', ext_page_id: 'ST-ISH-24', fields: ['External URL'] },
        { target_page_id: 'target-page-b', ext_page_id: 'ST-ISH-25', fields: ['External URL', 'External Files & Media'] },
      ],
      body_drifts: [{ target_page_id: 'target-page-c', ext_page_id: 'ST-ISH-26' }],
      reverse_status_drifts: [],
    },
  };

  const summary = summarizeBraintrustPayload(result);
  const serialized = JSON.stringify(summary);

  assert.equal(summary.action, 'audit');
  assert.equal(summary.source_rows_checked, 19);
  assert.equal(summary.target_rows_checked, 620);
  assert.equal(summary.missing_hd_rows_count, 1);
  assert.equal(summary.contract_field_drifts_count, 2);
  assert.equal(summary.body_drifts_count, 1);
  assert.deepEqual(summary.contract_field_drift_fields, {
    'External Files & Media': 1,
    'External URL': 2,
  });
  assert.doesNotMatch(serialized, /source-page-a|target-page-a|ST-ISH-24|Merchandise Funnel/);
});

test('summarizeBraintrustPayload keeps scoped repair plans compact', () => {
  const result: SyncResult = {
    ok: true,
    action: 'source_to_hd_repair_plan',
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    details: {
      repairable_missing_hd_rows: 1,
      repairable_external_url_drifts: 15,
      repairable_external_files_drifts: 0,
      other_contract_drifts: [],
      body_drifts: [],
      reverse_status_drifts: [],
      recommended_write_tools: [
        'blondish_sync_repair_external_url_drift',
        'blondish_sync_repair_missing_hd_rows',
      ],
      future_scale_note: 'Use Notion webhooks or a persisted sync index before this becomes a frequent full-scan workflow.',
    },
  };

  const summary = summarizeBraintrustPayload(result);

  assert.equal(summary.repairable_missing_hd_rows, 1);
  assert.equal(summary.repairable_external_url_drifts, 15);
  assert.equal(summary.other_contract_drifts_count, 0);
  assert.equal(summary.future_scale_note_present, true);
  assert.deepEqual(summary.recommended_write_tools, [
    'blondish_sync_repair_external_url_drift',
    'blondish_sync_repair_missing_hd_rows',
  ]);
});

test('braintrustHealth reports configured state without exposing secret values', () => {
  const health = braintrustHealth({
    BRAINTRUST_API_KEY: 'secret_token_should_not_render',
    BRAINTRUST_PROJECT_ID: 'project-id',
    BRAINTRUST_PROJECT_NAME: 'Custom Project',
  } as Env);

  assert.equal(health.enabled, true);
  assert.equal(health.api_key_configured, true);
  assert.equal(health.project_id_configured, true);
  assert.equal(health.project_name, 'Custom Project');
  assert.doesNotMatch(JSON.stringify(health), /secret_token_should_not_render/);
});
