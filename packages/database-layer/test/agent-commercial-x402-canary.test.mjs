import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  BASE_SEPOLIA_NETWORK,
  BASE_SEPOLIA_USDC,
  createCanaryRequirements,
  runX402Canary,
  validateCanaryRequirements
} from '../scripts/lib/agent-commercial-x402-canary.mjs';

const payTo = '0x0000000000000000000000000000000000000001';

test('canary requirements are capped to one atomic test USDC on Base Sepolia', () => {
  const requirements = createCanaryRequirements({ payTo });

  assert.deepEqual(requirements, {
    scheme: 'exact',
    network: BASE_SEPOLIA_NETWORK,
    asset: BASE_SEPOLIA_USDC,
    amount: '1',
    payTo,
    maxTimeoutSeconds: 300,
    extra: {
      name: 'USDC',
      version: '2',
      assetTransferMethod: 'eip3009'
    }
  });
  assert.deepEqual(validateCanaryRequirements(requirements), requirements);
});

test('canary requirements reject mainnet, another asset, or a larger amount', () => {
  const requirements = createCanaryRequirements({ payTo });

  assert.throws(
    () => validateCanaryRequirements({ ...requirements, network: 'eip155:8453' }),
    /Base Sepolia/
  );
  assert.throws(
    () =>
      validateCanaryRequirements({
        ...requirements,
        asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      }),
    /test USDC/
  );
  assert.throws(
    () => validateCanaryRequirements({ ...requirements, amount: '2' }),
    /one atomic unit/
  );
});

test('canary verifies before one settlement and emits only sanitized evidence', async () => {
  const payer = '0x0000000000000000000000000000000000000002';
  const calls = [];
  const result = await runX402Canary({
    payTo,
    signer: {
      address: payer,
      async signTypedData() {
        calls.push('sign');
        return `0x${'11'.repeat(65)}`;
      }
    },
    facilitator: {
      async getSupported() {
        calls.push('supported');
        return {
          kinds: [{ x402Version: 2, scheme: 'exact', network: BASE_SEPOLIA_NETWORK }],
          extensions: [],
          signers: {}
        };
      },
      async verify(paymentPayload, requirements) {
        calls.push('verify');
        assert.equal(paymentPayload.x402Version, 2);
        assert.deepEqual(paymentPayload.accepted, requirements);
        assert.equal(paymentPayload.payload.authorization.from, payer);
        assert.equal(paymentPayload.payload.authorization.to, payTo);
        assert.equal(paymentPayload.payload.authorization.value, '1');
        assert.match(paymentPayload.payload.signature, /^0x/);
        return { isValid: true, payer };
      },
      async settle() {
        calls.push('settle');
        return {
          success: true,
          payer,
          transaction: `0x${'22'.repeat(32)}`,
          network: BASE_SEPOLIA_NETWORK
        };
      }
    },
    settle: true,
    occurredAt: '2026-08-12T13:00:00.000Z'
  });

  assert.deepEqual(calls, ['supported', 'sign', 'verify', 'settle']);
  assert.equal(result.receipt.verification.status, 'verified');
  assert.equal(result.receipt.settlement.status, 'settled');
  assert.equal(result.receipt.settlement.transaction, `0x${'22'.repeat(32)}`);
  assert.equal(result.receipt.payer, payer);
  assert.equal(result.receipt.payTo, payTo);
  assert.doesNotMatch(JSON.stringify(result.receipt), /signature|authorization|11{16}/i);
});

test('canary never settles when facilitator verification fails', async () => {
  let settlements = 0;
  const result = await runX402Canary({
    payTo,
    signer: {
      address: '0x0000000000000000000000000000000000000002',
      async signTypedData() {
        return `0x${'11'.repeat(65)}`;
      }
    },
    facilitator: {
      async getSupported() {
        return {
          kinds: [{ x402Version: 2, scheme: 'exact', network: BASE_SEPOLIA_NETWORK }],
          extensions: [],
          signers: {}
        };
      },
      async verify() {
        return { isValid: false, invalidReason: 'invalid_exact_evm_signature' };
      },
      async settle() {
        settlements += 1;
        throw new Error('settlement must not be called');
      }
    },
    settle: true,
    occurredAt: '2026-08-12T13:00:00.000Z'
  });

  assert.equal(settlements, 0);
  assert.equal(result.receipt.verification.status, 'rejected');
  assert.equal(result.receipt.settlement.status, 'not_attempted');
});

test('canary rejects unsupported facilitator capability before signing', async () => {
  let signatures = 0;

  await assert.rejects(
    runX402Canary({
      payTo,
      signer: {
        address: '0x0000000000000000000000000000000000000002',
        async signTypedData() {
          signatures += 1;
          return `0x${'11'.repeat(65)}`;
        }
      },
      facilitator: {
        async getSupported() {
          return {
            kinds: [{ x402Version: 2, scheme: 'exact', network: 'eip155:8453' }]
          };
        }
      }
    }),
    /does not support/
  );

  assert.equal(signatures, 0);
});

test('canary records an indeterminate settlement once and does not retry', async () => {
  let settlements = 0;
  const result = await runX402Canary({
    payTo,
    signer: {
      address: '0x0000000000000000000000000000000000000002',
      async signTypedData() {
        return `0x${'11'.repeat(65)}`;
      }
    },
    facilitator: {
      async getSupported() {
        return {
          kinds: [{ x402Version: 2, scheme: 'exact', network: BASE_SEPOLIA_NETWORK }]
        };
      },
      async verify() {
        return { isValid: true };
      },
      async settle() {
        settlements += 1;
        throw new Error('private upstream detail must not enter the receipt');
      }
    },
    settle: true,
    occurredAt: '2026-08-12T13:00:00.000Z'
  });

  assert.equal(settlements, 1);
  assert.equal(result.receipt.settlement.status, 'indeterminate');
  assert.equal(result.receipt.settlement.errorType, 'Error');
  assert.doesNotMatch(JSON.stringify(result.receipt), /private upstream detail/);
});

test('committed canary receipt is fixed to testnet and contains no signing material', async () => {
  const receiptUrl = new URL(
    '../contracts/agent-commercial/v1/canary-receipts/CRE-1701.json',
    import.meta.url
  );
  const receiptText = await readFile(receiptUrl, 'utf8');
  const receipt = JSON.parse(receiptText);

  assert.equal(receipt.network, BASE_SEPOLIA_NETWORK);
  assert.equal(receipt.asset.toLowerCase(), BASE_SEPOLIA_USDC.toLowerCase());
  assert.equal(receipt.amount, '1');
  assert.equal(receipt.verification.status, 'verified');
  assert.equal(receipt.settlement.status, 'settled');
  assert.equal(receipt.chainConfirmation.status, 'success');
  assert.doesNotMatch(receiptText, /privateKey|signature|authorization|seed|mnemonic/i);
});
