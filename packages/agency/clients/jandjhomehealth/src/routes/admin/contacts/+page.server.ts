import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { getPublicBaseUrl, getRuntimeEnv } from '$lib/server/env';
import { requireAdmin } from '$lib/server/guards';

export interface ContactRow {
	id: string;
	name: string;
	email: string;
	dob: string;
	phone: string;
	insurance_group: string | null;
	created_at: string;
}

export const load: PageServerLoad = async ({ locals, url, platform }) => {
	const admin = requireAdmin(locals, url);
	const db = getDb(platform);
	const env = getRuntimeEnv(platform);
	const contacts = await db
		.prepare(
			`SELECT
			   CAST(id AS TEXT) AS id,
			   name,
			   COALESCE(email, '') AS email,
			   COALESCE(dob, '') AS dob,
			   COALESCE(phone, '') AS phone,
			   insurance_group,
			   created_at
			 FROM contacts
			 ORDER BY created_at DESC`
		)
		.all<ContactRow>();

	return {
		admin,
		contacts: contacts.results ?? [],
		formUrl: getPublicBaseUrl(url, env)
	};
};
