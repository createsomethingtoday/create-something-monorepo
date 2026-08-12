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
