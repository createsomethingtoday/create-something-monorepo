import { x402Client } from '@x402/core/client';
import { registerExactEvmScheme } from '@x402/evm/exact/client';

export const BASE_SEPOLIA_NETWORK = 'eip155:84532';
export const BASE_SEPOLIA_USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
export const CANARY_AMOUNT = '1';
export const CANARY_MAX_TIMEOUT_SECONDS = 300;
export const CANARY_FACILITATOR_URL = 'https://x402.org/facilitator';

const CANARY_ID = 'CRE-1701';
const CANARY_RESOURCE_URL = 'https://createsomething.agency/.well-known/x402-canary/CRE-1701';

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export function createCanaryRequirements({ payTo }) {
  const requirements = {
    scheme: 'exact',
    network: BASE_SEPOLIA_NETWORK,
    asset: BASE_SEPOLIA_USDC,
    amount: CANARY_AMOUNT,
    payTo,
    maxTimeoutSeconds: CANARY_MAX_TIMEOUT_SECONDS,
    extra: {
      name: 'USDC',
      version: '2',
      assetTransferMethod: 'eip3009'
    }
  };

  return validateCanaryRequirements(requirements);
}

export function validateCanaryRequirements(requirements) {
  if (requirements.scheme !== 'exact') {
    throw new Error('x402 canary requires the exact scheme');
  }
  if (requirements.network !== BASE_SEPOLIA_NETWORK) {
    throw new Error('x402 canary is restricted to Base Sepolia');
  }
  if (requirements.asset.toLowerCase() !== BASE_SEPOLIA_USDC.toLowerCase()) {
    throw new Error('x402 canary is restricted to official Base Sepolia test USDC');
  }
  if (requirements.amount !== CANARY_AMOUNT) {
    throw new Error('x402 canary is capped at one atomic unit of test USDC');
  }
  if (!EVM_ADDRESS.test(requirements.payTo)) {
    throw new Error('x402 canary requires a valid EVM payee address');
  }
  if (
    requirements.maxTimeoutSeconds !== CANARY_MAX_TIMEOUT_SECONDS ||
    requirements.extra?.name !== 'USDC' ||
    requirements.extra?.version !== '2' ||
    requirements.extra?.assetTransferMethod !== 'eip3009'
  ) {
    throw new Error('x402 canary requirements do not match the fixed EIP-3009 policy');
  }

  return requirements;
}

function supportsCanary(supported) {
  return supported?.kinds?.some(
    (kind) =>
      kind.x402Version === 2 && kind.scheme === 'exact' && kind.network === BASE_SEPOLIA_NETWORK
  );
}

function sanitizedErrorToken(value, fallback) {
  return typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(value)
    ? value
    : fallback;
}

function createReceipt({ occurredAt, payer, payTo, verification, settlement }) {
  return {
    schemaVersion: 1,
    canaryId: CANARY_ID,
    contractId: 'create-something.agent-commercial.v1',
    policyId: 'x402.agent-readiness-audit.v1',
    protocol: 'x402',
    x402Version: 2,
    scheme: 'exact',
    network: BASE_SEPOLIA_NETWORK,
    asset: BASE_SEPOLIA_USDC,
    amount: CANARY_AMOUNT,
    payer,
    payTo,
    facilitator: CANARY_FACILITATOR_URL,
    occurredAt,
    verification,
    settlement,
    productionActivation: 'approval_required'
  };
}

export async function runX402Canary({
  payTo,
  signer,
  facilitator,
  settle = false,
  occurredAt = new Date().toISOString()
}) {
  const requirements = createCanaryRequirements({ payTo });
  const supported = await facilitator.getSupported();

  if (!supportsCanary(supported)) {
    throw new Error('facilitator does not support x402 v2 exact on Base Sepolia');
  }

  const client = new x402Client();
  registerExactEvmScheme(client, {
    signer,
    networks: [BASE_SEPOLIA_NETWORK]
  });

  const paymentPayload = await client.createPaymentPayload({
    x402Version: 2,
    resource: {
      url: CANARY_RESOURCE_URL,
      description: 'CREATE SOMETHING x402 testnet canary'
    },
    accepts: [requirements]
  });
  const verification = await facilitator.verify(paymentPayload, requirements);

  if (!verification.isValid) {
    return {
      receipt: createReceipt({
        occurredAt,
        payer: signer.address,
        payTo,
        verification: {
          status: 'rejected',
          invalidReason: sanitizedErrorToken(verification.invalidReason, 'facilitator_rejected')
        },
        settlement: { status: 'not_attempted' }
      })
    };
  }

  if (!settle) {
    return {
      receipt: createReceipt({
        occurredAt,
        payer: verification.payer ?? signer.address,
        payTo,
        verification: { status: 'verified' },
        settlement: { status: 'not_attempted' }
      })
    };
  }

  let settlement;
  try {
    settlement = await facilitator.settle(paymentPayload, requirements);
  } catch (error) {
    return {
      receipt: createReceipt({
        occurredAt,
        payer: verification.payer ?? signer.address,
        payTo,
        verification: { status: 'verified' },
        settlement: {
          status: 'indeterminate',
          errorType: sanitizedErrorToken(
            error instanceof Error ? error.name : undefined,
            'UnknownError'
          )
        }
      })
    };
  }

  return {
    receipt: createReceipt({
      occurredAt,
      payer: settlement.payer ?? verification.payer ?? signer.address,
      payTo,
      verification: { status: 'verified' },
      settlement: settlement.success
        ? {
            status: 'settled',
            transaction: settlement.transaction,
            network: settlement.network
          }
        : {
            status: 'failed',
            errorType: 'facilitator_rejected_settlement'
          }
    })
  };
}
