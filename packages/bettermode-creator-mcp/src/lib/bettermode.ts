// Bettermode GraphQL helpers — read-only subset for the MCP.
// Mirrors the agent worker's helpers but trimmed to what tools need.

const DEFAULT_ENDPOINT = 'https://api.bettermode.com';

export type BettermodeAuth = {
  endpoint: string;
  clientId: string;
  clientSecret: string;
};

export type BettermodeMember = {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  role?: { id?: string | null; name?: string | null; type?: string | null } | null;
};

export type BettermodePost = {
  id: string;
  slug?: string | null;
  title?: string | null;
  // description and shortContent are truncated previews (~240 chars).
  description?: string | null;
  shortContent?: string | null;
  // Full body as plain text.
  textContent?: string | null;
  status?: string | null;
  url?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  spaceId?: string | null;
  space?: { id: string; name?: string | null; slug?: string | null } | null;
  parentId?: string | null;
  owner?: BettermodeMember | null;
  createdBy?: BettermodeMember | null;
  // Count of direct replies to this post.
  repliesCount?: number | null;
  // Direct replies; each one carries its nested replies.
  replies?: { nodes?: BettermodePost[] } | null;
};

type BettermodeSpaceMember = { member?: BettermodeMember | null };
type RawBettermodePost = Omit<BettermodePost, 'owner' | 'createdBy' | 'parentId' | 'replies'> & {
  owner?: BettermodeSpaceMember | null;
  createdBy?: BettermodeSpaceMember | null;
  repliedToId?: string | null;
  replies?: { nodes?: RawBettermodePost[] } | null;
};

type GraphQlResponse<T> = { data?: T; errors?: Array<{ message?: string }> };

export class BettermodeError extends Error {
  constructor(message: string, readonly status: number = 502) {
    super(message);
  }
}

export function bettermodeAuth(env: {
  BETTERMODE_GRAPHQL_ENDPOINT?: string;
  BETTERMODE_CLIENT_ID?: string;
  BETTERMODE_CLIENT_SECRET?: string;
}): BettermodeAuth {
  if (!env.BETTERMODE_CLIENT_ID || !env.BETTERMODE_CLIENT_SECRET) {
    throw new BettermodeError('Missing BETTERMODE_CLIENT_ID or BETTERMODE_CLIENT_SECRET', 500);
  }
  return {
    endpoint: env.BETTERMODE_GRAPHQL_ENDPOINT || DEFAULT_ENDPOINT,
    clientId: env.BETTERMODE_CLIENT_ID,
    clientSecret: env.BETTERMODE_CLIENT_SECRET,
  };
}

export async function appAccessToken(networkId: string, auth: BettermodeAuth): Promise<string> {
  const data = await graphQl<{ limitedToken: { accessToken: string } }>(
    auth.endpoint,
    basicAuth(auth),
    `query LimitedToken($networkId: String!) {
      limitedToken(context: NETWORK, networkId: $networkId, entityId: $networkId) {
        accessToken
      }
    }`,
    { networkId },
  );
  if (!data.limitedToken?.accessToken) {
    throw new BettermodeError('Bettermode did not return an app access token.');
  }
  return data.limitedToken.accessToken;
}

// Bettermode limits query cost to 20,000 per 10 seconds, and nested
// connections multiply: two levels of replies(limit: 50) cost about 20,500 in
// one query. Field aliases are not allowed either. So the thread is read as
// one post with its direct replies, then one small query for each direct
// reply that has replies of its own. `reverse: true` returns the newest
// replies first, so a very long thread loses its oldest messages, not its latest.
const REPLY_FIELDS = `
  fragment ReplyFields on Post {
    id
    status
    shortContent
    textContent
    url
    publishedAt
    createdAt
    repliedToId
    repliesCount
    createdBy { member { ...MemberFields } }
  }
  fragment MemberFields on Member {
    id
    name
    username
    email
    role { id name type }
  }`;

export async function fetchPostThread(
  postId: string,
  appToken: string,
  auth: BettermodeAuth,
): Promise<BettermodePost | null> {
  const data = await graphQl<{ post: RawBettermodePost | null }>(
    auth.endpoint,
    bearer(appToken),
    `query Post($id: ID!) {
      post(id: $id) {
        slug
        title
        spaceId
        space { id name slug }
        owner { member { ...MemberFields } }
        ...ReplyFields
        replies(limit: 50, reverse: true) {
          nodes { ...ReplyFields }
        }
      }
    }
    ${REPLY_FIELDS}`,
    { id: postId },
  );
  if (!data.post) return null;

  const post = normalizePost(data.post);
  for (const reply of post.replies?.nodes ?? []) {
    if ((reply.repliesCount ?? 0) > 0) {
      const nested = await graphQl<{ replies: { nodes?: RawBettermodePost[] } }>(
        auth.endpoint,
        bearer(appToken),
        `query Replies($postId: ID!) {
          replies(postId: $postId, limit: 30, reverse: true) {
            nodes { ...ReplyFields }
          }
        }
        ${REPLY_FIELDS}`,
        { postId: reply.id },
      );
      reply.replies = { nodes: (nested.replies.nodes ?? []).map(normalizePost) };
    }
  }
  return post;
}

async function graphQl<T>(
  url: string,
  authHeader: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { authorization: authHeader, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const payload = (await response.json()) as GraphQlResponse<T>;
  if (!response.ok || payload.errors?.length) {
    const message =
      payload.errors?.map((e) => e.message).filter(Boolean).join('; ') ||
      `Bettermode GraphQL request failed with HTTP ${response.status}`;
    throw new BettermodeError(message, 502);
  }
  if (!payload.data) throw new BettermodeError('Bettermode GraphQL response did not include data.');
  return payload.data;
}

function basicAuth(auth: BettermodeAuth): string {
  return `Basic ${btoa(`${auth.clientId}:${auth.clientSecret}`)}`;
}

function bearer(token: string): string {
  return `Bearer ${token}`;
}

function normalizePost(post: RawBettermodePost): BettermodePost {
  return {
    ...post,
    parentId: post.repliedToId ?? null,
    owner: post.owner?.member ?? null,
    createdBy: post.createdBy?.member ?? null,
    replies: post.replies
      ? { nodes: post.replies.nodes?.map(normalizePost) ?? [] }
      : post.replies,
  };
}
