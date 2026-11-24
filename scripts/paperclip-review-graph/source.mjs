/** Read-only GitHub evidence adapter. Packet events are never an evidence source. */
export async function readCandidate(config, { request = fetch } = {}) {
  const { repo, pullNumber, reviewer, ciWorkflowId, caseId } = config ?? {};
  if (
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo ?? '') ||
    !Number.isSafeInteger(pullNumber) ||
    pullNumber < 1 ||
    !Number.isSafeInteger(ciWorkflowId) ||
    ciWorkflowId < 1 ||
    !/^[A-Za-z0-9-]+$/.test(reviewer ?? '') ||
    typeof caseId !== 'string' ||
    !caseId.trim() ||
    caseId !== caseId.trim()
  )
    throw new Error('Invalid GitHub operator configuration');
  const root = `https://api.github.com/repos/${repo}`;
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  async function get(url) {
    const response = await request(url, { method: 'GET', headers, redirect: 'error' });
    if (!response.ok) throw new Error(`GitHub evidence request failed (${response.status})`);
    return { body: await response.json(), link: response.headers?.get('link') ?? '' };
  }
  async function pages(path, key) {
    const items = [];
    for (let page = 1; page <= 20; page++) {
      const { body, link } = await get(
        `${root}${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`
      );
      const batch = key ? body[key] : body;
      if (!Array.isArray(batch)) throw new Error('Malformed GitHub evidence page');
      items.push(...batch);
      if (!link.includes('rel="next"')) {
        // A full page without pagination metadata cannot establish completeness.
        if (
          batch.length >= 100 ||
          (key && Number.isInteger(body.total_count) && body.total_count > items.length)
        )
          throw new Error('GitHub evidence pagination is incomplete');
        return items;
      }
    }
    throw new Error('GitHub evidence exceeds bounded pagination');
  }
  function check(pr) {
    if (
      pr.state !== 'open' ||
      pr.number !== pullNumber ||
      pr.base?.repo?.full_name?.toLowerCase() !== repo.toLowerCase() ||
      pr.head?.repo?.full_name?.toLowerCase() !== repo.toLowerCase() ||
      !/^[a-f0-9]{40}$/.test(pr.head?.sha ?? '') ||
      !pr.user?.login ||
      pr.user.login.toLowerCase() === reviewer.toLowerCase()
    )
      throw new Error('PR must be open, same-repository, and independently reviewed');
  }
  const { body: pr } = await get(`${root}/pulls/${pullNumber}`);
  check(pr);
  const sha = pr.head.sha;
  const [reviews, runs] = await Promise.all([
    pages(`/pulls/${pullNumber}/reviews`),
    pages(`/actions/workflows/${ciWorkflowId}/runs?head_sha=${sha}`, 'workflow_runs')
  ]);
  const events = [];
  const relevant = reviews
    .filter(
      (review) =>
        review.commit_id === sha &&
        review.user?.login?.toLowerCase() === reviewer.toLowerCase() &&
        ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)
    )
    .sort((a, b) => a.id - b.id);
  for (const review of relevant) {
    if (!Number.isSafeInteger(review.id) || review.id < 1)
      throw new Error('Review lacks native receipt ID');
    if (review.state === 'CHANGES_REQUESTED')
      events.push({
        type: 'review',
        verdict: 'changes_requested',
        id: `github:review:${review.id}`,
        sha,
        caseId,
        independent: true
      });
  }
  const latest = relevant.at(-1);
  if (latest?.state === 'APPROVED')
    events.push({
      type: 'review',
      verdict: 'approved',
      id: `github:review:${latest.id}`,
      sha,
      caseId,
      independent: true
    });
  const matching = runs.filter(
    (run) =>
      run.head_sha === sha &&
      run.workflow_id === ciWorkflowId &&
      run.event === 'pull_request' &&
      run.pull_requests?.some(
        (binding) =>
          binding.number === pullNumber &&
          binding.head?.sha === sha &&
          binding.base?.repo?.id === pr.base.repo.id
      )
  );
  matching.sort((a, b) => b.id - a.id || (b.run_attempt ?? 1) - (a.run_attempt ?? 1));
  const run = matching[0];
  if (run) {
    if (!Number.isSafeInteger(run.id) || run.id < 1) throw new Error('CI lacks native receipt ID');
    if (run.status === 'completed') {
      if (
        run.conclusion === 'success' ||
        [
          'failure',
          'cancelled',
          'timed_out',
          'action_required',
          'startup_failure',
          'stale'
        ].includes(run.conclusion)
      )
        events.push({
          type: 'ci',
          verdict: run.conclusion === 'success' ? 'passed' : 'failed',
          id: `github:run:${run.id}:attempt:${run.run_attempt ?? 1}`,
          runId: String(run.id),
          runAttempt: run.run_attempt ?? 1,
          sha,
          caseId
        });
    }
  }
  const { body: finalPr } = await get(`${root}/pulls/${pullNumber}`);
  check(finalPr);
  if (
    finalPr.head.sha !== sha ||
    finalPr.base.sha !== pr.base.sha ||
    finalPr.user.login.toLowerCase() !== pr.user.login.toLowerCase()
  )
    throw new Error('PR changed while collecting evidence; retry');
  return {
    sha,
    events,
    source: {
      repo,
      pullNumber,
      reviewer,
      ciWorkflowId,
      baseSha: pr.base.sha,
      headRef: pr.head.ref,
      headRepo: pr.head.repo.full_name
    }
  };
}
