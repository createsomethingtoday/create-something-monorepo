import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createX402HttpFacilitator,
  X402TestnetVerificationError,
  verifyX402TestnetPayment
} from '../dist/index.js';

const requirements = {
  scheme: 'exact',
  network: 'eip155:84532',
  amount: '1000',
  asset: 'test-usdc',
  payTo: '0x0000000000000000000000000000000000000001'
};

const paymentPayload = {
  x402Version: 2,
  accepted: requirements,
  payload: { signature: 'test-signature' }
};

test('x402 testnet verifier normalizes a valid facilitator response', async () => {
  const calls = [];
  const result = await verifyX402TestnetPayment({
    decisionId: 'decision-paid',
    policyId: 'x402.agent-readiness.v1',
    requirements,
    paymentPayload,
    facilitator: {
      async verify(input) {
        calls.push(input);
        return { isValid: true, payer: '0x0000000000000000000000000000000000000002' };
      }
    }
  });

  assert.deepEqual(calls, [{ paymentPayload, paymentRequirements: requirements }]);
  assert.deepEqual(result, {
    payment: {
      status: 'verified',
      receiptId: 'x402-testnet-authorization:decision-paid',
      policyId: 'x402.agent-readiness.v1'
    },
    verification: {
      protocol: 'x402',
      network: 'eip155:84532',
      payer: '0x0000000000000000000000000000000000000002',
      settlement: 'not_attempted'
    }
  });
});

test('x402 verifier rejects mainnet before calling the facilitator', async () => {
  let calls = 0;
  await assert.rejects(
    verifyX402TestnetPayment({
      decisionId: 'decision-mainnet',
      policyId: 'x402.agent-readiness.v1',
      requirements: { ...requirements, network: 'eip155:8453' },
      paymentPayload: {
        ...paymentPayload,
        accepted: { ...requirements, network: 'eip155:8453' }
      },
      facilitator: {
        async verify() {
          calls += 1;
          return { isValid: true };
        }
      }
    }),
    X402TestnetVerificationError
  );
  assert.equal(calls, 0);
});

test('x402 verifier rejects non-v2 and non-exact payloads before facilitator I/O', async () => {
  let calls = 0;
  const facilitator = {
    async verify() {
      calls += 1;
      return { isValid: true };
    }
  };

  await assert.rejects(
    verifyX402TestnetPayment({
      decisionId: 'decision-v1',
      policyId: 'x402.agent-readiness.v1',
      requirements,
      paymentPayload: { ...paymentPayload, x402Version: 1 },
      facilitator
    }),
    X402TestnetVerificationError
  );
  await assert.rejects(
    verifyX402TestnetPayment({
      decisionId: 'decision-scheme',
      policyId: 'x402.agent-readiness.v1',
      requirements: { ...requirements, scheme: 'upto' },
      paymentPayload: {
        ...paymentPayload,
        accepted: { ...requirements, scheme: 'upto' }
      },
      facilitator
    }),
    X402TestnetVerificationError
  );

  assert.equal(calls, 0);
});

test('x402 verifier fails closed on mismatched or invalid payment facts', async () => {
  await assert.rejects(
    verifyX402TestnetPayment({
      decisionId: 'decision-mismatch',
      policyId: 'x402.agent-readiness.v1',
      requirements,
      paymentPayload: {
        ...paymentPayload,
        accepted: { ...requirements, amount: '1' }
      },
      facilitator: {
        async verify() {
          return { isValid: true };
        }
      }
    }),
    X402TestnetVerificationError
  );

  await assert.rejects(
    verifyX402TestnetPayment({
      decisionId: 'decision-invalid',
      policyId: 'x402.agent-readiness.v1',
      requirements,
      paymentPayload,
      facilitator: {
        async verify() {
          return { isValid: false, invalidReason: 'bad_signature' };
        }
      }
    }),
    X402TestnetVerificationError
  );
});

test('HTTP facilitator posts only to the configured verify endpoint', async () => {
  const calls = [];
  const facilitator = createX402HttpFacilitator({
    url: 'https://x402.org/facilitator',
    fetch: async (url, init) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({
          isValid: true,
          payer: '0x0000000000000000000000000000000000000002'
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }
  });

  const response = await facilitator.verify({
    paymentPayload,
    paymentRequirements: requirements
  });

  assert.equal(response.isValid, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://x402.org/facilitator/verify');
  assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    paymentPayload,
    paymentRequirements: requirements
  });
  assert.doesNotMatch(calls[0].url, /settle/);
});

test('HTTP facilitator rejects insecure URLs and non-JSON failures', async () => {
  assert.throws(
    () =>
      createX402HttpFacilitator({
        url: 'http://example.com',
        fetch: globalThis.fetch
      }),
    X402TestnetVerificationError
  );
  assert.throws(
    () =>
      createX402HttpFacilitator({
        url: 'https://example.com/x402?mode=verify',
        fetch: globalThis.fetch
      }),
    X402TestnetVerificationError
  );

  const facilitator = createX402HttpFacilitator({
    url: 'https://example.com/x402',
    fetch: async () => new Response('unavailable', { status: 503 })
  });
  await assert.rejects(
    facilitator.verify({ paymentPayload, paymentRequirements: requirements }),
    X402TestnetVerificationError
  );
});
