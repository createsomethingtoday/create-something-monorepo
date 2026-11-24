import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { workflow, plan } from './graph.mjs';
import { readCandidate } from './source.mjs';
import { nativeClient, dispatch, handoffKey } from './native.mjs';
import { durableJournal } from './journal.mjs';

const roleActions = ['request_independent_review', 'run_cook_repair', 'assess_release_readiness'];
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

// Operator-owned adapter configuration. Case data and PR content never choose a
// destination, executable, API origin or credential.
export function workflowDocument(config) {
  const roles = roleActions.map((action) => [action, config.roles?.[action]]);
  if (
    !uuid.test(config.companyId) ||
    roles.some(([, id]) => !uuid.test(id)) ||
    new Set(roles.map(([, id]) => id)).size !== roles.length
  ) {
    throw Error('Bind three distinct native role IDs in the target company');
  }
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(config.repo) ||
    !Number.isSafeInteger(config.pullNumber) ||
    config.pullNumber < 1 ||
    !Number.isSafeInteger(config.ciWorkflowId) ||
    config.ciWorkflowId < 1 ||
    !/^[\w-]+$/.test(config.reviewer)
  )
    throw Error('Invalid pull, workflow or reviewer binding');
  if (
    typeof config.brief !== 'string' ||
    !config.brief.trim() ||
    !Array.isArray(config.acceptance) ||
    !config.acceptance.length ||
    config.acceptance.some((item) => typeof item !== 'string' || !item.trim())
  )
    throw Error('A Cook brief and acceptance criteria are required');
  const definition = {
    workflow,
    brief: config.brief,
    acceptance: config.acceptance,
    companyId: config.companyId,
    repo: config.repo,
    pullNumber: config.pullNumber,
    reviewer: config.reviewer,
    ciWorkflowId: config.ciWorkflowId,
    roles: Object.fromEntries(roles)
  };
  return [
    '# Delivery review with Cook',
    '',
    'Run independent review and the configured GitHub workflow on the same candidate. A failed gate sends its receipts to Cook. A new revision needs fresh review and CI. Readiness requires a separate release decision.',
    '',
    'Pinned workflow and destinations',
    '',
    '```json',
    JSON.stringify(definition, null, 2),
    '```'
  ].join('\n');
}

export async function runCase({
  config,
  env,
  request,
  candidate = readCandidate,
  journal = durableJournal,
  apply = false
}) {
  const document = workflowDocument(config);
  if (!uuid.test(config.caseId) || !uuid.test(config.issueId))
    throw Error('Invalid native case or primary task ID');
  if (
    apply &&
    (!env.PAPERCLIP_RUN_ID ||
      !env.PAPERCLIP_API_KEY ||
      !env.PAPERCLIP_AGENT_ID ||
      env.PAPERCLIP_COMPANY_ID !== config.companyId ||
      (env.PAPERCLIP_TASK_ID && env.PAPERCLIP_TASK_ID !== config.issueId))
  )
    throw Error('Applying requires a matching Paperclip task heartbeat');
  const current = await request('GET', '/api/cases/' + config.caseId);
  if (
    current.id !== config.caseId ||
    current.companyId !== config.companyId ||
    current.workIssueId !== config.issueId ||
    current.completedAt
  )
    throw Error('Case binding changed or completed');
  const [doc, history, issue] = await Promise.all([
    request('GET', '/api/issues/' + config.issueId + '/documents/workflow'),
    request('GET', '/api/cases/' + config.caseId + '/handoffs?limit=100'),
    request('GET', '/api/issues/' + config.issueId)
  ]);
  if (doc.issueId !== config.issueId || doc.companyId !== config.companyId || doc.body !== document)
    throw Error('Primary task workflow differs from the pinned definition');
  if (
    issue.companyId !== config.companyId ||
    issue.id !== config.issueId ||
    ['done', 'cancelled', 'canceled'].includes(issue.status)
  )
    throw Error('Primary task binding changed or closed');
  if (
    apply &&
    (issue.assigneeAgentId !== env.PAPERCLIP_AGENT_ID ||
      issue.executionRunId !== env.PAPERCLIP_RUN_ID)
  )
    throw Error('Heartbeat does not own this primary task');
  if (!Array.isArray(history.items) || history.items.length >= 100 || history.nextCursor)
    throw Error('Complete bounded handoff history required');
  const { sha, events, source } = await candidate(config);
  const repairs = [];
  for (const row of history.items) {
    if (row.phase !== 'run_cook_repair' || row.state === 'cancelled') continue;
    const revision = row.instructions?.match(
      /^review-graph-sha:([0-9a-f]{40}|[0-9a-f]{64})$/m
    )?.[1];
    if (
      !revision ||
      row.idempotencyKey !==
        handoffKey(config.companyId, config.caseId, revision, 'run_cook_repair') ||
      row.toAgentId !== config.roles.run_cook_repair
    )
      throw Error('Unrecognized repair in native case history');
    repairs.push({
      id: row.id,
      caseId: config.caseId,
      sha: revision,
      type: 'repair',
      verdict: 'dispatched'
    });
  }
  const input = {
    companyId: config.companyId,
    caseId: config.caseId,
    sha,
    source,
    brief: config.brief,
    acceptance: config.acceptance,
    actorAgentId: apply ? env.PAPERCLIP_AGENT_ID : undefined,
    events: [...events, ...repairs]
  };
  const graph = plan(input);
  const action = graph.actions.find((step) => roleActions.includes(step.type));
  if (!action) return { state: graph.state === 'held' ? 'held' : 'waiting_for_ci', graph };
  const key = createHash('sha256')
    .update(handoffKey(config.companyId, config.caseId, sha, action.type))
    .digest('hex');
  if (!path.isAbsolute(config.journalDir ?? ''))
    throw Error('An absolute private journal directory is required');
  return dispatch({
    request,
    input,
    roles: config.roles,
    ...journal(path.join(config.journalDir, key + '.json')),
    dispatchEnabled: apply
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [mode, filename] = process.argv.slice(2);
    if (!['definition', 'inspect', 'heartbeat'].includes(mode) || !filename)
      throw Error('Usage: runner.mjs definition|inspect|heartbeat operator-config.json');
    const config = JSON.parse(await readFile(filename, 'utf8'));
    if (mode === 'definition') process.stdout.write(workflowDocument(config));
    else {
      const env = process.env;
      const request = nativeClient({
        baseUrl: env.PAPERCLIP_API_URL,
        token: env.PAPERCLIP_API_KEY,
        runId: env.PAPERCLIP_RUN_ID
      });
      const result = await runCase({ config, env, request, apply: mode === 'heartbeat' });
      console.log(
        JSON.stringify(
          {
            state: result.state,
            graph: result.graph,
            handoffId: result.receipt?.handoffId ?? result.observed?.id
          },
          null,
          2
        )
      );
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
