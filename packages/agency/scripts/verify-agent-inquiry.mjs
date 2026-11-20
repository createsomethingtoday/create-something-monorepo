import assert from 'node:assert/strict';

// Exercise SvelteKit's real HTTP adapter: route-only streams cannot reproduce
// an incoming request cancellation destroying the response socket.
const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:4193');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname), 'Use a local development server.');
const endpoint = new URL('/api/agent-inquiry', origin);
const jsonHeaders = { 'content-type': 'application/json' };

for (const chunked of [false, true]) {
  const bytes = new TextEncoder().encode('x'.repeat(48001));
  const body = chunked ? new ReadableStream({ start(controller) {
    controller.enqueue(bytes.subarray(0, 24000));
    controller.enqueue(bytes.subarray(24000));
    controller.close();
  } }) : bytes;
  const response = await fetch(endpoint, {
    method: 'POST', headers: jsonHeaders, body,
    ...(chunked ? { duplex: 'half' } : {})
  });
  assert.equal(response.status, 413, `oversized ${chunked ? 'chunked' : 'fixed-length'} request`);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), {
    error: 'Request exceeds the 48,000-byte preparation limit.', submitted: false
  });
}

const brief = {
  version: '1.0.0', workflow: 'Synthetic invoice review', problem: 'Duplicate entries',
  desiredOutcome: 'One reviewed invoice', tools: '', owner: '', constraints: '', evidence: '', unknowns: ''
};
const prepared = await fetch(endpoint, {
  method: 'POST', headers: jsonHeaders, body: JSON.stringify({ offer: 'explore', brief })
});
assert.equal(prepared.status, 200);
const result = await prepared.json();
assert.equal(result.status, 'prepared');
assert.equal(result.submitted, false);
assert.deepEqual(result.missingContext, ['tools', 'owner', 'constraints', 'evidence']);
console.log('Passed real HTTP preparation and fixed-length/chunked oversized-request regressions. No contact submissions.');
