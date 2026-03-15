/**
 * Airtable Client
 *
 * Canon: Database access should be as invisible as memory access.
 * The query runs; the data returns; the mechanism recedes.
 */

import type { Env, AirtableRecord, AirtableResponse } from '../types';

const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

/**
 * Query Airtable records with a filter formula
 */
export async function queryRecords<T = Record<string, unknown>>(
  env: Env,
  table: string,
  filterFormula: string,
  options?: {
    view?: string;
    maxRecords?: number;
  }
): Promise<AirtableRecord<T>[]> {
  const params = new URLSearchParams();
  params.set('filterByFormula', filterFormula);

  if (options?.view) {
    params.set('view', options.view);
  }

  if (options?.maxRecords) {
    params.set('maxRecords', options.maxRecords.toString());
  }

  const url = `${AIRTABLE_API_URL}/${env.AIRTABLE_BASE_ID}/${table}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new AirtableError(
      `Airtable query failed: ${response.status}`,
      response.status,
      error
    );
  }

  const data = (await response.json()) as AirtableResponse<T>;
  return data.records;
}

/**
 * Get a single record by ID
 */
export async function getRecord<T = Record<string, unknown>>(
  env: Env,
  table: string,
  recordId: string
): Promise<AirtableRecord<T>> {
  const url = `${AIRTABLE_API_URL}/${env.AIRTABLE_BASE_ID}/${table}/${recordId}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new AirtableError(
      `Airtable get record failed: ${response.status}`,
      response.status,
      error
    );
  }

  return (await response.json()) as AirtableRecord<T>;
}

/**
 * Find a user by email in a field
 *
 * @param fieldId - The Airtable field ID containing email(s)
 */
export async function findUserByEmail<T = Record<string, unknown>>(
  env: Env,
  table: string,
  fieldId: string,
  email: string
): Promise<AirtableRecord<T> | null> {
  // Escape single quotes in email to prevent formula injection
  const escapedEmail = email.replace(/'/g, "\\'");
  const filterFormula = `FIND('${escapedEmail}', {${fieldId}})`;

  const records = await queryRecords<T>(env, table, filterFormula);
  return records.length > 0 ? records[0] : null;
}

/**
 * Check if a name exists (substring match)
 */
export async function checkNameExists(
  env: Env,
  table: string,
  name: string,
  options?: {
    view?: string;
    excludeArchived?: boolean;
  }
): Promise<boolean> {
  // Escape for formula
  const escapedName = name.replace(/'/g, "\\'");

  let filterFormula = `FIND(LOWER('${escapedName}'), LOWER({Name})) > 0`;

  if (options?.excludeArchived) {
    filterFormula = `AND(${filterFormula}, NOT(FIND(LOWER('archived'), LOWER({Name})) > 0))`;
  }

  const records = await queryRecords(env, table, filterFormula, {
    view: options?.view,
    maxRecords: 1,
  });

  return records.length > 0;
}

/**
 * Count records matching a filter
 */
export async function countRecords(
  env: Env,
  table: string,
  filterFormula: string,
  options?: { view?: string }
): Promise<number> {
  const records = await queryRecords(env, table, filterFormula, options);
  return records.length;
}

/**
 * Airtable Error class for structured error handling
 */
export class AirtableError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: string
  ) {
    super(message);
    this.name = 'AirtableError';
  }
}
