// Bettermode GraphQL helpers. Auth model:
//   - App access token (NETWORK context) for reading posts, threads, members, spaces.
//   - Member access token (MEMBER context, actorId=admin user) for posting AS the admin.
//
// Tokens are short-lived. The worker mints a fresh one per request rather than
// caching, since requests are infrequent (one per webhook, one per interaction).

const DEFAULT_ENDPOINT = 'https://api.bettermode.com';

type GraphQlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

export type BettermodeAuth = {
  endpoint: string;
  clientId: string;
  clientSecret: string;
};

export type BettermodePost = {
  id: string;
  slug?: string | null;
  title?: string | null;
  description?: string | null;
  shortContent?: string | null;
  url?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  spaceId?: string | null;
  space?: { id: string; name?: string | null; slug?: string | null } | null;
  owner?: BettermodeMember | null;
  createdBy?: BettermodeMember | null;
  parentId?: string | null;
  // Reply tree (top-level posts) or replies on a reply (rare).
  replies?: { nodes?: BettermodePost[] } | null;
};

export type BettermodeMember = {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  profilePictureId?: string | null;
  roleType?: string | null;
  role?: { id?: string | null; name?: string | null; type?: string | null } | null;
};

type BettermodeSpaceMember = {
  member?: BettermodeMember | null;
};

type RawBettermodePost = Omit<BettermodePost, 'owner' | 'createdBy' | 'parentId' | 'replies'> & {
  owner?: BettermodeSpaceMember | null;
  createdBy?: BettermodeSpaceMember | null;
  repliedToId?: string | null;
  replies?: { nodes?: RawBettermodePost[] } | null;
};

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

export async function memberAccessToken(
  networkId: string,
  memberId: string,
  auth: BettermodeAuth,
): Promise<string> {
  const data = await graphQl<{ limitedToken: { accessToken: string } }>(
    auth.endpoint,
    basicAuth(auth),
    `query MemberToken($networkId: String!, $memberId: String!) {
      limitedToken(context: MEMBER, networkId: $networkId, entityId: $memberId) {
        accessToken
      }
    }`,
    { networkId, memberId },
  );
  if (!data.limitedToken?.accessToken) {
    throw new BettermodeError('Bettermode did not return a member access token.');
  }
  return data.limitedToken.accessToken;
}

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
        id
        slug
        title
        description
        shortContent
        url
        publishedAt
        createdAt
        spaceId
        space { id name slug }
        owner {
          member { ...MemberFields }
        }
        createdBy {
          member { ...MemberFields }
        }
        repliedToId
        replies(limit: 50) {
          nodes {
            id
            shortContent
            description
            url
            publishedAt
            createdBy {
              member { ...MemberFields }
            }
          }
        }
      }
    }
    fragment MemberFields on Member {
      id
      name
      username
      email
      profilePictureId
      role { id name type }
    }`,
    { id: postId },
  );
  return data.post ? normalizePost(data.post) : null;
}

export async function createReply(
  parentPostId: string,
  _spaceId: string | null | undefined,
  htmlContent: string,
  memberToken: string,
  auth: BettermodeAuth,
  replyPostTypeId: string,
): Promise<{ id: string; url?: string | null }> {
  const data = await graphQl<{
    createReply: { id: string; url?: string | null };
  }>(
    auth.endpoint,
    bearer(memberToken),
    `mutation CreateReply($postId: ID!, $input: CreatePostInput!) {
      createReply(postId: $postId, input: $input) {
        id
        url
      }
    }`,
    {
      postId: parentPostId,
      input: {
        postTypeId: replyPostTypeId,
        mappingFields: [
          {
            key: 'content',
            type: 'html',
            value: JSON.stringify(htmlContent),
          },
        ],
      },
    },
  );

  const reply = data.createReply;
  if (!reply?.id) {
    return reply;
  }

  const published = await graphQl<{
    publishPost: { id: string; url?: string | null };
  }>(
    auth.endpoint,
    bearer(memberToken),
    `mutation PublishPost($postId: ID!) {
      publishPost(postId: $postId) {
        id
        url
      }
    }`,
    { postId: reply.id },
  );
  return published.publishPost;
}

async function graphQl<T>(
  url: string,
  authHeader: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: authHeader,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await response.json()) as GraphQlResponse<T>;
  if (!response.ok || payload.errors?.length) {
    const message =
      payload.errors?.map((error) => error.message).filter(Boolean).join('; ') ||
      `Bettermode GraphQL request failed with HTTP ${response.status}`;
    throw new BettermodeError(message, 502);
  }
  if (!payload.data) {
    throw new BettermodeError('Bettermode GraphQL response did not include data.');
  }
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
