import test from 'node:test';
import assert from 'node:assert/strict';
import { readCandidate } from './source.mjs';
const sha = 'a'.repeat(40);
const config = {
  repo: 'owner/project',
  pullNumber: 7,
  reviewer: 'reviewer',
  ciWorkflowId: 23,
  caseId: 'case'
};
const pr = {
  number: 7,
  state: 'open',
  user: { login: 'author' },
  head: { sha, ref: 'fix', repo: { full_name: config.repo } },
  base: { sha: 'b'.repeat(40), repo: { id: 99, full_name: config.repo } }
};
const review = { id: 4, state: 'APPROVED', commit_id: sha, user: { login: 'reviewer' } };
const run = {
  id: 10,
  run_attempt: 1,
  workflow_id: 23,
  head_sha: sha,
  event: 'pull_request',
  status: 'completed',
  conclusion: 'success',
  pull_requests: [{ number: 7, head: { sha }, base: { repo: { id: 99 } } }]
};
function fixture({ pull = pr, reviews = [review], runs = [run], final = pull, link = '' } = {}) {
  let reads = 0;
  return async (url, options) => {
    assert.ok(url.startsWith('https://api.github.com/repos/owner/project/'));
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    const isReviews = url.includes('/reviews');
    const body = isReviews
      ? reviews
      : url.includes('/actions/')
        ? { workflow_runs: runs, total_count: runs.length }
        : ++reads === 1
          ? pull
          : final;
    return { ok: true, headers: new Headers(isReviews ? { link } : {}), json: async () => body };
  };
}
test('sources native independent approval and exact workflow CI', async () => {
  const result = await readCandidate(
    { ...config, events: [{ verdict: 'passed' }] },
    { request: fixture() }
  );
  assert.equal(result.sha, sha);
  assert.deepEqual(
    result.events.map((e) => [e.id, e.verdict]),
    [
      ['github:review:4', 'approved'],
      ['github:run:10:attempt:1', 'passed']
    ]
  );
});
test('changes request remains latched after later approval; dismissed excluded', async () => {
  const result = await readCandidate(config, {
    request: fixture({
      reviews: [
        { ...review, id: 1, state: 'CHANGES_REQUESTED' },
        { ...review, id: 2, state: 'DISMISSED' },
        review
      ]
    })
  });
  assert.deepEqual(
    result.events.filter((e) => e.type === 'review').map((e) => e.verdict),
    ['changes_requested', 'approved']
  );
});
test('new pending run blocks old green; unbound and foreign workflow ignored', async () => {
  const result = await readCandidate(config, {
    request: fixture({
      runs: [
        run,
        { ...run, id: 11, status: 'in_progress', conclusion: null },
        { ...run, id: 12, workflow_id: 999 },
        { ...run, id: 13, pull_requests: [] }
      ]
    })
  });
  assert.equal(
    result.events.some((e) => e.type === 'ci'),
    false
  );
});
test('rejects forks, self review, moving head, and incomplete pagination', async () => {
  for (const pull of [
    { ...pr, head: { ...pr.head, repo: { full_name: 'fork/project' } } },
    { ...pr, user: { login: 'reviewer' } }
  ])
    await assert.rejects(readCandidate(config, { request: fixture({ pull }) }));
  await assert.rejects(
    readCandidate(config, {
      request: fixture({ final: { ...pr, head: { ...pr.head, sha: 'c'.repeat(40) } } })
    }),
    /changed/
  );
  await assert.rejects(
    readCandidate(config, { request: fixture({ reviews: Array(100).fill(review) }) }),
    /pagination/
  );
});
test('read failure fails closed', async () => {
  await assert.rejects(
    readCandidate(config, { request: async () => ({ ok: false, status: 403 }) }),
    /403/
  );
});
