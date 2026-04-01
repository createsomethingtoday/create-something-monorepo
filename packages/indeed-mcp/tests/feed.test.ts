import assert from 'node:assert/strict';
import test from 'node:test';

import { buildIndeedApplyQueryString, renderIndeedApplyFeed } from '../src/feed.ts';
import type { IndeedJobRecord } from '../src/types.ts';

function buildJob(overrides: Partial<IndeedJobRecord> = {}): IndeedJobRecord {
  return {
    id: 'indeedjob_123',
    account_id: 'abundance',
    status: 'active',
    reference_number: 'REQ-123',
    requisition_id: 'REQ-123',
    title: 'Travel ICU Nurse',
    company_name: 'Abundance Nurse Staffing',
    source_name: 'Abundance',
    url: 'https://abundance.example/jobs/req-123?source=Indeed',
    city: 'Austin',
    state: 'TX',
    country: 'US',
    postal_code: '78701',
    street_address: null,
    description_html: '<p>ICU travel contract</p>',
    employment_type: 'contract',
    email: 'jobs@abundance.example',
    job_meta: 'nurse-staffing',
    phone_config: 'required',
    coverletter_config: 'optional',
    resume_config: 'required',
    name_config: 'firstlastname',
    questions_json: JSON.stringify({ questions: [{ id: 'q1', type: 'text', question: 'Compact license?' }] }),
    resume_fields_required_json: null,
    resume_fields_optional_json: null,
    metadata_json: null,
    published_at: '2026-04-01T12:00:00Z',
    created_at: '2026-04-01T12:00:00Z',
    updated_at: '2026-04-01T12:00:00Z',
    ...overrides,
  };
}

test('buildIndeedApplyQueryString includes the configured questions url when questions exist', () => {
  const query = buildIndeedApplyQueryString(
    buildJob(),
    {
      apiToken: 'token_123',
      publisher: 'CREATE SOMETHING',
      publisherUrl: 'https://createsomething.agency',
      publicBaseUrl: 'https://indeed-mcp.example',
    },
  );

  assert.match(query, /indeed-apply-apiToken=token_123/);
  assert.match(query, /indeed-apply-questions=https%3A%2F%2Findeed-mcp\.example%2Fquestions%2Findeedjob_123\.json/);
});

test('renderIndeedApplyFeed renders the root source node and the indeed-apply-data block', () => {
  const xml = renderIndeedApplyFeed(
    [buildJob()],
    {
      apiToken: 'token_123',
      publisher: 'CREATE SOMETHING',
      publisherUrl: 'https://createsomething.agency',
      publicBaseUrl: 'https://indeed-mcp.example',
    },
  );

  assert.match(xml, /<source>/);
  assert.match(xml, /<publisher><!\[CDATA\[CREATE SOMETHING\]\]><\/publisher>/);
  assert.match(xml, /<indeed-apply-data><!\[CDATA\[/);
  assert.match(xml, /Travel ICU Nurse/);
});

