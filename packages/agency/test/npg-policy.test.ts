import assert from 'node:assert/strict';
import test from 'node:test';
import { NPG_SKIP_TRACE_POLICY } from '../src/lib/server/npg/policy';
test('custom spend tracking supersedes Dify limits without removing exact approval', () => {
  assert.match(NPG_SKIP_TRACE_POLICY, /supersedes all Dify spend restrictions/);
  assert.match(NPG_SKIP_TRACE_POLICY, /no application spend limit/);
  assert.match(NPG_SKIP_TRACE_POLICY, /each provider is attempted independently/);
  assert.match(NPG_SKIP_TRACE_POLICY, /one combined expiring review/);
  assert.match(NPG_SKIP_TRACE_POLICY, /host creates operation_id/);
  assert.match(NPG_SKIP_TRACE_POLICY, /No calls, email, text/);
});
