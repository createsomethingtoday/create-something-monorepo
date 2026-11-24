import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatch } from './native.mjs';
const input = { companyId: 'company', caseId: 'case', sha: 'a'.repeat(40), events: [] };
function harness({ lost = false } = {}) {
  let intent = null,
    row = null,
    posts = 0;
  const calls = [];
  const request = async (method, path, body) => {
    calls.push(method + ' ' + path);
    if (method === 'GET' && path.endsWith('/case'))
      return { companyId: 'company', workIssueId: 'issue', handoffVersion: row ? 1 : 0 };
    if (method === 'GET' && path === '/api/issues/issue')
      return { id: 'issue', companyId: 'company', statusVersion: 0, assigneeAgentId: 'engineer' };
    if (method === 'GET') return { items: row ? [row] : [] };
    posts++;
    row ??= {
      id: 'handoff',
      state: 'pending_dispatch',
      companyId: 'company',
      caseId: 'case',
      toAgentId: body.toAgentId,
      phase: body.phase,
      idempotencyKey: body.idempotencyKey,
      instructions: body.instructions
    };
    if (lost && posts === 1) throw Error('response interrupted');
    return { handoffId: row.id, replayed: posts > 1 };
  };
  return {
    args: {
      request,
      input,
      roles: { request_independent_review: 'reviewer', run_ci: 'ci' },
      loadIntent: async () => intent,
      saveIntent: async (i) => {
        intent = i;
      }
    },
    calls,
    get posts() {
      return posts;
    },
    get intent() {
      return intent;
    }
  };
}
test('plan reads native and makes no mutation', async () => {
  const h = harness();
  const r = await dispatch(h.args);
  assert.equal(r.state, 'planned');
  assert.equal(h.posts, 0);
  assert.equal(h.intent, null);
});
test('dispatch persists and reads back actual native handoff', async () => {
  const h = harness();
  const r = await dispatch({ ...h.args, dispatchEnabled: true });
  assert.equal(r.observed.id, 'handoff');
  assert.equal(h.intent.body.expectedHandoffVersion, 0);
  assert.equal(h.posts, 1);
});
test('lost response reconciles by readback then exact idempotent replay', async () => {
  const h = harness({ lost: true });
  await assert.rejects(dispatch({ ...h.args, dispatchEnabled: true }), /interrupted/);
  const body = JSON.stringify(h.intent.body);
  const r = await dispatch({ ...h.args, dispatchEnabled: true });
  assert.equal(r.state, 'already_dispatched');
  assert.equal(JSON.stringify(h.intent.body), body);
  assert.equal(h.calls[4], 'GET /api/cases/case');
  assert.equal(h.calls[6], 'GET /api/cases/case/handoffs?limit=100');
});
test('company mismatch rejects before mutation', async () => {
  const h = harness();
  await assert.rejects(
    dispatch({ ...h.args, input: { ...input, companyId: 'other' }, dispatchEnabled: true }),
    /mismatch/
  );
  assert.equal(h.posts, 0);
});
test('stale pending journal rejects before native mutation', async () => {
  const h = harness();
  await dispatch({ ...h.args, dispatchEnabled: true });
  await assert.rejects(
    dispatch({
      ...h.args,
      roles: { ...h.args.roles, request_independent_review: 'changed' },
      dispatchEnabled: true
    }),
    /Unreconciled/
  );
  assert.equal(h.posts, 1);
});
test('CI remains parallel receipt work and never receives a case handoff', async () => {
  const h = harness();
  const r = await dispatch({
    ...h.args,
    input: {
      ...input,
      events: [
        {
          id: 'review',
          caseId: 'case',
          sha: input.sha,
          type: 'review',
          verdict: 'approved',
          independent: true
        }
      ]
    },
    dispatchEnabled: true
  });
  assert.equal(r.state, 'awaiting_ci');
  assert.equal(h.posts, 0);
});
test('fresh journal recognizes prior marker despite advanced native version', async () => {
  const h = harness();
  const first = await dispatch({ ...h.args, dispatchEnabled: true });
  const request = async (method, path) => {
    assert.equal(method, 'GET');
    if (path === '/api/cases/case')
      return { companyId: 'company', handoffVersion: 7, workIssueId: 'issue' };
    if (path === '/api/issues/issue')
      return { id: 'issue', companyId: 'company', statusVersion: 3, assigneeAgentId: 'reviewer' };
    return {
      items: [
        {
          id: 'prior',
          companyId: 'company',
          caseId: 'case',
          toAgentId: first.intent.body.toAgentId,
          phase: first.intent.body.phase,
          idempotencyKey: first.intent.body.idempotencyKey,
          state: 'delivered',
          instructions: first.intent.body.instructions
        }
      ]
    };
  };
  const result = await dispatch({
    ...h.args,
    request,
    loadIntent: async () => null,
    dispatchEnabled: true
  });
  assert.equal(result.state, 'already_dispatched');
});
test('delivered handoff reconciles existing journal without replay from next actor', async () => {
  const h = harness();
  const first = await dispatch({ ...h.args, dispatchEnabled: true });
  const request = async (method, path) => {
    assert.equal(method, 'GET', 'must not replay delivered handoff');
    if (path === '/api/cases/case')
      return { companyId: 'company', handoffVersion: 1, workIssueId: 'issue' };
    if (path === '/api/issues/issue')
      return { id: 'issue', companyId: 'company', statusVersion: 1, assigneeAgentId: 'reviewer' };
    return {
      items: [
        {
          id: 'prior',
          companyId: 'company',
          caseId: 'case',
          toAgentId: 'reviewer',
          phase: first.intent.body.phase,
          idempotencyKey: first.intent.body.idempotencyKey,
          instructions: first.intent.body.instructions,
          state: 'delivered'
        }
      ]
    };
  };
  const r = await dispatch({ ...h.args, request, dispatchEnabled: true });
  assert.equal(r.state, 'already_dispatched');
});
test('cancelled handoff holds rather than resending', async () => {
  const h = harness();
  const first = await dispatch({ ...h.args, dispatchEnabled: true });
  const request = async (method, path) => {
    assert.equal(method, 'GET');
    if (path === '/api/cases/case')
      return { companyId: 'company', handoffVersion: 1, workIssueId: 'issue' };
    if (path === '/api/issues/issue')
      return { id: 'issue', companyId: 'company', statusVersion: 1, assigneeAgentId: 'reviewer' };
    return {
      items: [
        {
          id: 'prior',
          companyId: 'company',
          caseId: 'case',
          ...first.intent.body,
          case: undefined,
          state: 'cancelled'
        }
      ]
    };
  };
  assert.equal((await dispatch({ ...h.args, request, dispatchEnabled: true })).state, 'held');
});
test('unmatched native routing drift holds uncertain journal', async () => {
  const h = harness();
  await dispatch({ ...h.args, dispatchEnabled: true });
  const request = async (method, path) => {
    assert.equal(method, 'GET');
    if (path === '/api/cases/case')
      return { companyId: 'company', handoffVersion: 4, workIssueId: 'issue' };
    if (path === '/api/issues/issue')
      return { id: 'issue', companyId: 'company', statusVersion: 4, assigneeAgentId: 'reviewer' };
    return { items: [] };
  };
  assert.equal((await dispatch({ ...h.args, request, dispatchEnabled: true })).state, 'held');
});
