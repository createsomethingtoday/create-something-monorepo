import assert from 'node:assert/strict';
import test from 'node:test';

import { invokeFunctionTool } from '@openai/agents';

import {
  OFFER_FIND_DISCOVERY_STAGES,
  OFFER_FIND_AGENT_INSTRUCTIONS,
  createOfferFindAgent,
  createOfferEvidenceFinalizer,
  createLtkWebSearchTool,
  discoveredOfferEvidenceSchema,
  finalizeCapturedResolution,
  finalizeStructuredEvidence,
  offerEvidenceInputSchema,
  runOfferFindAgentService,
  resolveOfferEvidenceTool
} from '../src/agent.js';
import { createOfferService } from '../src/service.js';
import type { OfferObservation } from '../src/types.js';

const request = {
  merchant: 'Abercrombie & Fitch',
  need: 'clothing order',
  budget: 200,
  currency: 'USD',
  postalCode: '76060',
  deadline: '2026-08-09',
  asOf: '2026-07-29T18:00:00.000Z',
  channels: ['online' as const]
};

test('exposes only public web search and deterministic resolution', () => {
  const agent = createOfferFindAgent({ model: 'gpt-5.4-mini' });
  const toolNames = agent.tools.map((candidate) =>
    candidate.type === 'function' ? candidate.name : (candidate.name ?? candidate.type)
  );

  assert.deepEqual(toolNames, ['web_search', 'resolve_offer_evidence']);
  assert.deepEqual(agent.toolUseBehavior, { stopAtToolNames: ['resolve_offer_evidence'] });
  assert.equal(agent.modelSettings.toolChoice, 'web_search');
  assert.equal(agent.resetToolChoice, true);
  assert.equal(agent.handoffs.length, 0);
  assert.deepEqual(OFFER_FIND_DISCOVERY_STAGES, ['ltk', 'supplemental', 'resolve_offer_evidence']);
});

test('instructions reserve scoring and recommendation for the resolver', () => {
  assert.match(OFFER_FIND_AGENT_INSTRUCTIONS, /Never calculate or invent a reliability score/i);
  assert.match(OFFER_FIND_AGENT_INSTRUCTIONS, /LTK.*first/i);
  assert.match(OFFER_FIND_AGENT_INSTRUCTIONS, /supplemental.*after/i);
  assert.match(OFFER_FIND_AGENT_INSTRUCTIONS, /must call resolve_offer_evidence/i);
  assert.match(OFFER_FIND_AGENT_INSTRUCTIONS, /Do not purchase/i);
  assert.match(OFFER_FIND_AGENT_INSTRUCTIONS, /public LTK/i);
});

test('hard-limits the primary search stage to public LTK pages', () => {
  const ltkSearch = createLtkWebSearchTool();
  assert.equal(ltkSearch.providerData?.type, 'web_search');
  assert.deepEqual(ltkSearch.providerData?.filters, { allowed_domains: ['shopltk.com'] });
  assert.equal(ltkSearch.providerData?.external_web_access, true);
});

test('tool input rejects model-authored reliability fields', () => {
  const parsed = offerEvidenceInputSchema.safeParse({
    request,
    observations: [],
    reliability: { score: 100 }
  });
  assert.equal(parsed.success, false);
});

test('resolver tool returns the deterministic result as final JSON', async () => {
  const output = await invokeFunctionTool({
    tool: resolveOfferEvidenceTool,
    runContext: undefined as never,
    input: JSON.stringify({ request, observations: [] })
  });
  const parsed = typeof output === 'string' ? JSON.parse(output) : output;

  assert.equal(parsed.schemaVersion, 'offer_resolution.v0.2');
  assert.deepEqual(parsed.summary, { recommend: 0, verify: 0, lead: 0, rejected: 0 });
  assert.deepEqual(parsed.lanes, { ltk: [], supplemental: [] });
});

test('agent service facade returns the same authoritative service contract', async () => {
  const observations: OfferObservation[] = [];
  const discovery = { discover: async () => observations };
  const expected = await createOfferService({
    discovery,
    clock: () => new Date(request.asOf)
  }).findOffers(request);

  const actual = await runOfferFindAgentService(request, { discovery });

  assert.deepEqual(actual, expected);
  assert.equal(actual.operation, 'find_offers');
});

test('finalization trusts the captured resolver tool payload when model output is prose', () => {
  const captured = { request, observations: [] };

  const actual = finalizeCapturedResolution(captured, 'Resolved the offers successfully.');

  assert.deepEqual(actual, []);
});

test('finalization rejects a model receipt that conflicts with captured resolver evidence', () => {
  const captured = { request, observations: [] };
  const conflicting = JSON.stringify({
    schemaVersion: 'offer_resolution.v0.2',
    request,
    summary: { recommend: 1, verify: 0, lead: 0, rejected: 0 },
    lanes: { ltk: [], supplemental: [] },
    rejected: []
  });

  assert.throws(
    () => finalizeCapturedResolution(captured, conflicting),
    /does not match the authoritative service receipt/
  );
});

test('evidence finalizer uses schema-constrained output instead of a side-effect tool capture', () => {
  const finalizer = createOfferEvidenceFinalizer({ model: 'gpt-5.4-mini' });

  assert.equal(finalizer.outputType, discoveredOfferEvidenceSchema);
  assert.deepEqual(finalizer.tools, []);
  assert.equal(finalizer.modelSettings.toolChoice, 'none');
  assert.match(String(finalizer.instructions), /omit publishedAt unless/i);
});

test('evidence finalizer accepts a coded observation when the model omits discount details', () => {
  const finalizer = createOfferEvidenceFinalizer({ model: 'gpt-5.4-mini' });
  const codedObservationWithoutDiscount = {
    id: 'sephora-code-with-unknown-discount',
    merchant: 'Sephora',
    title: 'Public Sephora code',
    source: {
      kind: 'official_retailer' as const,
      url: 'https://www.sephora.com/beauty/beauty-offers',
      publisher: 'Sephora',
      observedAt: request.asOf,
      access: 'public' as const,
      direct: true
    },
    offer: {
      code: 'SAMPLE',
      status: 'unknown' as const
    },
    applicability: {
      merchant: 'confirmed' as const,
      budget: 'unknown' as const,
      location: 'unknown' as const,
      channel: 'unknown' as const,
      membership: 'unknown' as const
    },
    fulfillment: { deadline: 'unknown' as const },
    evidence: { terms: 'partial' as const, code: 'reported' as const, corroboratingUrls: [] }
  };

  const outputSchema = finalizer.outputType as typeof discoveredOfferEvidenceSchema;
  assert.equal(
    outputSchema.safeParse({ request, observations: [codedObservationWithoutDiscount] }).success,
    true
  );

  const [normalized] = finalizeStructuredEvidence(request, {
    request,
    observations: [codedObservationWithoutDiscount]
  });
  assert.equal(normalized.offer.code, 'SAMPLE');
  assert.deepEqual(normalized.offer.discount, { kind: 'unknown' });

  assert.deepEqual(
    finalizeStructuredEvidence(request, {
      request,
      observations: [
        {
          ...codedObservationWithoutDiscount,
          id: 'no-concrete-offer-value',
          offer: { status: 'unknown' as const }
        }
      ]
    }),
    []
  );
});

test('structured evidence accepts the exact normalized request and rejects request drift', () => {
  const captured = { request, observations: [] };

  assert.deepEqual(finalizeStructuredEvidence(request, captured), []);
  assert.throws(
    () =>
      finalizeStructuredEvidence(request, {
        request: { ...request, budget: 999 },
        observations: []
      }),
    /does not match the normalized shopping request/
  );
});

test('structured evidence fails closed on imprecise optional dates and owns observation time', () => {
  const observation = {
    id: 'sephora-ltk-lead',
    merchant: 'Sephora',
    title: 'Public LTK coupon lead',
    source: {
      kind: 'ltk_public' as const,
      url: 'https://www.shopltk.com/explore/example',
      publisher: 'Example creator',
      publishedAt: '2026-08-01',
      observedAt: '2026-08-01',
      access: 'public' as const,
      direct: true
    },
    offer: {
      code: 'EXAMPLE',
      discount: { kind: 'percent' as const, value: 10 },
      status: 'unknown' as const,
      startsAt: '2026-08-01',
      endsAt: '2026-08-09'
    },
    applicability: {
      merchant: 'confirmed' as const,
      budget: 'unknown' as const,
      location: 'unknown' as const,
      channel: 'unknown' as const,
      membership: 'unknown' as const
    },
    fulfillment: { deadline: 'unknown' as const },
    evidence: { terms: 'partial' as const, code: 'reported' as const, corroboratingUrls: [] }
  };

  const [actual] = finalizeStructuredEvidence(request, {
    request,
    observations: [observation]
  });

  assert.equal(actual.source.observedAt, request.asOf);
  assert.equal(actual.source.publishedAt, undefined);
  assert.equal(actual.offer.startsAt, undefined);
  assert.equal(actual.offer.endsAt, undefined);
});

test('structured evidence drops a malformed candidate without failing the entire search run', () => {
  const validObservation: OfferObservation = {
    id: 'sephora-search-lead',
    merchant: 'Sephora',
    title: 'Public search lead',
    source: {
      kind: 'search_index',
      url: 'https://www.sephora.com/beauty/savings-event',
      publisher: 'Sephora',
      observedAt: request.asOf,
      access: 'public',
      direct: false
    },
    offer: {
      discount: { kind: 'percent', value: 20 },
      status: 'unknown'
    },
    applicability: {
      merchant: 'confirmed',
      budget: 'unknown',
      location: 'unknown',
      channel: 'unknown',
      membership: 'unknown'
    },
    fulfillment: { deadline: 'unknown' },
    evidence: { terms: 'partial', code: 'unknown', corroboratingUrls: [] }
  };

  const actual = finalizeStructuredEvidence(request, {
    request,
    observations: [
      validObservation,
      {
        ...validObservation,
        id: 'malformed-channel',
        applicability: { ...validObservation.applicability, channel: 'not_applicable' }
      }
    ]
  });

  assert.deepEqual(actual, [validObservation]);
});
