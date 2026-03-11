import type { AuthorizationAccessType, AuthorizationRequest } from './types.js';

type ToolLike = {
  description?: string;
};

const DESTRUCTIVE_PATTERN = /\b(delete|destroy|purge|wipe|drop|archive|trash|remove|revoke|disconnect|deactivate)\b/i;
const WRITE_PATTERN = /\b(create|update|upsert|insert|append|send|post|publish|start|run|execute|sync|batch_update|values_update|set|assign|unassign|clear)\b/i;
const AUTH_ADMIN_PATTERN = /\b(get_connect_link|oauth|authorize|auth|token|consent|credential|scope)\b/i;
const CONTROL_PLANE_PATTERN = /\b(policy|rollout|registry|state|quota|rate_limit|discovery|bundle|trace)\b/i;

function joinedRouteText(route: {
  proxyToolName: string;
  serverName: string;
  downstreamToolName: string;
}, definition?: ToolLike): string {
  return [
    route.proxyToolName,
    route.serverName,
    route.downstreamToolName,
    definition?.description ?? '',
  ]
    .join(' ')
    .replace(/[_:/.-]+/g, ' ')
    .toLowerCase();
}

export function classifyHubRoute(route: {
  proxyToolName: string;
  serverName: string;
  downstreamToolName: string;
  serverTags?: string[] | null;
}, definition?: ToolLike): {
  accessType: AuthorizationAccessType;
  oauthRequired: boolean;
  tags: string[];
} {
  const text = joinedRouteText(route, definition);
  let accessType: AuthorizationAccessType = 'read';
  if (DESTRUCTIVE_PATTERN.test(text)) {
    accessType = 'destructive';
  } else if (CONTROL_PLANE_PATTERN.test(text)) {
    accessType = 'control_plane';
  } else if (AUTH_ADMIN_PATTERN.test(text)) {
    accessType = 'auth_admin';
  } else if (WRITE_PATTERN.test(text)) {
    accessType = 'write';
  }

  const oauthRequired =
    route.serverName.startsWith('composio-toolkit-') ||
    route.downstreamToolName.includes('oauth') ||
    route.downstreamToolName.includes('connect_link');

  const tags = [
    route.serverName,
    accessType,
    oauthRequired ? 'oauth_required' : 'oauth_not_required',
    ...((route.serverTags ?? []).filter((tag) => typeof tag === 'string' && tag.length > 0)),
  ];

  return { accessType, oauthRequired, tags: [...new Set(tags)] };
}

export function buildHubAuthorizationRequest(input: {
  accountId: string;
  tenantId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  role?: string | null;
  readOnly?: boolean;
  toolMode?: string | null;
  identitySource?: string | null;
  introspectionOk?: boolean;
  proxyToolName: string;
  serverName: string;
  downstreamToolName: string;
  serverTags?: string[] | null;
  actionName: 'discover' | 'execute';
  definition?: ToolLike;
  context?: Record<string, unknown>;
}): AuthorizationRequest {
  const classification = classifyHubRoute(
    {
      proxyToolName: input.proxyToolName,
      serverName: input.serverName,
      downstreamToolName: input.downstreamToolName,
      serverTags: input.serverTags ?? null,
    },
    input.definition,
  );

  return {
    actor: {
      accountId: input.accountId,
      tenantId: input.tenantId ?? null,
      userId: input.userId ?? null,
      sessionId: input.sessionId ?? null,
      role: input.role ?? null,
      readOnly: input.readOnly ?? input.toolMode === 'read_only',
      toolMode: input.toolMode ?? null,
      identitySource: input.identitySource ?? null,
    },
    action: {
      name: input.actionName,
      writeIntent: input.actionName === 'execute' && classification.accessType !== 'read',
      humanReviewStep: false,
      introspectionOk: input.introspectionOk ?? true,
    },
    resource: {
      kind: 'hub_route',
      id: input.proxyToolName,
      toolName: input.proxyToolName,
      serverName: input.serverName,
      downstreamToolName: input.downstreamToolName,
      accessType: classification.accessType,
      oauthRequired: classification.oauthRequired,
      tags: classification.tags,
      metadata: {
        description: input.definition?.description ?? null,
      },
    },
    context: input.context,
  };
}
