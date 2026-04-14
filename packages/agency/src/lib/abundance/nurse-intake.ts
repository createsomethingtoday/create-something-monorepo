import type {
	CandidateEventInput,
	CandidateProfileStatus,
	NurseIntakeInput,
	NurseIntakeResult,
	NurseMessageIntakeInput,
	NurseMessageIntakeResult
} from '$lib/types/abundance';
import { generateId } from '$lib/abundance/matching';

interface PersonRow {
	id: string;
	phone?: string | null;
	email?: string | null;
	name: string;
	primary_role: string;
	status: string;
	source?: string | null;
}

interface CandidateProfileRow {
	id: string;
	person_id: string;
	profile_status: CandidateProfileStatus;
	recruiter_notes?: string | null;
}

type CandidateDocumentType = 'resume' | 'skills_checklist' | 'license_copy' | 'consent';

export interface CandidateIdentity {
	person_id: string;
	candidate_profile_id: string;
	profile_status: CandidateProfileStatus;
}

interface ProcessNurseIntakeOptions {
	eventType?: string;
	eventSource?: string;
	eventMetadata?: Record<string, unknown>;
	upsertDocuments?: boolean;
	upsertConsentDocument?: boolean;
	mergeContextNotesIntoRecruiterNotes?: boolean;
}

export async function processNurseIntake(
	db: D1Database,
	input: NurseIntakeInput,
	options: ProcessNurseIntakeOptions = {}
): Promise<NurseIntakeResult> {
	const normalized = normalizeNurseIntakeInput(input);
	const { person, profile, documents, consent, context } = normalized;
	const source = normalizeOptionalString(context.source || person.source || context.intake_channel);

	if (!person.phone && !person.email) {
		throw new Error('Phone or email is required for nurse intake.');
	}

	const personByPhone = person.phone
		? await db.prepare('SELECT * FROM people WHERE phone = ?').bind(person.phone).first<PersonRow>()
		: null;
	const personByEmail = person.email
		? await db.prepare('SELECT * FROM people WHERE email = ?').bind(person.email).first<PersonRow>()
		: null;

	if (personByPhone && personByEmail && personByPhone.id !== personByEmail.id) {
		throw new Error('Phone and email map to different people records. Resolve identity before intake.');
	}

	const existingPerson = personByPhone || personByEmail;
	const personId = existingPerson?.id || generateId();
	const createdPerson = !existingPerson;

	if (createdPerson) {
		await db
			.prepare(
				`
					INSERT INTO people (id, phone, email, name, primary_role, status, source)
					VALUES (?, ?, ?, ?, 'candidate', 'onboarding', ?)
				`
			)
			.bind(personId, person.phone || null, person.email || null, person.name, source || null)
			.run();
	} else {
		await db
			.prepare(
				`
					UPDATE people
					SET phone = COALESCE(?, phone),
						email = COALESCE(?, email),
						name = ?,
						primary_role = CASE
							WHEN primary_role = 'unknown' THEN 'candidate'
							ELSE primary_role
						END,
						source = COALESCE(?, source)
					WHERE id = ?
				`
			)
			.bind(person.phone || null, person.email || null, person.name, source || null, personId)
			.run();
	}

	const existingProfile = await db
		.prepare('SELECT * FROM candidate_profiles WHERE person_id = ?')
		.bind(personId)
		.first<CandidateProfileRow>();

	const candidateProfileId = existingProfile?.id || generateId();
	const createdProfile = !existingProfile;
	const recruiterNotes = mergeNotes(
		existingProfile?.recruiter_notes,
		profile.recruiter_notes,
		options.mergeContextNotesIntoRecruiterNotes === false ? undefined : context.notes
	);
	const profileStatus = determineProfileStatus(normalized, existingProfile?.profile_status);

	if (createdProfile) {
		await db
			.prepare(
				`
					INSERT INTO candidate_profiles (
						id,
						person_id,
						profession,
						specialty_primary,
						specialties,
						years_experience,
						recent_specialty_months,
						contract_preferences,
						shift_preferences,
						start_window_start,
						start_window_end,
						travel_radius_miles,
						preferred_locations,
						home_state,
						compact_license,
						compact_states,
						pay_floor_weekly,
						pay_target_weekly,
						available_from,
						recruiter_notes,
						profile_status
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`
			)
			.bind(
				candidateProfileId,
				personId,
				profile.profession,
				profile.specialty_primary || null,
				JSON.stringify(profile.specialties),
				profile.years_experience ?? null,
				profile.recent_specialty_months ?? null,
				jsonOrNull(profile.contract_preferences),
				jsonOrNull(profile.shift_preferences),
				profile.start_window_start || null,
				profile.start_window_end || null,
				profile.travel_radius_miles ?? null,
				jsonOrNull(profile.preferred_locations),
				profile.home_state || null,
				profile.compact_license ? 1 : 0,
				jsonOrNull(profile.compact_states),
				profile.pay_floor_weekly ?? null,
				profile.pay_target_weekly ?? null,
				profile.available_from || null,
				recruiterNotes || null,
				profileStatus
			)
			.run();
	} else {
		await db
			.prepare(
				`
					UPDATE candidate_profiles
					SET profession = ?,
						specialty_primary = ?,
						specialties = ?,
						years_experience = ?,
						recent_specialty_months = ?,
						contract_preferences = ?,
						shift_preferences = ?,
						start_window_start = ?,
						start_window_end = ?,
						travel_radius_miles = ?,
						preferred_locations = ?,
						home_state = ?,
						compact_license = ?,
						compact_states = ?,
						pay_floor_weekly = ?,
						pay_target_weekly = ?,
						available_from = ?,
						recruiter_notes = ?,
						profile_status = ?
					WHERE id = ?
				`
			)
			.bind(
				profile.profession,
				profile.specialty_primary || null,
				JSON.stringify(profile.specialties),
				profile.years_experience ?? null,
				profile.recent_specialty_months ?? null,
				jsonOrNull(profile.contract_preferences),
				jsonOrNull(profile.shift_preferences),
				profile.start_window_start || null,
				profile.start_window_end || null,
				profile.travel_radius_miles ?? null,
				jsonOrNull(profile.preferred_locations),
				profile.home_state || null,
				profile.compact_license ? 1 : 0,
				jsonOrNull(profile.compact_states),
				profile.pay_floor_weekly ?? null,
				profile.pay_target_weekly ?? null,
				profile.available_from || null,
				recruiterNotes || null,
				profileStatus,
				candidateProfileId
			)
			.run();
	}

	if (options.upsertDocuments !== false) {
		if (documents?.resume_url) {
			await upsertDocument(db, {
				candidateProfileId,
				documentType: 'resume',
				status: 'received',
				storageUrl: documents.resume_url,
				uploadedAt: new Date().toISOString(),
				metadata: {
					intake_channel: context.intake_channel
				}
			});
		}

		if (documents?.skills_checklist_url) {
			await upsertDocument(db, {
				candidateProfileId,
				documentType: 'skills_checklist',
				status: 'received',
				storageUrl: documents.skills_checklist_url,
				uploadedAt: new Date().toISOString(),
				metadata: {
					intake_channel: context.intake_channel
				}
			});
		}

		if (documents?.license_copy_url) {
			await upsertDocument(db, {
				candidateProfileId,
				documentType: 'license_copy',
				status: 'received',
				storageUrl: documents.license_copy_url,
				uploadedAt: new Date().toISOString(),
				metadata: {
					intake_channel: context.intake_channel
				}
			});
		}
	}

	if (options.upsertConsentDocument !== false) {
		await upsertDocument(db, {
			candidateProfileId,
			documentType: 'consent',
			status: consent.granted ? 'received' : 'missing',
			consentScope: consent.scope,
			uploadedAt: consent.granted ? consent.granted_at || new Date().toISOString() : null,
			metadata: {
				disclosure: consent.disclosure || null,
				intake_channel: context.intake_channel,
				granted: consent.granted
			}
		});
	}

	await recordCandidateEvent(db, {
		candidate_profile_id: candidateProfileId,
		opening_id: context.opening_id,
		event_type: options.eventType || (createdProfile ? 'intake_submitted' : 'intake_updated'),
		source: options.eventSource || context.intake_channel,
		metadata_json: JSON.stringify({
			created_person: createdPerson,
			created_profile: createdProfile,
			has_resume: Boolean(documents?.resume_url),
			consent_granted: consent.granted,
			source_listing_id: context.source_listing_id || null,
			recruiter_person_id: context.recruiter_person_id || null,
			...(options.eventMetadata || {})
		})
	});

	return {
		person_id: personId,
		candidate_profile_id: candidateProfileId,
		profile_status: profileStatus,
		created_person: createdPerson,
		created_profile: createdProfile,
		next_steps: getNextSteps(normalized, profileStatus)
	};
}

export async function findCandidateIdentity(
	db: D1Database,
	input: { phone?: string; email?: string }
): Promise<CandidateIdentity | null> {
	const normalizedPhone = normalizeOptionalString(input.phone);
	const normalizedEmail = normalizeOptionalEmail(input.email);

	if (!normalizedPhone && !normalizedEmail) {
		return null;
	}

	const candidateByPhone = normalizedPhone
		? await queryCandidateIdentity(db, 'people.phone = ?', normalizedPhone)
		: null;
	const candidateByEmail = normalizedEmail
		? await queryCandidateIdentity(db, 'people.email = ?', normalizedEmail)
		: null;

	if (
		candidateByPhone &&
		candidateByEmail &&
		candidateByPhone.person_id !== candidateByEmail.person_id
	) {
		throw new Error(
			'Phone and email map to different nurse candidates. Resolve identity before continuing.'
		);
	}

	return candidateByPhone || candidateByEmail || null;
}

export async function recordCandidateEvent(
	db: D1Database,
	input: CandidateEventInput
): Promise<void> {
	await db
		.prepare(
			`
				INSERT INTO candidate_events (
					id,
					candidate_profile_id,
					opening_id,
					application_id,
					event_type,
					source,
					metadata_json,
					event_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
			`
		)
		.bind(
			generateId(),
			input.candidate_profile_id || null,
			input.opening_id || null,
			input.application_id || null,
			input.event_type,
			input.source || null,
			input.metadata_json || null,
			input.event_at || null
		)
		.run();
}

export async function processNurseMessageIntake(
	db: D1Database,
	input: NurseMessageIntakeInput
): Promise<NurseMessageIntakeResult> {
	const normalized = normalizeNurseMessageInput(input);
	const existingCandidate = await findCandidateIdentity(db, {
		phone: normalized.contact.phone,
		email: normalized.contact.email
	});

	if (existingCandidate) {
		const eventType = `${normalized.channel}_message_received`;

		await syncCandidatePersonContact(db, existingCandidate.person_id, normalized.contact);

		await recordCandidateEvent(db, {
			candidate_profile_id: existingCandidate.candidate_profile_id,
			opening_id: normalized.context.opening_id,
			event_type: eventType,
			source: normalized.channel,
			event_at: normalized.message.received_at,
			metadata_json: JSON.stringify({
				person_id: existingCandidate.person_id,
				channel: normalized.channel,
				message_id: normalized.message.message_id || null,
				message_type: normalized.message.message_type || null,
				subject: normalized.message.subject || null,
				content: normalized.message.content,
				raw_payload: normalized.message.raw_payload ?? null
			})
		});

		return {
			person_id: existingCandidate.person_id,
			candidate_profile_id: existingCandidate.candidate_profile_id,
			profile_status: existingCandidate.profile_status,
			is_new_candidate: false,
			event_type: eventType,
			next_steps: getMessageNextSteps(existingCandidate.profile_status)
		};
	}

	const intakeResult = await processNurseIntake(
		db,
		{
			person: {
				name: normalized.contact.name,
				phone: normalized.contact.phone,
				email: normalized.contact.email,
				primary_role: 'candidate',
				source: normalized.contact.source || normalized.channel
			},
			profile: normalized.profile,
			consent: {
				granted: false,
				scope: 'candidate_intake'
			},
			context: {
				...normalized.context,
				intake_channel: normalized.channel,
				source: normalized.context.source || normalized.channel
			}
		},
		{
			eventType: `${normalized.channel}_intake_started`,
			eventSource: normalized.channel,
			eventMetadata: {
				message_id: normalized.message.message_id || null,
				message_type: normalized.message.message_type || null,
				subject: normalized.message.subject || null,
				content: normalized.message.content,
				raw_payload: normalized.message.raw_payload ?? null
			},
			upsertDocuments: false,
			mergeContextNotesIntoRecruiterNotes: false
		}
	);

	return {
		person_id: intakeResult.person_id,
		candidate_profile_id: intakeResult.candidate_profile_id,
		profile_status: intakeResult.profile_status,
		is_new_candidate: true,
		event_type: `${normalized.channel}_intake_started`,
		next_steps: intakeResult.next_steps
	};
}

function normalizeNurseIntakeInput(input: NurseIntakeInput): Required<NurseIntakeInput> {
	return {
		person: {
			...input.person,
			name: input.person.name.trim(),
			email: normalizeOptionalEmail(input.person.email),
			phone: normalizeOptionalString(input.person.phone),
			primary_role: 'candidate',
			source: normalizeOptionalString(input.person.source)
		},
		profile: {
			profession: input.profile.profession || 'rn',
			specialty_primary: normalizeOptionalString(input.profile.specialty_primary),
			specialties: normalizeStringArray(input.profile.specialties),
			years_experience: input.profile.years_experience,
			recent_specialty_months: input.profile.recent_specialty_months,
			contract_preferences: normalizeStringArray(input.profile.contract_preferences),
			shift_preferences: normalizeStringArray(input.profile.shift_preferences),
			start_window_start: normalizeOptionalString(input.profile.start_window_start),
			start_window_end: normalizeOptionalString(input.profile.start_window_end),
			travel_radius_miles: input.profile.travel_radius_miles,
			preferred_locations: normalizeStringArray(input.profile.preferred_locations),
			home_state: normalizeOptionalString(input.profile.home_state),
			compact_license: input.profile.compact_license ?? false,
			compact_states: normalizeStringArray(input.profile.compact_states),
			pay_floor_weekly: input.profile.pay_floor_weekly,
			pay_target_weekly: input.profile.pay_target_weekly,
			available_from: normalizeOptionalString(input.profile.available_from),
			recruiter_notes: normalizeOptionalString(input.profile.recruiter_notes)
		},
		documents: input.documents
			? {
					resume_url: normalizeOptionalString(input.documents.resume_url),
					skills_checklist_url: normalizeOptionalString(input.documents.skills_checklist_url),
					license_copy_url: normalizeOptionalString(input.documents.license_copy_url)
				}
			: {
					resume_url: undefined,
					skills_checklist_url: undefined,
					license_copy_url: undefined
				},
		consent: {
			granted: input.consent?.granted ?? false,
			scope: normalizeOptionalString(input.consent?.scope) || 'candidate_intake',
			granted_at: normalizeOptionalString(input.consent?.granted_at),
			disclosure: normalizeOptionalString(input.consent?.disclosure)
		},
		context: {
			intake_channel: normalizeOptionalString(input.context?.intake_channel) || 'web',
			opening_id: normalizeOptionalString(input.context?.opening_id),
			source_listing_id: normalizeOptionalString(input.context?.source_listing_id),
			recruiter_person_id: normalizeOptionalString(input.context?.recruiter_person_id),
			source: normalizeOptionalString(input.context?.source),
			notes: normalizeOptionalString(input.context?.notes)
		}
	};
}

function normalizeNurseMessageInput(
	input: NurseMessageIntakeInput
): {
	channel: NonNullable<NurseMessageIntakeInput['channel']>;
	contact: {
		name: string;
		phone?: string;
		email?: string;
		source?: string;
	};
	message: {
		message_id?: string;
		message_type?: string;
		subject?: string;
		content: string;
		received_at?: string;
		raw_payload?: unknown;
	};
	profile: {
		profession: NonNullable<NurseIntakeInput['profile']['profession']>;
		specialty_primary?: string;
		specialties: string[];
		years_experience?: number;
		recent_specialty_months?: number;
		contract_preferences: string[];
		shift_preferences: string[];
		start_window_start?: string;
		start_window_end?: string;
		travel_radius_miles?: number;
		preferred_locations: string[];
		home_state?: string;
		compact_license: boolean;
		compact_states: string[];
		pay_floor_weekly?: number;
		pay_target_weekly?: number;
		available_from?: string;
		recruiter_notes?: string;
	};
	context: {
		intake_channel: string;
		opening_id?: string;
		source_listing_id?: string;
		recruiter_person_id?: string;
		source?: string;
		notes?: string;
	};
} {
	const normalizedPhone = normalizeOptionalString(input.contact.phone);
	const normalizedEmail = normalizeOptionalEmail(input.contact.email);

	if (!normalizedPhone && !normalizedEmail) {
		throw new Error('Phone or email is required for nurse message intake.');
	}

	const derivedName =
		normalizeOptionalString(input.contact.name) ||
		deriveDisplayName(normalizedEmail, normalizedPhone);

	return {
		channel: input.channel || 'manual',
		contact: {
			name: derivedName,
			phone: normalizedPhone,
			email: normalizedEmail,
			source: normalizeOptionalString(input.contact.source)
		},
		message: {
			...input.message,
			message_id: normalizeOptionalString(input.message.message_id),
			message_type: normalizeOptionalString(input.message.message_type),
			subject: normalizeOptionalString(input.message.subject),
			content: input.message.content.trim(),
			received_at: normalizeOptionalString(input.message.received_at)
		},
		profile: {
			profession: input.profile?.profession || 'rn',
			specialty_primary: normalizeOptionalString(input.profile?.specialty_primary),
			specialties: normalizeStringArray(input.profile?.specialties),
			years_experience: input.profile?.years_experience,
			recent_specialty_months: input.profile?.recent_specialty_months,
			contract_preferences: normalizeStringArray(input.profile?.contract_preferences),
			shift_preferences: normalizeStringArray(input.profile?.shift_preferences),
			start_window_start: normalizeOptionalString(input.profile?.start_window_start),
			start_window_end: normalizeOptionalString(input.profile?.start_window_end),
			travel_radius_miles: input.profile?.travel_radius_miles,
			preferred_locations: normalizeStringArray(input.profile?.preferred_locations),
			home_state: normalizeOptionalString(input.profile?.home_state),
			compact_license: input.profile?.compact_license ?? false,
			compact_states: normalizeStringArray(input.profile?.compact_states),
			pay_floor_weekly: input.profile?.pay_floor_weekly,
			pay_target_weekly: input.profile?.pay_target_weekly,
			available_from: normalizeOptionalString(input.profile?.available_from),
			recruiter_notes: normalizeOptionalString(input.profile?.recruiter_notes)
		},
		context: {
			intake_channel: normalizeOptionalString(input.context?.intake_channel) || input.channel || 'manual',
			opening_id: normalizeOptionalString(input.context?.opening_id),
			source_listing_id: normalizeOptionalString(input.context?.source_listing_id),
			recruiter_person_id: normalizeOptionalString(input.context?.recruiter_person_id),
			source: normalizeOptionalString(input.context?.source),
			notes: normalizeOptionalString(input.context?.notes)
		}
	};
}

function normalizeOptionalString(value?: string | null): string | undefined {
	if (!value) return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOptionalEmail(value?: string | null): string | undefined {
	const normalized = normalizeOptionalString(value);
	return normalized ? normalized.toLowerCase() : undefined;
}

function normalizeStringArray(values?: string[] | null): string[] {
	if (!values || values.length === 0) {
		return [];
	}

	return values
		.map((value) => normalizeOptionalString(value))
		.filter(Boolean) as string[];
}

function jsonOrNull(values?: string[] | null): string | null {
	return values && values.length > 0 ? JSON.stringify(values) : null;
}

function mergeNotes(...notes: Array<string | null | undefined>): string | undefined {
	const parts = notes.map((note) => normalizeOptionalString(note)).filter(Boolean) as string[];
	return parts.length > 0 ? parts.join('\n\n') : undefined;
}

async function queryCandidateIdentity(
	db: D1Database,
	whereClause: string,
	value: string
): Promise<CandidateIdentity | null> {
	const identity = await db
		.prepare(
			`
				SELECT
					people.id AS person_id,
					candidate_profiles.id AS candidate_profile_id,
					candidate_profiles.profile_status AS profile_status
				FROM people
				INNER JOIN candidate_profiles ON candidate_profiles.person_id = people.id
				WHERE ${whereClause}
				LIMIT 1
			`
		)
		.bind(value)
		.first<CandidateIdentity>();

	return identity || null;
}

function deriveDisplayName(email?: string, phone?: string): string {
	if (email) {
		const localPart = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
		if (localPart) {
			return localPart
				.split(' ')
				.filter(Boolean)
				.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
				.join(' ');
		}
	}

	if (phone) {
		return `Candidate ${phone.slice(-4)}`;
	}

	return 'Candidate';
}

function determineProfileStatus(
	input: Required<NurseIntakeInput>,
	existingStatus?: CandidateProfileStatus
): CandidateProfileStatus {
	if (existingStatus === 'eligible') {
		return 'eligible';
	}

	const hasCoreProfile =
		Boolean(input.profile.specialty_primary) &&
		Boolean(input.profile.home_state) &&
		Boolean(input.profile.available_from);
	const hasConsent = input.consent.granted;

	return hasCoreProfile && hasConsent ? 'ready_for_review' : 'draft';
}

function getNextSteps(
	input: Required<NurseIntakeInput>,
	profileStatus: CandidateProfileStatus
): string[] {
	const nextSteps: string[] = [];

	if (!input.consent.granted) {
		nextSteps.push('Capture release consent before any recruiter handoff.');
	}

	if (!input.documents.resume_url) {
		nextSteps.push('Collect a current resume or profile summary.');
	}

	if (!input.profile.home_state) {
		nextSteps.push('Confirm home state for license and compact review.');
	}

	if (!input.profile.specialty_primary) {
		nextSteps.push('Confirm a primary specialty before shortlist generation.');
	}

	if (!input.profile.available_from) {
		nextSteps.push('Capture an available start date or start window.');
	}

	if (profileStatus === 'ready_for_review') {
		nextSteps.push('Queue profile for recruiter review and eligibility gating.');
	}

	if (nextSteps.length === 0) {
		nextSteps.push('Profile is complete enough for recruiter review.');
	}

	return nextSteps;
}

function getMessageNextSteps(profileStatus: CandidateProfileStatus): string[] {
	if (profileStatus === 'ready_for_review' || profileStatus === 'eligible') {
		return ['Review the new inbound message in the recruiter queue.'];
	}

	return [
		'Continue profile collection before recruiter handoff.',
		'Review the new inbound message for additional qualification details.'
	];
}

async function syncCandidatePersonContact(
	db: D1Database,
	personId: string,
	contact: {
		name: string;
		phone?: string;
		email?: string;
		source?: string;
	}
): Promise<void> {
	await db
		.prepare(
			`
				UPDATE people
				SET phone = COALESCE(phone, ?),
					email = COALESCE(email, ?),
					name = CASE
						WHEN name = 'Unknown'
							OR name LIKE 'Candidate %'
						THEN ?
						ELSE name
					END,
					source = COALESCE(source, ?)
				WHERE id = ?
			`
		)
		.bind(
			contact.phone || null,
			contact.email || null,
			contact.name,
			contact.source || null,
			personId
		)
		.run();
}

async function upsertDocument(
	db: D1Database,
	input: {
		candidateProfileId: string;
		documentType: CandidateDocumentType;
		status: 'missing' | 'received';
		storageUrl?: string;
		consentScope?: string;
		uploadedAt?: string | null;
		metadata?: Record<string, unknown>;
	}
): Promise<void> {
	const existingDocument = await db
		.prepare(
			'SELECT id FROM candidate_documents WHERE candidate_profile_id = ? AND document_type = ?'
		)
		.bind(input.candidateProfileId, input.documentType)
		.first<{ id: string }>();

	if (existingDocument) {
		await db
			.prepare(
				`
					UPDATE candidate_documents
					SET status = ?,
						storage_url = ?,
						consent_scope = ?,
						uploaded_at = ?,
						metadata_json = ?
					WHERE id = ?
				`
			)
			.bind(
				input.status,
				input.storageUrl || null,
				input.consentScope || null,
				input.uploadedAt || null,
				input.metadata ? JSON.stringify(input.metadata) : null,
				existingDocument.id
			)
			.run();
		return;
	}

	await db
		.prepare(
			`
				INSERT INTO candidate_documents (
					id,
					candidate_profile_id,
					document_type,
					status,
					storage_url,
					consent_scope,
					uploaded_at,
					metadata_json
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			`
		)
		.bind(
			generateId(),
			input.candidateProfileId,
			input.documentType,
			input.status,
			input.storageUrl || null,
			input.consentScope || null,
			input.uploadedAt || null,
			input.metadata ? JSON.stringify(input.metadata) : null
		)
		.run();
}
