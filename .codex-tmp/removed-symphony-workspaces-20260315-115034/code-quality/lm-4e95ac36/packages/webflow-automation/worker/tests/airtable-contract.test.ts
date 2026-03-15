import assert from 'node:assert/strict';
import test from 'node:test';

import { buildOutboundPayload, createNormalizedFingerprint } from '../src/airtable.js';
import { AIRTABLE_FIELDS, type AirtableRecord, type IngestRequest, type ParseResult } from '../src/types.js';

test('createNormalizedFingerprint is deterministic for same normalized payload', () => {
  const request: IngestRequest = {
    source: 'slack_alerts_partner_onboarding_requests',
    channel_id: 'C123',
    message_ts: '1739999999.1234',
    thread_ts: '1739999999.1234',
    raw_text: 'Agency name: GH Branding',
    raw_payload: { x: 1 }
  };

  const parseResult: ParseResult = {
    parseStatus: 'partial',
    warnings: ['Workspace ID was not found.'],
    fields: { agencyName: 'GH Branding' },
    parsedKeyValues: { 'agency name': 'GH Branding' }
  };

  const first = createNormalizedFingerprint(request, parseResult);
  const second = createNormalizedFingerprint(request, parseResult);

  assert.equal(first, second);
});

test('buildOutboundPayload returns payload when record satisfies outbound trigger contract', () => {
  const record: AirtableRecord = {
    id: 'rec123',
    fields: {
      [AIRTABLE_FIELDS.WORKFLOW_STATE]: 'Done',
      [AIRTABLE_FIELDS.OUTBOUND_STATUS]: 'ready',
      [AIRTABLE_FIELDS.RESPONSE_TEXT]: 'Onboarding completed.',
      [AIRTABLE_FIELDS.RESPONSE_PAYLOAD_JSON]: JSON.stringify({ ok: true }),
      [AIRTABLE_FIELDS.MESSAGE_KEY]: 'C123:1739999999.1234',
      [AIRTABLE_FIELDS.SLACK_CHANNEL_ID]: 'C123',
      [AIRTABLE_FIELDS.SLACK_THREAD_TS]: '1739999999.1234',
      [AIRTABLE_FIELDS.SLACK_MESSAGE_TS]: '1739999999.1234',
      [AIRTABLE_FIELDS.WORKSPACE_ID]: 'ws_abc',
      [AIRTABLE_FIELDS.WORKSPACE_NAME]: 'GH Workspace',
      [AIRTABLE_FIELDS.AGENCY_NAME]: 'GH Branding',
      [AIRTABLE_FIELDS.CONTACT_NAME]: 'Edmar Batista',
      [AIRTABLE_FIELDS.CONTACT_EMAIL]: 'edmar@ghbranding.com.br',
      [AIRTABLE_FIELDS.CODEX_ACTION_RESULT]: 'success',
      [AIRTABLE_FIELDS.CODEX_ACTION_NOTES]: 'Manual admin action completed.'
    }
  };

  const payload = buildOutboundPayload(record);

  assert.ok(payload);
  assert.equal(payload?.event_type, 'partner_onboarding_completed');
  assert.equal(payload?.slack.channel_id, 'C123');
  assert.equal(payload?.result.response_text, 'Onboarding completed.');
  assert.equal(payload?.result.status, 'success');
});

test('buildOutboundPayload returns null when trigger contract is not satisfied', () => {
  const record: AirtableRecord = {
    id: 'rec456',
    fields: {
      [AIRTABLE_FIELDS.WORKFLOW_STATE]: 'In-Progress',
      [AIRTABLE_FIELDS.OUTBOUND_STATUS]: 'ready',
      [AIRTABLE_FIELDS.RESPONSE_TEXT]: 'not done yet'
    }
  };

  const payload = buildOutboundPayload(record);
  assert.equal(payload, null);
});
