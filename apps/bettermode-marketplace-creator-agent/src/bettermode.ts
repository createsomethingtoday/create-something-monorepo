// Bettermode GraphQL helpers. Auth model:
//   - App access token (NETWORK context) for reading posts, threads, members, spaces.
//   - Member access token (MEMBER context, actorId=admin user) for posting AS the admin.
//
// Tokens are short-lived. The worker mints a fresh one per request rather than
// caching, since requests are infrequent (one per webhook, one per interaction).

const DEFAULT_ENDPOINT = 'https://api.bettermode.com';

type GraphQlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string; status?: number }>;
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
  // description and shortContent are truncated previews (~240 chars).
  description?: string | null;
  shortContent?: string | null;
  // Full body as plain text.
  textContent?: string | null;
  url?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  lastActivityAt?: string | null;
  // PUBLISHED | BLOCKED | DELETED | DRAFT | ARCHIVED
  status?: string | null;
  spaceId?: string | null;
  space?: { id: string; name?: string | null; slug?: string | null } | null;
  owner?: BettermodeMember | null;
  createdBy?: BettermodeMember | null;
  parentId?: string | null;
  // Ancestor post IDs, nearest first. The last entry is the thread root.
  ancestorIds?: string[];
  // Count of direct replies to this post.
  repliesCount?: number | null;
  // Direct replies. After fetchThread, each one carries its nested replies.
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

type RawBettermodePost = Omit<
  BettermodePost,
  'owner' | 'createdBy' | 'parentId' | 'ancestorIds' | 'replies'
> & {
  owner?: BettermodeSpaceMember | null;
  createdBy?: BettermodeSpaceMember | null;
  repliedToId?: string | null;
  repliedToIds?: string[] | null;
  replies?: { nodes?: RawBettermodePost[]; pageInfo?: RawPageInfo | null } | null;
};

type RawPageInfo = { endCursor?: string | null; hasNextPage?: boolean | null };

function nextCursor(pageInfo: RawPageInfo | null | undefined): string | null {
  return pageInfo?.hasNextPage && pageInfo.endCursor ? pageInfo.endCursor : null;
}

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

// Bettermode limits query cost to 20,000 per 10 seconds, and nested
// connections multiply: two levels of replies(limit: 50) cost about 20,500 in
// one query. Field aliases are not allowed either. So a thread is read as one
// post with its direct replies (cost about 150), then one small query for each
// direct reply that has replies of its own. Direct replies are read in pages
// of 50, newest first, up to 250. `reverse: true` means a longer thread loses
// its oldest direct replies, not the latest ones that decide the state.
const POST_FIELDS = `
  fragment PostFields on Post {
    id
    status
    textContent
    shortContent
    url
    publishedAt
    createdAt
    lastActivityAt
    repliedToId
    repliedToIds
    repliesCount
    owner {
      member { id name username email role { id name type } }
    }
  }`;

const DIRECT_REPLY_PAGE = 50;
const NESTED_REPLY_PAGE = 30;
// Direct replies read after the first page: 4 more pages, 250 in total.
const MAX_EXTRA_REPLY_PAGES = 4;

// One post with its newest direct replies, and the cursor for older ones.
async function fetchPostThread(
  postId: string,
  appToken: string,
  auth: BettermodeAuth,
): Promise<{ post: BettermodePost; olderReplies: string | null } | null> {
  let data: { post: RawBettermodePost | null };
  try {
    data = await graphQl<{ post: RawBettermodePost | null }>(
      auth.endpoint,
      bearer(appToken),
      `query Post($id: ID!) {
        post(id: $id) {
          slug
          title
          spaceId
          space { id name slug }
          ...PostFields
          replies(limit: ${DIRECT_REPLY_PAGE}, reverse: true) {
            pageInfo { endCursor hasNextPage }
            nodes { ...PostFields }
          }
        }
      }
      ${POST_FIELDS}`,
      { id: postId },
    );
  } catch (error) {
    if (error instanceof BettermodeError && error.status === 404) return null;
    throw error;
  }
  if (!data.post) return null;
  return {
    post: normalizePost(data.post),
    olderReplies: nextCursor(data.post.replies?.pageInfo),
  };
}

// One page of replies to a post, newest first.
async function fetchReplies(
  postId: string,
  appToken: string,
  auth: BettermodeAuth,
  page: { limit: number; after?: string | null },
): Promise<{ nodes: BettermodePost[]; older: string | null }> {
  const data = await graphQl<{
    replies: { nodes?: RawBettermodePost[]; pageInfo?: RawPageInfo | null };
  }>(
    auth.endpoint,
    bearer(appToken),
    `query Replies($postId: ID!, $limit: Int!, $after: String) {
      replies(postId: $postId, limit: $limit, reverse: true, after: $after) {
        pageInfo { endCursor hasNextPage }
        nodes { ...PostFields }
      }
    }
    ${POST_FIELDS}`,
    { postId, limit: page.limit, after: page.after ?? null },
  );
  return {
    nodes: (data.replies.nodes ?? []).map(normalizePost),
    older: nextCursor(data.replies.pageInfo),
  };
}

// Returns the whole thread for any post in it: the root, its direct replies,
// and the replies nested under them. A reply ID resolves to its root.
export async function fetchThread(
  postId: string,
  appToken: string,
  auth: BettermodeAuth,
): Promise<BettermodePost | null> {
  let rootId = postId;
  try {
    const ref = await graphQl<{ post: { id: string; repliedToIds?: string[] | null } | null }>(
      auth.endpoint,
      bearer(appToken),
      `query PostRoot($id: ID!) {
        post(id: $id) { id repliedToIds }
      }`,
      { id: postId },
    );
    rootId = ref.post?.repliedToIds?.at(-1) || postId;
  } catch (error) {
    if (error instanceof BettermodeError && error.status === 404) return null;
    throw error;
  }

  const first = await fetchPostThread(rootId, appToken, auth);
  if (!first) return null;
  const root = first.post;
  const direct = root.replies?.nodes ?? [];

  // A long thread has more direct replies than one page. Read the older pages
  // too: a new nested reply under an old direct reply still decides the state.
  let older = first.olderReplies;
  for (let page = 0; older && page < MAX_EXTRA_REPLY_PAGES; page += 1) {
    const next = await fetchReplies(rootId, appToken, auth, {
      limit: DIRECT_REPLY_PAGE,
      after: older,
    });
    direct.push(...next.nodes);
    older = next.older;
  }
  if (older) {
    console.warn('thread is longer than the read limit; oldest direct replies skipped', {
      rootId,
      read: direct.length,
    });
  }
  root.replies = { nodes: direct };

  // Sequential on purpose: threads rarely have more than a few reply chains,
  // and this keeps the request rate flat.
  for (const reply of direct) {
    if ((reply.repliesCount ?? 0) > 0) {
      const nested = await fetchReplies(reply.id, appToken, auth, { limit: NESTED_REPLY_PAGE });
      reply.replies = { nodes: nested.nodes };
    }
  }
  return root;
}

// Most recently active threads (root posts) in one space.
export async function listRecentThreads(
  spaceId: string,
  limit: number,
  appToken: string,
  auth: BettermodeAuth,
): Promise<Array<{ id: string; lastActivityAt: string | null }>> {
  const data = await graphQl<{
    posts: { nodes?: Array<{ id: string; lastActivityAt?: string | null }> };
  }>(
    auth.endpoint,
    bearer(appToken),
    `query RecentThreads($spaceIds: [ID!], $limit: Int!) {
      posts(spaceIds: $spaceIds, limit: $limit, orderBy: lastActivityAt, reverse: true) {
        nodes { id lastActivityAt }
      }
    }`,
    { spaceIds: [spaceId], limit },
  );
  return (data.posts.nodes ?? []).map((node) => ({
    id: node.id,
    lastActivityAt: node.lastActivityAt ?? null,
  }));
}

// CreatePostInput requires postTypeId and rejects spaceId.
export async function createReply(
  parentPostId: string,
  postTypeId: string,
  htmlContent: string,
  memberToken: string,
  auth: BettermodeAuth,
): Promise<{ id: string; status?: string | null; url?: string | null }> {
  const data = await graphQl<{
    createReply: { id: string; status?: string | null; url?: string | null };
  }>(
    auth.endpoint,
    bearer(memberToken),
    `mutation CreateReply($postId: ID!, $input: CreatePostInput!) {
      createReply(postId: $postId, input: $input) {
        id
        status
        url
      }
    }`,
    {
      postId: parentPostId,
      input: {
        postTypeId,
        publish: true,
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
  return data.createReply;
}

export async function fetchPostStatus(
  postId: string,
  token: string,
  auth: BettermodeAuth,
): Promise<string | null> {
  try {
    const data = await graphQl<{ post: { status?: string | null } | null }>(
      auth.endpoint,
      bearer(token),
      `query PostStatus($id: ID!) {
        post(id: $id) { id status }
      }`,
      { id: postId },
    );
    return data.post?.status ?? null;
  } catch (error) {
    if (error instanceof BettermodeError && error.status === 404) return null;
    throw error;
  }
}

// Finds the open moderation item that holds one post, if any.
export async function findModerationItemId(
  spaceId: string,
  postId: string,
  token: string,
  auth: BettermodeAuth,
): Promise<string | null> {
  const data = await graphQl<{
    moderationItems: { nodes?: Array<{ id: string; entity?: { id?: string } | null }> };
  }>(
    auth.endpoint,
    bearer(token),
    `query ModerationItems($spaceId: String!) {
      moderationItems(spaceId: $spaceId, limit: 50, status: REVIEW) {
        nodes {
          id
          entity { ... on Post { id } }
        }
      }
    }`,
    { spaceId },
  );
  const item = (data.moderationItems.nodes ?? []).find((node) => node.entity?.id === postId);
  return item?.id ?? null;
}

// REJECTED rejects the spam report, which publishes the held post.
export async function releaseModerationItem(
  itemId: string,
  token: string,
  auth: BettermodeAuth,
): Promise<void> {
  await graphQl<{ updateModerationItem: { status?: string | null } }>(
    auth.endpoint,
    bearer(token),
    `mutation ReleaseModerationItem($id: ID!) {
      updateModerationItem(id: $id, input: { status: REJECTED }) {
        status
      }
    }`,
    { id: itemId },
  );
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
    // GraphQL errors arrive with HTTP 200; the real status is on the error.
    const status = payload.errors?.find((error) => error.status === 404 || error.status === 429)
      ?.status;
    throw new BettermodeError(message, status ?? 502);
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
    ancestorIds: post.repliedToIds ?? [],
    owner: post.owner?.member ?? null,
    createdBy: post.createdBy?.member ?? null,
    replies: post.replies
      ? { nodes: post.replies.nodes?.map(normalizePost) ?? [] }
      : post.replies,
  };
}
