import { US_STATE_CODES } from './us-states.js';

// Values come exclusively from the finite repository-owned state list.
const stateCases = US_STATE_CODES.map(
  ([name, code]) => `WHEN '${name}' THEN '${code}' WHEN '${code.toLowerCase()}' THEN '${code}'`
).join(' ');
const stateSql = `CASE LOWER(TRIM(state)) ${stateCases} ELSE NULL END`;
const stateExpression = `CASE
  WHEN country IS NULL OR UPPER(TRIM(country)) IN
    ('US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA', '')
  THEN ${stateSql} ELSE NULL END`;

// Match whole role words across punctuation in provider titles, e.g. "ICU (RN)/Med-Surg".
const nursingTitles = [
  'NURSE', 'NURSES', 'NURSING', 'RN', 'RNS', 'LPN', 'LVN', 'CNA', 'NP', 'APRN', 'CRNA'
];
const nursingTitlePredicate = '(' + nursingTitles.map(
  title => `(' ' || UPPER(title) || ' ') GLOB '*[^A-Z0-9]${title}[^A-Z0-9]*'`
).join(' OR ') + ')';

/** Read-only view of normalized public jobs. Never invokes collection providers. */
export function parseJobsQuery(params: URLSearchParams) {
  const text = (key: string, max = 120) => {
    const value = (params.get(key) ?? '').trim();
    if (value.length > max) throw new TypeError(`${key} is too long`);
    return value;
  };
  const integer = (key: string, fallback: number, max: number) => {
    const raw = params.get(key);
    if (raw === null) return fallback;
    if (!/^\d+$/.test(raw) || Number(raw) > max) throw new TypeError(`Invalid ${key}`);
    return Number(raw);
  };
  const state = text('state', 2).toUpperCase();
  if (state && !/^[A-Z]{2}$/.test(state)) throw new TypeError('Use a two-letter state');
  const rawStatus = text('status').toLowerCase() || 'open';
  const aliases: Record<string, string> = {
    new: 'open',
    reviewing: 'open',
    qualified: 'open',
    rejected: 'closed',
    archived: 'closed'
  };
  const status = aliases[rawStatus] ?? rawStatus;
  if (!['open', 'closed', 'expired', 'unknown', 'all'].includes(status))
    throw new TypeError('Invalid status');
  const limit = integer('limit', 30, 100);
  if (!limit) throw new TypeError('limit must be at least one');
  return {
    q: text('q'),
    state,
    specialty: text('specialty'),
    status,
    limit,
    offset: integer('offset', 0, 100000)
  };
}
export type JobsQuery = ReturnType<typeof parseJobsQuery>;
export function safeJobUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
export function jobsWhere(query: JobsQuery, omitState = false, omitSpecialty = false) {
  const clauses = [nursingTitlePredicate];
  const values: string[] = [];
  if (query.status !== 'all') {
    clauses.push('status = ?');
    values.push(query.status);
  }
  if (query.state && !omitState) {
    clauses.push(`${stateExpression} = ?`);
    values.push(query.state);
  }
  if (query.specialty && !omitSpecialty) {
    clauses.push('specialty = ?');
    values.push(query.specialty);
  }
  if (query.q) {
    clauses.push(
      "(title LIKE ? ESCAPE '\\' OR employer LIKE ? ESCAPE '\\' OR city LIKE ? ESCAPE '\\' OR specialty LIKE ? ESCAPE '\\')"
    );
    const pattern = `%${query.q.replace(/[\\%_]/g, '\\$&')}%`;
    values.push(pattern, pattern, pattern, pattern);
  }
  return { sql: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '', values };
}
const columns =
  'id,title,employer,city,state,country,location_text,specialty,discipline,employment_type,shift,pay_min,pay_max,pay_text,currency,status,source_url,application_url,posted_at,last_seen_at,fetched_at';
export async function queryJobsBrowser(db: D1Database, query: JobsQuery) {
  const filtered = jobsWhere(query);
  const states = jobsWhere(query, true);
  const specialties = jobsWhere(query, false, true);
  // D1 batch executes the reads transactionally, keeping totals/facets aligned with the page.
  const results = await db.batch<Record<string, unknown>>([
    db
      .prepare(
        `SELECT ${columns} FROM abundance_public_jobs${filtered.sql} ORDER BY last_seen_at DESC, id ASC LIMIT ? OFFSET ?`
      )
      .bind(...filtered.values, query.limit, query.offset),
    db
      .prepare(
        `SELECT COUNT(*) AS total, MAX(last_seen_at) AS lastSeenAt, MAX(fetched_at) AS fetchedAt FROM abundance_public_jobs${filtered.sql}`
      )
      .bind(...filtered.values),
    db
      .prepare(
        `SELECT ${stateExpression} AS state, COUNT(*) AS count FROM abundance_public_jobs${states.sql} GROUP BY ${stateExpression} ORDER BY count DESC, state ASC`
      )
      .bind(...states.values),
    db
      .prepare(
        `SELECT specialty, COUNT(*) AS count FROM abundance_public_jobs${specialties.sql} GROUP BY specialty ORDER BY count DESC, specialty ASC`
      )
      .bind(...specialties.values)
  ]);
  if (results.some((result) => !result.success)) throw new Error('Jobs read failed');
  const summary = results[1].results[0] as {
    total: number;
    lastSeenAt: string | null;
    fetchedAt: string | null;
  };
  return {
    jobs: results[0].results.map((job) => ({
      ...job,
      source_url: safeJobUrl(job.source_url),
      application_url: safeJobUrl(job.application_url)
    })),
    total: summary.total,
    limit: query.limit,
    offset: query.offset,
    states: results[2].results,
    specialties: results[3].results,
    freshness: { lastSeenAt: summary.lastSeenAt, fetchedAt: summary.fetchedAt },
    filters: query
  };
}
