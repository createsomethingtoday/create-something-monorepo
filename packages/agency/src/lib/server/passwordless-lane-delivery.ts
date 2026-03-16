export type ManagedBearerDeliveryTransport = 'header' | 'url_query';

export interface PasswordlessLaneUrlDeliveryApproval {
	enabled: true;
	approvedBy: string | null;
	approvedAt: string | null;
	expirationOrReviewDate: string | null;
	reason: string | null;
	allowedScope: string | null;
}

export function normalizeManagedBearerDeliveryTransport(raw: unknown): ManagedBearerDeliveryTransport {
	return raw === 'url_query' ? 'url_query' : 'header';
}

export function resolvePasswordlessLaneUrlDeliveryApproval(
	metadata: Record<string, unknown>,
	laneSlug: string,
): PasswordlessLaneUrlDeliveryApproval | null {
	const config = asObject(metadata.passwordless_delivery);
	const enabled =
		config.enabled === true
		|| config.transport === 'url_query'
		|| config.mode === 'url_query';
	if (!enabled) {
		return null;
	}

	const approvedException = asObject(metadata.approved_exception);
	return {
		enabled: true,
		approvedBy: readString(config.approved_by) ?? readString(approvedException.approved_by),
		approvedAt: readString(config.approved_at) ?? readString(approvedException.approved_at),
		expirationOrReviewDate:
			readString(config.expiration_or_review_date)
			?? readString(approvedException.expiration_or_review_date),
		reason:
			readString(config.reason)
			?? readString(approvedException.reason)
			?? `Passwordless URL delivery approved for named lane ${laneSlug}`,
		allowedScope:
			readString(config.allowed_scope)
			?? readString(approvedException.allowed_scope)
			?? `interactive_named_lane:${laneSlug}`,
	};
}

export function buildManagedBearerLaunchUrl(hubUrl: string, token: string): string {
	const url = new URL(hubUrl);
	url.searchParams.set('mcp_access_token', token);
	return url.toString();
}

export function buildManagedBearerLaunchUrlPreview(hubUrl: string, maskedToken: string): string {
	const url = new URL(hubUrl);
	url.searchParams.set('mcp_access_token', maskedToken);
	return url.toString();
}

function asObject(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}
	return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
