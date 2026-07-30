import { Agent, run, tool, webSearchTool } from '@openai/agents';
import { z } from 'zod';

import { findOffers } from './resolve.js';
import type { OfferRequest, OfferResolutionResult } from './types.js';

const evidenceStateSchema = z.enum(['confirmed', 'conflict', 'unknown']);

const requestSchema = z
  .object({
    merchant: z.string().min(1),
    need: z.string().min(1),
    budget: z.number().positive(),
    currency: z.string().min(3).max(3),
    postalCode: z.string().regex(/^\d{5}$/),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    asOf: z.string().datetime(),
    channels: z.array(z.enum(['online', 'pickup', 'in_store'])).min(1)
  })
  .strict();

const observationSchema = z
  .object({
    id: z.string().min(1),
    merchant: z.string().min(1),
    title: z.string().min(1),
    source: z
      .object({
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
        url: z.string().url(),
        publisher: z.string().min(1),
        observedAt: z.string().datetime(),
        access: z.enum(['public', 'authenticated', 'app_only', 'blocked']),
        direct: z.boolean()
      })
      .strict(),
    offer: z
      .object({
        code: z.string().min(1).optional(),
        discount: z
          .object({
            kind: z.enum(['percent', 'amount', 'shipping', 'unknown']),
            value: z.number().nonnegative().optional()
          })
          .strict(),
        status: z.enum(['active', 'expired', 'revoked', 'unknown']),
        startsAt: z.string().datetime().optional(),
        endsAt: z.string().datetime().optional(),
        minimumSubtotal: z.number().nonnegative().optional(),
        checkoutOnly: z.boolean().optional()
      })
      .strict(),
    applicability: z
      .object({
        merchant: evidenceStateSchema,
        budget: evidenceStateSchema,
        location: evidenceStateSchema,
        channel: evidenceStateSchema,
        membership: evidenceStateSchema
      })
      .strict(),
    fulfillment: z
      .object({
        deadline: z.enum(['confirmed', 'misses', 'unknown']),
        evidenceUrl: z.string().url().optional()
      })
      .strict(),
    evidence: z
      .object({
        terms: z.enum(['explicit', 'partial', 'none']),
        code: z.enum(['verified', 'reported', 'not_applicable', 'unknown']),
        corroboratingUrls: z.array(z.string().url())
      })
      .strict()
  })
  .strict();

export const offerEvidenceInputSchema = z
  .object({
    request: requestSchema,
    observations: z.array(observationSchema)
  })
  .strict();

export const OFFER_FIND_AGENT_INSTRUCTIONS = `
You are the read-only Offer Find Agent. Resolve a shopping request against current public evidence.

Workflow:
1. Parse merchant, need, budget, US ZIP code, deadline, current observation time, and acceptable channels. Ask for clarification if a year or essential constraint is ambiguous.
2. Your first tool call must be web_search. Search current sources in this order: official retailer promotion and shipping pages; retailer checkout evidence that can be inspected without transacting; public LTK posts; creator-owned pages and social posts; affiliate or partner feeds exposed to the user; then search indexes and deal sites as discovery leads.
3. Build only factual observations supported by the searched URLs. A search snippet is not a direct source. Public LTK content does not imply private API access, partnership rights, or permission for bulk scraping.
4. You must call resolve_offer_evidence with the normalized request and every candidate observation, including expired, conflicting, inaccessible, or uncertain candidates. If no candidate exists, call it with an empty observations array.

The run is incomplete until resolve_offer_evidence is called. Never answer the user with prose, a summary, or raw findings before that terminal tool call.

Never calculate or invent a reliability score. Never change a resolver status, score, cap, reason, or receipt. Do not recommend an offer outside the resolver result. Do not purchase, add to cart, submit checkout, message a creator, subscribe, create monitoring, bypass access controls, or use private LTK endpoints.
`.trim();

export const resolveOfferEvidenceTool = tool({
  name: 'resolve_offer_evidence',
  description:
    'Finalize discovered offer observations with deterministic reliability policy. This is the only tool allowed to score, rank, recommend, or reject offers.',
  parameters: offerEvidenceInputSchema,
  strict: true,
  execute: async ({ request, observations }) => JSON.stringify(findOffers(request, observations))
});

export interface CreateOfferFindAgentOptions {
  model?: string;
}

export function createOfferFindAgent(options: CreateOfferFindAgentOptions = {}): Agent {
  return new Agent({
    name: 'Offer Find Agent',
    handoffDescription: 'Find and resolve public offers without purchasing or monitoring.',
    model: options.model ?? 'gpt-5.4-mini',
    instructions: OFFER_FIND_AGENT_INSTRUCTIONS,
    modelSettings: { toolChoice: 'web_search', parallelToolCalls: false },
    tools: [
      webSearchTool({
        name: 'web_search',
        searchContextSize: 'high',
        externalWebAccess: true
      }),
      resolveOfferEvidenceTool
    ],
    handoffs: [],
    toolUseBehavior: { stopAtToolNames: ['resolve_offer_evidence'] },
    resetToolChoice: true
  });
}

export interface RunOfferFindAgentOptions extends CreateOfferFindAgentOptions {
  maxTurns?: number;
}

function assertResolutionResult(value: unknown): OfferResolutionResult {
  if (
    value === null ||
    typeof value !== 'object' ||
    (value as { schemaVersion?: unknown }).schemaVersion !== 'offer_resolution.v0.1'
  ) {
    throw new Error('The agent did not complete deterministic offer resolution.');
  }
  return value as OfferResolutionResult;
}

function parseResolutionOutput(finalOutput: unknown): OfferResolutionResult | undefined {
  if (typeof finalOutput !== 'string') return undefined;
  try {
    return assertResolutionResult(JSON.parse(finalOutput));
  } catch {
    return undefined;
  }
}

export async function runOfferFindAgent(
  request: OfferRequest,
  options: RunOfferFindAgentOptions = {}
): Promise<OfferResolutionResult> {
  const normalizedRequest = requestSchema.parse(request);
  const agent = createOfferFindAgent(options);
  const prompt = [
    'Find currently usable public offers for this request.',
    'Pass the request object through unchanged except for evidence-backed normalization.',
    JSON.stringify(normalizedRequest)
  ].join('\n\n');
  const discovery = await run(agent, prompt, { maxTurns: options.maxTurns ?? 10 });
  const directResolution = parseResolutionOutput(discovery.finalOutput);
  if (directResolution) return directResolution;

  // Hosted web search is always processed by the model. If the discovery turn emits prose
  // instead of the mandatory resolver call, continue the same agent history with an exact
  // terminal tool choice. This preserves the searched evidence while preventing prose from
  // becoming an unscored product response.
  const finalizer = agent.clone({
    modelSettings: { toolChoice: 'resolve_offer_evidence', parallelToolCalls: false },
    resetToolChoice: false
  });
  const finalization = await run(
    finalizer,
    [
      ...discovery.history,
      {
        role: 'user' as const,
        content:
          'Finalize now. Call resolve_offer_evidence with the request and all factual candidates from the completed public search. Do not answer with prose.'
      }
    ],
    { maxTurns: 2 }
  );
  const resolution = parseResolutionOutput(finalization.finalOutput);
  if (!resolution) {
    throw new Error('The agent did not return a deterministic resolver receipt.');
  }
  return resolution;
}
