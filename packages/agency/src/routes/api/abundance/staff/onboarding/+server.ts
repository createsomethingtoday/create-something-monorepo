/**
 * Abundance Network: staff onboarding write path
 *
 * POST /api/abundance/staff/onboarding
 *
 * This endpoint is the explicit nurse/staff submission path. It writes the
 * matchable profile to talent and preserves the complete submitted packet in
 * intakes for audit/recruiter review.
 */

import { error, json, type RequestHandler } from '@sveltejs/kit';
import type {
	ApiResponse,
	StaffOnboardingInput,
	StaffOnboardingResponse,
	Talent
} from '$lib/types/abundance';
import { generateId, safeJsonParse } from '$lib/abundance/matching';

const VALID_AVAILABILITY = new Set(['available', 'busy', 'unavailable']);

type DbRow = Record<string, unknown>;

function normalizePhone(value: string): string {
	const trimmed = value.trim();
	if (trimmed.startsWith('+')) {
		return `+${trimmed.slice(1).replace(/\D/g, '')}`;
	}

	const digits = trimmed.replace(/\D/g, '');
	return digits || trimmed;
}

function normalizeEmail(value: string | undefined): string | null {
	const trimmed = value?.trim().toLowerCase();
	return trimmed || null;
}

function normalizeText(value: string | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed || null;
}

function normalizeStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const seen = new Set<string>();
	const normalized: string[] = [];

	for (const item of value) {
		if (typeof item !== 'string') {
			continue;
		}

		const trimmed = item.trim();
		const key = trimmed.toLowerCase();
		if (!trimmed || seen.has(key)) {
			continue;
		}

		seen.add(key);
		normalized.push(trimmed);
	}

	return normalized;
}

function normalizeAvailability(value: unknown): Talent['availability'] {
	if (typeof value === 'string' && VALID_AVAILABILITY.has(value)) {
		return value as Talent['availability'];
	}

	return 'available';
}

function buildSkills(input: StaffOnboardingInput): string[] {
	const skills = normalizeStringArray(input.skills);
	const specialties = normalizeStringArray(input.specialties);
	return normalizeStringArray([...skills, ...specialties]);
}

function buildStaffTags(input: StaffOnboardingInput): string[] {
	return normalizeStringArray([
		input.license_type ? `license:${input.license_type}` : '',
		input.license_state ? `state:${input.license_state}` : '',
		input.shift_preference ? `shift:${input.shift_preference}` : '',
		input.contract_preference ? `contract:${input.contract_preference}` : '',
		input.desired_location ? `location:${input.desired_location}` : ''
	]);
}

function parseTalent(row: DbRow): Talent {
	return {
		...(row as unknown as Talent),
		skills: safeJsonParse<string[]>(row.skills, [], 'skills'),
		styles: safeJsonParse<string[] | undefined>(row.styles, undefined, 'styles')
	};
}

async function findTalent(db: D1Database, phone: string, email: string | null): Promise<DbRow | null> {
	const byPhone = await db.prepare(
		'SELECT * FROM talent WHERE phone = ?'
	).bind(phone).first<DbRow>();

	if (byPhone || !email) {
		return byPhone ?? null;
	}

	return await db.prepare(
		'SELECT * FROM talent WHERE lower(email) = ?'
	).bind(email).first<DbRow>();
}

async function findSeeker(db: D1Database, phone: string, email: string | null): Promise<DbRow | null> {
	const byPhone = await db.prepare(
		'SELECT * FROM seekers WHERE phone = ?'
	).bind(phone).first<DbRow>();

	if (byPhone || !email) {
		return byPhone ?? null;
	}

	return await db.prepare(
		'SELECT * FROM seekers WHERE lower(email) = ?'
	).bind(email).first<DbRow>();
}

function buildIntakeSummary(input: StaffOnboardingInput, skills: string[]): string {
	const parts = [
		`${input.name.trim()} submitted staff onboarding`,
		skills.length ? `specialties: ${skills.join(', ')}` : '',
		input.license_state ? `license state: ${input.license_state.trim()}` : '',
		input.shift_preference ? `shift: ${input.shift_preference.trim()}` : '',
		input.start_date ? `start: ${input.start_date.trim()}` : ''
	].filter(Boolean);

	return parts.join('; ');
}

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		if (!platform?.env?.DB) {
			throw error(500, 'Database not available');
		}

		const input = (await request.json()) as StaffOnboardingInput;
		const phone = typeof input.phone === 'string' ? normalizePhone(input.phone) : '';
		const phoneDigits = phone.replace(/\D/g, '');
		const name = normalizeText(input.name);
		const email = normalizeEmail(input.email);
		const skills = buildSkills(input);

		if (!phone || phoneDigits.length < 7) {
			return json({ success: false, error: 'Valid phone number is required' } as ApiResponse<never>, { status: 400 });
		}

		if (!name) {
			return json({ success: false, error: 'Name is required' } as ApiResponse<never>, { status: 400 });
		}

		if (skills.length === 0) {
			return json({ success: false, error: 'At least one staff specialty or skill is required' } as ApiResponse<never>, { status: 400 });
		}

		if (input.consent?.background_check !== true || input.consent?.compliance_screening !== true) {
			return json({
				success: false,
				error: 'Explicit background-check and compliance-screening consent is required before staff onboarding writeback'
			} as ApiResponse<never>, { status: 400 });
		}

		const db = platform.env.DB;
		const existingTalent = await findTalent(db, phone, email);
		const existingSeeker = await findSeeker(db, phone, email);
		const talentId = (existingTalent?.id as string | undefined) || generateId();
		const staffTags = buildStaffTags(input);
		const availability = normalizeAvailability(input.availability);
		const profileUrl = normalizeText(input.profile_url) || normalizeText(input.resume_url);
		const skillsJson = JSON.stringify(skills);
		const tagsJson = staffTags.length ? JSON.stringify(staffTags) : null;
		const hourlyRateMin = input.hourly_rate_min ?? existingTalent?.hourly_rate_min ?? null;
		const hourlyRateMax = input.hourly_rate_max ?? existingTalent?.hourly_rate_max ?? null;
		const timezone = normalizeText(input.timezone) ?? (existingTalent?.timezone as string | undefined) ?? null;
		const action: StaffOnboardingResponse['action'] = existingTalent ? 'updated' : 'created';

		if (existingTalent) {
			await db.prepare(`
				UPDATE talent
				SET phone = ?, name = ?, email = ?, portfolio_url = ?, skills = ?, styles = ?, hourly_rate_min = ?, hourly_rate_max = ?, availability = ?, timezone = ?, status = 'active'
				WHERE id = ?
			`).bind(
				phone,
				name,
				email,
				profileUrl ?? existingTalent.portfolio_url ?? null,
				skillsJson,
				tagsJson ?? existingTalent.styles ?? null,
				hourlyRateMin,
				hourlyRateMax,
				availability,
				timezone,
				talentId
			).run();
		} else {
			await db.prepare(`
				INSERT INTO talent (id, phone, name, email, portfolio_url, skills, styles, hourly_rate_min, hourly_rate_max, availability, timezone, abundance_index, status)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
			`).bind(
				talentId,
				phone,
				name,
				email,
				profileUrl,
				skillsJson,
				tagsJson,
				hourlyRateMin,
				hourlyRateMax,
				availability,
				timezone,
				50
			).run();
		}

		let seekerDeactivated = false;
		if (existingSeeker && existingSeeker.status !== 'inactive') {
			await db.prepare("UPDATE seekers SET status = 'inactive' WHERE id = ?").bind(existingSeeker.id).run();
			seekerDeactivated = true;
		}

		const previousIntake = await db.prepare(`
			SELECT id FROM intakes
			WHERE user_id = ? AND user_type = 'talent'
			ORDER BY created_at DESC
			LIMIT 1
		`).bind(talentId).first<{ id: string }>();

		const intakeId = generateId();
		await db.prepare(`
			INSERT INTO intakes (id, user_id, user_type, intake_type, data, summary, previous_intake_id)
			VALUES (?, ?, 'talent', 'onboarding', ?, ?, ?)
		`).bind(
			intakeId,
			talentId,
			JSON.stringify({
				...input,
				phone,
				email,
				name,
				skills,
				staff_tags: staffTags,
				source: input.source || 'staff_onboarding'
			}),
			buildIntakeSummary({ ...input, name, phone, email: email ?? undefined }, skills),
			previousIntake?.id ?? null
		).run();

		const row = await db.prepare(
			'SELECT * FROM talent WHERE id = ?'
		).bind(talentId).first<DbRow>();

		if (!row) {
			throw error(500, 'Failed to fetch staff profile after onboarding write');
		}

		return json({
			success: true,
			data: {
				action,
				talent: parseTalent(row),
				intake: {
					id: intakeId,
					user_id: talentId,
					user_type: 'talent',
					intake_type: 'onboarding'
				},
				seeker_deactivated: seekerDeactivated
			}
		} as ApiResponse<StaffOnboardingResponse>, { status: action === 'created' ? 201 : 200 });
	} catch (err) {
		console.error('Staff onboarding error:', err);
		if (err instanceof Response) throw err;
		return json(
			{ success: false, error: `Error onboarding staff profile: ${err instanceof Error ? err.message : 'Unknown error'}` } as ApiResponse<never>,
			{ status: 500 }
		);
	}
};
