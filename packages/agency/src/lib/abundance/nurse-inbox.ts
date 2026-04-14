import { generateId, safeJsonParse } from '$lib/abundance/matching';
import { recordCandidateEvent } from '$lib/abundance/nurse-intake';
import type {
	CandidateProfileStatus,
	HandoffStatus,
	NurseHandoffActionInput,
	NurseHandoffActionResult,
	NurseInboxActionInput,
	NurseInboxActionResult,
	NurseInboxRecruiterOption,
	PersonRole,
	PersonStatus
} from '$lib/types/abundance';

interface CandidateProfileRow {
	id: string;
	profile_status: CandidateProfileStatus;
	recruiter_notes?: string | null;
}

interface RecruiterRow {
	id: string;
	name: string;
	email?: string | null;
	primary_role: Extract<PersonRole, 'recruiter' | 'operator'>;
	status: PersonStatus;
}

interface HandoffRow {
	id: string;
	candidate_profile_id?: string | null;
	opening_id?: string | null;
	recruiter_person_id?: string | null;
	queue_slug?: string | null;
	status?: HandoffStatus;
	acknowledged_at?: string | null;
	resolved_at?: string | null;
	notes_json?: string | null;
}

interface ApplyInboxActionOptions {
	actor_email?: string;
	actor_role?: 'operator' | 'recruiter';
}

export async function listNurseInboxRecruiters(
	db: D1Database
): Promise<NurseInboxRecruiterOption[]> {
	const result = await db
		.prepare(
			`
				SELECT id, name, email, primary_role, status
				FROM people
				WHERE primary_role IN ('recruiter', 'operator')
					AND status != 'inactive'
				ORDER BY
					CASE primary_role
						WHEN 'recruiter' THEN 0
						ELSE 1
					END,
					name ASC
			`
		)
		.all<RecruiterRow>();

	return (result.results || []).map((row) => ({
		id: row.id,
		name: row.name,
		email: row.email || undefined,
		role: row.primary_role,
		status: row.status
	}));
}

export async function applyNurseInboxAction(
	db: D1Database,
	input: NurseInboxActionInput,
	options: ApplyInboxActionOptions = {}
): Promise<NurseInboxActionResult> {
	const candidate = await db
		.prepare(
			`
				SELECT id, profile_status, recruiter_notes
				FROM candidate_profiles
				WHERE id = ?
			`
		)
		.bind(input.candidate_profile_id)
		.first<CandidateProfileRow>();

	if (!candidate) {
		throw new Error('Candidate profile not found.');
	}

	const normalized = normalizeActionInput(input);
	const eventAt = new Date().toISOString();
	let handoffId: string | undefined;
	let message = '';

	if (normalized.action === 'mark_reviewed') {
		await appendRecruiterNotes(db, candidate, normalized.note, options.actor_email);
		await recordCandidateEvent(db, {
			candidate_profile_id: candidate.id,
			opening_id: normalized.opening_id,
			event_type: 'inbox_reviewed',
			source: normalized.source,
			event_at: eventAt,
			metadata_json: JSON.stringify({
				actor_email: options.actor_email || null,
				actor_role: options.actor_role || 'operator',
				note: normalized.note || null
			})
		});

		message = 'Marked candidate as reviewed.';
	} else if (normalized.action === 'assign_recruiter') {
		const recruiter = await getRecruiter(db, normalized.recruiter_person_id);
		if (!recruiter) {
			throw new Error('Recruiter not found.');
		}

		await appendRecruiterNotes(db, candidate, normalized.note, options.actor_email);
		handoffId = await upsertOpenHandoff(db, {
			candidate_profile_id: candidate.id,
			opening_id: normalized.opening_id,
			recruiter_person_id: recruiter.id,
			queue_slug: normalized.queue_slug || 'intake_review',
			reason: normalized.reason || 'Inbox recruiter assignment',
			sla_due_at: normalized.sla_due_at,
			note: normalized.note,
			source: normalized.source,
			actor_email: options.actor_email
		});
		await recordCandidateEvent(db, {
			candidate_profile_id: candidate.id,
			opening_id: normalized.opening_id,
			event_type: 'inbox_recruiter_assigned',
			source: normalized.source,
			event_at: eventAt,
			metadata_json: JSON.stringify({
				actor_email: options.actor_email || null,
				actor_role: options.actor_role || 'operator',
				recruiter_person_id: recruiter.id,
				recruiter_name: recruiter.name,
				handoff_id: handoffId,
				queue_slug: normalized.queue_slug || 'intake_review',
				note: normalized.note || null
			})
		});

		message = `Assigned ${recruiter.name}.`;
	} else {
		const recruiter = normalized.recruiter_person_id
			? await getRecruiter(db, normalized.recruiter_person_id)
			: null;

		if (normalized.recruiter_person_id && !recruiter) {
			throw new Error('Recruiter not found.');
		}

		await appendRecruiterNotes(db, candidate, normalized.note, options.actor_email);
		handoffId = await upsertOpenHandoff(db, {
			candidate_profile_id: candidate.id,
			opening_id: normalized.opening_id,
			recruiter_person_id: recruiter?.id,
			queue_slug: normalized.queue_slug || 'recruiter_triage',
			reason: normalized.reason || 'Manual recruiter handoff',
			sla_due_at: normalized.sla_due_at,
			note: normalized.note,
			source: normalized.source,
			actor_email: options.actor_email
		});
		await recordCandidateEvent(db, {
			candidate_profile_id: candidate.id,
			opening_id: normalized.opening_id,
			event_type: 'handoff_created',
			source: normalized.source,
			event_at: eventAt,
			metadata_json: JSON.stringify({
				actor_email: options.actor_email || null,
				actor_role: options.actor_role || 'operator',
				recruiter_person_id: recruiter?.id || null,
				recruiter_name: recruiter?.name || null,
				handoff_id: handoffId,
				queue_slug: normalized.queue_slug || 'recruiter_triage',
				reason: normalized.reason || 'Manual recruiter handoff',
				note: normalized.note || null
			})
		});

		message = recruiter
			? `Created recruiter handoff for ${recruiter.name}.`
			: 'Created recruiter handoff.';
	}

	return {
		action: normalized.action,
		candidate_profile_id: candidate.id,
		profile_status: candidate.profile_status,
		removed_from_queue: true,
		message,
		handoff_id: handoffId
	};
}

export async function applyNurseHandoffAction(
	db: D1Database,
	input: NurseHandoffActionInput,
	options: ApplyInboxActionOptions = {}
): Promise<NurseHandoffActionResult> {
	const handoff = await db
		.prepare(
			`
				SELECT
					id,
					candidate_profile_id,
					opening_id,
					recruiter_person_id,
					queue_slug,
					status,
					acknowledged_at,
					resolved_at,
					notes_json
				FROM handoffs
				WHERE id = ?
			`
		)
		.bind(input.handoff_id)
		.first<HandoffRow>();

	if (!handoff || !handoff.status) {
		throw new Error('Handoff not found.');
	}

	const normalized = normalizeHandoffActionInput(input);
	const recruiter = normalized.recruiter_person_id
		? await getRecruiter(db, normalized.recruiter_person_id)
		: null;

	if (normalized.recruiter_person_id && !recruiter) {
		throw new Error('Recruiter not found.');
	}

	const now = new Date().toISOString();
	const notes = buildHandoffNotes(
		handoff.notes_json,
		normalized.note,
		options.actor_email,
		normalized.source
	);
	let nextStatus: HandoffStatus;
	let acknowledgedAt = handoff.acknowledged_at || null;
	let resolvedAt = handoff.resolved_at || null;
	let eventType: string;
	let message: string;

	if (normalized.action === 'accept') {
		if (handoff.status === 'completed' || handoff.status === 'cancelled') {
			throw new Error('Resolved handoffs cannot be accepted.');
		}

		nextStatus = 'accepted';
		acknowledgedAt = acknowledgedAt || now;
		resolvedAt = null;
		eventType = 'handoff_accepted';
		message = recruiter ? `Accepted handoff for ${recruiter.name}.` : 'Accepted handoff.';
	} else if (normalized.action === 'complete') {
		if (handoff.status === 'cancelled') {
			throw new Error('Cancelled handoffs cannot be completed.');
		}

		nextStatus = 'completed';
		acknowledgedAt = acknowledgedAt || now;
		resolvedAt = now;
		eventType = 'handoff_completed';
		message = 'Marked handoff as completed.';
	} else {
		if (handoff.status === 'completed') {
			throw new Error('Completed handoffs cannot be cancelled.');
		}

		nextStatus = 'cancelled';
		resolvedAt = now;
		eventType = 'handoff_cancelled';
		message = 'Cancelled handoff.';
	}

	await db
		.prepare(
			`
				UPDATE handoffs
				SET status = ?,
					recruiter_person_id = COALESCE(?, recruiter_person_id),
					acknowledged_at = ?,
					resolved_at = ?,
					notes_json = ?
				WHERE id = ?
			`
		)
		.bind(
			nextStatus,
			recruiter?.id || null,
			acknowledgedAt,
			resolvedAt,
			JSON.stringify(notes),
			handoff.id
		)
		.run();

	if (handoff.candidate_profile_id) {
		await recordCandidateEvent(db, {
			candidate_profile_id: handoff.candidate_profile_id,
			opening_id: handoff.opening_id || undefined,
			event_type: eventType,
			source: normalized.source,
			event_at: now,
			metadata_json: JSON.stringify({
				handoff_id: handoff.id,
				queue_slug: handoff.queue_slug || null,
				actor_email: options.actor_email || null,
				actor_role: options.actor_role || 'operator',
				recruiter_person_id: recruiter?.id || handoff.recruiter_person_id || null,
				recruiter_name: recruiter?.name || null,
				note: normalized.note || null
			})
		});
	}

	return {
		handoff_id: handoff.id,
		status: nextStatus,
		message
	};
}

async function getRecruiter(
	db: D1Database,
	recruiterPersonId: string | undefined
): Promise<NurseInboxRecruiterOption | null> {
	if (!recruiterPersonId) {
		return null;
	}

	const recruiter = await db
		.prepare(
			`
				SELECT id, name, email, primary_role, status
				FROM people
				WHERE id = ?
					AND primary_role IN ('recruiter', 'operator')
					AND status != 'inactive'
			`
		)
		.bind(recruiterPersonId)
		.first<RecruiterRow>();

	return recruiter
		? {
				id: recruiter.id,
				name: recruiter.name,
				email: recruiter.email || undefined,
				role: recruiter.primary_role,
				status: recruiter.status
			}
		: null;
}

async function appendRecruiterNotes(
	db: D1Database,
	candidate: CandidateProfileRow,
	note: string | undefined,
	actorEmail?: string
): Promise<void> {
	if (!note) {
		return;
	}

	const noteEntry = buildNoteEntry(note, actorEmail);
	const recruiterNotes = candidate.recruiter_notes
		? `${candidate.recruiter_notes}\n\n${noteEntry}`
		: noteEntry;

	await db
		.prepare(
			`
				UPDATE candidate_profiles
				SET recruiter_notes = ?
				WHERE id = ?
			`
		)
		.bind(recruiterNotes, candidate.id)
		.run();
}

async function upsertOpenHandoff(
	db: D1Database,
	input: {
		candidate_profile_id: string;
		opening_id?: string;
		recruiter_person_id?: string;
		queue_slug: string;
		reason: string;
		sla_due_at?: string;
		note?: string;
		source: string;
		actor_email?: string;
	}
): Promise<string> {
	const existing = await db
		.prepare(
			`
				SELECT id, notes_json
				FROM handoffs
				WHERE candidate_profile_id = ?
					AND status = 'open'
					AND queue_slug = ?
					AND (
						(? IS NULL AND opening_id IS NULL)
						OR opening_id = ?
					)
				ORDER BY COALESCE(datetime(updated_at), updated_at) DESC, id DESC
				LIMIT 1
			`
		)
		.bind(
			input.candidate_profile_id,
			input.queue_slug,
			input.opening_id || null,
			input.opening_id || null
		)
		.first<HandoffRow>();

	const notes = buildHandoffNotes(existing?.notes_json, input.note, input.actor_email, input.source);

	if (existing) {
		await db
			.prepare(
				`
					UPDATE handoffs
					SET opening_id = COALESCE(?, opening_id),
						recruiter_person_id = COALESCE(?, recruiter_person_id),
						queue_slug = ?,
						reason = ?,
						sla_due_at = COALESCE(?, sla_due_at),
						notes_json = ?
					WHERE id = ?
				`
			)
			.bind(
				input.opening_id || null,
				input.recruiter_person_id || null,
				input.queue_slug,
				input.reason,
				input.sla_due_at || null,
				JSON.stringify(notes),
				existing.id
			)
			.run();

		return existing.id;
	}

	const handoffId = generateId();
	await db
		.prepare(
			`
				INSERT INTO handoffs (
					id,
					candidate_profile_id,
					opening_id,
					recruiter_person_id,
					queue_slug,
					status,
					reason,
					sla_due_at,
					notes_json
				) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)
			`
		)
		.bind(
			handoffId,
			input.candidate_profile_id,
			input.opening_id || null,
			input.recruiter_person_id || null,
			input.queue_slug,
			input.reason,
			input.sla_due_at || null,
			JSON.stringify(notes)
		)
		.run();

	return handoffId;
}

function buildHandoffNotes(
	existingNotesJson: string | null | undefined,
	note: string | undefined,
	actorEmail: string | undefined,
	source: string
): Record<string, unknown> {
	const existingNotes = safeJsonParse<Record<string, unknown>>(
		existingNotesJson,
		{},
		'handoffs.notes_json'
	);
	const existingLastNote =
		typeof existingNotes.last_note === 'string' ? existingNotes.last_note : null;
	const existingUpdatedBy =
		typeof existingNotes.last_updated_by === 'string' ? existingNotes.last_updated_by : null;
	const noteHistory = Array.isArray(existingNotes.note_history)
		? [...existingNotes.note_history]
		: [];

	if (note) {
		noteHistory.push({
			note,
			actor_email: actorEmail || null,
			recorded_at: new Date().toISOString()
		});
	}

	return {
		...existingNotes,
		source,
		last_note: note || existingLastNote,
		last_updated_by: actorEmail || existingUpdatedBy,
		last_updated_at: new Date().toISOString(),
		note_history: noteHistory
	};
}

function buildNoteEntry(note: string, actorEmail?: string): string {
	const stampedBy = actorEmail ? ` · ${actorEmail}` : '';
	return `[${new Date().toISOString()}${stampedBy}] ${note}`;
}

function normalizeActionInput(input: NurseInboxActionInput): Required<NurseInboxActionInput> {
	return {
		action: input.action,
		candidate_profile_id: input.candidate_profile_id,
		recruiter_person_id: normalizeOptionalString(input.recruiter_person_id),
		opening_id: normalizeOptionalString(input.opening_id),
		note: normalizeOptionalString(input.note),
		reason: normalizeOptionalString(input.reason),
		queue_slug: normalizeOptionalString(input.queue_slug),
		sla_due_at: normalizeOptionalString(input.sla_due_at),
		source: normalizeOptionalString(input.source) || 'admin_inbox'
	};
}

function normalizeHandoffActionInput(
	input: NurseHandoffActionInput
): Required<NurseHandoffActionInput> {
	return {
		handoff_id: input.handoff_id,
		action: input.action,
		recruiter_person_id: normalizeOptionalString(input.recruiter_person_id),
		note: normalizeOptionalString(input.note),
		source: normalizeOptionalString(input.source) || 'admin_handoff_queue'
	};
}

function normalizeOptionalString(value: string | undefined): string | undefined {
	if (!value) {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}
