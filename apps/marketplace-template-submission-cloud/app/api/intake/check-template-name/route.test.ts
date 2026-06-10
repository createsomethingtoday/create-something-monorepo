import assert from 'node:assert/strict';
import test from 'node:test';

import { POST } from './route';

test('rejects blocked agent names before availability lookup', async () => {
  const response = await POST(
    new Request('https://worker.test/api/intake/check-template-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Agentra0' })
    })
  );

  const payload = (await response.json()) as {
    valid?: boolean;
    available?: boolean;
    errors?: string[];
    matchedForbiddenTokens?: string[];
  };

  assert.equal(response.status, 200);
  assert.equal(payload.valid, false);
  assert.equal(payload.available, false);
  assert.deepEqual(payload.errors, ['Template names cannot use "agent" or lookalike spellings.']);
  assert.deepEqual(payload.matchedForbiddenTokens, ['agent']);
});
