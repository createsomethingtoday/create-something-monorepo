import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { runCase, workflowDocument } from './runner.mjs';

function fixture() {
  const roles = Object.fromEntries(
    ['request_independent_review', 'run_cook_repair', 'assess_release_readiness'].map((role) => [
      role,
      randomUUID()
    ])
  );
  const config = {
    roles,
    companyId: randomUUID(),
    caseId: randomUUID(),
    issueId: randomUUID(),
    repo: 'owner/project',
    pullNumber: 12,
    reviewer: 'reviewer',
    ciWorkflowId: 42,
    brief: 'Repair regression',
    acceptance: ['Independent review and CI'],
    journalDir: '/tmp/unused'
  };
  const current = {
    id: config.caseId,
    companyId: config.companyId,
    workIssueId: config.issueId,
    handoffVersion: 1
  };
  const issue = {
    id: config.issueId,
    companyId: config.companyId,
    assigneeAgentId: randomUUID(),
    executionRunId: randomUUID(),
    statusVersion: 1,
    status: 'in_progress'
  };
  const doc = {
    issueId: config.issueId,
    companyId: config.companyId,
    body: workflowDocument(config)
  };
  const history = { items: [] };
  const sha = 'a'.repeat(40);
  const input = {
    config,
    env: {},
    candidate: async () => ({ sha, source: { repo: config.repo, pullNumber: 12 }, events: [] }),
    journal: () => ({ loadIntent: async () => null }),
    request: async (method, path) => {
      assert.equal(method, 'GET');
      if (path.includes('documents/workflow')) return doc;
      if (path.includes('/handoffs?')) return history;
      if (path.includes('/issues/')) return issue;
      return current;
    }
  };
  return { input, config, issue, doc, history, sha };
}

test('ordinary inspect reads pinned case and explains both eligible gates without a write', async () => {
  const { input } = fixture();
  const result = await runCase(input);
  assert.equal(result.state, 'planned');
  assert.deepEqual(
    result.graph.actions.map((x) => x.type),
    ['request_independent_review', 'run_ci']
  );
});
test('changed workflow, truncated history and unbound heartbeat stop before fetching evidence', async () => {
  for (const defect of ['workflow', 'history', 'actor']) {
    const { input, doc, history } = fixture();
    if (defect === 'workflow') doc.body += ' changed';
    if (defect === 'history') history.nextCursor = 'next';
    if (defect === 'actor') input.apply = true;
    let reads = 0;
    input.candidate = async () => {
      reads++;
      throw Error('unexpected');
    };
    await assert.rejects(runCase(input));
    assert.equal(reads, 0);
  }
});
test('repair handoff carries actual brief, acceptance criteria and finding ID', async () => {
  const { input, config, sha } = fixture();
  input.candidate = async () => ({
    sha,
    source: { repo: config.repo, pullNumber: 12 },
    events: [
      {
        id: 'github:review:123',
        caseId: config.caseId,
        sha,
        type: 'review',
        verdict: 'changes_requested'
      }
    ]
  });
  const { intent } = await runCase(input);
  for (const value of ['$cook', config.brief, ...config.acceptance, 'github:review:123', sha])
    assert.ok(intent.body.instructions.includes(value));
});
