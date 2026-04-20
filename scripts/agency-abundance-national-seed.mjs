#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const ADZUNA_API_BASE_URL = 'https://api.adzuna.com/v1/api';
const DEFAULT_COUNTRY = 'us';
const DEFAULT_RESULTS_PER_REQUEST = 10;
const DEFAULT_BASE_URL = 'https://create-something-agency.pages.dev';
const DEFAULT_REQUEST_DELAY_MS = 150;
const DEFAULT_REGIONAL_LOCATIONS = [
  'California',
  'Texas',
  'Florida',
  'New York',
  'Illinois',
  'Georgia',
  'North Carolina',
  'Ohio',
  'Washington',
  'Colorado',
  'Arizona',
  'Pennsylvania',
];
const DEFAULT_NATIONAL_QUERIES = [
  { query: 'travel nurse', pages: [1, 2, 3, 4] },
  { query: 'ER RN', pages: [1, 2] },
  { query: 'ICU RN', pages: [1, 2] },
  { query: 'Telemetry RN', pages: [1, 2] },
  { query: 'Labor and Delivery RN', pages: [1, 2] },
];

async function main() {
  const config = loadConfig();
  const specs = buildSeedSpecs(config);
  const startedAt = new Date().toISOString();
  const createdIds = new Set();
  const duplicateIds = new Set();
  const errors = [];
  const callSummaries = [];

  for (const [index, spec] of specs.entries()) {
    try {
      const jobs = await fetchAdzunaJobs(config, spec);
      let created = 0;
      let duplicate = 0;

      for (const job of jobs) {
        if (!normalizeNullableString(job.title)) continue;

        const ingestResult = await ingestJob(config, mapAdzunaJobToInboundJob(job, {
          query: spec.query,
          sourceRunId: spec.sourceRunId,
        }));

        if (ingestResult.created) {
          created += 1;
          createdIds.add(ingestResult.id);
        } else if (ingestResult.duplicate) {
          duplicate += 1;
          duplicateIds.add(ingestResult.id);
        }
      }

      callSummaries.push({
        label: spec.label,
        query: spec.query,
        location: spec.location ?? null,
        page: spec.page,
        fetched: jobs.length,
        created,
        duplicate,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({
        label: spec.label,
        query: spec.query,
        location: spec.location ?? null,
        page: spec.page,
        error: message,
      });
    }

    if (index < specs.length - 1 && config.requestDelayMs > 0) {
      await sleep(config.requestDelayMs);
    }
  }

  const summary = {
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    base_url: config.baseUrl,
    country: config.country,
    seed_id: config.seedId,
    requests_attempted: specs.length,
    requests_succeeded: callSummaries.length,
    requests_failed: errors.length,
    jobs_fetched: callSummaries.reduce((sum, item) => sum + item.fetched, 0),
    jobs_created: callSummaries.reduce((sum, item) => sum + item.created, 0),
    jobs_duplicate: callSummaries.reduce((sum, item) => sum + item.duplicate, 0),
    unique_created_ids: createdIds.size,
    unique_duplicate_ids: duplicateIds.size,
    call_summaries: callSummaries,
    errors,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (callSummaries.length === 0) {
    process.exitCode = 1;
  }
}

function loadConfig() {
  const infisicalPayload = readInfisicalPayload();

  const adzunaAppId = readRequiredSecret(infisicalPayload, 'ABUNDANCE_ADZUNA_APP_ID');
  const adzunaAppKey = readRequiredSecret(infisicalPayload, 'ABUNDANCE_ADZUNA_APP_KEY');
  const ingestApiKey = readRequiredSecret(infisicalPayload, 'ABUNDANCE_INGEST_API_KEY');
  const baseUrl = normalizeBaseUrl(process.env.ABUNDANCE_BASE_URL ?? DEFAULT_BASE_URL);
  const country = (process.env.ABUNDANCE_COUNTRY ?? DEFAULT_COUNTRY).trim().toLowerCase();
  const resultsPerRequest = clampInt(
    process.env.ABUNDANCE_RESULTS_PER_REQUEST,
    DEFAULT_RESULTS_PER_REQUEST,
    1,
    20,
  );
  const requestDelayMs = clampInt(
    process.env.ABUNDANCE_REQUEST_DELAY_MS,
    DEFAULT_REQUEST_DELAY_MS,
    0,
    5000,
  );
  const regionalLocations = splitList(process.env.ABUNDANCE_REGIONAL_LOCATIONS) ?? DEFAULT_REGIONAL_LOCATIONS;
  const seedId = `national-seed-${new Date().toISOString().replace(/[:.]/g, '-')}`;

  return {
    adzunaAppId,
    adzunaAppKey,
    ingestApiKey,
    baseUrl,
    country,
    resultsPerRequest,
    requestDelayMs,
    regionalLocations,
    seedId,
  };
}

function buildSeedSpecs(config) {
  const specs = [];

  for (const querySpec of DEFAULT_NATIONAL_QUERIES) {
    for (const page of querySpec.pages) {
      specs.push({
        label: `${slugify(querySpec.query)}-page-${page}`,
        query: querySpec.query,
        page,
        location: null,
        sourceRunId: `${config.seedId}:${slugify(querySpec.query)}:page-${page}`,
      });
    }
  }

  for (const location of config.regionalLocations) {
    specs.push({
      label: `travel-nurse-${slugify(location)}`,
      query: 'travel nurse',
      page: 1,
      location,
      sourceRunId: `${config.seedId}:travel-nurse:${slugify(location)}`,
    });
  }

  return specs;
}

function readInfisicalPayload() {
  const stdout = execFileSync(
    'infisical',
    ['export', '--format=json', '--env=prod', '--path=/agency', '--include-imports=true'],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  return JSON.parse(stdout);
}

function readRequiredSecret(payload, key) {
  const value = readSecret(payload, key);
  if (!value) {
    throw new Error(`Missing required Infisical secret: ${key}`);
  }
  return value;
}

function readSecret(payload, key) {
  if (Array.isArray(payload)) {
    return payload.find((entry) => entry?.key === key)?.value?.trim() ?? '';
  }

  if (payload && typeof payload === 'object') {
    return String(payload[key] ?? '').trim();
  }

  return '';
}

async function fetchAdzunaJobs(config, spec) {
  const params = new URLSearchParams({
    app_id: config.adzunaAppId,
    app_key: config.adzunaAppKey,
    results_per_page: String(config.resultsPerRequest),
    sort_by: 'date',
    what: spec.query,
    'content-type': 'application/json',
  });

  if (spec.location) {
    params.set('where', spec.location);
  }

  const response = await fetch(
    `${ADZUNA_API_BASE_URL}/jobs/${config.country}/search/${spec.page}?${params.toString()}`,
    {
      headers: { Accept: 'application/json' },
    },
  );

  if (!response.ok) {
    throw new Error(`Adzuna request failed with ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.results) ? payload.results : [];
}

async function ingestJob(config, payload) {
  const response = await fetch(`${config.baseUrl}/api/abundance/inbound-jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-abundance-ingest-key': config.ingestApiKey,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.data?.id) {
    throw new Error(
      `Ingest failed with ${response.status}: ${JSON.stringify(body ?? { message: response.statusText })}`,
    );
  }

  return {
    id: body.data.id,
    created: Boolean(body.created),
    duplicate: Boolean(body.duplicate),
  };
}

function mapAdzunaJobToInboundJob(job, context) {
  const title = normalizeNullableString(job.title) ?? 'Public job listing';
  const description = normalizeNullableString(job.description) ?? '';
  const combinedText = [title, description].filter(Boolean).join(' ');
  const pay = extractPayRange(combinedText, {
    defaultMin: normalizeNullableNumber(job.salary_min),
    defaultMax: normalizeNullableNumber(job.salary_max),
    defaultPeriod: job.salary_min || job.salary_max ? 'year' : null,
  });

  return {
    source_agent: 'public-adzuna',
    source_run_id: context.sourceRunId,
    source_system: 'adzuna',
    external_job_id: job.id === undefined ? undefined : String(job.id),
    job_url: normalizeNullableString(job.redirect_url) ?? undefined,
    employer: normalizeNullableString(job.company?.display_name) ?? undefined,
    location: normalizeNullableString(job.location?.display_name) ?? undefined,
    title,
    category:
      normalizeNullableString(job.category?.label) ??
      normalizeNullableString(job.category?.tag) ??
      undefined,
    specialty: extractNurseSpecialty(combinedText) ?? undefined,
    employment_type: normalizeEmploymentType(job.contract_type, job.contract_time) ?? undefined,
    pay_min: pay.payMin ?? undefined,
    pay_max: pay.payMax ?? undefined,
    pay_period: pay.payPeriod ?? undefined,
    shift: extractShift(combinedText) ?? undefined,
    duration_weeks: extractDurationWeeks(combinedText) ?? undefined,
    start_date: extractStartDate(combinedText) ?? undefined,
    openings: extractOpenings(combinedText) ?? undefined,
    source_posted_at: normalizeNullableDateString(job.created) ?? undefined,
    raw_payload: {
      query: context.query,
      ...job,
    },
  };
}

function extractNurseSpecialty(text) {
  const specialties = [
    { label: 'ER', patterns: [/\ber\b/i, /emergency room/i, /emergency department/i] },
    { label: 'ICU', patterns: [/\bicu\b/i, /intensive care/i] },
    { label: 'PICU', patterns: [/\bpicu\b/i] },
    { label: 'NICU', patterns: [/\bnicu\b/i] },
    { label: 'Telemetry', patterns: [/\btelemetry\b/i, /\bms\/tele\b/i, /med surg tele/i, /med surg\/tele/i] },
    { label: 'Med Surg', patterns: [/med surg/i, /med-surg/i, /medical surgical/i] },
    { label: 'Labor & Delivery', patterns: [/labor\s*&\s*delivery/i, /labour\s*&\s*delivery/i, /\bl&d\b/i] },
    { label: 'OR', patterns: [/operating room/i, /perioperative/i, /\bor nurse\b/i] },
    { label: 'PACU', patterns: [/\bpacu\b/i] },
    { label: 'PCU', patterns: [/\bpcu\b/i, /progressive care/i] },
    { label: 'Home Health', patterns: [/home health/i] },
    { label: 'Skilled Nursing', patterns: [/skilled nursing/i, /\bsnf\b/i] },
  ];

  for (const specialty of specialties) {
    if (specialty.patterns.some((pattern) => pattern.test(text))) {
      return specialty.label;
    }
  }

  const haystack = text.toLowerCase();
  return haystack.includes('travel nurse') || haystack.includes('registered nurse') ? 'RN' : null;
}

function normalizeEmploymentType(contractType, contractTime) {
  const parts = [normalizeNullableString(contractType), normalizeNullableString(contractTime)].filter(Boolean);
  return parts.length > 0 ? parts.join(' / ') : null;
}

function extractShift(text) {
  const match = text.match(/\b(days?|nights?|evenings?|rotating|weekends?|3x12(?:s)?|4x10(?:s)?|5x8(?:s)?)\b/i);
  return normalizeNullableString(match?.[0]);
}

function extractDurationWeeks(text) {
  const match = text.match(/\b(\d{1,2})\s*weeks?\b/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function extractStartDate(text) {
  const verbose = text.match(/\bstarts?\s+(?:on\s+)?([A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4})\b/i);
  if (verbose?.[1]) {
    return normalizeNullableDateString(verbose[1]);
  }

  const numeric = text.match(/\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
  if (numeric?.[1]) {
    return normalizeNullableDateString(numeric[1]);
  }

  return null;
}

function extractOpenings(text) {
  const match = text.match(/\b(\d{1,2})\s+(?:openings?|positions?)\b/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function extractPayRange(
  text,
  defaults = { defaultMin: null, defaultMax: null, defaultPeriod: null },
) {
  const rangeMatch = text.match(
    /\$(\d[\d,]*(?:\.\d{1,2})?)\s*(?:-|to)\s*\$?(\d[\d,]*(?:\.\d{1,2})?)\s*(?:\/|\bper\b)?\s*(wk|week|weekly|hr|hour|hourly|mo|month|monthly|yr|year|yearly)\b/i,
  );
  if (rangeMatch) {
    return {
      payMin: normalizeNullableNumber(rangeMatch[1]),
      payMax: normalizeNullableNumber(rangeMatch[2]),
      payPeriod: normalizePayPeriod(rangeMatch[3]),
    };
  }

  const singleMatch = text.match(
    /\$(\d[\d,]*(?:\.\d{1,2})?)\s*(?:\/|\bper\b)?\s*(wk|week|weekly|hr|hour|hourly|mo|month|monthly|yr|year|yearly)\b/i,
  );
  if (singleMatch) {
    const amount = normalizeNullableNumber(singleMatch[1]);
    return {
      payMin: amount,
      payMax: amount,
      payPeriod: normalizePayPeriod(singleMatch[2]),
    };
  }

  return {
    payMin: defaults.defaultMin ?? null,
    payMax: defaults.defaultMax ?? null,
    payPeriod: normalizePayPeriod(defaults.defaultPeriod),
  };
}

function normalizePayPeriod(value) {
  const normalized = normalizeNullableString(value)?.toLowerCase();
  if (!normalized) return null;
  if (normalized.startsWith('wk') || normalized.startsWith('week')) return 'week';
  if (normalized.startsWith('hr') || normalized.startsWith('hour')) return 'hour';
  if (normalized.startsWith('mo') || normalized.startsWith('month')) return 'month';
  if (normalized.startsWith('yr') || normalized.startsWith('year')) return 'year';
  return normalized;
}

function normalizeNullableString(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeNullableNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/[$,]/g, '');
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNullableDateString(value) {
  const normalized = normalizeNullableString(value);
  if (!normalized) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  if (!/[tT:]/.test(normalized)) {
    const parsedDateOnly = new Date(normalized);
    if (!Number.isNaN(parsedDateOnly.getTime())) {
      return parsedDateOnly.toISOString().slice(0, 10);
    }
  }
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? normalized : parsed.toISOString();
}

function normalizeBaseUrl(value) {
  return value.trim().replace(/\/+$/, '');
}

function splitList(value) {
  if (!value) return null;
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function clampInt(rawValue, fallback, min, max) {
  const value = rawValue == null || rawValue === '' ? fallback : Number.parseInt(String(rawValue), 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(value, max));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

await main();
