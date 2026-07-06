import { Eval, type Score } from '../harness.js';

import { resolveIntentRouteCandidate } from '../../../packages/cs-mcp-hub-remote/index.ts';

type IntentRoutingInput = {
  name: string;
  intent: string;
  expectedProxyToolName: string;
  expectedServerName: string;
  expectedSource: 'allowlist' | 'discovery';
  disallowedProxyToolNames?: string[];
};

type IntentRoutingOutput = {
  matched: boolean;
  source: string;
  proxyToolName: string | null;
  serverName: string | null;
  reason: string;
  matchesExpectedTool: boolean;
  matchesExpectedServer: boolean;
  matchesExpectedSource: boolean;
  avoidsDisallowedRoute: boolean;
};

type MockRouteDefinition = {
  proxyToolName: string;
  serverName: string;
  downstreamToolName: string;
  description: string;
};

const MOCK_ROUTES: MockRouteDefinition[] = [
  {
    proxyToolName: 'composio-toolkit-zoom__zoom_create_a_meeting',
    serverName: 'composio-toolkit-zoom',
    downstreamToolName: 'zoom_create_a_meeting',
    description: '[zoom] create meeting',
  },
  {
    proxyToolName: 'composio-toolkit-googlesheets__googlesheets_create_google_sheet1',
    serverName: 'composio-toolkit-googlesheets',
    downstreamToolName: 'googlesheets_create_google_sheet1',
    description: '[googlesheets] create sheet',
  },
  {
    proxyToolName: 'composio-toolkit-googlesheets__googlesheets_batch_update',
    serverName: 'composio-toolkit-googlesheets',
    downstreamToolName: 'googlesheets_batch_update',
    description: '[googlesheets] write values to range',
  },
  {
    proxyToolName: 'composio-toolkit-googlesheets__googlesheets_values_update',
    serverName: 'composio-toolkit-googlesheets',
    downstreamToolName: 'googlesheets_values_update',
    description: '[googlesheets] set values in range',
  },
  {
    proxyToolName: 'composio-toolkit-googlesheets__googlesheets_values_get',
    serverName: 'composio-toolkit-googlesheets',
    downstreamToolName: 'googlesheets_values_get',
    description: '[googlesheets] get sheet values',
  },
  {
    proxyToolName: 'composio-toolkit-googlesheets__googlesheets_execute_sql',
    serverName: 'composio-toolkit-googlesheets',
    downstreamToolName: 'googlesheets_execute_sql',
    description: '[googlesheets] DEPRECATED SQL executor',
  },
  {
    proxyToolName: 'composio-toolkit-gmail__gmail_send_email',
    serverName: 'composio-toolkit-gmail',
    downstreamToolName: 'gmail_send_email',
    description: '[gmail] send email',
  },
  {
    proxyToolName: 'composio-toolkit-gmail__gmail_fetch_emails',
    serverName: 'composio-toolkit-gmail',
    downstreamToolName: 'gmail_fetch_emails',
    description: '[gmail] fetch inbox',
  },
  {
    proxyToolName: 'composio-toolkit-gmail__gmail_mark_read_by_query',
    serverName: 'composio-toolkit-gmail',
    downstreamToolName: 'gmail_mark_read_by_query',
    description: '[gmail] mark unread emails as read',
  },
];

function buildVisibleCatalog() {
  const toolDefinitions = MOCK_ROUTES.map((route) => ({
    name: route.proxyToolName,
    description: route.description,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  }));

  const routes = new Map(
    MOCK_ROUTES.map((route) => [
      route.proxyToolName,
      {
        proxyToolName: route.proxyToolName,
        serverName: route.serverName,
        downstreamToolName: route.downstreamToolName,
        serverTags: [],
        call: async () => ({ ok: true }),
      },
    ]),
  );

  return {
    toolDefinitions,
    routes,
    definitionByName: new Map(toolDefinitions.map((tool) => [tool.name, tool])),
  };
}

const VISIBLE_CATALOG = buildVisibleCatalog();

const INTENT_ROUTING_CASES = [
  {
    input: {
      name: 'exact-zoom-intent',
      intent: 'create_zoom_meeting',
      expectedProxyToolName: 'composio-toolkit-zoom__zoom_create_a_meeting',
      expectedServerName: 'composio-toolkit-zoom',
      expectedSource: 'allowlist',
    } satisfies IntentRoutingInput,
    metadata: { suite: 'mcp-fleet', eval: 'hub_intent_routing_quality' },
  },
  {
    input: {
      name: 'natural-language-create-sheet',
      intent: 'create a google sheet',
      expectedProxyToolName: 'composio-toolkit-googlesheets__googlesheets_create_google_sheet1',
      expectedServerName: 'composio-toolkit-googlesheets',
      expectedSource: 'allowlist',
      disallowedProxyToolNames: ['composio-toolkit-googlesheets__googlesheets_execute_sql'],
    } satisfies IntentRoutingInput,
    metadata: { suite: 'mcp-fleet', eval: 'hub_intent_routing_quality' },
  },
  {
    input: {
      name: 'legacy-write-values-phrase',
      intent: 'write values in sheets',
      expectedProxyToolName: 'composio-toolkit-googlesheets__googlesheets_batch_update',
      expectedServerName: 'composio-toolkit-googlesheets',
      expectedSource: 'allowlist',
      disallowedProxyToolNames: ['composio-toolkit-googlesheets__googlesheets_execute_sql'],
    } satisfies IntentRoutingInput,
    metadata: { suite: 'mcp-fleet', eval: 'hub_intent_routing_quality' },
  },
  {
    input: {
      name: 'legacy-search-spreadsheets-phrase',
      intent: 'search_spreadsheets',
      expectedProxyToolName: 'composio-toolkit-googlesheets__googlesheets_values_get',
      expectedServerName: 'composio-toolkit-googlesheets',
      expectedSource: 'allowlist',
      disallowedProxyToolNames: ['composio-toolkit-googlesheets__googlesheets_execute_sql'],
    } satisfies IntentRoutingInput,
    metadata: { suite: 'mcp-fleet', eval: 'hub_intent_routing_quality' },
  },
  {
    input: {
      name: 'composite-sheet-formula-phrase',
      intent: 'create a google sheet and write a formula',
      expectedProxyToolName: 'composio-toolkit-googlesheets__googlesheets_values_update',
      expectedServerName: 'composio-toolkit-googlesheets',
      expectedSource: 'allowlist',
      disallowedProxyToolNames: ['composio-toolkit-googlesheets__googlesheets_execute_sql'],
    } satisfies IntentRoutingInput,
    metadata: { suite: 'mcp-fleet', eval: 'hub_intent_routing_quality' },
  },
  {
    input: {
      name: 'gmail-mark-read-synonym',
      intent: 'mark unread emails as read',
      expectedProxyToolName: 'composio-toolkit-gmail__gmail_mark_read_by_query',
      expectedServerName: 'composio-toolkit-gmail',
      expectedSource: 'allowlist',
    } satisfies IntentRoutingInput,
    metadata: { suite: 'mcp-fleet', eval: 'hub_intent_routing_quality' },
  },
  {
    input: {
      name: 'gmail-fetch-latest-email',
      intent: 'latest email',
      expectedProxyToolName: 'composio-toolkit-gmail__gmail_fetch_emails',
      expectedServerName: 'composio-toolkit-gmail',
      expectedSource: 'allowlist',
    } satisfies IntentRoutingInput,
    metadata: { suite: 'mcp-fleet', eval: 'hub_intent_routing_quality' },
  },
];

function routeResolvedScore(output: IntentRoutingOutput): Score {
  return {
    name: 'route_resolved',
    score: output.matched ? 1 : 0,
    metadata: {
      source: output.source,
      proxyToolName: output.proxyToolName,
      reason: output.reason,
    },
  };
}

function expectedToolScore(output: IntentRoutingOutput): Score {
  return {
    name: 'expected_tool',
    score: output.matchesExpectedTool ? 1 : 0,
    metadata: {
      proxyToolName: output.proxyToolName,
    },
  };
}

function expectedServerScore(output: IntentRoutingOutput): Score {
  return {
    name: 'expected_server',
    score: output.matchesExpectedServer ? 1 : 0,
    metadata: {
      serverName: output.serverName,
    },
  };
}

function expectedSourceScore(output: IntentRoutingOutput): Score {
  return {
    name: 'expected_source',
    score: output.matchesExpectedSource ? 1 : 0,
    metadata: {
      source: output.source,
    },
  };
}

function avoidsDisallowedRouteScore(output: IntentRoutingOutput): Score {
  return {
    name: 'avoids_disallowed_route',
    score: output.avoidsDisallowedRoute ? 1 : 0,
    metadata: {
      proxyToolName: output.proxyToolName,
    },
  };
}

void Eval<IntentRoutingInput, IntentRoutingOutput>('create-something-mcp-fleet', {
  experimentName: 'hub_intent_routing_quality',
  data: INTENT_ROUTING_CASES,
  task: async (input): Promise<IntentRoutingOutput> => {
    const candidate = resolveIntentRouteCandidate(VISIBLE_CATALOG as any, { intent: input.intent });

    return {
      matched: candidate.source !== 'none' && Boolean(candidate.proxyToolName),
      source: candidate.source,
      proxyToolName: candidate.proxyToolName,
      serverName: candidate.serverName,
      reason: candidate.reason,
      matchesExpectedTool: candidate.proxyToolName === input.expectedProxyToolName,
      matchesExpectedServer: candidate.serverName === input.expectedServerName,
      matchesExpectedSource: candidate.source === input.expectedSource,
      avoidsDisallowedRoute: !input.disallowedProxyToolNames?.includes(candidate.proxyToolName ?? ''),
    };
  },
  scores: [
    ({ output }) => routeResolvedScore(output),
    ({ output }) => expectedToolScore(output),
    ({ output }) => expectedServerScore(output),
    ({ output }) => expectedSourceScore(output),
    ({ output }) => avoidsDisallowedRouteScore(output),
  ],
});
