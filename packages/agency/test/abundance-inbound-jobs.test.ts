import assert from 'node:assert/strict';
import test from 'node:test';

import {
  handoffInboundJobToFunnelLead,
  computeInboundJobDedupeKey,
  normalizeInboundJobInput,
  toInboundJobsCsv
} from '../src/lib/server/abundance-inbound-jobs.ts';
import { buildAbundanceLeadInputFromInboundJob } from '../src/lib/server/funnel-leads.ts';
import type { Lead } from '../src/lib/funnel/types.ts';
import type { InboundJob } from '../src/lib/types/abundance.ts';

test('normalizeInboundJobInput JSON-encodes string raw payload values', () => {
  const normalized = normalizeInboundJobInput({
    source_agent: ' scout-alpha ',
    title: ' ICU RN ',
    raw_payload: '  source text  '
  });

  assert.equal(normalized.source_agent, 'scout-alpha');
  assert.equal(normalized.title, 'ICU RN');
  assert.equal(JSON.parse(normalized.raw_payload), 'source text');
});

test('computeInboundJobDedupeKey ignores tracking params and query ordering', () => {
  const left = computeInboundJobDedupeKey({
    job_url: 'HTTPS://Example.com/jobs/RN-123?utm_source=meta&b=2&a=1',
    title: 'ignored',
    employer: 'ignored',
    location: 'ignored'
  });
  const right = computeInboundJobDedupeKey({
    job_url: 'https://example.com/jobs/RN-123?a=1&b=2&utm_campaign=spring',
    title: 'ignored',
    employer: 'ignored',
    location: 'ignored'
  });

  assert.equal(left, right);
});

test('computeInboundJobDedupeKey falls back to normalized metadata when no URL exists', () => {
  const left = computeInboundJobDedupeKey({
    external_job_id: ' ABC-123 ',
    title: 'Travel Nurse',
    employer: 'Mercy West',
    location: 'Dallas, TX'
  });
  const right = computeInboundJobDedupeKey({
    external_job_id: 'abc-123',
    title: 'travel nurse',
    employer: 'mercy west',
    location: 'dallas, tx'
  });

  assert.equal(left, right);
});

test('toInboundJobsCsv writes raw string payloads without double JSON encoding', () => {
  const csv = toInboundJobsCsv([
    createInboundJob({
      raw_payload: 'poster, rn'
    })
  ]);

  const row = csv.split('\n')[1] ?? '';
  assert.match(row, /,"poster, rn"$/);
  assert.equal(row.includes('"""poster, rn"""'), false);
});

test('buildAbundanceLeadInputFromInboundJob maps qualified jobs into funnel lead input', () => {
  const leadInput = buildAbundanceLeadInputFromInboundJob(
    createInboundJob({
      status: 'qualified',
      source_agents: ['scout-alpha', 'scout-beta'],
      source_system: 'halfdozen',
      source_run_id: 'run-42',
      notes: 'Ready for recruiter handoff.'
    }),
    {
      operator_email: 'operator@example.com',
      handed_off_at: '2026-04-20T15:55:00.000Z',
      estimated_value: 25000
    }
  );

  assert.equal(leadInput.source, 'abundance');
  assert.equal(leadInput.stage, 'decision');
  assert.equal(leadInput.company, 'Mercy West');
  assert.equal(leadInput.estimated_value, 25000);
  assert.match(leadInput.source_detail ?? '', /Abundance inbound job/);
  assert.match(leadInput.notes ?? '', /Handed off by: operator@example.com/);
  assert.match(leadInput.notes ?? '', /Ready for recruiter handoff/);
});

test('handoffInboundJobToFunnelLead is idempotent when a linked lead already exists', async () => {
  const job = createInboundJob({
    status: 'qualified',
    funnel_lead_id: 'lead_existing',
    funnel_handoff_at: '2026-04-20T15:55:00.000Z'
  });
  const lead = createLead({ id: 'lead_existing' });
  let createCalls = 0;
  let updateCalls = 0;

  const result = await handoffInboundJobToFunnelLead({} as D1Database, job.id, {}, {
    getInboundJob: async () => job,
    getLead: async () => lead,
    createLead: async () => {
      createCalls += 1;
      return lead;
    },
    updateInboundJobHandoff: async () => {
      updateCalls += 1;
      return job;
    },
    now: () => '2026-04-20T16:00:00.000Z'
  });

  assert.equal(result?.created, false);
  assert.equal(result?.lead.id, 'lead_existing');
  assert.equal(createCalls, 0);
  assert.equal(updateCalls, 0);
});

test('handoffInboundJobToFunnelLead creates and links a new lead for a qualified job', async () => {
  const job = createInboundJob({
    status: 'qualified',
    notes: 'Pay confirmed.'
  });
  const lead = createLead({
    id: 'lead_created',
    source: 'abundance',
    company: job.employer ?? undefined,
    name: job.title
  });

  let updateArgs:
    | {
        id: string;
        funnel_lead_id: string;
        funnel_handoff_at: string;
      }
    | null = null;

  const result = await handoffInboundJobToFunnelLead({} as D1Database, job.id, { operator_email: 'ops@example.com' }, {
    getInboundJob: async () => job,
    getLead: async () => null,
    createLead: async (_db, input) => {
      assert.equal(input.source, 'abundance');
      assert.equal(input.stage, 'decision');
      assert.match(input.notes ?? '', /Pay confirmed/);
      return lead;
    },
    updateInboundJobHandoff: async (_db, id, input) => {
      updateArgs = { id, ...input };
      return {
        ...job,
        funnel_lead_id: input.funnel_lead_id,
        funnel_handoff_at: input.funnel_handoff_at
      };
    },
    now: () => '2026-04-20T16:05:00.000Z'
  });

  assert.equal(result?.created, true);
  assert.equal(result?.lead.id, 'lead_created');
  assert.deepEqual(updateArgs, {
    id: job.id,
    funnel_lead_id: 'lead_created',
    funnel_handoff_at: '2026-04-20T16:05:00.000Z'
  });
  assert.equal(result?.job.funnel_lead_id, 'lead_created');
});

test('handoffInboundJobToFunnelLead rejects non-qualified jobs', async () => {
  await assert.rejects(
    () =>
      handoffInboundJobToFunnelLead({} as D1Database, 'abj_test', {}, {
        getInboundJob: async () => createInboundJob({ status: 'reviewing' }),
        getLead: async () => null,
        createLead: async () => {
          throw new Error('createLead should not be called');
        },
        updateInboundJobHandoff: async () => {
          throw new Error('updateInboundJobHandoff should not be called');
        },
        now: () => '2026-04-20T16:10:00.000Z'
      }),
    /Only qualified inbound jobs can be handed off/
  );
});

function createInboundJob(overrides: Partial<InboundJob> = {}): InboundJob {
  return {
    id: 'abj_test',
    source_agent: 'scout-alpha',
    source_agents: ['scout-alpha'],
    source_run_id: null,
    source_system: 'manual',
    external_job_id: null,
    job_url: 'https://example.com/jobs/RN-123',
    employer: 'Mercy West',
    location: 'Dallas, TX',
    title: 'Travel Nurse',
    status: 'new',
    dedupe_key: 'dedupe-key',
    raw_payload: { title: 'Travel Nurse' },
    notes: null,
    funnel_lead_id: null,
    funnel_handoff_at: null,
    seen_count: 1,
    ingested_at: '2026-04-18T00:00:00.000Z',
    last_seen_at: '2026-04-18T00:00:00.000Z',
    reviewed_at: null,
    updated_at: '2026-04-18T00:00:00.000Z',
    ...overrides
  };
}

function createLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead_test',
    name: 'Travel Nurse',
    email: undefined,
    company: 'Mercy West',
    role: undefined,
    linkedin_url: undefined,
    source: 'other',
    source_detail: undefined,
    campaign: undefined,
    stage: 'decision',
    estimated_value: undefined,
    actual_value: undefined,
    service_interest: undefined,
    first_touch_at: '2026-04-20T15:55:00.000Z',
    last_touch_at: '2026-04-20T15:55:00.000Z',
    discovery_call_at: undefined,
    proposal_sent_at: undefined,
    closed_at: undefined,
    notes: undefined,
    created_at: '2026-04-20T15:55:00.000Z',
    updated_at: '2026-04-20T15:55:00.000Z',
    ...overrides
  };
}
