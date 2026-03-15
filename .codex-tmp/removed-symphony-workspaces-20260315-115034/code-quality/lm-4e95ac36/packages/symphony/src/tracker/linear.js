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
    name
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
        return this.fetch_issues_by_states(this.config.tracker.active_states);
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