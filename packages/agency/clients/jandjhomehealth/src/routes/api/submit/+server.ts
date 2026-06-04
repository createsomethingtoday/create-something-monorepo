import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb, nowIso } from '$lib/server/db';

interface SubmitPayload {
	name: string;
	dob: string;
	phone: string;
	insurance_group: string | null;
}

function sanitize(value: unknown, maxLength: number): string {
	if (typeof value !== 'string') return '';
	return value.trim().slice(0, maxLength);
}

function parsePayload(body: unknown): SubmitPayload | null {
	if (!body || typeof body !== 'object') return null;
	const payload = body as Record<string, unknown>;
	const name = sanitize(payload.name, 120);
	const dob = sanitize(payload.dob, 20);
	const phone = sanitize(payload.phone, 40);
	const insuranceGroup = sanitize(payload.insurance_group, 120);

	if (!name || !dob || !phone) return null;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;

	return {
		name,
		dob,
		phone,
		insurance_group: insuranceGroup || null
	};
}

export const POST: RequestHandler = async ({ request, platform }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
	}

	const payload = parsePayload(body);
	if (!payload) {
		return json(
			{ success: false, error: 'Name, date of birth, and phone are required.' },
			{ status: 400 }
		);
	}

	try {
		const db = getDb(platform);
		const result = await db
			.prepare(
				`INSERT INTO contacts (name, email, dob, phone, insurance_group, created_at)
				 VALUES (?, '', ?, ?, ?, ?)`
			)
			.bind(payload.name, payload.dob, payload.phone, payload.insurance_group, nowIso())
			.run();

		return json({ success: true, data: { id: result.meta.last_row_id } });
	} catch (error) {
		console.error('Contact submission failed:', error);
		return json({ success: false, error: 'Submission failed.' }, { status: 500 });
	}
};
