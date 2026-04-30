import assert from 'node:assert/strict';
import { test } from 'node:test';

import { inferredProxyToolCount, liveHubTotalServerCount } from '../registrySweepTelemetry.js';

test('infers proxy tool count from connected server telemetry when the hub total is absent', () => {
  assert.equal(
    inferredProxyToolCount([{ tool_count: 12 }, { tool_count: 3 }, { tool_count: 0 }]),
    15
  );
});

test('keeps proxy tool count unknown when any connected server omits tool telemetry', () => {
  assert.equal(inferredProxyToolCount([{ tool_count: 12 }, { tool_count: null }]), null);
});

test('counts failed-only hub health payloads in live totals', () => {
  assert.equal(
    liveHubTotalServerCount([], [{ name: 'linear' }], [{ server: 'notion' }, { server: 'github' }]),
    3
  );
});

test('prefers explicit enabled server count when the hub reports it', () => {
  assert.equal(
    liveHubTotalServerCount(['linear', 'github'], [{ name: 'linear' }], [{ server: 'github' }]),
    2
  );
});
