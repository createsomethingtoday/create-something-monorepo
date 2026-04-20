import assert from 'node:assert/strict';
import test from 'node:test';

import { type Lead } from '../src/lib/funnel/types.ts';
import {
  buildGmailLeadDraft,
  getFunnelAutomationConfig,
  runFunnelLeadAutomation
} from '../src/lib/server/funnel-automation.ts';

test('getFunnelAutomationConfig parses Slack, Notion, and Gmail automation settings', () => {
  const config = getFunnelAutomationConfig({
    FUNNEL_AUTOMATION_ENABLED: 'true',
    FUNNEL_AUTOMATION_COMPOSIO_USER_ID: ' ops_runner ',
    FUNNEL_AUTOMATION_SLACK_CHANNEL: ' C123 ',
    FUNNEL_AUTOMATION_SLACK_CONNECTED_ACCOUNT_ID: ' slack_conn ',
    FUNNEL_AUTOMATION_NOTION_DATABASE_ID: ' notion_db ',
    FUNNEL_AUTOMATION_NOTION_CONNECTED_ACCOUNT_ID: ' notion_conn ',
    FUNNEL_AUTOMATION_GMAIL_ENABLED: 'yes',
    FUNNEL_AUTOMATION_GMAIL_CONNECTED_ACCOUNT_ID: ' gmail_conn ',
    FUNNEL_AUTOMATION_GMAIL_DRAFT_TOOL_SLUG: ' GMAIL_CREATE_EMAIL_DRAFT '
  } as App.Platform['env']);

  assert.equal(config.enabled, true);
  assert.equal(config.composioUserId, 'ops_runner');
  assert.equal(config.slack.channel, 'C123');
  assert.equal(config.slack.connectedAccountId, 'slack_conn');
  assert.equal(config.notion.databaseId, 'notion_db');
  assert.equal(config.notion.connectedAccountId, 'notion_conn');
  assert.equal(config.gmail.enabled, true);
  assert.equal(config.gmail.connectedAccountId, 'gmail_conn');
  assert.equal(config.gmail.draftToolSlug, 'GMAIL_CREATE_EMAIL_DRAFT');
});

test('buildGmailLeadDraft uses job-oriented copy for abundance leads', () => {
  const draft = buildGmailLeadDraft(
    createLead({
      source: 'abundance',
      name: 'Director of Nursing',
      company: 'Mercy West',
      email: 'recruiter@example.com',
      stage: 'decision'
    }),
    'lead_created',
    null
  );

  assert.match(draft.subject, /Director of Nursing role at Mercy West/);
  assert.match(draft.body, /came across the Director of Nursing role at Mercy West/i);
  assert.match(draft.body, /https:\/\/createsomething\.agency\/book/);
});

test('buildGmailLeadDraft mentions stage transitions for standard leads', () => {
  const previousLead = createLead({
    stage: 'awareness',
    company: 'Create Something',
    source: 'referral'
  });
  const draft = buildGmailLeadDraft(
    createLead({
      stage: 'decision',
      company: 'Create Something',
      source: 'referral',
      email: 'owner@example.com'
    }),
    'stage_changed',
    previousLead
  );

  assert.match(draft.subject, /Workflow mapping session for Create Something/);
  assert.match(draft.body, /moved from awareness to decision/i);
});

test('runFunnelLeadAutomation is a no-op when automation is disabled', async () => {
  const result = await runFunnelLeadAutomation({
    db: {} as D1Database,
    env: {
      FUNNEL_AUTOMATION_ENABLED: 'false'
    } as App.Platform['env'],
    lead: createLead(),
    trigger: 'manual',
    force: true
  });

  assert.equal(result.enabled, false);
  assert.deepEqual(result.configuredDestinations, []);
  assert.deepEqual(result.events, []);
});

function createLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead_test',
    name: 'Operations Lead',
    email: 'ops@example.com',
    company: 'Create Something',
    role: undefined,
    linkedin_url: undefined,
    source: 'other',
    source_detail: undefined,
    campaign: undefined,
    stage: 'decision',
    estimated_value: undefined,
    actual_value: undefined,
    service_interest: 'workflow mapping',
    first_touch_at: '2026-04-20T15:55:00.000Z',
    last_touch_at: '2026-04-20T15:55:00.000Z',
    discovery_call_at: undefined,
    proposal_sent_at: undefined,
    closed_at: undefined,
    notes: 'Interested in governed automation.',
    created_at: '2026-04-20T15:55:00.000Z',
    updated_at: '2026-04-20T15:55:00.000Z',
    ...overrides
  };
}
