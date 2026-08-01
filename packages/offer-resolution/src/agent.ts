import { Agent, run, tool, webSearchTool } from '@openai/agents';

import { normalizeOfferRequest, planOfferDiscovery } from './discovery.js';
import { findOffers } from './resolve.js';
import { offerEvidenceInputSchema, offerRequestSchema } from './schemas.js';
import { canonicalStringify } from './canonical.js';
import { createOfferService } from './service.js';
import type { FindOffersServiceResult, OfferDiscoveryProvider } from './service.js';
import type { OfferObservation, OfferRequest, OfferResolutionResult } from './types.js';

export { offerEvidenceInputSchema } from './schemas.js';

export const OFFER_FIND_AGENT_INSTRUCTIONS = `
You are the read-only Offer Find Agent. Resolve a shopping request against current public evidence.

Workflow:
1. Parse the merchant or category, candidate merchants, need, budget, US ZIP code, deadline, current observation time, and acceptable channels. Ask for clarification only if a year or essential constraint is ambiguous.
2. Search public LTK first. Inspect relevant public posts, creator profiles, captions, product links, and LTK-exclusive indicators. Detect app-gated Copy Promo Code offers without bypassing the app gate.
3. Search supplemental sources only after the LTK stage. Corroborate LTK candidates through creator-owned or official retailer evidence, then fill merchant gaps through official retailer, authorized feed, search-index, and deal sources. Supplemental findings must remain visibly secondary to LTK findings.
4. Build only factual observations supported by searched URLs. A standalone observation must contain a concrete coupon code, numeric discount, or explicit shipping offer. Never emit a generic shipping, pickup, delivery, store-location, or policy page as an offer; use it only as a fulfillment or corroborating URL on a concrete offer. Record the page observation time separately from an LTK or creator post's publication time; never call an old post fresh merely because it was found today. A search snippet is not a direct source. LTK search priority does not grant reliability authority. Public LTK content does not imply private API access, partnership rights, or permission for bulk scraping.
5. You must call resolve_offer_evidence with the normalized request and every candidate observation from both stages, including expired, conflicting, inaccessible, or uncertain candidates. If no candidate exists, call it with an empty observations array.

The run is incomplete until resolve_offer_evidence is called. Never answer the user with prose, a summary, or raw findings before that terminal tool call.

Never calculate or invent a reliability score. Never change a resolver status, score, cap, reason, or receipt. Do not recommend an offer outside the resolver result. Do not purchase, add to cart, submit checkout, message a creator, subscribe, create monitoring, bypass access controls, or use private LTK endpoints.
`.trim();

export interface CreateResolveOfferEvidenceToolOptions {
  onEvidence?: (input: {
    request: OfferRequest;
    observations: OfferObservation[];
  }) => void | Promise<void>;
}

export function createResolveOfferEvidenceTool(
  options: CreateResolveOfferEvidenceToolOptions = {}
) {
  return tool({
    name: 'resolve_offer_evidence',
    description:
      'Finalize discovered offer observations with deterministic reliability policy. This is the only tool allowed to score, rank, recommend, or reject offers.',
    parameters: offerEvidenceInputSchema,
    strict: true,
    execute: async ({ request, observations }) => {
      await options.onEvidence?.({ request, observations });
      return JSON.stringify(findOffers(request, observations));
    }
  });
}

export const resolveOfferEvidenceTool = createResolveOfferEvidenceTool();

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

export function createLtkWebSearchTool() {
  return webSearchTool({
    name: 'web_search',
    searchContextSize: 'high',
    externalWebAccess: true,
    filters: { allowedDomains: ['shopltk.com'] }
  });
}

export interface RunOfferFindAgentOptions extends CreateOfferFindAgentOptions {
  maxTurns?: number;
  discovery?: OfferDiscoveryProvider;
}

function assertResolutionResult(value: unknown): OfferResolutionResult {
  if (
    value === null ||
    typeof value !== 'object' ||
    (value as { schemaVersion?: unknown }).schemaVersion !== 'offer_resolution.v0.2'
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

async function discoverAgentEvidence(
  request: OfferRequest,
  options: RunOfferFindAgentOptions = {}
): Promise<OfferObservation[]> {
  const normalizedRequest = offerRequestSchema.parse(normalizeOfferRequest(request));
  const discoveryPlan = planOfferDiscovery(normalizedRequest);
  const agent = createOfferFindAgent(options);
  const [webSearch] = agent.tools;
  const ltkWebSearch = createLtkWebSearchTool();
  const stageMaxTurns = Math.max(2, options.maxTurns ?? 6);

  const ltkAgent = agent.clone({
    instructions: `${OFFER_FIND_AGENT_INSTRUCTIONS}\n\nCurrent stage: LTK primary discovery. ${discoveryPlan.stages[0].instructions}`,
    modelSettings: { toolChoice: 'web_search', parallelToolCalls: false },
    tools: [ltkWebSearch],
    toolUseBehavior: 'run_llm_again',
    resetToolChoice: true
  });
  const ltkDiscovery = await run(
    ltkAgent,
    [
      'Complete stage 1 only. Use web_search for the LTK queries below and preserve factual findings with direct URLs for the next stage.',
      JSON.stringify({ request: normalizedRequest, stage: discoveryPlan.stages[0] })
    ].join('\n\n'),
    { maxTurns: stageMaxTurns }
  );

  const supplementalAgent = agent.clone({
    instructions: `${OFFER_FIND_AGENT_INSTRUCTIONS}\n\nCurrent stage: supplemental corroboration and gap fill. ${discoveryPlan.stages[1].instructions}`,
    modelSettings: { toolChoice: 'web_search', parallelToolCalls: false },
    tools: [webSearch],
    toolUseBehavior: 'run_llm_again',
    resetToolChoice: true
  });
  const supplementalDiscovery = await run(
    supplementalAgent,
    [
      ...ltkDiscovery.history,
      {
        role: 'user' as const,
        content: [
          'Complete stage 2 now. Use web_search to corroborate the LTK findings and fill remaining merchant gaps. Preserve the distinction between LTK and supplemental evidence.',
          JSON.stringify({ request: normalizedRequest, stage: discoveryPlan.stages[1] })
        ].join('\n\n')
      }
    ],
    { maxTurns: stageMaxTurns }
  );

  let capturedEvidence: { request: OfferRequest; observations: OfferObservation[] } | undefined;
  const captureTool = createResolveOfferEvidenceTool({
    onEvidence: (input) => {
      capturedEvidence = input;
    }
  });
  const finalizer = agent.clone({
    instructions: OFFER_FIND_AGENT_INSTRUCTIONS,
    modelSettings: { toolChoice: 'resolve_offer_evidence', parallelToolCalls: false },
    tools: [captureTool],
    resetToolChoice: false
  });
  const finalization = await run(
    finalizer,
    [
      ...supplementalDiscovery.history,
      {
        role: 'user' as const,
        content:
          'Finalize now. Call resolve_offer_evidence with the normalized request and all factual candidates from both completed stages. Keep public LTK observations as source kind ltk_public. Do not answer with prose.'
      }
    ],
    { maxTurns: 2 }
  );
  const resolution = parseResolutionOutput(finalization.finalOutput);
  if (!resolution) {
    throw new Error('The agent did not return a deterministic resolver receipt.');
  }
  if (!capturedEvidence) {
    throw new Error('The agent did not expose factual evidence to the service contract.');
  }
  const observations = capturedEvidence.observations;
  if (
    canonicalStringify(findOffers(normalizedRequest, observations)) !==
    canonicalStringify(resolution)
  ) {
    throw new Error('The agent receipt does not match the authoritative service receipt.');
  }
  return observations;
}

export function createAgentOfferDiscoveryProvider(
  options: RunOfferFindAgentOptions = {}
): OfferDiscoveryProvider {
  return {
    discover: async (request) => discoverAgentEvidence(request, options)
  };
}

export async function runOfferFindAgentService(
  request: OfferRequest,
  options: RunOfferFindAgentOptions = {}
): Promise<FindOffersServiceResult> {
  const normalizedRequest = offerRequestSchema.parse(normalizeOfferRequest(request));
  const discovery = options.discovery ?? createAgentOfferDiscoveryProvider(options);
  const { asOf, ...publicRequest } = normalizedRequest;
  return createOfferService({ discovery, clock: () => new Date(asOf) }).findOffers(publicRequest);
}

export async function runOfferFindAgent(
  request: OfferRequest,
  options: RunOfferFindAgentOptions = {}
): Promise<OfferResolutionResult> {
  return (await runOfferFindAgentService(request, options)).resolution;
}

export const OFFER_FIND_DISCOVERY_STAGES = [
  'ltk',
  'supplemental',
  'resolve_offer_evidence'
] as const;
