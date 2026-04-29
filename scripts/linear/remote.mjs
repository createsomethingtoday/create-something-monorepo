#!/usr/bin/env node

const LINEAR_API = process.env.LINEAR_API_URL || 'https://api.linear.app/graphql';
const DEFAULT_TEAM_KEY = process.env.LINEAR_TEAM_KEY || 'CRE';

function usage() {
  console.log(`Usage:
  node scripts/linear/remote.mjs <command> [options]

Commands:
  ready [--team <key>] [--limit <n>]
  list [--team <key>] [--status <open|done|canceled|all>] [--label <label>] [--project <name>] [--limit <n>]
  get --issue <identifier-or-id>
  create --title <title> [--description <text>] [--label <label> ...] [--project <name>] [--priority <urgent|high|normal|low>]
  claim --issue <identifier-or-id>
  done --issue <identifier-or-id> [--evidence <text>]
  comment --issue <identifier-or-id> --body <text>

Environment:
  LINEAR_API_KEY  Required Linear API key
  LINEAR_TEAM_KEY Optional team key, default: CRE
  LINEAR_API_URL  Optional GraphQL endpoint override
`);
}

function parseArgs(argv) {
  const args = argv.slice(2).filter((arg) => arg !== '--');
  const command = args[0];
  const options = { labels: [], limit: 50, status: 'open', team: DEFAULT_TEAM_KEY };

  if (!command || command === '--help' || command === '-h') {
    options.help = true;
    return { command: null, options };
  }

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--team' && args[index + 1]) options.team = args[++index];
    else if (arg === '--status' && args[index + 1]) options.status = args[++index];
    else if (arg === '--label' && args[index + 1]) options.labels.push(args[++index]);
    else if (arg === '--project' && args[index + 1]) options.project = args[++index];
    else if (arg === '--limit' && args[index + 1]) options.limit = Number(args[++index]);
    else if (arg === '--issue' && args[index + 1]) options.issue = args[++index];
    else if (arg === '--title' && args[index + 1]) options.title = args[++index];
    else if (arg === '--description' && args[index + 1]) options.description = args[++index];
    else if (arg === '--priority' && args[index + 1]) options.priority = args[++index];
    else if (arg === '--evidence' && args[index + 1]) options.evidence = args[++index];
    else if (arg === '--body' && args[index + 1]) options.body = args[++index];
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return { command, options };
}

function requireOption(name, value) {
  if (!value) throw new Error(`Missing required option: ${name}`);
  return value;
}

function priorityValue(priority) {
  switch (priority) {
    case 'urgent':
    case 'critical':
      return 1;
    case 'high':
      return 2;
    case 'low':
      return 4;
    case 'normal':
    default:
      return 3;
  }
}

async function gql(query, variables = {}) {
  const token = process.env.LINEAR_API_KEY || '';
  if (!token) throw new Error('LINEAR_API_KEY is required.');

  const response = await fetch(LINEAR_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (!response.ok || body.errors) {
    throw new Error(JSON.stringify({ status: response.status, errors: body.errors ?? body }, null, 2));
  }
  return body.data;
}

async function bootstrap(teamKey) {
  const data = await gql(`
    query Bootstrap {
      viewer { id name }
      teams(first: 100) { nodes { id key name } }
      issueLabels(first: 250) { nodes { id name } }
      projects(first: 250) { nodes { id name url } }
      workflowStates(first: 250) { nodes { id name type team { id key } } }
    }
  `);
  const team = data.teams.nodes.find((node) => node.key === teamKey) ?? data.teams.nodes[0];
  if (!team) throw new Error('No Linear team is visible to this token.');
  return {
    viewer: data.viewer,
    team,
    labels: data.issueLabels.nodes,
    projects: data.projects.nodes,
    states: data.workflowStates.nodes.filter((state) => state.team?.id === team.id),
  };
}

function stateMatches(issue, status) {
  const type = issue.state?.type;
  if (status === 'all') return true;
  if (status === 'done') return type === 'completed';
  if (status === 'canceled' || status === 'cancelled') return type === 'canceled';
  return type !== 'completed' && type !== 'canceled';
}

function formatIssue(issue) {
  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    url: issue.url,
    state: issue.state ? { name: issue.state.name, type: issue.state.type } : null,
    priority: issue.priority,
    assignee: issue.assignee?.name ?? null,
    project: issue.project?.name ?? null,
    labels: issue.labels?.nodes?.map((label) => label.name) ?? [],
    updatedAt: issue.updatedAt,
  };
}

async function findIssue(issueId) {
  const byId = await gql(
    `query IssueById($id: String!) {
      issue(id: $id) {
        id identifier title description url priority updatedAt
        state { id name type }
        assignee { id name }
        project { id name }
        labels { nodes { id name } }
      }
    }`,
    { id: issueId },
  ).catch(() => ({ issue: null }));
  if (byId.issue) return byId.issue;

  const byIdentifier = await gql(
    `query IssueByIdentifier($filter: IssueFilter) {
      issues(first: 10, filter: $filter) {
        nodes {
          id identifier title description url priority updatedAt
          state { id name type }
          assignee { id name }
          project { id name }
          labels { nodes { id name } }
        }
      }
    }`,
    { filter: { identifier: { eq: issueId } } },
  );
  const issue = byIdentifier.issues.nodes[0];
  if (!issue) throw new Error(`Linear issue not found: ${issueId}`);
  return issue;
}

async function listIssues(options) {
  const data = await gql(
    `query Issues($first: Int!) {
      issues(first: $first, orderBy: updatedAt) {
        nodes {
          id identifier title url priority updatedAt
          state { name type }
          assignee { name }
          team { key }
          project { name }
          labels { nodes { name } }
        }
      }
    }`,
    { first: Math.min(Math.max(options.limit || 50, 1), 250) },
  );
  return data.issues.nodes
    .filter((issue) => issue.team?.key === options.team)
    .filter((issue) => stateMatches(issue, options.status))
    .filter((issue) => !options.project || issue.project?.name === options.project)
    .filter((issue) => options.labels.every((label) => issue.labels.nodes.some((node) => node.name === label)))
    .map(formatIssue);
}

async function createIssue(options) {
  const ctx = await bootstrap(options.team);
  const labelIds = options.labels
    .map((label) => ctx.labels.find((node) => node.name === label)?.id)
    .filter(Boolean);
  const projectId = options.project ? ctx.projects.find((project) => project.name === options.project)?.id : undefined;
  if (options.project && !projectId) throw new Error(`Linear project not found: ${options.project}`);

  const data = await gql(
    `mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) { success issue { id identifier title url } }
    }`,
    {
      input: {
        title: requireOption('--title', options.title),
        description: options.description,
        teamId: ctx.team.id,
        priority: priorityValue(options.priority),
        ...(labelIds.length ? { labelIds } : {}),
        ...(projectId ? { projectId } : {}),
      },
    },
  );
  return data.issueCreate.issue;
}

async function claimIssue(options) {
  const ctx = await bootstrap(options.team);
  const issue = await findIssue(requireOption('--issue', options.issue));
  const inProgress = ctx.states.find((state) => state.name === 'In Progress') ?? ctx.states.find((state) => state.type === 'started');
  const data = await gql(
    `mutation ClaimIssue($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) { success issue { id identifier title url state { name type } assignee { name } } }
    }`,
    { id: issue.id, input: { assigneeId: ctx.viewer.id, ...(inProgress ? { stateId: inProgress.id } : {}) } },
  );
  return data.issueUpdate.issue;
}

async function commentIssue(issueId, body) {
  const issue = await findIssue(requireOption('--issue', issueId));
  const data = await gql(
    `mutation CommentIssue($input: CommentCreateInput!) {
      commentCreate(input: $input) { success comment { id url body } }
    }`,
    { input: { issueId: issue.id, body: requireOption('--body', body) } },
  );
  return data.commentCreate.comment;
}

async function doneIssue(options) {
  const ctx = await bootstrap(options.team);
  const issue = await findIssue(requireOption('--issue', options.issue));
  const completed = ctx.states.find((state) => state.type === 'completed');
  if (!completed) throw new Error(`No completed workflow state found for team ${ctx.team.key}.`);
  const data = await gql(
    `mutation DoneIssue($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) { success issue { id identifier title url state { name type } } }
    }`,
    { id: issue.id, input: { stateId: completed.id } },
  );
  if (options.evidence) await commentIssue(issue.identifier, `Evidence:\n\n${options.evidence}`);
  return data.issueUpdate.issue;
}

async function main() {
  const { command, options } = parseArgs(process.argv);
  if (!command || options.help) {
    usage();
    process.exit(options.help ? 0 : 1);
  }

  let payload;
  if (command === 'ready') {
    payload = await listIssues({ ...options, status: 'open' });
  } else if (command === 'list') {
    payload = await listIssues(options);
  } else if (command === 'get') {
    payload = formatIssue(await findIssue(requireOption('--issue', options.issue)));
  } else if (command === 'create') {
    payload = await createIssue(options);
  } else if (command === 'claim') {
    payload = await claimIssue(options);
  } else if (command === 'done') {
    payload = await doneIssue(options);
  } else if (command === 'comment') {
    payload = await commentIssue(options.issue, options.body);
  } else {
    throw new Error(`Unknown command: ${command}`);
  }

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
