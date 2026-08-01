import assert from 'node:assert/strict';
import test from 'node:test';

import { invokeFunctionTool } from '@openai/agents';

import {
  OFFER_FIND_DISCOVERY_STAGES,
  OFFER_FIND_AGENT_INSTRUCTIONS,
  createOfferFindAgent,
  createLtkWebSearchTool,
  finalizeCapturedResolution,
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
