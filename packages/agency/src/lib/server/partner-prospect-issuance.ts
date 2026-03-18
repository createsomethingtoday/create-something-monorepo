export type PartnerCredentialIssuanceSurface = 'strict_session' | 'managed_bearer' | 'legacy_key';

export function isPartnerProspectRecord(metadata: Record<string, unknown>): boolean {
	if (normalizeMetadataLabel(metadata.onboarding_mode) === 'prospect') return true;
	if (normalizeMetadataLabel(metadata.lifecycle_stage) === 'prospect') return true;
	const prospect = asMetadataObject(metadata.prospect_onboarding);
	return (
		normalizeMetadataLabel(prospect.mode) === 'prospect' || normalizeMetadataLabel(prospect.stage) === 'prospect'
	);
}

export function isPartnerProspectGraduated(metadata: Record<string, unknown>): boolean {
	const lifecycleStage = normalizeMetadataLabel(metadata.lifecycle_stage);
	if (lifecycleStage === 'active' || lifecycleStage === 'client' || lifecycleStage === 'graduated') {
		return true;
	}

	const prospect = asMetadataObject(metadata.prospect_onboarding);
	const graduatedAt = typeof prospect.graduated_at === 'string' ? prospect.graduated_at.trim() : '';
	return graduatedAt.length > 0;
}

export function getPartnerProspectIssuanceBlocker(input: {
	clientMetadata: Record<string, unknown>;
	laneMetadata?: Record<string, unknown>;
	surface: PartnerCredentialIssuanceSurface;
}): string | null {
	const clientBlocked = isPartnerProspectRecord(input.clientMetadata) && !isPartnerProspectGraduated(input.clientMetadata);
	const laneBlocked =
		input.laneMetadata !== undefined &&
		isPartnerProspectRecord(input.laneMetadata) &&
		!isPartnerProspectGraduated(input.laneMetadata);

	if (!clientBlocked && !laneBlocked) {
		return null;
	}

	return `Prospect onboarding records cannot issue ${describeIssuanceSurface(input.surface)} until graduation is recorded and governed entitlement state is active (service_entitled, policy_accepted, contract_active, billing_active).`;
}

function asMetadataObject(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}
	return value as Record<string, unknown>;
}

function normalizeMetadataLabel(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const normalized = value.trim().toLowerCase();
	return normalized.length > 0 ? normalized : null;
}

function describeIssuanceSurface(surface: PartnerCredentialIssuanceSurface): string {
	switch (surface) {
		case 'strict_session':
			return 'strict sessions';
		case 'managed_bearer':
			return 'managed bearer tokens';
		case 'legacy_key':
			return 'legacy keys';
	}
}
