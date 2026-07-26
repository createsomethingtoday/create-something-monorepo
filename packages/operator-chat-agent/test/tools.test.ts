import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildPaidCapabilityHandoff } from '../src/tools.js';

test('paid capability handoff records spend policy without executing spend', () => {
  const handoff = buildPaidCapabilityHandoff({
    requestedCapability: 'Carrier bid discovery',
    businessReason: 'Validate Sea King opportunity',
    estimatedMaxUsd: 12,
    mode: 'handoff_only',
    maxUsd: 25
  });

  assert.equal(handoff.status, 'handoff_required');
  assert.equal(handoff.capabilityPlane, 'poncho_agentcash');
  assert.equal(handoff.operatorPolicy.execution, 'no_live_spend_from_poc');
  assert.match(handoff.nextStep, /Linear issue/);
});
