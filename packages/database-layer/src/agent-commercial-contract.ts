export type AgentCommercialAccessClass = 'free' | 'entitled' | 'paid' | 'private';

export type AgentCommercialCapabilityKind = 'resource' | 'tool' | 'prompt';

export type AgentCommercialSideEffect = 'read' | 'write' | 'destructive';

export type AgentCommercialCapabilityStatus = 'active' | 'preview' | 'inactive';

export type AgentCommercialCapability = {
  id: string;
  kind: AgentCommercialCapabilityKind;
  accessClass: AgentCommercialAccessClass;
  sideEffect: AgentCommercialSideEffect;
  status: AgentCommercialCapabilityStatus;
  approval: 'never' | 'always';
  entitlementId?: string;
  paymentPolicyId?: string;
  grantId?: string;
};

export type AgentCommercialContract = {
  contractId: string;
  defaultDecision: 'deny';
  capabilities: AgentCommercialCapability[];
};

export type AgentCommercialAccessRequest = {
  capabilityId: string;
  environment?: 'preview' | 'production';
  principal?: {
    id: string;
    authenticated: boolean;
  };
  entitlementIds?: string[];
  grantIds?: string[];
  payment?: {
    status: 'verified';
    receiptId: string;
    policyId: string;
  };
  approval?: {
    status: 'approved';
    receiptId: string;
  };
};

export type AgentCommercialDecision = {
  decision: 'allow' | 'deny' | 'payment_required' | 'approval_required';
  reason: string;
  capabilityId: string;
  contractId: string;
  receiptRequired: true;
  requiredPolicyId?: string;
};

export type AgentCommercialAuthorizationReceipt = {
  receiptId: string;
  decisionId: string;
  contractId: string;
  capabilityId: string;
  principalId: string;
  decision: AgentCommercialDecision['decision'];
  reason: string;
  entitlementOrPaymentRef: string | null;
  approvalReceiptId: string | null;
  outcome: 'authorized' | 'blocked';
  environment: 'preview' | 'production';
  occurredAt: string;
};

export type AgentCommercialAuthorizationContext = {
  decisionId: string;
  occurredAt: string;
};

export type AgentCommercialAuthorizationStore = {
  commit(receipt: AgentCommercialAuthorizationReceipt): Promise<{
    status: 'inserted' | 'existing';
    receipt: AgentCommercialAuthorizationReceipt;
  }>;
};

export type AgentCommercialAuthorizationResult = {
  decision: AgentCommercialDecision;
  receipt: AgentCommercialAuthorizationReceipt;
  replayed: boolean;
};

export class AgentCommercialReceiptConflictError extends Error {
  constructor(decisionId: string) {
    super(`Commercial decision id ${decisionId} is already bound to different facts`);
    this.name = 'AgentCommercialReceiptConflictError';
  }
}

export class AgentCommercialAuthorizationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentCommercialAuthorizationInputError';
  }
}

function decision(
  contract: AgentCommercialContract,
  request: AgentCommercialAccessRequest,
  value: AgentCommercialDecision['decision'],
  reason: string,
  requiredPolicyId?: string
): AgentCommercialDecision {
  return {
    decision: value,
    reason,
    capabilityId: request.capabilityId,
    contractId: contract.contractId,
    receiptRequired: true,
    ...(requiredPolicyId ? { requiredPolicyId } : {})
  };
}

/**
 * Evaluate the stable commercial boundary before a provider adapter runs.
 * Identity, entitlement, payment, and approval inputs are normalized verified
 * facts from trusted adapters, never raw values accepted from an agent request.
 * Uncataloged capabilities fail closed and every decision requires a receipt.
 */
export function evaluateAgentCommercialAccess(
  contract: AgentCommercialContract,
  request: AgentCommercialAccessRequest
): AgentCommercialDecision {
  const capability = contract.capabilities.find((entry) => entry.id === request.capabilityId);

  if (!capability) {
    return decision(contract, request, contract.defaultDecision, 'capability_not_cataloged');
  }

  if (capability.status === 'inactive') {
    return decision(contract, request, 'deny', 'capability_inactive');
  }

  if (capability.status === 'preview' && request.environment !== 'preview') {
    return decision(contract, request, 'deny', 'preview_not_promoted');
  }

  let allowReason = 'free_access';

  if (capability.accessClass === 'entitled') {
    if (
      !request.principal?.authenticated ||
      !capability.entitlementId ||
      !request.entitlementIds?.includes(capability.entitlementId)
    ) {
      return decision(contract, request, 'deny', 'entitlement_required');
    }
    allowReason = 'entitled_access';
  }

  if (capability.accessClass === 'paid') {
    if (
      !capability.paymentPolicyId ||
      request.payment?.status !== 'verified' ||
      request.payment.policyId !== capability.paymentPolicyId
    ) {
      return decision(
        contract,
        request,
        'payment_required',
        'verified_payment_required',
        capability.paymentPolicyId
      );
    }
    allowReason = 'verified_payment';
  }

  if (capability.accessClass === 'private') {
    if (
      !request.principal?.authenticated ||
      !capability.grantId ||
      !request.grantIds?.includes(capability.grantId)
    ) {
      return decision(contract, request, 'deny', 'private_grant_required');
    }
    allowReason = 'private_grant';
  }

  const approvalRequired = capability.approval === 'always' || capability.sideEffect !== 'read';

  if (approvalRequired && request.approval?.status !== 'approved') {
    return decision(contract, request, 'approval_required', 'approval_receipt_required');
  }

  if (approvalRequired) allowReason = 'approval_verified';

  return decision(contract, request, 'allow', allowReason);
}

function authorizationReference(
  capability: AgentCommercialCapability | undefined,
  request: AgentCommercialAccessRequest
): string | null {
  if (request.payment?.receiptId) return request.payment.receiptId;
  if (capability?.entitlementId && request.entitlementIds?.includes(capability.entitlementId)) {
    return capability.entitlementId;
  }
  if (capability?.grantId && request.grantIds?.includes(capability.grantId)) {
    return capability.grantId;
  }
  return null;
}

function receiptFacts(receipt: AgentCommercialAuthorizationReceipt): string {
  return JSON.stringify([
    receipt.receiptId,
    receipt.decisionId,
    receipt.contractId,
    receipt.capabilityId,
    receipt.principalId,
    receipt.decision,
    receipt.reason,
    receipt.entitlementOrPaymentRef,
    receipt.approvalReceiptId,
    receipt.outcome,
    receipt.environment,
    receipt.occurredAt
  ]);
}

/**
 * Evaluate a commercial request and atomically commit its authorization receipt.
 * The store adapter owns durable idempotency; provider-specific execution must
 * not begin until this function returns an `allow` decision with a committed
 * receipt.
 */
export function authorizeAgentCommercialAccess(
  contract: AgentCommercialContract,
  request: AgentCommercialAccessRequest,
  context: AgentCommercialAuthorizationContext,
  store: AgentCommercialAuthorizationStore
): Promise<AgentCommercialAuthorizationResult> {
  if (!context.decisionId.trim()) {
    return Promise.reject(
      new AgentCommercialAuthorizationInputError('Commercial decision id is required')
    );
  }
  const occurredAt = new Date(context.occurredAt);
  if (Number.isNaN(occurredAt.valueOf()) || occurredAt.toISOString() !== context.occurredAt) {
    return Promise.reject(
      new AgentCommercialAuthorizationInputError(
        'Commercial receipt occurredAt must be a canonical ISO timestamp'
      )
    );
  }

  const accessDecision = evaluateAgentCommercialAccess(contract, request);
  const capability = contract.capabilities.find((entry) => entry.id === request.capabilityId);
  const receipt: AgentCommercialAuthorizationReceipt = {
    receiptId: `agent-commercial:${contract.contractId}:${context.decisionId}`,
    decisionId: context.decisionId,
    contractId: contract.contractId,
    capabilityId: request.capabilityId,
    principalId: request.principal?.id ?? 'anonymous',
    decision: accessDecision.decision,
    reason: accessDecision.reason,
    entitlementOrPaymentRef: authorizationReference(capability, request),
    approvalReceiptId: request.approval?.receiptId ?? null,
    outcome: accessDecision.decision === 'allow' ? 'authorized' : 'blocked',
    environment: request.environment ?? 'production',
    occurredAt: context.occurredAt
  };
  return store.commit(receipt).then((committed) => {
    if (receiptFacts(committed.receipt) !== receiptFacts(receipt)) {
      throw new AgentCommercialReceiptConflictError(context.decisionId);
    }

    return {
      decision: accessDecision,
      receipt: committed.receipt,
      replayed: committed.status === 'existing'
    };
  });
}
