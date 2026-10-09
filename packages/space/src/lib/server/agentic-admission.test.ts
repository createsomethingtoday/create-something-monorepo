import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import * as admission from './agentic-admission.ts';
import { authorizeAgenticSubmission, validateSubmissionBudget } from './agentic-admission.ts';

const env = { AGENTIC_ADMISSION_TOKEN: 'server-only-test-token-not-a-real-secret', AGENTIC_ALLOWED_SUBMITTER_IDS: 'operator-a,operator-b' };
const request = new Request('https://example.test/api/agentic/submit', { method: 'POST' });

test('submission fails closed without configured policy or verified identity', () => {
  assert.throws(() => authorizeAgenticSubmission(request, undefined, env), { status: 401 });
  assert.throws(() => authorizeAgenticSubmission(request, { id: 'operator-a' }, {}), { status: 503 });
  assert.throws(() => authorizeAgenticSubmission(request, { id: 'outsider' }, env), { status: 403 });
});

test('only configured verified identities receive the server authorization header', () => {
  assert.equal(authorizeAgenticSubmission(request, { id: 'operator-a' }, env), `Bearer ${env.AGENTIC_ADMISSION_TOKEN}`);
  const forged = new Request(request, { headers: { 'x-user-id': 'operator-a' } });
  assert.throws(() => authorizeAgenticSubmission(forged, undefined, env), { status: 401 });
});

// Exercise the real route with only its framework/database/provider boundaries replaced.
function loadRoute() {
  const source = fs.readFileSync(new URL('../../routes/api/agentic/submit/+server.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports: { POST?: (event: unknown) => Promise<Response> } = {};
  const modules: Record<string, unknown> = {
    '@sveltejs/kit': { json: Response.json, error: (status: number, message: string) => Object.assign(new Error(message), { status }) },
    '$lib/server/agentic-admission': admission,
    '$lib/utils/id': { generateId: (prefix: string) => `${prefix}_test` },
    '$lib/agentic/hooks': { InputSanitizationHook: class { sanitizePrompt(value: string) { return value; } } }
  };
  new Function('require', 'exports', output)((name: string) => {
    if (!(name in modules)) throw new Error(`Unexpected dependency: ${name}`);
    return modules[name];
  }, exports);
  return exports.POST!;
}

test('route denies unauthorized callers before database or external work', async () => {
  const POST = loadRoute();
  let writes = 0;
  const platform = { env: { ...env, DB: { prepare() { writes++; throw new Error('Must not write'); } } } };
  await assert.rejects(POST({ request, platform, locals: {} }), { status: 401 });
  assert.equal(writes, 0);
});

test('route forwards credential only after authorization and never returns it to caller', async () => {
  const POST = loadRoute();
  const original = globalThis.fetch;
  const calls: RequestInit[] = [];
  globalThis.fetch = async (_url, init) => { calls.push(init!); return Response.json({ success: true }); };
  try {
    const statement = { bind() { return this; }, async run() {} };
    const req = new Request(request, { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'research', prompt: 'test', budget: 1 }) });
    const response = await POST({ request: req, platform: { env: { ...env, DB: { prepare: () => statement } } }, locals: { user: { id: 'operator-a' } } });
    assert.equal(calls.length, 1);
    assert.equal(new Headers(calls[0].headers).get('Authorization'), `Bearer ${env.AGENTIC_ADMISSION_TOKEN}`);
    assert.ok(calls[0].signal);
    assert.equal((await response.text()).includes(env.AGENTIC_ADMISSION_TOKEN), false);
  } finally { globalThis.fetch = original; }
});

test('cross-origin session submissions cannot forward the server credential', () => {
  const crossOrigin = new Request(request, { headers: { origin: 'https://untrusted.test' } });
  assert.throws(() => authorizeAgenticSubmission(crossOrigin, { id: 'operator-a' }, env), { status: 403 });
});

test('budget validation rejects coercion and nonfinite values before any admission work', () => {
  for (const value of [null, '5', {}, [], NaN, Infinity, -1, 0]) {
    assert.throws(() => validateSubmissionBudget(value), { status: 400 });
  }
  assert.equal(validateSubmissionBudget(0.25), 0.25);
});
