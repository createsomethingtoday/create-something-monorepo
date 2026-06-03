import type { ConciergeThread } from '$chat/thread-store';
import type { ProfileFieldEvent } from '$lib/profile/types';

type StaffAvailability = 'available' | 'busy' | 'unavailable';

export interface StaffOnboardingPayload {
	phone: string;
	name: string;
	email?: string;
	specialties: string[];
	skills?: string[];
	license_type?: string;
	license_state?: string;
	shift_preference?: string;
	contract_preference?: string;
	desired_location?: string;
	start_date?: string;
	availability: StaffAvailability;
	source: string;
	notes?: string;
	metadata: Record<string, unknown>;
	consent: {
		background_check: boolean;
		compliance_screening: boolean;
		submitted_at: string;
		source: string;
	};
}

export interface StaffOnboardingReadiness {
	ready: boolean;
	blockers: string[];
	payload?: StaffOnboardingPayload;
}

export interface StaffOnboardingRuntime {
	endpoint: string | null;
	configured: boolean;
	missing: string[];
}

export interface StaffOnboardingResult {
	success: boolean;
	status: number;
	endpoint: string;
	data?: unknown;
	error?: string;
}

type StaffOnboardingEnv = App.Platform['env'];

const FIELD_KEYS = {
	phone: ['phone', 'phone_number', 'mobile_phone', 'whatsapp_phone'],
	email: ['email', 'email_address'],
	name: ['full_name', 'name'],
	specialty: ['specialty', 'specialties', 'clinical_specialty'],
	skill: ['skill', 'skills'],
	licenseType: ['license_type', 'license', 'compact_license'],
	licenseState: ['license_state', 'state'],
	shift: ['preferred_shift', 'shift_preference'],
	contract: ['contract_preference', 'contract_type', 'contract_length'],
	region: ['preferred_region', 'desired_location', 'location'],
	startDate: ['contract_start', 'start_date'],
	consent: ['background_check_consent', 'compliance_screening_consent', 'staff_writeback_consent']
} as const;

function activeFields(thread: ConciergeThread): ProfileFieldEvent[] {
	return thread.profile.fields.filter((field) => field.status !== 'rejected');
}

function findField(thread: ConciergeThread, keys: readonly string[]): ProfileFieldEvent | undefined {
	const keySet = new Set(keys);
	return activeFields(thread).find((field) => keySet.has(field.key));
}

function fieldValue(thread: ConciergeThread, keys: readonly string[]): string | undefined {
	const value = findField(thread, keys)?.value.trim();
	return value || undefined;
}

function splitValues(value: string | undefined): string[] {
	if (!value) {
		return [];
	}

	const seen = new Set<string>();
	const values: string[] = [];

	for (const part of value.split(/[,;/]|\band\b/i)) {
		const trimmed = part.trim();
		const key = trimmed.toLowerCase();
		if (!trimmed || seen.has(key)) {
			continue;
		}

		seen.add(key);
		values.push(trimmed);
	}

	return values;
}

function hasExplicitConsent(thread: ConciergeThread): boolean {
	const consentField = findField(thread, FIELD_KEYS.consent);
	if (!consentField || consentField.status !== 'confirmed') {
		return false;
	}

	return /^(yes|true|confirmed|approved|authorized|i consent|consented)$/i.test(consentField.value.trim());
}

function inferAvailability(thread: ConciergeThread): StaffAvailability {
	if (thread.status === 'handoff_ready' || thread.profile.blockers.length > 0) {
		return 'busy';
	}

	return 'available';
}

function endpointFromEnv(env: StaffOnboardingEnv): string | null {
	const explicit = env?.AGENCY_STAFF_ONBOARDING_URL?.trim();
	if (explicit) {
		return explicit;
	}

	const baseUrl = env?.AGENCY_ABUNDANCE_API_BASE_URL?.trim() || 'https://createsomething.agency/api/abundance';
	return `${baseUrl.replace(/\/$/, '')}/staff/onboarding`;
}

function tokenFromEnv(env: StaffOnboardingEnv): string | null {
	return env?.ABUNDANCE_STAFF_ONBOARDING_TOKEN?.trim() || env?.AGENCY_INTERNAL_API_KEY?.trim() || null;
}

export function getStaffOnboardingRuntime(env: StaffOnboardingEnv): StaffOnboardingRuntime {
	const endpoint = endpointFromEnv(env);
	const token = tokenFromEnv(env);
	const missing = [];

	if (!endpoint) {
		missing.push('AGENCY_STAFF_ONBOARDING_URL or AGENCY_ABUNDANCE_API_BASE_URL');
	}

	if (!token) {
		missing.push('ABUNDANCE_STAFF_ONBOARDING_TOKEN or AGENCY_INTERNAL_API_KEY');
	}

	return {
		endpoint,
		configured: missing.length === 0,
		missing
	};
}

export function buildStaffOnboardingPayload(thread: ConciergeThread): StaffOnboardingReadiness {
	const blockers: string[] = [];
	const phone = fieldValue(thread, FIELD_KEYS.phone);
	const name = fieldValue(thread, FIELD_KEYS.name) || thread.userName;
	const specialties = splitValues(fieldValue(thread, FIELD_KEYS.specialty));
	const skills = splitValues(fieldValue(thread, FIELD_KEYS.skill));
	const consentGranted = hasExplicitConsent(thread);

	if (!phone) {
		blockers.push('Confirmed phone number is required before Staff DB writeback.');
	}

	if (!name) {
		blockers.push('Confirmed name is required before Staff DB writeback.');
	}

	if (specialties.length === 0 && skills.length === 0) {
		blockers.push('At least one confirmed specialty or skill is required before Staff DB writeback.');
	}

	if (!consentGranted) {
		blockers.push('Explicit candidate consent is required before Staff DB writeback.');
	}

	if (thread.profile.blockers.length > 0) {
		blockers.push(...thread.profile.blockers);
	}

	if (blockers.length > 0 || !phone || !name) {
		return { ready: false, blockers };
	}

	const payload: StaffOnboardingPayload = {
		phone,
		name,
		email: fieldValue(thread, FIELD_KEYS.email),
		specialties: specialties.length ? specialties : skills,
		skills: skills.length ? skills : undefined,
		license_type: fieldValue(thread, FIELD_KEYS.licenseType),
		license_state: fieldValue(thread, FIELD_KEYS.licenseState),
		shift_preference: fieldValue(thread, FIELD_KEYS.shift),
		contract_preference: fieldValue(thread, FIELD_KEYS.contract),
		desired_location: fieldValue(thread, FIELD_KEYS.region),
		start_date: fieldValue(thread, FIELD_KEYS.startDate),
		availability: inferAvailability(thread),
		source: 'concierge-chat',
		notes: thread.turn.summary,
		metadata: {
			thread_id: thread.id,
			thread_title: thread.title,
			profile_completion: thread.profile.completion,
			confirmed_field_count: thread.profile.confirmedCount,
			artifact_ids: thread.artifacts.map((artifact) => artifact.id),
			policy_ref: thread.turn.policyRef,
			paylocity_graduation: {
				state: 'requires_human_confirmation',
				confirmed: false,
				target_system: 'paylocity'
			}
		},
		consent: {
			background_check: true,
			compliance_screening: true,
			submitted_at: new Date().toISOString(),
			source: 'concierge-chat'
		}
	};

	return { ready: true, blockers: [], payload };
}

export async function submitStaffOnboarding(
	payload: StaffOnboardingPayload,
	env: StaffOnboardingEnv,
	fetchImpl: typeof fetch
): Promise<StaffOnboardingResult> {
	const runtime = getStaffOnboardingRuntime(env);
	const token = tokenFromEnv(env);

	if (!runtime.endpoint || !token) {
		return {
			success: false,
			status: 503,
			endpoint: runtime.endpoint ?? 'not-configured',
			error: `Staff onboarding runtime is not configured: ${runtime.missing.join(', ')}`
		};
	}

	const response = await fetchImpl(runtime.endpoint, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${token}`,
			'content-type': 'application/json'
		},
		body: JSON.stringify(payload)
	});

	let data: unknown;
	try {
		data = await response.json();
	} catch {
		data = undefined;
	}

	return {
		success: response.ok,
		status: response.status,
		endpoint: runtime.endpoint,
		data,
		error: response.ok ? undefined : extractError(data) ?? response.statusText
	};
}

function extractError(data: unknown): string | undefined {
	if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
		return data.error;
	}

	return undefined;
}
