import { SymphonyError } from '../errors.js';
import type { Issue, Logger, ServiceConfig, TrackerClient } from '../types.js';

type FetchLike = typeof fetch;

type IssuesConnection = {
  nodes?: Array<Record<string, unknown>>;
  pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
};

type IssuesPagePayload = {
  data?: {
    issues?: IssuesConnection;
  };
};

type IssueStatesPayload = {
  data?: {
    issues?: {
      nodes?: Array<Record<string, unknown>>;
    };
  };
};

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

function normalize_priority(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

function normalize_timestamp(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function normalize_issue(node: Record<string, unknown>): Issue {
  const labels = ((node.labels as { nodes?: Array<{ name?: string }> } | undefined)?.nodes ?? [])
    .map((entry) => entry.name?.toLowerCase())
    .filter((entry): entry is string => Boolean(entry));

  const blocked_by = ((node.inverseRelations as { nodes?: Array<{ type?: string; issue?: { id?: string; identifier?: string; state?: { name?: string } } }> } | undefined)?.nodes ?? [])
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
    state: String((node.state as { name?: string } | undefined)?.name ?? ''),
    branch_name: typeof node.branchName === 'string' ? node.branchName : null,
    url: typeof node.url === 'string' ? node.url : null,
    labels,
    blocked_by,
    created_at: normalize_timestamp(node.createdAt),
    updated_at: normalize_timestamp(node.updatedAt),
  };
}

export class LinearTrackerClient implements TrackerClient {
  private readonly config: ServiceConfig;
  private readonly logger: Logger;
  private readonly fetch_impl: FetchLike;

  constructor(config: ServiceConfig, logger: Logger, fetch_impl: FetchLike = fetch) {
    this.config = config;
    this.logger = logger;
    this.fetch_impl = fetch_impl;
  }

  async fetch_candidate_issues(): Promise<Issue[]> {
    return this.fetch_issues_by_states(this.config.tracker.active_states);
  }

  async fetch_issues_by_states(states: string[]): Promise<Issue[]> {
    if (states.length === 0) {
      return [];
    }

    const issues: Issue[] = [];
    let after: string | null = null;

    while (true) {
      const payload: IssuesPagePayload = await this.graphql<IssuesPagePayload>(
        `
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
        `,
        {
          projectSlug: this.config.tracker.project_slug,
          states,
          first: this.config.tracker.page_size,
          after,
        }
      );

      const connection: IssuesConnection | undefined = payload.data?.issues;
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

  async fetch_issue_states_by_ids(issue_ids: string[]): Promise<Issue[]> {
    if (issue_ids.length === 0) {
      return [];
    }

    const payload: IssueStatesPayload = await this.graphql<IssueStatesPayload>(
      `
        query SymphonyIssueStates($ids: [ID!]) {
          issues(filter: { id: { in: $ids } }) {
            nodes {
              ${LINEAR_ISSUE_FIELDS}
            }
          }
        }
      `,
      { ids: issue_ids }
    );

    const nodes = payload.data?.issues?.nodes;
    if (!Array.isArray(nodes)) {
      throw new SymphonyError('linear_unknown_payload', 'Linear issue-state payload missing nodes.');
    }

    return nodes.map(normalize_issue);
  }

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    let response: Response;
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
    } catch (error) {
      throw new SymphonyError('linear_api_request', `Linear request failed: ${(error as Error).message}`, {
        cause: error,
      });
    }

    if (!response.ok) {
      throw new SymphonyError('linear_api_status', `Linear request failed with status ${response.status}`, {
        details: { status: response.status },
      });
    }

    let payload: Record<string, unknown>;
    try {
      payload = (await response.json()) as Record<string, unknown>;
    } catch (error) {
      throw new SymphonyError('linear_unknown_payload', `Linear response JSON parse failed: ${(error as Error).message}`, {
        cause: error,
      });
    }

    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      this.logger.warn('tracker graphql failed', {
        error: 'linear_graphql_errors',
      });
      throw new SymphonyError('linear_graphql_errors', 'Linear GraphQL returned top-level errors.', {
        details: { errors: payload.errors as unknown as Record<string, unknown>[] },
      });
    }

    return payload as T;
  }
}
