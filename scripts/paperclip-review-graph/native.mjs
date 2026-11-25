import { createHash } from 'node:crypto';
import { plan } from './graph.mjs';

export function handoffKey(companyId, caseId, sha, actionType) {
  return (
    'review-graph:' +
    createHash('sha256')
      .update(JSON.stringify([companyId, caseId, sha, actionType]))
      .digest('hex')
  );
}

export function nativeClient({ baseUrl, token, runId, fetchImpl = fetch }) {
  const url = new URL(baseUrl);
  if (
    url.username ||
    url.password ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)))
  )
    throw Error('HTTPS or loopback HTTP API required');
  return async (method, path, body) => {
    const response = await fetchImpl(new URL(path, url), {
      method,
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(runId ? { 'X-Paperclip-Run-Id': runId } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (!response.ok) throw Error(`Paperclip ${method} ${path}: ${response.status}`);
    return response.json();
  };
}

// The caller supplies verified graph receipts; routing is a native case handoff,
// never an issue-status mutation or a second local lifecycle.
export async function dispatch({
  request,
  input,
  roles,
  loadIntent,
  saveIntent,
  dispatchEnabled = false
}) {
  const graph = plan(input);
  const action = graph.actions.find((item) => !['run_ci', 'hold'].includes(item.type));
  const binding = action
    ? createHash('sha256')
        .update(
          JSON.stringify({
            version: graph.version,
            action: { type: action.type, inputs: action.inputs },
            role: roles[action.type],
            brief: input.brief,
            acceptance: input.acceptance,
            source: input.source
          })
        )
        .digest('hex')
    : null;
  const marker = action ? handoffKey(input.companyId, input.caseId, input.sha, action.type) : null;
  const links = [];
  const repo = input.source?.repo;
  if (repo && input.source.pullNumber) {
    for (const id of action?.inputs.receiptIds ?? []) {
      const review = /^github:review:(\d+)$/.exec(id);
      const run = /^github:run:(\d+):attempt:(\d+)$/.exec(id);
      if (review)
        links.push(
          `https://github.com/${repo}/pull/${input.source.pullNumber}#pullrequestreview-${review[1]}`
        );
      if (run) links.push(`https://github.com/${repo}/actions/runs/${run[1]}/attempts/${run[2]}`);
    }
  }
  const instructionsForAction = `[${marker}]\nWorkflow ${graph.version}. ${action?.reason}\nExact SHA: ${input.sha}\nreview-graph-sha:${input.sha}\nreview-graph-action:${action?.type}\nSource: ${JSON.stringify(input.source ?? {})}\nEvidence: ${JSON.stringify(action?.inputs)}\nFinding links: ${links.join(' ')}\nBrief: ${input.brief ?? 'Follow the owning case assignment'}\nAcceptance: ${JSON.stringify(input.acceptance ?? [])}\n${action?.type === 'run_cook_repair' ? 'Invoke $cook with these findings, brief and acceptance. Repair within the assignment and produce a new SHA.' : ''}\nReturn a SHA-bound receipt. Release requires separate explicit authorization.`;
  let intent = await loadIntent();
  if (intent) {
    if (
      intent.companyId !== input.companyId ||
      intent.body.case.id !== input.caseId ||
      intent.sha !== input.sha ||
      !action ||
      intent.binding !== binding ||
      intent.bodyHash !== createHash('sha256').update(JSON.stringify(intent.body)).digest('hex') ||
      intent.body.toAgentId !== roles[action.type] ||
      intent.body.phase !== action.type ||
      intent.body.instructions !== instructionsForAction ||
      intent.body.idempotencyKey !== marker
    )
      throw Error('Unreconciled intent belongs to another case/revision');
  }
  const current = await request('GET', `/api/cases/${input.caseId}`);
  if (current.companyId !== input.companyId) throw Error('Case company mismatch');
  if (!current.workIssueId) throw Error('Existing primary task required');
  const issue = await request('GET', `/api/issues/${current.workIssueId}`);
  if (
    issue.id !== current.workIssueId ||
    issue.companyId !== input.companyId ||
    !Number.isInteger(issue.statusVersion) ||
    issue.assigneeUserId ||
    !issue.assigneeAgentId
  )
    throw Error('Native primary task binding invalid');
  if (input.actorAgentId && issue.assigneeAgentId !== input.actorAgentId && !intent)
    throw Error('Native task assigned to another actor');
  // Always read native state before replay, including after a lost POST response.
  const history = await request('GET', `/api/cases/${input.caseId}/handoffs?limit=100`);
  if (!Array.isArray(history.items)) throw Error('Invalid native handoff history');
  const matches = (row) =>
    row.companyId === input.companyId &&
    row.caseId === input.caseId &&
    row.toAgentId === roles[action?.type] &&
    row.phase === action?.type &&
    row.idempotencyKey === marker &&
    row.instructions === instructionsForAction;
  const existing = history.items.find(matches);
  if (existing)
    return {
      graph,
      state: existing.state === 'cancelled' ? 'held' : 'already_dispatched',
      observed: existing
    };
  if (
    history.items.some(
      (row) => row.idempotencyKey === marker || row.instructions?.includes(`[${marker}]`)
    )
  )
    throw Error('Native handoff marker binding mismatch');
  if (
    intent &&
    (current.handoffVersion !== intent.body.expectedHandoffVersion ||
      issue.statusVersion !== intent.body.expectedIssueStatusVersion)
  )
    return {
      graph,
      state: 'held',
      reason: 'Native routing changed without verified matching handoff'
    };

  if (!intent) {
    if (
      history.items.some((row) =>
        ['awaiting_release', 'pending_dispatch', 'awaiting_completion'].includes(row.state)
      )
    )
      return { graph, state: 'native_pending', history };
    if (!action) return { graph, state: graph.state === 'held' ? 'held' : 'awaiting_ci' };
    // Readiness remains an assessment; it cannot dispatch merge/deploy authority.
    const target = roles[action.type];
    if (!target) throw Error(`Missing role for ${action.type}`);
    if (!Number.isInteger(current.handoffVersion)) throw Error('Native handoff version missing');
    if (history.nextCursor)
      throw Error('Native history exceeds bounded read; reconcile before dispatch');
    if (
      action.type === 'run_cook_repair' &&
      (!input.brief ||
        !Array.isArray(input.acceptance) ||
        !input.acceptance.length ||
        !action.inputs.receiptIds?.length)
    )
      throw Error('Cook requires brief, acceptance and exact finding receipt IDs');

    intent = {
      companyId: input.companyId,
      sha: input.sha,
      binding,
      body: {
        idempotencyKey: marker,
        case: { id: input.caseId },
        toAgentId: target,
        phase: action.type,
        expectedHandoffVersion: current.handoffVersion,
        expectedIssueStatusVersion: issue.statusVersion,
        instructions: instructionsForAction
      }
    };
    intent.bodyHash = createHash('sha256').update(JSON.stringify(intent.body)).digest('hex');
    if (!dispatchEnabled) return { graph, state: 'planned', intent };
    await saveIntent(intent); // durable before effects; caller must use exclusive journal creation
  }
  if (!dispatchEnabled) return { graph, state: 'reconciliation_required', intent, history };
  // Reuse the original fingerprint even when native version advanced: native
  // idempotency lookup precedes version validation. Never rebuild uncertain work.
  const receipt = await request(
    'POST',
    `/api/companies/${intent.companyId}/case-handoffs`,
    intent.body
  );
  const readback = await request('GET', `/api/cases/${input.caseId}/handoffs?limit=100`);
  const observed = readback.items?.find((row) => row.id === receipt.handoffId);
  if (!observed || !matches(observed))
    throw Error('Dispatch accepted but exact handoff readback missing; retain intent');
  return { graph, state: 'dispatched', intent, receipt, observed };
}
