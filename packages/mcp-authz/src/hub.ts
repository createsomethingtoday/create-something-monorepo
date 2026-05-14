import type { AuthorizationAccessType, AuthorizationRequest } from './types.js';

type ToolLike = {
  description?: string;
};

const DESTRUCTIVE_PATTERN =
  /\b(delete|destroy|purge|wipe|drop|archive|trash|remove|revoke|disconnect|deactivate)\b/i;
const WRITE_PATTERN =
  /\b(create|update|upsert|insert|append|send|post|publish|start|run|execute|sync|batch_update|values_update|set|assign|unassign|clear)\b/i;
const AUTH_ADMIN_PATTERN =
  /\b(get_connect_link|oauth|authorize|auth|token|consent|credential|scope)\b/i;
const CONTROL_PLANE_PATTERN =
  /\b(policy|rollout|registry|state|quota|rate_limit|discovery|bundle|trace)\b/i;
const READ_ACTION_PREFIX_PATTERN =
  /^(list|get|fetch|describe|inspect|preview|validate|search|query|check|test)\b/i;
const READ_METADATA_PATTERN = /\b(status|schema|health|info|details)\b/i;
const EXPLICIT_READ_ONLY_DOWNSTREAM_TOOLS = new Set(['template_review_start_capture_session']);

function normalizeHubRouteText(...parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part.length > 0)
    .join(' ')
    .replace(/[_:/.-]+/g, ' ')
    .toLowerCase();
}

function routeIdentifierText(route: {
  proxyToolName: string;
  serverName: string;
  downstreamToolName: string;
}): string {
  return normalizeHubRouteText(route.proxyToolName, route.serverName, route.downstreamToolName);
}

function isExplicitReadOnlyRoute(route: { downstreamToolName: string }): boolean {
  return EXPLICIT_READ_ONLY_DOWNSTREAM_TOOLS.has(route.downstreamToolName);
}

function classifyInvocationAccessType(
  invocationAction?: string | null
): AuthorizationAccessType | null {
  const text = normalizeHubRouteText(invocationAction);
  if (!text) return null;
  if (DESTRUCTIVE_PATTERN.test(text)) {
    return 'destructive';
  }
  if (AUTH_ADMIN_PATTERN.test(text)) {
    return 'auth_admin';
  }
  if (
    READ_ACTION_PREFIX_PATTERN.test(text) ||
    (READ_METADATA_PATTERN.test(text) && !WRITE_PATTERN.test(text))
  ) {
    return 'read';
  }
  if (CONTROL_PLANE_PATTERN.test(text)) {
    return 'control_plane';
  }
  if (WRITE_PATTERN.test(text)) {
    return 'write';
  }
  return null;
}

export function classifyHubRoute(
  route: {
    proxyToolName: string;
    serverName: string;
    downstreamToolName: string;
    serverTags?: string[] | null;
  },
  definition?: ToolLike,
  options?: {
    invocationAction?: string | null;
  }
): {
  accessType: AuthorizationAccessType;
  oauthRequired: boolean;
  tags: string[];
} {
  const invocationAccessType = classifyInvocationAccessType(options?.invocationAction);
  let accessType: AuthorizationAccessType = invocationAccessType ?? 'read';
  if (!invocationAccessType) {
    // Classify from stable identifiers instead of free-form vendor descriptions.
    // Descriptions frequently contain incidental nouns like "state" or "trash"
    // in otherwise read-only tools, which creates false control-plane or
    // destructive matches if we pattern-match the prose directly.
    const text = routeIdentifierText(route);
    if (isExplicitReadOnlyRoute(route)) {
      accessType = 'read';
    } else if (DESTRUCTIVE_PATTERN.test(text)) {
      accessType = 'destructive';
    } else if (CONTROL_PLANE_PATTERN.test(text)) {
      accessType = 'control_plane';
    } else if (AUTH_ADMIN_PATTERN.test(text)) {
      accessType = 'auth_admin';
    } else if (WRITE_PATTERN.test(text)) {
      accessType = 'write';
    }
  }

  const oauthRequired =
    route.serverName.startsWith('composio-toolkit-') ||
    route.downstreamToolName.includes('oauth') ||
    route.downstreamToolName.includes('connect_link');

  const tags = [
    route.serverName,
    accessType,
    oauthRequired ? 'oauth_required' : 'oauth_not_required',
    ...(route.serverTags ?? []).filter((tag) => typeof tag === 'string' && tag.length > 0)
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
  invocationAction?: string | null;
  context?: Record<string, unknown>;
}): AuthorizationRequest {
  const classification = classifyHubRoute(
    {
      proxyToolName: input.proxyToolName,
      serverName: input.serverName,
      downstreamToolName: input.downstreamToolName,
      serverTags: input.serverTags ?? null
    },
    input.definition,
    {
      invocationAction: input.invocationAction
    }
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
      identitySource: input.identitySource ?? null
    },
    action: {
      name: input.actionName,
      writeIntent: input.actionName === 'execute' && classification.accessType !== 'read',
      humanReviewStep: false,
      introspectionOk: input.introspectionOk ?? true
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
        invocationAction: input.invocationAction ?? null
      }
    },
    context: input.context
  };
}
