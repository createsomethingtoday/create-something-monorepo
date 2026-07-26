import type { Env } from './env.js';

interface LinearIssueNode {
  identifier: string;
  title: string;
  url: string;
  state?: {
    name?: string;
  };
  updatedAt?: string;
}

interface LinearIssuesResponse {
  data?: {
    issues?: {
      nodes?: LinearIssueNode[];
    };
  };
  errors?: { message?: string }[];
}

export interface LinearIssueSummary {
  identifier: string;
  title: string;
  url: string;
  state: string;
  updatedAt: string | null;
}

const LINEAR_QUERY = `
  query OperatorChatOpenIssues($teamKey: String!, $first: Int!) {
    issues(
      first: $first
      filter: {
        team: { key: { eq: $teamKey } }
        state: { type: { nin: ["completed", "canceled"] } }
      }
      orderBy: updatedAt
    ) {
      nodes {
        identifier
        title
        url
        updatedAt
        state { name }
      }
    }
  }
`;

export async function listOpenLinearIssues(env: Pick<Env, 'LINEAR_API_KEY' | 'LINEAR_TEAM_KEY'>, first = 5): Promise<LinearIssueSummary[]> {
  const token = env.LINEAR_API_KEY?.trim();
  if (!token) {
    return [];
  }

  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      authorization: token,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      query: LINEAR_QUERY,
      variables: {
        first: Math.max(1, Math.min(first, 10)),
        teamKey: env.LINEAR_TEAM_KEY?.trim() || 'CRE'
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Linear request failed with ${response.status}`);
  }

  const payload = (await response.json()) as LinearIssuesResponse;
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message ?? 'Linear GraphQL error').join('; '));
  }

  return (payload.data?.issues?.nodes ?? []).map((issue) => ({
    identifier: issue.identifier,
    title: issue.title,
    url: issue.url,
    state: issue.state?.name ?? 'Unknown',
    updatedAt: issue.updatedAt ?? null
  }));
}
