import assert from 'node:assert/strict';
import test from 'node:test';

import { invokeFunctionTool } from '@openai/agents';

import {
  OFFER_FIND_AGENT_INSTRUCTIONS,
  createOfferFindAgent,
  offerEvidenceInputSchema,
  resolveOfferEvidenceTool
} from '../src/agent.js';

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
});

test('instructions reserve scoring and recommendation for the resolver', () => {
  assert.match(OFFER_FIND_AGENT_INSTRUCTIONS, /Never calculate or invent a reliability score/i);
  assert.match(OFFER_FIND_AGENT_INSTRUCTIONS, /first tool call must be web_search/i);
  assert.match(OFFER_FIND_AGENT_INSTRUCTIONS, /must call resolve_offer_evidence/i);
  assert.match(OFFER_FIND_AGENT_INSTRUCTIONS, /Do not purchase/i);
  assert.match(OFFER_FIND_AGENT_INSTRUCTIONS, /public LTK/i);
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

  assert.equal(parsed.schemaVersion, 'offer_resolution.v0.1');
  assert.deepEqual(parsed.summary, { recommend: 0, verify: 0, lead: 0, rejected: 0 });
});
