export type ProspectClaimAuthorization = 'owner_email' | 'claim_emails' | 'claim_email_domains';
export type ProspectClaimConflictCode =
	| 'identity_seed_conflict'
	| 'manual_override_conflict'
	| 'prospect_unavailable';
export type ProspectSelfServiceStatus = 'initialized' | 'active';

export interface ProspectClaimSeedLike {
	auth_subject: string | null;
	account_id: string;
	tenant_id: string;
}

export interface ProspectClaimEntitlementLike {
	account_id: string | null;
	tenant_id: string | null;
}

export interface ProspectClaimConflict {
	code: ProspectClaimConflictCode;
	message: string;
}

export function isProspectSelfServiceStatus(status: string): status is ProspectSelfServiceStatus {
	return status === 'initialized' || status === 'active';
}

export function resolveProspectClaimAuthorization(input: {
	userEmail: string;
	clientOwnerEmail: string | null;
	clientMetadata: Record<string, unknown>;
	laneOwnerEmail: string | null;
	laneMetadata: Record<string, unknown>;
	normalizeEmail: (raw: string | undefined) => string | null;
}): ProspectClaimAuthorization | null {
	const ownerEmails = [
		input.normalizeEmail(input.clientOwnerEmail ?? undefined),
		input.normalizeEmail(input.laneOwnerEmail ?? undefined),
	].filter((value): value is string => Boolean(value));

	if (ownerEmails.includes(input.userEmail)) {
		return 'owner_email';
	}

	const clientProspect = asMetadataObject(input.clientMetadata.prospect_onboarding);
	const laneProspect = asMetadataObject(input.laneMetadata.prospect_onboarding);
	const claimEmails = [
		...readStringArray(input.clientMetadata.claim_emails),
		...readStringArray(input.clientMetadata.allowed_claim_emails),
		...readStringArray(clientProspect.claim_emails),
		...readStringArray(clientProspect.allowed_claim_emails),
		...readStringArray(input.laneMetadata.claim_emails),
		...readStringArray(input.laneMetadata.allowed_claim_emails),
		...readStringArray(laneProspect.claim_emails),
		...readStringArray(laneProspect.allowed_claim_emails),
	]
		.map((value) => input.normalizeEmail(value) ?? '')
		.filter(Boolean);
	if (claimEmails.includes(input.userEmail)) {
		return 'claim_emails';
	}

	const emailDomain = input.userEmail.split('@')[1] ?? '';
	if (!emailDomain) return null;

	const claimDomains = [
		...readStringArray(input.clientMetadata.claim_email_domains),
		...readStringArray(input.clientMetadata.allowed_claim_email_domains),
		...readStringArray(clientProspect.claim_email_domains),
		...readStringArray(clientProspect.allowed_claim_email_domains),
		...readStringArray(input.laneMetadata.claim_email_domains),
		...readStringArray(input.laneMetadata.allowed_claim_email_domains),
		...readStringArray(laneProspect.claim_email_domains),
		...readStringArray(laneProspect.allowed_claim_email_domains),
	]
		.map((value) => value.trim().toLowerCase())
		.filter(Boolean);
	return claimDomains.includes(emailDomain) ? 'claim_email_domains' : null;
}

export function deriveProspectServiceTier(
	clientMetadata: Record<string, unknown>,
	normalizeAgencyServiceTier: (
		value: string | null | undefined,
		fallback?: 'mcp_only' | 'policy_os_trial' | 'policy_os_core',
	) => string,
): string {
	const prospect = asMetadataObject(clientMetadata.prospect_onboarding);
	const graduationTarget =
		typeof prospect.graduation_target === 'string'
			? prospect.graduation_target
			: typeof clientMetadata.graduation_target === 'string'
				? clientMetadata.graduation_target
				: null;
	return normalizeAgencyServiceTier(graduationTarget, 'mcp_only');
}

export function getProspectClaimConflict(input: {
	userId: string;
	identityAccountId: string;
	identityTenantId: string;
	existingSeed: ProspectClaimSeedLike | null;
	existingEntitlement: ProspectClaimEntitlementLike | null;
	existingEntitlementMetadata: Record<string, unknown>;
}): ProspectClaimConflict | null {
	if (
		input.existingSeed &&
		((input.existingSeed.account_id && input.existingSeed.account_id !== input.identityAccountId) ||
			(input.existingSeed.tenant_id && input.existingSeed.tenant_id !== input.identityTenantId) ||
			(input.existingSeed.auth_subject && input.existingSeed.auth_subject !== input.userId))
	) {
		return {
			code: 'identity_seed_conflict',
			message:
				'This email is already seeded to a different account or CREATE SOMETHING Identity subject. Operator review is required before prospect claim can continue.',
		};
	}

	if (
		input.existingEntitlementMetadata.manual_override === true &&
		((input.existingEntitlement?.account_id && input.existingEntitlement.account_id !== input.identityAccountId) ||
			(input.existingEntitlement?.tenant_id && input.existingEntitlement.tenant_id !== input.identityTenantId))
	) {
		return {
			code: 'manual_override_conflict',
			message:
				'This CREATE SOMETHING Identity subject already has a manual entitlement override for a different account. Operator review is required before prospect claim can continue.',
		};
	}

	return null;
}

export function getProspectAvailabilityConflict(input: {
	clientStatus: string;
	laneStatus: string;
}): ProspectClaimConflict | null {
	if (isProspectSelfServiceStatus(input.clientStatus) && isProspectSelfServiceStatus(input.laneStatus)) {
		return null;
	}

	return {
		code: 'prospect_unavailable',
		message: `This prospect workspace is not available for self-service claim while client status is ${input.clientStatus} and lane status is ${input.laneStatus}.`,
	};
}

function readStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((entry): entry is string => typeof entry === 'string');
}

function asMetadataObject(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}
	return value as Record<string, unknown>;
}
