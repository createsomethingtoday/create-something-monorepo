import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  offerRequestSchema,
  planOfferSearchInputSchema,
  resolveOffersInputSchema,
  verifyOfferInputSchema,
  watchOffersInputSchema,
  type FindOffersServiceResult,
  type OfferSearchPlanServiceResult,
  type OfferService
} from '@create-something/offer-resolution';
import { z } from 'zod';

export { createOfferSavingsHttpServer } from './http.js';
export { createLiveOfferService, readOfferSavingsRuntimeConfig } from './runtime.js';
export { OFFER_SAVINGS_WIDGET_HTML } from './widget.js';
import { OFFER_SAVINGS_WIDGET_HTML } from './widget.js';

export const OFFER_WIDGET_URI = 'ui://offer-savings/results-v6.html';
export const OFFER_WIDGET_MIME_TYPE = 'text/html;profile=mcp-app';

const widgetResources = [
  { name: 'offer-savings-results', uri: OFFER_WIDGET_URI },
  { name: 'offer-savings-results-v5-compatibility', uri: 'ui://offer-savings/results-v5.html' },
  { name: 'offer-savings-results-v4-compatibility', uri: 'ui://offer-savings/results-v4.html' },
  { name: 'offer-savings-results-v3-compatibility', uri: 'ui://offer-savings/results-v3.html' },
  { name: 'offer-savings-results-v2-compatibility', uri: 'ui://offer-savings/results-v2.html' },
  { name: 'offer-savings-results-v1-compatibility', uri: 'ui://offer-savings/results-v1.html' }
] as const;

const widgetResourceMeta = {
  ui: {
    prefersBorder: true,
    csp: { connectDomains: [], resourceDomains: [] }
  },
  'openai/widgetDescription':
    'Currently corroborated public offers, with unverified leads separated as non-actionable evidence.',
  'openai/widgetPrefersBorder': true,
  'openai/widgetCSP': {
    connect_domains: [],
    resource_domains: []
  }
} as const;

const toolInvocationMeta = {
  'openai/toolInvocation/invoking': 'Checking public offers…',
  'openai/toolInvocation/invoked': 'Offers checked'
} as const;

function toolMetaWithSecurity(
  meta: Record<string, unknown>,
  securitySchemes?: Array<{ type: 'noauth' } | { type: 'oauth2'; scopes: string[] }>
): Record<string, unknown> {
  return securitySchemes ? { ...meta, securitySchemes } : meta;
}

const userOfferOutputSchema = z
  .object({
    observationId: z.string().min(1),
    merchant: z.string().min(1),
    title: z.string().min(1),
    code: z.string().min(1).optional(),
    status: z.enum(['recommend', 'verify', 'lead', 'rejected']),
    confidence: z.object({ label: z.string().min(1), score: z.number() }).strict(),
    freshness: z.object({ score: z.number() }).strict(),
    projectedSavings: z
      .object({ amount: z.number(), currency: z.string().min(3).max(3) })
      .strict()
      .optional(),
    source: z
      .object({
        url: z.string().url(),
        kind: z.enum([
          'official_retailer',
          'retailer_checkout',
          'ltk_public',
          'creator_owned',
          'affiliate_feed',
          'user_authorized',
          'search_index',
          'deal_aggregator'
        ]),
        lane: z.enum(['ltk', 'supplemental'])
      })
      .strict(),
    disclosure: z.string(),
    receiptHash: z.string().min(1),
    actions: z.object({ canCopyCode: z.boolean(), canWatch: z.boolean() }).strict()
  })
  .strict();

const findOffersToolOutputSchema = z
  .object({
    schemaVersion: z.literal('offer_service.v0.1'),
    operation: z.literal('find_offers'),
    observedAt: z.string().datetime(),
    receiptHash: z.string().min(1),
    request: offerRequestSchema,
    offers: z.array(userOfferOutputSchema),
    ltkOffers: z.array(userOfferOutputSchema),
    supplementalOffers: z.array(userOfferOutputSchema),
    evidence: z.array(userOfferOutputSchema),
    counts: z
      .object({
        ltk: z.number().int().nonnegative(),
        supplemental: z.number().int().nonnegative(),
        evidence: z.number().int().nonnegative()
      })
      .strict()
  })
  .strict();

const offerDiscoveryStageOutputSchema = z
  .object({
    lane: z.enum(['ltk', 'supplemental']),
    ordinal: z.union([z.literal(1), z.literal(2)]),
    domains: z.array(z.string()),
    queries: z.array(z.string()),
    instructions: z.string()
  })
  .strict();

const offerSearchPlanToolOutputSchema = z
  .object({
    schemaVersion: z.literal('offer_service.v0.1'),
    operation: z.literal('plan_offer_search'),
    observedAt: z.string().datetime(),
    request: offerRequestSchema,
    plan: z
      .object({
        policyVersion: z.literal('offer_discovery_ltk_first.v0.1'),
        candidateMerchants: z.array(z.string().min(1)),
        stages: z.tuple([offerDiscoveryStageOutputSchema, offerDiscoveryStageOutputSchema])
      })
      .strict()
  })
  .strict();

const getWatchInputSchema = z
  .object({
    id: z.string().min(1).max(128)
  })
  .strict();

function asStructuredContent(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function asFindOffersStructuredContent(result: FindOffersServiceResult): Record<string, unknown> {
  return asStructuredContent({
    schemaVersion: result.schemaVersion,
    operation: result.operation,
    observedAt: result.observedAt,
    receiptHash: result.receiptHash,
    request: result.resolution.request,
    offers: result.offers,
    ltkOffers: result.ltkOffers,
    supplementalOffers: result.supplementalOffers,
    evidence: result.evidence,
    counts: result.counts
  });
}

function asFindOffersWidgetMeta(result: FindOffersServiceResult): Record<string, unknown> {
  return asFindOffersStructuredContent(result);
}

function asOfferSearchPlanStructuredContent(
  result: OfferSearchPlanServiceResult
): Record<string, unknown> {
  return asStructuredContent(result);
}

function resultText(operation: string, result?: FindOffersServiceResult): string {
  if (operation === 'plan_offer_search') {
    return 'LTK-first host search plan prepared. The ChatGPT or Codex host must retrieve public pages before resolving evidence.';
  }
  if (operation === 'find_offers') {
    const ltk = result?.counts.ltk ?? 0;
    const supplemental = result?.counts.supplemental ?? 0;
    const evidence = result?.counts.evidence ?? 0;
    const run = result?.receiptHash.slice('sha256:'.length, 'sha256:'.length + 10) ?? 'unknown';
    return `${ltk} verified LTK offer${ltk === 1 ? '' : 's'}; ${supplemental} verified supplemental offer${supplemental === 1 ? '' : 's'}; ${evidence} unverified finding${evidence === 1 ? '' : 's'}. Search run ${run}.`;
  }
  if (operation === 'verify_offer') return 'Re-evaluated the supplied public offer evidence.';
  if (operation === 'watch_offers') return 'The host-managed offer watch baseline is saved.';
  return 'Offer watch retrieved.';
}

export interface CreateOfferSavingsMcpServerOptions {
  service: OfferService;
  widgetHtml?: string;
  readSecuritySchemes?: Array<{ type: 'noauth' } | { type: 'oauth2'; scopes: string[] }>;
  writeSecuritySchemes?: Array<{ type: 'noauth' } | { type: 'oauth2'; scopes: string[] }>;
}

export function createOfferSavingsMcpServer(
  options: CreateOfferSavingsMcpServerOptions
): McpServer {
  const server = new McpServer(
    {
      name: 'offer-savings-agent',
      version: '0.3.0'
    },
    {
      capabilities: {
        tools: {},
        resources: {}
      }
    }
  );

  for (const resource of widgetResources) {
    server.registerResource(
      resource.name,
      resource.uri,
      {
        title: 'Offer Savings results',
        description: 'Interactive public-offer results and watch controls.',
        mimeType: OFFER_WIDGET_MIME_TYPE,
        _meta: widgetResourceMeta
      },
      async () => ({
        contents: [
          {
            uri: resource.uri,
            mimeType: OFFER_WIDGET_MIME_TYPE,
            text: options.widgetHtml ?? OFFER_SAVINGS_WIDGET_HTML,
            _meta: widgetResourceMeta
          }
        ]
      })
    );
  }

  server.registerTool(
    'plan_offer_search',
    {
      title: 'Plan an LTK-first host search',
      description:
        'Use this when a user asks to find current savings and the ChatGPT or Codex host needs bounded LTK-first query and evidence guidance before using its own web-search and page-retrieval capability. This tool never searches, retrieves external pages, purchases, mutates a cart, or creates a watch. After the host gathers factual public observations, call resolve_offers.',
      inputSchema: planOfferSearchInputSchema,
      outputSchema: offerSearchPlanToolOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      },
      _meta: toolMetaWithSecurity(
        {
          ...toolInvocationMeta,
          'openai/toolInvocation/invoking': 'Preparing the LTK-first search plan…',
          'openai/toolInvocation/invoked': 'Search plan prepared'
        },
        options.readSecuritySchemes
      )
    },
    async (request) => {
      const result = await options.service.planOfferSearch(request);
      return {
        content: [{ type: 'text', text: resultText(result.operation) }],
        structuredContent: asOfferSearchPlanStructuredContent(result),
        _meta: { operation: result.operation, schemaVersion: result.schemaVersion }
      };
    }
  );

  server.registerTool(
    'resolve_offers',
    {
      title: 'Score host-discovered public offers',
      description:
        'Use this after the ChatGPT or Codex host completes bounded public retrieval with the plan_offer_search guidance and has factual direct-URL observations. Submit the normalized request and factual observations for authoritative deterministic scoring, ranking, evidence separation, and a receipt. Only recommend-status decisions are returned as usable offers; verify and lead decisions remain non-actionable evidence. This tool does not search, purchase, mutate a cart, or create a watch.',
      inputSchema: resolveOffersInputSchema,
      outputSchema: findOffersToolOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      },
      _meta: toolMetaWithSecurity(toolInvocationMeta, options.readSecuritySchemes)
    },
    async (input) => {
      const result = await options.service.resolveOffers(input);
      return {
        content: [{ type: 'text', text: resultText(result.operation, result) }],
        structuredContent: asFindOffersStructuredContent(result),
        _meta: asFindOffersWidgetMeta(result)
      };
    }
  );

  server.registerTool(
    'verify_offer',
    {
      title: 'Verify public offer evidence',
      description:
        'Use this when the ChatGPT or Codex host retrieves stronger public evidence for one candidate and needs a deterministic re-evaluation. This is evidence verification only; when checkout would be required, the result remains needs_checkout.',
      inputSchema: verifyOfferInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      },
      _meta: toolMetaWithSecurity(toolInvocationMeta, options.readSecuritySchemes)
    },
    async (input) => {
      const result = await options.service.verifyOffer(input);
      return {
        content: [{ type: 'text', text: resultText(result.operation) }],
        structuredContent: asStructuredContent(result),
        _meta: { operation: result.operation, schemaVersion: result.schemaVersion }
      };
    }
  );

  server.registerTool(
    'watch_offers',
    {
      title: 'Watch for a better public offer',
      description:
        'Use this only to persist a host-resolved baseline for a bounded offer request until a deadline. The ChatGPT or Codex host must perform every future search and retrieval itself; this MCP never runs scheduled public-web discovery or sends notifications. Reusing an idempotency key with the same request returns the existing watch; this does not purchase or mutate a cart.',
      inputSchema: watchOffersInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      },
      _meta: toolMetaWithSecurity(
        {
          ...toolInvocationMeta,
          'openai/toolInvocation/invoking': 'Starting the offer watch…',
          'openai/toolInvocation/invoked': 'Offer watch active'
        },
        options.writeSecuritySchemes
      )
    },
    async (input) => {
      const result = await options.service.watchOffers(input);
      return {
        content: [{ type: 'text', text: resultText(result.operation) }],
        structuredContent: asStructuredContent(result),
        _meta: { operation: result.operation, schemaVersion: result.schemaVersion }
      };
    }
  );

  server.registerTool(
    'get_watch',
    {
      title: 'Get offer watch',
      description: 'Read the current status and latest deterministic result for one offer watch.',
      inputSchema: getWatchInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      },
      _meta: toolMetaWithSecurity(toolInvocationMeta, options.readSecuritySchemes)
    },
    async ({ id }) => {
      const watch = await options.service.getWatch(id);
      if (!watch) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Offer watch ${id} was not found.` }]
        };
      }
      return {
        content: [{ type: 'text', text: resultText('get_watch') }],
        structuredContent: {
          schemaVersion: 'offer_service.v0.1',
          operation: 'get_watch',
          watch: asStructuredContent(watch)
        },
        _meta: { operation: 'get_watch', schemaVersion: 'offer_service.v0.1' }
      };
    }
  );

  return server;
}
