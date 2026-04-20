import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractNurseSpecialty,
  extractPayRange,
  getPublicJobsConfig,
  mapAdzunaJobToInboundJob,
  mapExaResultToInboundJob,
} from '../src/lib/server/abundance-public-jobs.ts';

test('extractPayRange parses weekly travel nurse ranges', () => {
  const pay = extractPayRange('Travel RN pays $1,876-$2,084.08 / wk with nights 3x12.');

  assert.equal(pay.payMin, 1876);
  assert.equal(pay.payMax, 2084.08);
  assert.equal(pay.payPeriod, 'week');
});

test('extractNurseSpecialty recognizes common travel nurse specialties', () => {
  assert.equal(extractNurseSpecialty('Travel ICU Registered Nurse'), 'ICU');
  assert.equal(extractNurseSpecialty('Labor & Delivery travel RN opening'), 'Labor & Delivery');
  assert.equal(extractNurseSpecialty('Telemetry / MS-Tele contract'), 'Telemetry');
});

test('mapAdzunaJobToInboundJob preserves structured public-job fields', () => {
  const mapped = mapAdzunaJobToInboundJob(
    {
      id: 42,
      title: 'Travel ICU RN',
      description: '13 weeks. Nights. Starts on May 4, 2026.',
      redirect_url: 'https://example.com/jobs/42',
      created: '2026-04-20T10:00:00Z',
      salary_min: 102000,
      salary_max: 118000,
      contract_type: 'contract',
      contract_time: 'full_time',
      company: { display_name: 'Aya Healthcare' },
      location: { display_name: 'Dallas, TX' },
      category: { label: 'Healthcare & Nursing Jobs' },
    },
    {
      query: 'travel nurse',
      sourceRunId: 'adzuna:test',
    },
  );

  assert.equal(mapped.source_system, 'adzuna');
  assert.equal(mapped.external_job_id, '42');
  assert.equal(mapped.specialty, 'ICU');
  assert.equal(mapped.pay_min, 102000);
  assert.equal(mapped.pay_max, 118000);
  assert.equal(mapped.pay_period, 'year');
  assert.equal(mapped.shift, 'Nights');
  assert.equal(mapped.duration_weeks, 13);
  assert.equal(mapped.start_date, '2026-05-04');
  assert.equal(mapped.category, 'Healthcare & Nursing Jobs');
});

test('mapExaResultToInboundJob infers employer, pay, and specialty from public-board text', () => {
  const mapped = mapExaResultToInboundJob(
    {
      id: 'exa-1',
      title: 'Travel ER Registered Nurse',
      url: 'https://www.ayahealthcare.com/travel-nursing-job/3267385',
      publishedDate: '2026-04-20',
      text: 'Prosper, TX. 13 weeks. Starts on May 4, 2026. $1,637-$1,866/wk. Nights 3x12.',
    },
    {
      query: 'travel nurse',
      sourceRunId: 'exa:test',
    },
  );

  assert.equal(mapped.source_system, 'exa');
  assert.equal(mapped.employer, 'Aya Healthcare');
  assert.equal(mapped.location, 'Prosper, TX');
  assert.equal(mapped.specialty, 'ER');
  assert.equal(mapped.pay_min, 1637);
  assert.equal(mapped.pay_max, 1866);
  assert.equal(mapped.pay_period, 'week');
  assert.equal(mapped.duration_weeks, 13);
  assert.equal(mapped.start_date, '2026-05-04');
});

test('getPublicJobsConfig falls back to funnel automation Composio user id', () => {
  const config = getPublicJobsConfig({
    ABUNDANCE_ADZUNA_APP_ID: ' adzuna-id ',
    ABUNDANCE_ADZUNA_APP_KEY: ' adzuna-key ',
    FUNNEL_AUTOMATION_COMPOSIO_USER_ID: ' ops-runner ',
  } as App.Platform['env']);

  assert.equal(config.adzuna.appId, 'adzuna-id');
  assert.equal(config.adzuna.appKey, 'adzuna-key');
  assert.equal(config.exa.userId, 'ops-runner');
});
