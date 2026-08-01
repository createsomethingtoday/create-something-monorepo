import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  findOffersInputSchema,
  verifyOfferInputSchema,
  watchOffersInputSchema,
  type FindOffersServiceResult,
  type OfferService
} from '@create-something/offer-resolution';
import { z } from 'zod';

export { createOfferSavingsHttpServer } from './http.js';
export { createLiveOfferService, readOfferSavingsRuntimeConfig } from './runtime.js';
export { OFFER_SAVINGS_WIDGET_HTML } from './widget.js';
import { OFFER_SAVINGS_WIDGET_HTML } from './widget.js';

export const OFFER_WIDGET_URI = 'ui://offer-savings/results-v1.html';
export const OFFER_WIDGET_MIME_TYPE = 'text/html;profile=mcp-app';

const widgetToolMeta = {
  ui: { resourceUri: OFFER_WIDGET_URI },
  'openai/outputTemplate': OFFER_WIDGET_URI,
  'openai/toolInvocation/invoking': 'Checking public offers…',
  'openai/toolInvocation/invoked': 'Offers checked'
} as const;

function toolMetaWithSecurity(
  meta: Record<string, unknown>,
  securitySchemes?: Array<{ type: 'noauth' } | { type: 'oauth2'; scopes: string[] }>
): Record<string, unknown> {
  return securitySchemes ? { ...meta, securitySchemes } : meta;
}

const serviceResultOutputSchema = z
  .object({
    schemaVersion: z.literal('offer_service.v0.1'),
    operation: z.string().min(1)
  })
  .passthrough();

const getWatchInputSchema = z
  .object({
    id: z.string().min(1).max(128)
  })
  .strict();

function asStructuredContent(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function resultText(operation: string, result?: FindOffersServiceResult): string {
  if (operation === 'find_offers') {
    const ltk = result?.counts.ltk ?? 0;
    const supplemental = result?.counts.supplemental ?? 0;
    const evidence = result?.counts.evidence ?? 0;
    const run = result?.receiptHash.slice('sha256:'.length, 'sha256:'.length + 10) ?? 'unknown';
    return `${ltk} LTK coupon candidate${ltk === 1 ? '' : 's'}; ${supplemental} supplemental fallback offer${supplemental === 1 ? '' : 's'}; ${evidence} evidence-only source${evidence === 1 ? '' : 's'}. Search run ${run}.`;
  }
  if (operation === 'verify_offer') return 'Re-evaluated the supplied public offer evidence.';
  if (operation === 'watch_offers') return 'The offer watch is active.';
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
      version: '0.1.0'
    },
    {
      capabilities: {
        tools: {},
        resources: {}
      }
    }
  );

  server.registerResource(
    'offer-savings-results',
    OFFER_WIDGET_URI,
    {
      title: 'Offer Savings results',
      description: 'Interactive public-offer results and watch controls.',
      mimeType: OFFER_WIDGET_MIME_TYPE,
      _meta: {
        ui: {
          prefersBorder: true,
          csp: { connectDomains: [], resourceDomains: [] }
        },
        'openai/widgetDescription':
          'Ranked public offers with reliability and evidence disclosures.',
        'openai/widgetPrefersBorder': true,
        'openai/widgetCSP': {
          connect_domains: [],
          resource_domains: []
        }
      }
    },
    async () => ({
      contents: [
        {
          uri: OFFER_WIDGET_URI,
          mimeType: OFFER_WIDGET_MIME_TYPE,
          text: options.widgetHtml ?? OFFER_SAVINGS_WIDGET_HTML,
          _meta: {
            ui: {
              prefersBorder: true,
              csp: { connectDomains: [], resourceDomains: [] }
            },
            'openai/widgetDescription':
              'Ranked public offers with reliability and evidence disclosures.',
            'openai/widgetPrefersBorder': true,
            'openai/widgetCSP': {
              connect_domains: [],
              resource_domains: []
            }
          }
        }
      ]
    })
  );

  server.registerTool(
    'find_offers',
    {
      title: 'Find public offers',
      description:
        'Search the configured public discovery lanes with LTK first, then apply the authoritative deterministic reliability policy. Use for a bounded merchant or health-and-beauty request; this does not purchase or mutate a cart.',
      inputSchema: findOffersInputSchema,
      outputSchema: serviceResultOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: toolMetaWithSecurity(widgetToolMeta, options.readSecuritySchemes)
    },
    async (request) => {
      const result = await options.service.findOffers(request);
      return {
        content: [{ type: 'text', text: resultText(result.operation, result) }],
        structuredContent: asStructuredContent(result),
        _meta: { operation: result.operation, schemaVersion: result.schemaVersion }
      };
    }
  );

  server.registerTool(
    'verify_offer',
    {
      title: 'Verify public offer evidence',
      description:
        'Re-evaluate one supplied public offer observation against the deterministic policy. This is evidence verification only; when checkout would be required, the result remains needs_checkout.',
      inputSchema: verifyOfferInputSchema,
      outputSchema: serviceResultOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      },
      _meta: toolMetaWithSecurity(widgetToolMeta, options.readSecuritySchemes)
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
        'Persist one bounded offer request until a deadline. Reusing an idempotency key with the same request returns the existing watch; this does not notify, purchase, or mutate a cart.',
      inputSchema: watchOffersInputSchema,
      outputSchema: serviceResultOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: toolMetaWithSecurity(
        {
          ...widgetToolMeta,
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
      _meta: toolMetaWithSecurity(widgetToolMeta, options.readSecuritySchemes)
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
