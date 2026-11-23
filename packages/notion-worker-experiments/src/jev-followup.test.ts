import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyMeetingFollowup, FOLLOWUP_CRITERIA, JEV_FOLLOWUP_MODEL,
  type FollowupInput, type FollowupLane
} from './jev-followup.js';

const input: FollowupInput = {
  sourcePageUrl: 'https://app.notion.com/p/337019187ac5807e8840c3bbb3573c16',
  candidateText: 'Kam asks Half Dozen to add a guarantee tracking field to the KK Management events view.',
  requesterKind: 'external',
  outputLocation: 'client_workspace'
};

function providerAnswer(lane: FollowupLane, confidence = 0.96): typeof fetch {
  return async (_url, init) => {
    const request = JSON.parse(String(init?.body));
    assert.equal(request.model, JEV_FOLLOWUP_MODEL);
    assert.deepEqual(Object.keys(request.questions.lane.criteria), Object.keys(FOLLOWUP_CRITERIA));
    const probabilities = Object.fromEntries(Object.keys(FOLLOWUP_CRITERIA).map((key) => [key, key === lane ? 1 : 0]));
    return new Response(JSON.stringify({
      model: JEV_FOLLOWUP_MODEL,
      answers: { lane: { type: 'choice', choice: lane, confidence, probabilities } }
    }), { status: 200 });
  };
}

test('returns a source-linked advisory suggestion for a supported Ticket', async () => {
  const result = await classifyMeetingFollowup(input, {
    enabled: true, apiKey: 'test-key', fetchImpl: providerAnswer('ticket')
  });
  assert.equal(result.status, 'suggested');
  assert.equal(result.suggestedLane, 'ticket');
  assert.equal(result.authority, 'advisory_only');
  assert.equal(result.sourcePageUrl, input.sourcePageUrl);
  assert.match(result.requestHash ?? '', /^[a-f0-9]{64}$/);
});

test('requires review when the model conflicts with the source location', async () => {
  const result = await classifyMeetingFollowup(input, {
    enabled: true, apiKey: 'test-key', fetchImpl: providerAnswer('task')
  });
  assert.equal(result.status, 'needs_review');
  assert.equal(result.reason, 'policy_conflict');
  assert.equal(result.modelLane, 'task');
  assert.equal(result.suggestedLane, null);
});

test('abstains on low confidence and model abstention', async () => {
  const low = await classifyMeetingFollowup(input, {
    enabled: true, apiKey: 'test-key', fetchImpl: providerAnswer('ticket', 0.6)
  });
  assert.equal(low.reason, 'low_confidence');
  const unknown = await classifyMeetingFollowup(input, {
    enabled: true, apiKey: 'test-key', fetchImpl: providerAnswer('needs_review')
  });
  assert.equal(unknown.status, 'needs_review');
  assert.equal(unknown.suggestedLane, null);
  const noAction = await classifyMeetingFollowup({ ...input, requesterKind: 'unknown', outputLocation: 'unknown' }, {
    enabled: true, apiKey: 'test-key', fetchImpl: providerAnswer('no_action')
  });
  assert.equal(noAction.status, 'suggested');
  assert.equal(noAction.suggestedLane, 'no_action');
  const contradicted = await classifyMeetingFollowup(input, {
    enabled: true, apiKey: 'test-key', fetchImpl: providerAnswer('no_action')
  });
  assert.equal(contradicted.reason, 'policy_conflict');
});

test('distinguishes a disabled provider from an unavailable provider', async () => {
  const disabled = await classifyMeetingFollowup(input);
  assert.equal(disabled.reason, 'disabled');
  const unavailable = await classifyMeetingFollowup(input, {
    enabled: true, apiKey: 'test-key', fetchImpl: async () => new Response('', { status: 429 })
  });
  assert.equal(unavailable.reason, 'provider_unavailable');
  assert.equal(unavailable.suggestedLane, null);
});

test('rejects malformed provider output and invalid input', async () => {
  const invalid = await classifyMeetingFollowup(input, {
    enabled: true, apiKey: 'test-key', fetchImpl: async () =>
      new Response(JSON.stringify({ model: JEV_FOLLOWUP_MODEL, answers: { lane: {
        type: 'choice', choice: 'ticket', confidence: 1, probabilities: { ticket: 1 }
      } } }), { status: 200 })
  });
  assert.equal(invalid.reason, 'invalid_response');
  const badSource = await classifyMeetingFollowup({ ...input, sourcePageUrl: 'https://example.com' }, {
    enabled: true, apiKey: 'test-key', fetchImpl: () => { throw new Error('must not call'); }
  });
  assert.equal(badSource.reason, 'insufficient_evidence');
});

test('times out a hanging read without retrying', async () => {
  let calls = 0;
  const result = await classifyMeetingFollowup(input, {
    enabled: true, apiKey: 'test-key', timeoutMs: 10,
    fetchImpl: async (_url, init) => {
      calls++;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });
    }
  });
  assert.equal(result.reason, 'provider_unavailable');
  assert.equal(calls, 1);
});
