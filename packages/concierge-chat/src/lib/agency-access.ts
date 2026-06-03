import type { ThreadActionType } from '$chat/api-contract';
import type { ControlPlaneSurface } from '$lib/control-plane';

export type AgencyServiceTier = 'mcp_only' | 'policy_os_trial' | 'policy_os_core';
export const agencyAccessPreviewModes = [
	'allowed',
	'policy_acceptance_required',
	'billing_inactive',
	'service_not_entitled'
] as const;

export type AgencyAccessPreviewMode = (typeof agencyAccessPreviewModes)[number];

export interface AgencyAccessChecks {
	managedBearerAllowed: boolean;
	orgMembershipActive: boolean;
	serviceEntitled: boolean;
	policyAccepted: boolean;
	contractActive: boolean;
	billingActive: boolean;
}

export interface AgencyApprovedException {
	present: boolean;
	type: string | null;
	allowedScope: string | null;
	graduationTarget: string | null;
	reviewBy: string | null;
}

export interface AgencyAccessDecision {
	allowed: boolean;
	reason: string;
	accountId: string | null;
	tenantId: string | null;
	checks: AgencyAccessChecks;
}

export interface AgencyAccessSnapshot {
	serviceTier: AgencyServiceTier;
	managedBearerAllowed: boolean;
	orgMembershipActive: boolean;
	serviceEntitled: boolean;
	policyAccepted: boolean;
	contractActive: boolean;
	billingActive: boolean;
	approvedException: AgencyApprovedException;
}

export type AgencyAccessStatus = 'anonymous' | 'allowed' | 'blocked' | 'unavailable';

export interface AgencyAccessState {
	status: AgencyAccessStatus;
	source: 'none' | 'live' | 'preview';
	previewMode: AgencyAccessPreviewMode | null;
	decision: AgencyAccessDecision | null;
	snapshot: AgencyAccessSnapshot | null;
	updatedAt: string | null;
	accountId: string | null;
	tenantId: string | null;
}

export interface AgencyGovernedActionGate {
	blocked: true;
	label: string;
	message: string;
	controlPlaneSurface: ControlPlaneSurface;
	ctaLabel: string;
	tone: 'warn' | 'danger';
}

interface AgencyAccessCheckDescriptor {
	key: keyof AgencyAccessChecks;
	label: string;
}

const accessCheckDescriptors: AgencyAccessCheckDescriptor[] = [
	{ key: 'managedBearerAllowed', label: 'Managed bearer allowed' },
	{ key: 'orgMembershipActive', label: 'Organization membership active' },
	{ key: 'serviceEntitled', label: 'Service entitlement active' },
	{ key: 'policyAccepted', label: 'Policy accepted' },
	{ key: 'contractActive', label: 'Contract active' },
	{ key: 'billingActive', label: 'Billing active' }
];

const governedThreadActions = new Set<ThreadActionType>([
	'complete_review',
	'start_staffing_outreach',
	'submit_to_facility',
	'record_facility_interview',
	'confirm_placement',
	'close_staffing_request',
	'start_onboarding',
	'complete_onboarding'
]);

const governedNextStepIntents = new Set([
	'complete_review',
	'start_staffing_outreach',
	'submit_to_facility',
	'record_facility_response',
	'confirm_placement',
	'start_onboarding',
	'complete_onboarding'
]);

export function createAnonymousAgencyAccessState(): AgencyAccessState {
	return {
		status: 'anonymous',
		source: 'none',
		previewMode: null,
		decision: null,
		snapshot: null,
		updatedAt: null,
		accountId: null,
		tenantId: null
	};
}

export function createUnavailableAgencyAccessState(): AgencyAccessState {
	return {
		status: 'unavailable',
		source: 'live',
		previewMode: null,
		decision: null,
		snapshot: null,
		updatedAt: null,
		accountId: null,
		tenantId: null
	};
}

export function createResolvedAgencyAccessState(input: {
	decision: AgencyAccessDecision;
	snapshot: AgencyAccessSnapshot;
	source?: 'live' | 'preview';
	previewMode?: AgencyAccessPreviewMode | null;
	updatedAt?: string | null;
	accountId?: string | null;
	tenantId?: string | null;
}): AgencyAccessState {
	return {
		status: input.decision.allowed ? 'allowed' : 'blocked',
		source: input.source ?? 'live',
		previewMode: input.previewMode ?? null,
		decision: input.decision,
		snapshot: input.snapshot,
		updatedAt: input.updatedAt ?? null,
		accountId: input.accountId ?? input.decision.accountId ?? null,
		tenantId: input.tenantId ?? input.decision.tenantId ?? null
	};
}

export function isAgencyAccessPreviewMode(value: string): value is AgencyAccessPreviewMode {
	return agencyAccessPreviewModes.includes(value as AgencyAccessPreviewMode);
}

export function createPreviewAgencyAccessState(mode: AgencyAccessPreviewMode): AgencyAccessState {
	const baseChecks = {
		managedBearerAllowed: true,
		orgMembershipActive: true,
		serviceEntitled: true,
		policyAccepted: true,
		contractActive: true,
		billingActive: true
	};

	if (mode === 'policy_acceptance_required') {
		baseChecks.policyAccepted = false;
	}

	if (mode === 'billing_inactive') {
		baseChecks.billingActive = false;
	}

	if (mode === 'service_not_entitled') {
		baseChecks.serviceEntitled = false;
	}

	const decision: AgencyAccessDecision = {
		allowed: Object.values(baseChecks).every(Boolean),
		reason:
			mode === 'allowed'
				? 'allowed'
				: mode === 'policy_acceptance_required'
					? 'policy_acceptance_required'
					: mode === 'billing_inactive'
						? 'billing_inactive'
						: 'service_not_entitled',
		accountId: 'preview-account',
		tenantId: 'preview-tenant',
		checks: baseChecks
	};

	const snapshot: AgencyAccessSnapshot = {
		serviceTier: 'policy_os_core',
		managedBearerAllowed: baseChecks.managedBearerAllowed,
		orgMembershipActive: baseChecks.orgMembershipActive,
		serviceEntitled: baseChecks.serviceEntitled,
		policyAccepted: baseChecks.policyAccepted,
		contractActive: baseChecks.contractActive,
		billingActive: baseChecks.billingActive,
		approvedException: {
			present: false,
			type: null,
			allowedScope: null,
			graduationTarget: null,
			reviewBy: null
		}
	};

	return createResolvedAgencyAccessState({
		decision,
		snapshot,
		source: 'preview',
		previewMode: mode,
		updatedAt: new Date().toISOString(),
		accountId: 'preview-account',
		tenantId: 'preview-tenant'
	});
}

export function isGovernedThreadAction(type: ThreadActionType) {
	return governedThreadActions.has(type);
}

export function isGovernedNextStepIntent(intent: string) {
	return governedNextStepIntents.has(intent);
}

export function getAgencyAccessControlPlaneSurface(state: AgencyAccessState): ControlPlaneSurface {
	return state.status === 'allowed' && state.source === 'live' ? 'account' : 'dashboard';
}

export function getAgencyAccessTone(state: AgencyAccessState): 'good' | 'warn' | 'danger' {
	switch (state.status) {
		case 'allowed':
			return 'good';
		case 'blocked':
			return 'danger';
		default:
			return 'warn';
	}
}

export function getAgencyAccessStatusLabel(state: AgencyAccessState) {
	if (state.source === 'preview') {
		return state.status === 'allowed' ? 'preview access active' : 'preview access blocked';
	}

	switch (state.status) {
		case 'allowed':
			return 'access active';
		case 'blocked':
			return 'access blocked';
		case 'unavailable':
			return 'verify access';
		default:
			return 'internal staff sign-in';
	}
}

export function getAgencyAccessMeta(
	state: AgencyAccessState,
	user?: { email: string; tier: string } | null
) {
	if (state.source === 'preview') {
		return state.status === 'allowed'
			? `Local preview override · ${state.snapshot?.serviceTier ?? 'policy_os_core'} access active`
			: `Local preview override · ${getAgencyAccessReasonLabel(state.decision?.reason)}`;
	}

	if (!user) {
		return 'Internal team access only. Nurse uploads and booking stay in Abundance after email verification.';
	}

	if (state.status === 'allowed') {
		return `${user.email} · ${state.snapshot?.serviceTier ?? user.tier} access active`;
	}

	if (state.status === 'blocked') {
		return `${user.email} · ${getAgencyAccessReasonLabel(state.decision?.reason)}`;
	}

	return `${user.email} · live .agency access could not be verified`;
}

export function getAgencyAccessReasonLabel(reason?: string | null) {
	switch (reason) {
		case 'allowed':
			return 'All governed checks passed';
		case 'missing_entitlement_record':
			return 'No entitlement record is linked yet';
		case 'managed_bearer_disabled':
			return 'Managed bearer access is disabled';
		case 'org_membership_inactive':
			return 'Organization membership is inactive';
		case 'service_not_entitled':
			return 'Service entitlement is inactive';
		case 'policy_acceptance_required':
			return 'Policy acceptance is required';
		case 'contract_inactive':
			return 'Contract is inactive';
		case 'billing_inactive':
			return 'Billing is inactive';
		case 'account_mismatch':
			return 'Session is linked to a different account';
		case 'tenant_mismatch':
			return 'Session is linked to a different tenant';
		default:
			return 'Access needs review';
	}
}

export function getAgencyAccessDetail(state: AgencyAccessState) {
	if (state.source === 'preview') {
		return state.status === 'allowed'
			? 'Preview override keeps internal review completion, staffing, and onboarding actions unlocked without a live .agency session.'
			: `Preview override is simulating a blocked .agency verdict: ${getAgencyAccessReasonLabel(state.decision?.reason)}.`;
	}

	switch (state.status) {
		case 'allowed':
			return 'Live .agency entitlement is active for this browser. Internal review completion, staffing, and onboarding actions can continue.';
		case 'blocked':
			return `Governed staffing actions are blocked in .agency: ${getAgencyAccessReasonLabel(state.decision?.reason)}. Review the access report before advancing the thread.`;
		case 'unavailable':
			return 'Abundance could not retrieve the live .agency entitlement decision for this browser. Verify access in the control plane before advancing governed staffing steps.';
		default:
			return 'Internal review completion, staffing, and onboarding actions stay locked until this browser connects to .agency.';
	}
}

export function getAgencyAccessCheckItems(state: AgencyAccessState) {
	const checks = state.decision?.checks;
	if (!checks) {
		return [];
	}

	return accessCheckDescriptors.map((descriptor) => ({
		...descriptor,
		passed: checks[descriptor.key]
	}));
}

export function getAgencyGovernedActionGate(
	state: AgencyAccessState
): AgencyGovernedActionGate | null {
	if (state.status === 'allowed') {
		return null;
	}

	return {
		blocked: true,
		label:
			state.source === 'preview'
				? 'Preview access blocked'
				: state.status === 'blocked'
				? 'Governed access blocked'
				: state.status === 'unavailable'
					? 'Governed access unavailable'
					: 'Internal staff access required',
		message: getAgencyAccessDetail(state),
		controlPlaneSurface: 'dashboard',
		ctaLabel:
			state.source === 'preview'
				? 'Open .agency dashboard'
				: state.status === 'anonymous'
					? 'Internal staff sign-in'
					: 'Review in .agency',
		tone: state.status === 'blocked' ? 'danger' : 'warn'
	};
}

export function getGovernedActionBlockedMessage(state: AgencyAccessState) {
	if (state.source === 'preview') {
		return `Governed staffing actions are blocked by the local .agency preview override: ${getAgencyAccessReasonLabel(state.decision?.reason)}.`;
	}

	switch (state.status) {
		case 'blocked':
			return `Governed staffing actions are blocked in .agency: ${getAgencyAccessReasonLabel(state.decision?.reason)}.`;
		case 'unavailable':
			return 'Governed staffing actions are blocked until .agency access can be verified for this browser.';
		case 'anonymous':
			return 'Governed staffing actions require an active .agency session for this browser.';
		default:
			return 'Governed staffing access is active.';
	}
}
