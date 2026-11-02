import assert from 'node:assert/strict';
import test from 'node:test';
import { SocialAgent } from '../src/index.js';
import { ContentReviewer } from '../src/reviewer.js';

test('queued generation sends the approved uncertainty-preserving voice rules', async (t) => {
  const stopped = new Error('Captured prompt; no generation or posting');
  let captured = false;
  t.mock.method(globalThis, 'fetch', async (_input, options) => {
    const body = JSON.parse(String(options?.body));
    assert.match(body.system, /create-something-voice\.md/);
    assert.match(body.system, /evidence or an honest limit/);
    assert.match(body.system, /inclusive language/);
    assert.match(body.system, /verification status/);
    assert.doesNotMatch(body.system, /every claim must be measurable/i);
    assert.match(body.system, /do not reuse prompt examples as source evidence/i);
    captured = true;
    throw stopped;
  });
  const db = {
    prepare: () => ({
      first: async () => ({
        id: 'fixture',
        source: 'manual',
        source_id: null,
        raw_content: 'Build passed; deployment and costs remain unknown.',
        platforms: '["linkedin"]',
        status: 'raw',
        priority: 1,
        created_at: 0,
        updated_at: 0,
        metadata: null
      })
    })
  };
  const agent = new SocialAgent({
    db: db as unknown as D1Database,
    kv: { get: async () => null } as unknown as KVNamespace,
    anthropicApiKey: 'offline-fixture'
  });
  await assert.rejects(agent.processNextIdea(), (error) => error === stopped);
  assert.ok(captured);
});

test('reviewing qualitative evidence does not demand invented numbers or grant publication', () => {
  const content =
    'We tested the change locally and found that operators could follow the handoff. Deployment remains pending, and the evidence does not establish production behavior. Costs remain unknown. The next review will compare the observed workflow with the requested outcome and preserve any remaining limitations.';
  const reviewer = new ContentReviewer();
  const result = reviewer.review(content, 'linkedin');
  assert.ok(!result.violations.some((entry) => entry.found === 'Missing: metrics'));
  assert.ok(reviewer.quickCheck(content).likely);
  assert.doesNotMatch(result.feedback, /ready for publishing/i);
  assert.match(result.feedback, /does not.*authorize publication/i);
});
