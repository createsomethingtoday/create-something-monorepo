import type { AirtableRecord, Env } from './types';
import { sleep } from './webflow';

const API_BASE = 'https://api.airtable.com/v0';

function airtableUrl(env: Env, suffix = ''): string {
  return `${API_BASE}/${env.AIRTABLE_BASE_ID}/${env.AIRTABLE_CMS_RECORDS_TABLE_ID}${suffix}`;
}

function headers(env: Env): Record<string, string> {
  if (!env.AIRTABLE_API_KEY) throw new Error('AIRTABLE_API_KEY is not configured.');
  return { Authorization: `Bearer ${env.AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' };
}

async function airtableFetch(env: Env, url: string, init: RequestInit = {}, attempt = 0): Promise<Response> {
  const response = await fetch(url, { ...init, headers: { ...headers(env), ...(init.headers ?? {}) } });
  if (response.status === 429 && attempt < 3) {
    await sleep(1000 * (attempt + 1));
    return airtableFetch(env, url, init, attempt + 1);
  }
  return response;
}

/** Escape a value for interpolation into filterByFormula single quotes. */
export function formulaEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export async function findByWebflowRecordId(env: Env, itemId: string): Promise<AirtableRecord[]> {
  const params = new URLSearchParams({
    filterByFormula: `{Webflow Record ID} = '${formulaEscape(itemId)}'`,
    maxRecords: '5',
  });
  const response = await airtableFetch(env, `${airtableUrl(env)}?${params}`);
  if (!response.ok) throw new Error(`Airtable find failed: ${response.status} ${await response.text()}`);
  const body = (await response.json()) as { records?: AirtableRecord[] };
  return body.records ?? [];
}

export async function createRecord(env: Env, fields: Record<string, unknown>): Promise<AirtableRecord> {
  const response = await airtableFetch(env, airtableUrl(env), {
    method: 'POST',
    body: JSON.stringify({ records: [{ fields }], typecast: true }),
  });
  if (!response.ok) throw new Error(`Airtable create failed: ${response.status} ${await response.text()}`);
  const body = (await response.json()) as { records: AirtableRecord[] };
  return body.records[0];
}

export async function updateRecord(env: Env, recordId: string, fields: Record<string, unknown>): Promise<AirtableRecord> {
  const response = await airtableFetch(env, airtableUrl(env), {
    method: 'PATCH',
    body: JSON.stringify({ records: [{ id: recordId, fields }], typecast: true }),
  });
  if (!response.ok) throw new Error(`Airtable update failed: ${response.status} ${await response.text()}`);
  const body = (await response.json()) as { records: AirtableRecord[] };
  return body.records[0];
}

/**
 * Batch lookup by Webflow Record ID (OR batches keep formula and URL length safe).
 * Returns a map of itemId → rows (usually one; duplicates surface as extras).
 */
export async function findByWebflowRecordIds(env: Env, itemIds: string[]): Promise<Map<string, AirtableRecord[]>> {
  const result = new Map<string, AirtableRecord[]>();
  const BATCH = 50;
  for (let i = 0; i < itemIds.length; i += BATCH) {
    const batch = itemIds.slice(i, i + BATCH);
    const formula = `OR(${batch.map((id) => `{Webflow Record ID} = '${formulaEscape(id)}'`).join(',')})`;
    let offset: string | undefined;
    for (;;) {
      const params = new URLSearchParams({ filterByFormula: formula, pageSize: '100' });
      for (const field of LIST_FIELDS) params.append('fields[]', field);
      if (offset) params.set('offset', offset);
      const response = await airtableFetch(env, `${airtableUrl(env)}?${params}`);
      if (!response.ok) throw new Error(`Airtable batch find failed: ${response.status} ${await response.text()}`);
      const body = (await response.json()) as { records?: AirtableRecord[]; offset?: string };
      for (const record of body.records ?? []) {
        const itemId = String(record.fields['Webflow Record ID'] ?? '').trim();
        if (!itemId) continue;
        const bucket = result.get(itemId) ?? [];
        bucket.push(record);
        result.set(itemId, bucket);
      }
      if (!body.offset) break;
      offset = body.offset;
      await sleep(250);
    }
    if (i + BATCH < itemIds.length) await sleep(250);
  }
  return result;
}

const LIST_FIELDS = [
  'Name',
  'Status',
  'Slug',
  'MRP ID',
  'Sync Source',
  'Sync Record ID',
  'Webflow Record ID',
  'WF Created',
  'WF Last Updated',
  'Approval Date',
];

/** List every row in the sync-log table (paginated; ~5 req/s Airtable limit respected). */
export async function listAllRecords(env: Env, options: { pageDelayMs?: number } = {}): Promise<AirtableRecord[]> {
  const all: AirtableRecord[] = [];
  let offset: string | undefined;
  for (;;) {
    const params = new URLSearchParams({ pageSize: '100' });
    for (const field of LIST_FIELDS) params.append('fields[]', field);
    if (offset) params.set('offset', offset);
    const response = await airtableFetch(env, `${airtableUrl(env)}?${params}`);
    if (!response.ok) throw new Error(`Airtable list failed: ${response.status} ${await response.text()}`);
    const body = (await response.json()) as { records?: AirtableRecord[]; offset?: string };
    all.push(...(body.records ?? []));
    if (!body.offset) break;
    offset = body.offset;
    await sleep(options.pageDelayMs ?? 250);
  }
  return all;
}
