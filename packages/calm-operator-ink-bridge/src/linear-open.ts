export interface LinearIssueSummary {
  identifier: string;
  title: string;
  url: string;
  priority: number;
  updatedAt: string;
  state: {
    name: string;
    type: string;
  };
  assignee: string | null;
  project: string | null;
}

export interface LinearOpenQueue {
  ok: true;
  team: string;
  generated_at: string;
  issues: LinearIssueSummary[];
}

interface LinearIssueNode {
  identifier?: string;
  title?: string;
  url?: string;
  priority?: number;
  updatedAt?: string;
  state?: {
    name?: string;
    type?: string;
  } | null;
  assignee?: {
    name?: string;
  } | null;
  team?: {
    key?: string;
  } | null;
  project?: {
    name?: string;
  } | null;
}

interface LinearIssuesResponse {
  data?: {
    issues?: {
      nodes?: LinearIssueNode[];
    };
  };
  errors?: unknown;
}

interface LinearContextResponse {
  data?: {
    viewer?: {
      id?: string;
      name?: string;
    };
    issues?: {
      nodes?: Array<LinearIssueNode & { id?: string; team?: { id?: string; key?: string } | null }>;
    };
    workflowStates?: {
      nodes?: Array<{ id?: string; name?: string; type?: string; team?: { id?: string; key?: string } | null }>;
    };
  };
  errors?: unknown;
}

interface LinearUpdateResponse {
  data?: {
    issueUpdate?: {
      success?: boolean;
      issue?: LinearIssueNode & {
        id?: string;
        assignee?: { name?: string } | null;
      };
    };
  };
  errors?: unknown;
}

export interface FetchLinearOpenIssuesOptions {
  apiKey: string;
  teamKey?: string;
  limit?: number;
  now?: () => Date;
  fetch?: typeof fetch;
}

export interface ClaimLinearIssueOptions {
  apiKey: string;
  identifier: string;
  teamKey?: string;
  fetch?: typeof fetch;
}

export interface PrepareLinearIssueOptions {
  apiKey: string;
  identifier: string;
  teamKey?: string;
  fetch?: typeof fetch;
}

const LINEAR_API = 'https://api.linear.app/graphql';

export async function fetchLinearOpenIssues(options: FetchLinearOpenIssuesOptions): Promise<LinearOpenQueue> {
  const apiKey = options.apiKey.trim();
  if (!apiKey) throw new Error('LINEAR_API_KEY is required.');

  const team = (options.teamKey?.trim() || 'CRE').toUpperCase();
  const limit = normalizeLimit(options.limit);
  const fetchImpl = options.fetch ?? fetch;
  const first = Math.max(limit * 6, 30);

  const response = await fetchImpl(LINEAR_API, {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      query: `
        query EvenOpenLinearIssues($first: Int!) {
          issues(first: $first, orderBy: updatedAt) {
            nodes {
              identifier
              title
              url
              priority
              updatedAt
              state { name type }
              assignee { name }
              team { key }
              project { name }
            }
          }
        }
      `,
      variables: { first }
    })
  });

  const body = (await response.json()) as LinearIssuesResponse;
  if (!response.ok || body.errors) {
    throw new Error('Linear open issue lookup failed.');
  }

  const issues = (body.data?.issues?.nodes ?? [])
    .filter((issue) => issue.team?.key === team)
    .filter((issue) => issue.state?.type !== 'completed' && issue.state?.type !== 'canceled')
    .slice(0, limit)
    .map(mapIssueSummary);

  return {
    ok: true,
    team,
    generated_at: (options.now?.() ?? new Date()).toISOString(),
    issues
  };
}

export async function claimLinearIssue(options: ClaimLinearIssueOptions): Promise<{ ok: true; issue: LinearIssueSummary; claimed_by: string }> {
  const apiKey = options.apiKey.trim();
  if (!apiKey) throw new Error('LINEAR_API_KEY is required.');
  const identifier = options.identifier.trim().toUpperCase();
  if (!/^CRE-\d+$/.test(identifier)) throw new Error('Only CRE issue identifiers can be claimed from Ink.');

  const team = (options.teamKey?.trim() || 'CRE').toUpperCase();
  const fetchImpl = options.fetch ?? fetch;
  const context = await linearGraphql<LinearContextResponse>(
    fetchImpl,
    apiKey,
    `
      query EvenClaimContext($filter: IssueFilter) {
        viewer { id name }
        issues(first: 5, filter: $filter) {
          nodes {
            id
            identifier
            title
            url
            priority
            updatedAt
            state { name type }
            assignee { name }
            team { id key }
            project { name }
          }
        }
        workflowStates(first: 250) {
          nodes { id name type team { id key } }
        }
      }
    `,
    { filter: { identifier: { eq: identifier } } }
  );

  const viewer = context.data?.viewer;
  if (!viewer?.id) throw new Error('Linear viewer is unavailable.');

  const issue = context.data?.issues?.nodes?.find((node) => node.identifier === identifier && node.team?.key === team);
  if (!issue?.id) throw new Error(`Linear issue not found: ${identifier}`);
  if (issue.state?.type === 'completed' || issue.state?.type === 'canceled') {
    throw new Error(`Linear issue is not open: ${identifier}`);
  }

  const state = context.data?.workflowStates?.nodes?.find(
    (node) => node.team?.id === issue.team?.id && (node.name === 'In Progress' || node.type === 'started')
  );

  const update = await linearGraphql<LinearUpdateResponse>(
    fetchImpl,
    apiKey,
    `
      mutation EvenClaimIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            identifier
            title
            url
            priority
            updatedAt
            state { name type }
            assignee { name }
            project { name }
          }
        }
      }
    `,
    {
      id: issue.id,
      input: {
        assigneeId: viewer.id,
        ...(state?.id ? { stateId: state.id } : {})
      }
    }
  );

  const updated = update.data?.issueUpdate?.issue;
  if (!update.data?.issueUpdate?.success || !updated) throw new Error(`Linear claim failed: ${identifier}`);

  return {
    ok: true,
    issue: mapIssueSummary(updated),
    claimed_by: viewer.name || 'Linear viewer'
  };
}

export async function prepareLinearIssue(options: PrepareLinearIssueOptions): Promise<{
  ok: true;
  issue: LinearIssueSummary;
  prep: {
    headline: string;
    next_action: string;
    handoff: string;
    source_url: string;
  };
}> {
  const apiKey = options.apiKey.trim();
  if (!apiKey) throw new Error('LINEAR_API_KEY is required.');
  const identifier = options.identifier.trim().toUpperCase();
  if (!/^CRE-\d+$/.test(identifier)) throw new Error('Only CRE issue identifiers can be prepared from Ink.');

  const team = (options.teamKey?.trim() || 'CRE').toUpperCase();
  const fetchImpl = options.fetch ?? fetch;
  const context = await linearGraphql<LinearContextResponse>(
    fetchImpl,
    apiKey,
    `
      query EvenPrepareIssue($filter: IssueFilter) {
        issues(first: 5, filter: $filter) {
          nodes {
            identifier
            title
            url
            priority
            updatedAt
            state { name type }
            assignee { name }
            team { key }
            project { name }
          }
        }
      }
    `,
    { filter: { identifier: { eq: identifier } } }
  );

  const issue = context.data?.issues?.nodes?.find((node) => node.identifier === identifier && node.team?.key === team);
  if (!issue) throw new Error(`Linear issue not found: ${identifier}`);
  if (issue.state?.type === 'completed' || issue.state?.type === 'canceled') {
    throw new Error(`Linear issue is not open: ${identifier}`);
  }

  const summary = mapIssueSummary(issue);
  return {
    ok: true,
    issue: summary,
    prep: {
      headline: `${summary.identifier}: ${summary.title}`,
      next_action: summary.assignee ? 'Review current owner state and continue the issue.' : 'Claim or assign the issue before implementation.',
      handoff: [
        `State: ${summary.state.name}`,
        `Owner: ${summary.assignee ?? 'Unassigned'}`,
        summary.project ? `Project: ${summary.project}` : '',
        `Priority: ${summary.priority || 'none'}`
      ].filter(Boolean).join('\n'),
      source_url: summary.url
    }
  };
}

async function linearGraphql<T>(
  fetchImpl: typeof fetch,
  apiKey: string,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const response = await fetchImpl(LINEAR_API, {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });

  const body = (await response.json()) as T & { errors?: unknown };
  if (!response.ok || body.errors) {
    throw new Error('Linear request failed.');
  }

  return body;
}

function mapIssueSummary(issue: LinearIssueNode): LinearIssueSummary {
  return {
    identifier: issue.identifier || 'CRE-?',
    title: issue.title || 'Untitled Linear issue',
    url: issue.url || '',
    priority: issue.priority ?? 0,
    updatedAt: issue.updatedAt || '',
    state: {
      name: issue.state?.name || 'Unknown',
      type: issue.state?.type || 'unknown'
    },
    assignee: issue.assignee?.name ?? null,
    project: issue.project?.name ?? null
  };
}

function normalizeLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return 5;
  return Math.min(Math.max(Math.round(value ?? 5), 1), 10);
}
