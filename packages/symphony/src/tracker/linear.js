import { SymphonyError } from '../errors.js';
const LINEAR_ISSUE_FIELDS = `
  id
  identifier
  title
  description
  priority
  branchName
  url
  createdAt
  updatedAt
  state {
    id
    name
    type
  }
  labels {
    nodes {
      name
    }
  }
  inverseRelations {
    nodes {
      type
      issue {
        id
        identifier
        state {
          name
        }
      }
    }
  }
`;
function normalize_priority(value) {
    return typeof value === 'number' && Number.isInteger(value) ? value : null;
}
function normalize_timestamp(value) {
    if (typeof value !== 'string')
        return null;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}
function normalize_state_name(value) {
    return String(value ?? '').trim().toLowerCase();
}
function required_label_names(config) {
    return [
        ...(config.tracker.label ? [config.tracker.label] : []),
        ...config.tracker.labels,
    ]
        .map((label) => label.trim().toLowerCase())
        .filter((label) => label !== '');
}
function has_required_labels(issue, config) {
    const required = required_label_names(config);
    if (required.length === 0) {
        return true;
    }
    const issue_labels = new Set(issue.labels.map((label) => label.toLowerCase()));
    return required.every((label) => issue_labels.has(label));
}
function select_state_id(states, preferred_names, fallback_type) {
    for (const name of preferred_names) {
        const matched = states.find((state) => normalize_state_name(state.name) === normalize_state_name(name));
        if (matched?.id)
            return matched.id;
    }
    if (!fallback_type)
        return null;
    const fallback = states.find((state) => state.type === fallback_type);
    return fallback?.id ?? null;
}
function normalize_issue(node) {
    const labels = (node.labels?.nodes ?? [])
        .map((entry) => entry.name?.toLowerCase())
        .filter((entry) => Boolean(entry));
    const blocked_by = (node.inverseRelations?.nodes ?? [])
        .filter((entry) => entry.type === 'blocks')
        .map((entry) => ({
        id: entry.issue?.id ?? null,
        identifier: entry.issue?.identifier ?? null,
        state: entry.issue?.state?.name ?? null,
    }));
    return {
        id: String(node.id ?? ''),
        identifier: String(node.identifier ?? ''),
        title: String(node.title ?? ''),
        description: typeof node.description === 'string' ? node.description : null,
        priority: normalize_priority(node.priority),
        state: String(node.state?.name ?? ''),
        branch_name: typeof node.branchName === 'string' ? node.branchName : null,
        url: typeof node.url === 'string' ? node.url : null,
        labels,
        blocked_by,
        created_at: normalize_timestamp(node.createdAt),
        updated_at: normalize_timestamp(node.updatedAt),
    };
}
export class LinearTrackerClient {
    config;
    logger;
    fetch_impl;
    constructor(config, logger, fetch_impl = fetch) {
        this.config = config;
        this.logger = logger;
        this.fetch_impl = fetch_impl;
    }
    async fetch_candidate_issues() {
        const issues = await this.fetch_issues_by_states(this.config.tracker.active_states);
        return issues.filter((issue) => has_required_labels(issue, this.config));
    }
    async fetch_handoff_issues() {
        const handoff_state = this.config.completion?.handoff_state;
        if (!handoff_state) {
            return [];
        }
        const issues = await this.fetch_issues_by_states([handoff_state]);
        return issues.filter((issue) => has_required_labels(issue, this.config));
    }
    async fetch_issue_by_identifier(identifier) {
        const payload = await this.graphql(`
        query SymphonyIssueByIdentifier($id: String!) {
          issue(id: $id) {
            ${LINEAR_ISSUE_FIELDS}
          }
        }
      `, { id: identifier });
        const node = payload.data?.issue;
        if (!node) {
            return null;
        }
        const issue = normalize_issue(node);
        const active_states = new Set(this.config.tracker.active_states.map(normalize_state_name));
        if (!active_states.has(normalize_state_name(issue.state)) || !has_required_labels(issue, this.config)) {
            return null;
        }
        return issue;
    }
    async fetch_issues_by_states(states) {
        if (states.length === 0) {
            return [];
        }
        const issues = [];
        let after = null;
        while (true) {
            const payload = await this.graphql(`
          query SymphonyIssues($projectSlug: String!, $states: [String!]!, $first: Int!, $after: String) {
            issues(
              filter: {
                project: { slugId: { eq: $projectSlug } }
                state: { name: { in: $states } }
              }
              first: $first
              after: $after
            ) {
              nodes {
                ${LINEAR_ISSUE_FIELDS}
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        `, {
                projectSlug: this.config.tracker.project_slug,
                states,
                first: this.config.tracker.page_size,
                after,
            });
            const connection = payload.data?.issues;
            if (!connection || !Array.isArray(connection.nodes) || !connection.pageInfo) {
                throw new SymphonyError('linear_unknown_payload', 'Linear issues payload missing expected nodes/pageInfo.');
            }
            for (const node of connection.nodes) {
                issues.push(normalize_issue(node));
            }
            if (!connection.pageInfo.hasNextPage) {
                break;
            }
            if (!connection.pageInfo.endCursor) {
                throw new SymphonyError('linear_missing_end_cursor', 'Linear pagination reported hasNextPage=true without endCursor.');
            }
            after = connection.pageInfo.endCursor;
        }
        return issues;
    }
    async fetch_issue_states_by_ids(issue_ids) {
        if (issue_ids.length === 0) {
            return [];
        }
        const payload = await this.graphql(`
        query SymphonyIssueStates($ids: [ID!]) {
          issues(filter: { id: { in: $ids } }) {
            nodes {
              ${LINEAR_ISSUE_FIELDS}
            }
          }
        }
      `, { ids: issue_ids });
        const nodes = payload.data?.issues?.nodes;
        if (!Array.isArray(nodes)) {
            throw new SymphonyError('linear_unknown_payload', 'Linear issue-state payload missing nodes.');
        }
        return nodes.map(normalize_issue);
    }
    async claim_issue(issue) {
        const bootstrap = await this.bootstrap();
        const issue_state = normalize_state_name(issue.state);
        const target_state_names = issue_state === 'in progress'
            ? []
            : [
                ...this.config.tracker.active_states.filter((state) => normalize_state_name(state) === 'in progress'),
                ...this.config.tracker.active_states.filter((state) => normalize_state_name(state) !== issue_state && normalize_state_name(state) !== 'in progress'),
            ];
        const state_id = select_state_id(bootstrap.workflow_states, target_state_names, 'started');
        const input = {
            assigneeId: bootstrap.viewer.id,
            ...(state_id ? { stateId: state_id } : {}),
        };
        return this.update_issue(issue.id, input);
    }
    async complete_issue(issue, result) {
        const bootstrap = await this.bootstrap();
        const state_id = select_state_id(bootstrap.workflow_states, this.config.tracker.terminal_states, 'completed');
        if (!state_id) {
            throw new SymphonyError('linear_missing_completed_state', 'No Linear completed workflow state matched terminal_states.');
        }
        const completed = await this.update_issue(issue.id, { stateId: state_id });
        const message = result?.message ? String(result.message).trim() : '';
        if (message) {
            await this.comment_issue(issue.id, `Evidence:\n\n${message}`);
        }
        return completed;
    }
    async handoff_issue(issue) {
        const bootstrap = await this.bootstrap();
        const handoff_state = this.config.completion?.handoff_state ?? 'In Review';
        const state_id = select_state_id(bootstrap.workflow_states, [handoff_state], null);
        if (!state_id) {
            throw new SymphonyError('linear_missing_handoff_state', `No Linear workflow state matched completion.handoff_state: ${handoff_state}`);
        }
        return this.update_issue(issue.id, { stateId: state_id });
    }
    async release_issue(issue, reason) {
        const bootstrap = await this.bootstrap();
        const state_id = select_state_id(bootstrap.workflow_states, this.config.tracker.active_states, 'unstarted');
        const input = {
            assigneeId: null,
            ...(state_id ? { stateId: state_id } : {}),
        };
        const released = await this.update_issue(issue.id, input);
        if (reason) {
            await this.comment_issue(issue.id, `Released by Symphony: ${reason}`);
        }
        return released;
    }
    async bootstrap() {
        const payload = await this.graphql(`
        query SymphonyBootstrap {
          viewer {
            id
          }
          workflowStates(first: 250) {
            nodes {
              id
              name
              type
            }
          }
        }
      `, {});
        const viewer = payload.data?.viewer;
        const workflow_states = payload.data?.workflowStates?.nodes;
        if (!viewer?.id || !Array.isArray(workflow_states)) {
            throw new SymphonyError('linear_unknown_payload', 'Linear bootstrap payload missing viewer or workflow states.');
        }
        return { viewer, workflow_states };
    }
    async update_issue(issue_id, input) {
        const payload = await this.graphql(`
        mutation SymphonyUpdateIssue($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
            issue {
              ${LINEAR_ISSUE_FIELDS}
            }
          }
        }
      `, { id: issue_id, input });
        const issue = payload.data?.issueUpdate?.issue;
        if (!issue) {
            throw new SymphonyError('linear_unknown_payload', 'Linear issueUpdate payload missing issue.');
        }
        return normalize_issue(issue);
    }
    async comment_issue(issue_id, body) {
        const payload = await this.graphql(`
        mutation SymphonyComment($input: CommentCreateInput!) {
          commentCreate(input: $input) {
            success
            comment {
              id
            }
          }
        }
      `, { input: { issueId: issue_id, body } });
        if (!payload.data?.commentCreate?.success) {
            throw new SymphonyError('linear_unknown_payload', 'Linear commentCreate payload missing success.');
        }
    }
    async graphql(query, variables) {
        let response;
        try {
            response = await this.fetch_impl(this.config.tracker.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: this.config.tracker.api_key,
                },
                body: JSON.stringify({ query, variables }),
                signal: AbortSignal.timeout(this.config.tracker.network_timeout_ms),
            });
        }
        catch (error) {
            throw new SymphonyError('linear_api_request', `Linear request failed: ${error.message}`, {
                cause: error,
            });
        }
        if (!response.ok) {
            throw new SymphonyError('linear_api_status', `Linear request failed with status ${response.status}`, {
                details: { status: response.status },
            });
        }
        let payload;
        try {
            payload = (await response.json());
        }
        catch (error) {
            throw new SymphonyError('linear_unknown_payload', `Linear response JSON parse failed: ${error.message}`, {
                cause: error,
            });
        }
        if (Array.isArray(payload.errors) && payload.errors.length > 0) {
            this.logger.warn('tracker graphql failed', {
                error: 'linear_graphql_errors',
            });
            throw new SymphonyError('linear_graphql_errors', 'Linear GraphQL returned top-level errors.', {
                details: { errors: payload.errors },
            });
        }
        return payload;
    }
}
//# sourceMappingURL=linear.js.map
