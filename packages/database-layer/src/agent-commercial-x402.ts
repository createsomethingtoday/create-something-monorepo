import type { AgentCommercialAccessRequest } from './agent-commercial-contract.js';

export type X402TestnetRequirements = {
  scheme: 'exact';
  network: 'base-sepolia' | 'eip155:84532';
  amount: string;
  asset: string;
  payTo: string;
};

export type X402TestnetPaymentPayload = {
  x402Version: 2;
  accepted: X402TestnetRequirements;
  payload: unknown;
};

export type X402TestnetFacilitator = {
  verify(input: {
    paymentPayload: X402TestnetPaymentPayload;
    paymentRequirements: X402TestnetRequirements;
  }): Promise<{
    isValid: boolean;
    payer?: string;
    invalidReason?: string;
  }>;
};

export type X402TestnetVerificationResult = {
  payment: NonNullable<AgentCommercialAccessRequest['payment']>;
  verification: {
    protocol: 'x402';
    network: 'eip155:84532';
    payer: string | null;
    settlement: 'not_attempted';
  };
};

export class X402TestnetVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'X402TestnetVerificationError';
  }
}

export type X402FacilitatorFetch = (
  url: string,
  init: {
    method: 'POST';
    headers: Record<string, string>;
    body: string;
  }
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

function facilitatorResponse(
  value: unknown
): Awaited<ReturnType<X402TestnetFacilitator['verify']>> {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof (value as { isValid?: unknown }).isValid !== 'boolean'
  ) {
    throw new X402TestnetVerificationError('x402 facilitator returned an invalid response');
  }
  const response = value as {
    isValid: boolean;
    payer?: unknown;
    invalidReason?: unknown;
  };
  return {
    isValid: response.isValid,
    ...(typeof response.payer === 'string' ? { payer: response.payer } : {}),
    ...(typeof response.invalidReason === 'string' ? { invalidReason: response.invalidReason } : {})
  };
}

/** Create the verification-only HTTP adapter for an x402 facilitator. */
export function createX402HttpFacilitator(input: {
  url: string;
  fetch: X402FacilitatorFetch;
}): X402TestnetFacilitator {
  const baseUrl = input.url.trim().replace(/\/$/, '');
  if (!/^https:\/\/[^/?#]+(?:\/[^?#]*)?$/.test(baseUrl)) {
    throw new X402TestnetVerificationError(
      'x402 facilitator URL must use HTTPS without a query or fragment'
    );
  }
  const verifyUrl = `${baseUrl}/verify`;

  return {
    async verify(verificationInput) {
      const response = await input.fetch(verifyUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(verificationInput)
      });
      if (!response.ok) {
        throw new X402TestnetVerificationError(
          `x402 facilitator verification failed with HTTP ${response.status}`
        );
      }

      try {
        return facilitatorResponse(await response.json());
      } catch (error) {
        if (error instanceof X402TestnetVerificationError) throw error;
        throw new X402TestnetVerificationError('x402 facilitator response was not JSON');
      }
    }
  };
}

function normalizedNetwork(network: string): 'eip155:84532' | null {
  return network === 'base-sepolia' || network === 'eip155:84532' ? 'eip155:84532' : null;
}

function requirementsMatch(
  expected: X402TestnetRequirements,
  accepted: X402TestnetRequirements
): boolean {
  return (
    expected.scheme === accepted.scheme &&
    normalizedNetwork(expected.network) === normalizedNetwork(accepted.network) &&
    expected.amount === accepted.amount &&
    expected.asset === accepted.asset &&
    expected.payTo.toLowerCase() === accepted.payTo.toLowerCase()
  );
}

/**
 * Verify an x402 v2 authorization on Base Sepolia and normalize it into the
 * trusted fact consumed by the commercial evaluator. This preview harness never
 * settles a transaction and rejects every production network before I/O.
 */
export function verifyX402TestnetPayment(input: {
  decisionId: string;
  policyId: string;
  requirements: X402TestnetRequirements;
  paymentPayload: X402TestnetPaymentPayload;
  facilitator: X402TestnetFacilitator;
}): Promise<X402TestnetVerificationResult> {
  if (
    input.paymentPayload.x402Version !== 2 ||
    input.requirements.scheme !== 'exact' ||
    input.paymentPayload.accepted.scheme !== 'exact'
  ) {
    return Promise.reject(
      new X402TestnetVerificationError('x402 verification requires protocol v2 with exact scheme')
    );
  }
  const network = normalizedNetwork(input.requirements.network);
  if (!network || !normalizedNetwork(input.paymentPayload.accepted.network)) {
    return Promise.reject(
      new X402TestnetVerificationError('x402 verification is restricted to Base Sepolia')
    );
  }
  if (!input.decisionId.trim() || !input.policyId.trim()) {
    return Promise.reject(
      new X402TestnetVerificationError('x402 decision and policy identity are required')
    );
  }
  if (!requirementsMatch(input.requirements, input.paymentPayload.accepted)) {
    return Promise.reject(
      new X402TestnetVerificationError('x402 payment payload does not match the requirements')
    );
  }

  return input.facilitator
    .verify({
      paymentPayload: input.paymentPayload,
      paymentRequirements: input.requirements
    })
    .then((verification) => {
      if (!verification.isValid) {
        throw new X402TestnetVerificationError(
          `x402 facilitator rejected the payment authorization${
            verification.invalidReason ? `: ${verification.invalidReason}` : ''
          }`
        );
      }

      return {
        payment: {
          status: 'verified',
          receiptId: `x402-testnet-authorization:${input.decisionId}`,
          policyId: input.policyId
        },
        verification: {
          protocol: 'x402',
          network,
          payer: verification.payer ?? null,
          settlement: 'not_attempted'
        }
      };
    });
}
