import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseJobsQuery,
  jobsWhere,
  safeJobUrl,
  queryJobsBrowser
} from '../../abundance-jobs-mcp/src/job-markets.ts';

test('jobs queries are bounded and reject malformed input', () => {
  assert.equal(parseJobsQuery(new URLSearchParams()).status, 'open');
  assert.equal(parseJobsQuery(new URLSearchParams('status=reviewing')).status, 'open');
  assert.equal(parseJobsQuery(new URLSearchParams('status=archived')).status, 'closed');
  for (const value of ['limit=0', 'limit=101', 'offset=-1', 'status=deleted', 'state=California']) {
    assert.throws(() => parseJobsQuery(new URLSearchParams(value)), TypeError);
  }
});
test('facets omit only their own selection and search remains bound literal text', () => {
  const query = parseJobsQuery(new URLSearchParams('q=100%25_&state=ca&specialty=ICU'));
  const selected = jobsWhere(query);
  assert.ok(selected.sql.includes('ELSE NULL END = ?'));
  assert.equal(selected.values[1], 'CA');
  assert.equal(selected.values[3], '%100\\%\\_%');
  assert.ok(!jobsWhere(query, true).sql.includes('ELSE NULL END = ?'));
  assert.ok(jobsWhere(query, true).values.includes('ICU'));
});
test('job links allow public web protocols and discard active or credentialed URLs', () => {
  for (const value of [
    'javascript:alert(1)',
    'data:text/plain,test',
    'https://user:secret@example.com',
    '/relative'
  ])
    assert.equal(safeJobUrl(value), null);
  assert.equal(safeJobUrl('https://example.com/job/1'), 'https://example.com/job/1');
});
test('page, total and facets share a single read-only D1 batch and links are sanitized', async () => {
  const statements: { sql: string; values?: unknown[] }[] = [];
  const db = {
    prepare(sql: string) {
      const statement = { sql, values: [] as unknown[] };
      statements.push(statement);
      return {
        bind(...values: unknown[]) {
          statement.values = values;
          return statement;
        }
      };
    },
    async batch() {
      return [
        {
          success: true,
          results: [
            { id: 'j1', application_url: 'javascript:alert(1)', source_url: 'https://example.com' }
          ]
        },
        {
          success: true,
          results: [{ total: 1, lastSeenAt: '2026-11-23', fetchedAt: '2026-11-22' }]
        },
        { success: true, results: [{ state: 'CA', count: 1 }] },
        { success: true, results: [{ specialty: 'ICU', count: 1 }] }
      ];
    }
  };
  const result = await queryJobsBrowser(db as never, parseJobsQuery(new URLSearchParams()));
  assert.equal(result.total, 1);
  assert.equal(result.jobs[0].application_url, null);
  assert.deepEqual(result.states, [{ state: 'CA', count: 1 }]);
  assert.equal(statements.length, 4);
  assert.ok(statements.every(({ sql }) => sql.startsWith('SELECT ')));
  assert.ok(!statements[0].sql.includes('raw_payload'));
});

test('real schema SQL normalizes state names and preserves unlocated and international counts', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { readFileSync } = await import('node:fs');
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(
    readFileSync(new URL('../migrations/0024_abundance_public_jobs.sql', import.meta.url), 'utf8')
  );
  const insert = sqlite.prepare(
    `INSERT INTO abundance_public_jobs (id,provider,source_system,external_job_id,raw_payload_hash,title,state,country,status,last_seen_at,fetched_at,normalized_at,raw_payload_json) VALUES (?, 'fixture','fixture',?,'hash',?,?,?,?,'2026-11-23','2026-11-22','2026-11-23','{}')`
  );
  for (const [id, title, state, country, status] of [
    ['a', 'Registered Nurse', 'CA', 'US', 'open'],
    ['b', 'ICU (RN)/Med-Surg', 'California', 'US', 'open'],
    ['c', 'Nurse', null, 'US', 'open'],
    ['d', 'Nurse', 'CA', 'Canada', 'open'],
    ['g', 'Nurse', 'XX', 'US', 'open'],
    ['h', 'Plant Nursery Manager', 'CA', 'US', 'open'],
    ['e', 'Software Engineer', 'CA', 'US', 'open'],
    ['f', 'Nurse', 'CA', 'US', 'closed']
  ])
    insert.run(id, id, title, state, country, status);
  const db = {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return { sql, values };
        }
      };
    },
    async batch(statements: { sql: string; values: any[] }[]) {
      return statements.map(({ sql, values }) => ({
        success: true,
        results: sqlite.prepare(sql).all(...values)
      }));
    }
  };
  const all = await queryJobsBrowser(db as never, parseJobsQuery(new URLSearchParams()));
  assert.equal(all.total, 5);
  assert.deepEqual(all.jobs.map(job => job.id).sort(), ['a', 'b', 'c', 'd', 'g']);
  assert.deepEqual(
    all.states.map((s) => [s.state, s.count]),
    [
      [null, 3],
      ['CA', 2]
    ]
  );
  const selected = await queryJobsBrowser(
    db as never,
    parseJobsQuery(new URLSearchParams('state=CA'))
  );
  assert.equal(selected.total, 2);
  assert.deepEqual(selected.states, all.states);
  sqlite.close();
});
