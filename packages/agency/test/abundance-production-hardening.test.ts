import test from 'node:test';
import assert from 'node:assert/strict';

import {
	abundanceApiAuthHandle,
	isProtectedAbundanceApiPath,
	isStaffOnboardingApiPath,
	isValidAbundanceApiBearer
} from '../src/lib/server/abundance-api-auth.ts';
import { isValidMetaSignature } from '../src/lib/server/abundance-whatsapp-auth.ts';
import { POST as matchPost } from '../src/routes/api/abundance/match/+server.ts';
import { POST as convertPost } from '../src/routes/api/abundance/convert/+server.ts';
import { POST as staffOnboardingPost } from '../src/routes/api/abundance/staff/onboarding/+server.ts';
import { GET as whatsappGet } from '../src/routes/api/abundance/whatsapp/+server.ts';

type StatementRecord = {
	sql: string;
	args: unknown[];
	operation: 'first' | 'all' | 'run';
};

function normalizeSql(sql: string): string {
	return sql.replace(/\s+/g, ' ').trim();
}

function createFakeDb() {
	const statements: StatementRecord[] = [];
	const talentRow = {
		id: 'talent_1',
		phone: '+15550000002',
		name: 'Nurse Candidate',
		email: 'candidate@example.com',
		skills: JSON.stringify(['iv', 'triage']),
		styles: JSON.stringify(['night-shift']),
		hourly_rate_min: 70,
		hourly_rate_max: 95,
		availability: 'available',
		abundance_index: 80,
		status: 'active',
		created_at: '2026-05-01T00:00:00.000Z',
		updated_at: '2026-05-01T00:00:00.000Z'
	};

	return {
		statements,
		db: {
			prepare(sql: string) {
				const normalized = normalizeSql(sql);
				const boundStatement = (args: unknown[]) => ({
					async first() {
						statements.push({ sql: normalized, args, operation: 'first' });

						if (/SELECT id FROM seekers WHERE id = \?/.test(normalized)) {
							return { id: 'seeker_1' };
						}

						if (/SELECT id, created_at FROM matches/.test(normalized)) {
							return { id: 'match_existing', created_at: '2026-05-02T00:00:00.000Z' };
						}

						if (/SELECT \* FROM seekers WHERE phone = \?/.test(normalized)) {
							return {
								id: 'seeker_1',
								phone: '+15550000001',
								name: 'Nurse Seeker',
								email: 'seeker@example.com',
								status: 'active',
								preferred_formats: JSON.stringify(['per-diem'])
							};
						}

						if (/SELECT \* FROM talent WHERE phone = \?/.test(normalized)) {
							return null;
						}

						if (/SELECT \* FROM talent WHERE id = \?/.test(normalized)) {
							return {
								...talentRow,
								id: args[0],
								phone: '+15550000001',
								name: 'Nurse Seeker'
							};
						}

						return null;
					},
					async all() {
						statements.push({ sql: normalized, args, operation: 'all' });

						if (/SELECT \* FROM talent WHERE status = 'active'/.test(normalized)) {
							return { results: [talentRow] };
						}

						return { results: [] };
					},
					async run() {
						statements.push({ sql: normalized, args, operation: 'run' });
						return {};
					}
				});

				return {
					bind(...args: unknown[]) {
						return boundStatement(args);
					},
					first: () => boundStatement([]).first(),
					all: () => boundStatement([]).all(),
					run: () => boundStatement([]).run()
				};
			}
		} as unknown as D1Database
	};
}

function createStaffOnboardingFakeDb(options: { existingTalent?: boolean; existingSeeker?: boolean; previousIntake?: boolean } = {}) {
	const statements: StatementRecord[] = [];
	let talentRow: Record<string, unknown> | null = options.existingTalent
		? {
				id: 'talent_existing',
				phone: '+15550000001',
				name: 'Existing Nurse',
				email: 'existing@example.com',
				portfolio_url: null,
				instagram: null,
				skills: JSON.stringify(['old-skill']),
				styles: JSON.stringify(['old-tag']),
				hourly_rate_min: 60,
				hourly_rate_max: 80,
				availability: 'busy',
				timezone: 'America/Chicago',
				abundance_index: 65,
				status: 'active',
				created_at: '2026-05-01T00:00:00.000Z',
				updated_at: '2026-05-01T00:00:00.000Z'
			}
		: null;
	let seekerRow: Record<string, unknown> | null = options.existingSeeker
		? {
				id: 'seeker_existing',
				phone: '5550000001',
				name: 'Placeholder Nurse',
				email: 'placeholder@example.com',
				status: 'onboarding'
			}
		: null;

	return {
		statements,
		getTalent: () => talentRow,
		getSeeker: () => seekerRow,
		db: {
			prepare(sql: string) {
				const normalized = normalizeSql(sql);
				const boundStatement = (args: unknown[]) => ({
					async first() {
						statements.push({ sql: normalized, args, operation: 'first' });

						if (/SELECT \* FROM talent WHERE phone = \?/.test(normalized)) {
							return talentRow && talentRow.phone === args[0] ? talentRow : null;
						}

						if (/SELECT \* FROM talent WHERE lower\(email\) = \?/.test(normalized)) {
							return talentRow && String(talentRow.email).toLowerCase() === args[0] ? talentRow : null;
						}

						if (/SELECT \* FROM seekers WHERE phone = \?/.test(normalized)) {
							return seekerRow && seekerRow.phone === args[0] ? seekerRow : null;
						}

						if (/SELECT \* FROM seekers WHERE lower\(email\) = \?/.test(normalized)) {
							return seekerRow && String(seekerRow.email).toLowerCase() === args[0] ? seekerRow : null;
						}

						if (/SELECT id FROM intakes WHERE user_id = \? AND user_type = 'talent'/.test(normalized)) {
							return options.previousIntake ? { id: 'intake_previous' } : null;
						}

						if (/SELECT \* FROM talent WHERE id = \?/.test(normalized)) {
							return talentRow && talentRow.id === args[0] ? talentRow : null;
						}

						return null;
					},
					async all() {
						statements.push({ sql: normalized, args, operation: 'all' });
						return { results: [] };
					},
					async run() {
						statements.push({ sql: normalized, args, operation: 'run' });

						if (/INSERT INTO talent/.test(normalized)) {
							const [
								id,
								phone,
								name,
								email,
								portfolioUrl,
								skills,
								styles,
								hourlyRateMin,
								hourlyRateMax,
								availability,
								timezone,
								abundanceIndex
							] = args;
							talentRow = {
								id,
								phone,
								name,
								email,
								portfolio_url: portfolioUrl,
								instagram: null,
								skills,
								styles,
								hourly_rate_min: hourlyRateMin,
								hourly_rate_max: hourlyRateMax,
								availability,
								timezone,
								abundance_index: abundanceIndex,
								status: 'active',
								created_at: '2026-05-01T00:00:00.000Z',
								updated_at: '2026-05-01T00:00:00.000Z'
							};
						}

						if (/UPDATE talent SET/.test(normalized) && talentRow) {
							const [
								phone,
								name,
								email,
								portfolioUrl,
								skills,
								styles,
								hourlyRateMin,
								hourlyRateMax,
								availability,
								timezone
							] = args;
							talentRow = {
								...talentRow,
								phone,
								name,
								email,
								portfolio_url: portfolioUrl,
								skills,
								styles,
								hourly_rate_min: hourlyRateMin,
								hourly_rate_max: hourlyRateMax,
								availability,
								timezone,
								status: 'active'
							};
						}

						if (/UPDATE seekers SET status = 'inactive' WHERE id = \?/.test(normalized) && seekerRow) {
							seekerRow = { ...seekerRow, status: 'inactive' };
						}

						return {};
					}
				});

				return {
					bind(...args: unknown[]) {
						return boundStatement(args);
					},
					first: () => boundStatement([]).first(),
					all: () => boundStatement([]).all(),
					run: () => boundStatement([]).run()
				};
			}
		} as unknown as D1Database
	};
}

async function signMetaPayload(payload: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
	const hex = Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
	return `sha256=${hex}`;
}

test('abundance API hook requires either a session user or internal bearer token', async () => {
	const url = new URL('https://example.com/api/abundance/match');

	const denied = await abundanceApiAuthHandle({
		event: {
			url,
			request: new Request(url),
			locals: {},
			platform: { env: { AGENCY_INTERNAL_API_KEY: 'expected-secret' } }
		},
		resolve: async () => new Response('ok')
	} as any);

	assert.equal(denied.status, 401);

	const allowedByBearer = await abundanceApiAuthHandle({
		event: {
			url,
			request: new Request(url, { headers: { authorization: 'Bearer expected-secret' } }),
			locals: {},
			platform: { env: { AGENCY_INTERNAL_API_KEY: 'expected-secret' } }
		},
		resolve: async () => new Response('ok', { status: 200 })
	} as any);

	assert.equal(allowedByBearer.status, 200);
	assert.equal(isProtectedAbundanceApiPath('/api/abundance/match'), true);
	assert.equal(isProtectedAbundanceApiPath('/api/abundance/whatsapp'), false);
	assert.equal(isProtectedAbundanceApiPath('/api/abundance/whatsapp/'), false);
	assert.equal(isStaffOnboardingApiPath('/api/abundance/staff/onboarding'), true);
	assert.equal(await isValidAbundanceApiBearer('Bearer expected-secret', 'expected-secret'), true);
	assert.equal(await isValidAbundanceApiBearer('Bearer wrong-secret', 'expected-secret'), false);
});

test('abundance staff onboarding route accepts only the route-scoped onboarding token', async () => {
	const staffUrl = new URL('https://example.com/api/abundance/staff/onboarding');
	const matchUrl = new URL('https://example.com/api/abundance/match');

	const staffAllowed = await abundanceApiAuthHandle({
		event: {
			url: staffUrl,
			request: new Request(staffUrl, { headers: { authorization: 'Bearer staff-secret' } }),
			locals: {},
			platform: { env: { ABUNDANCE_STAFF_ONBOARDING_TOKEN: 'staff-secret' } }
		},
		resolve: async () => new Response('ok', { status: 200 })
	} as any);

	assert.equal(staffAllowed.status, 200);

	const matchDenied = await abundanceApiAuthHandle({
		event: {
			url: matchUrl,
			request: new Request(matchUrl, { headers: { authorization: 'Bearer staff-secret' } }),
			locals: {},
			platform: { env: { ABUNDANCE_STAFF_ONBOARDING_TOKEN: 'staff-secret' } }
		},
		resolve: async () => new Response('ok')
	} as any);

	assert.equal(matchDenied.status, 401);
});

test('abundance WhatsApp webhook rejects missing verification config and validates Meta signatures', async () => {
	const missingConfig = await whatsappGet({
		url: new URL('https://example.com/api/abundance/whatsapp?hub.mode=subscribe&hub.verify_token=x&hub.challenge=abc'),
		platform: { env: {} }
	} as any);

	assert.equal(missingConfig.status, 503);

	const verified = await whatsappGet({
		url: new URL('https://example.com/api/abundance/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=abc'),
		platform: { env: { WHATSAPP_VERIFY_TOKEN: 'verify-me' } }
	} as any);

	assert.equal(verified.status, 200);
	assert.equal(await verified.text(), 'abc');

	const payload = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
	const signature = await signMetaPayload(payload, 'app-secret');

	assert.equal(await isValidMetaSignature(payload, signature, 'app-secret'), true);
	assert.equal(await isValidMetaSignature(payload, signature, 'wrong-secret'), false);
	assert.equal(await isValidMetaSignature(payload, null, 'app-secret'), false);
});

test('abundance match creation updates an existing suggestion instead of inserting a duplicate', async () => {
	const { db, statements } = createFakeDb();
	const response = await matchPost({
		request: new Request('https://example.com/api/abundance/match', {
			method: 'POST',
			body: JSON.stringify({
				seeker_id: ' seeker_1 ',
				job_title: 'RN night shift',
				job_description: 'Need IV and triage support.',
				required_skills: ['iv'],
				budget: 85
			})
		}),
		platform: { env: { DB: db } }
	} as any);

	assert.equal(response.status, 201);

	const payload = await response.json();
	assert.equal(payload.data[0].match.id, 'match_existing');
	assert.equal(payload.data[0].match.created_at, '2026-05-02T00:00:00.000Z');
	assert.ok(statements.some((entry) => /SELECT id, created_at FROM matches/.test(entry.sql)));
	assert.ok(statements.some((entry) => /UPDATE matches SET/.test(entry.sql)));
	assert.equal(statements.some((entry) => /INSERT INTO matches/.test(entry.sql)), false);
});

test('abundance conversion preserves the source record by marking it inactive', async () => {
	const { db, statements } = createFakeDb();
	const response = await convertPost({
		request: new Request('https://example.com/api/abundance/convert', {
			method: 'POST',
			body: JSON.stringify({
				phone: '+15550000001',
				target_type: 'talent',
				skills: ['iv', 'triage'],
				availability: 'available'
			})
		}),
		platform: { env: { DB: db } }
	} as any);

	assert.equal(response.status, 201);

	const payload = await response.json();
	assert.equal(payload.success, true);
	assert.deepEqual(payload.data.skills, ['iv', 'triage']);
	assert.ok(statements.some((entry) => /INSERT INTO talent/.test(entry.sql)));
	assert.ok(statements.some((entry) => /UPDATE seekers SET status = 'inactive'/.test(entry.sql)));
	assert.equal(statements.some((entry) => /DELETE FROM seekers|DELETE FROM talent/.test(entry.sql)), false);
});

test('staff onboarding creates a matchable talent profile and stores the full onboarding intake', async () => {
	const { db, statements, getSeeker } = createStaffOnboardingFakeDb({ existingSeeker: true });
	const response = await staffOnboardingPost({
		request: new Request('https://example.com/api/abundance/staff/onboarding', {
			method: 'POST',
			body: JSON.stringify({
				phone: '(555) 000-0001',
				name: 'Avery Stone',
				email: 'AVERY@example.com',
				specialties: ['ICU', 'Telemetry', 'ICU'],
				skills: ['Triage'],
				license_type: 'RN',
				license_state: 'TX',
				shift_preference: 'Nights',
				contract_preference: '13-week travel',
				desired_location: 'Austin',
				availability: 'available',
				source: 'concierge',
				consent: {
					background_check: true,
					compliance_screening: true,
					submitted_at: '2026-06-03T12:00:00.000Z'
				}
			})
		}),
		platform: { env: { DB: db } }
	} as any);

	assert.equal(response.status, 201);

	const payload = await response.json();
	assert.equal(payload.success, true);
	assert.equal(payload.data.action, 'created');
	assert.deepEqual(payload.data.talent.skills, ['Triage', 'ICU', 'Telemetry']);
	assert.equal(payload.data.intake.user_type, 'talent');
	assert.equal(payload.data.intake.intake_type, 'onboarding');
	assert.equal(payload.data.seeker_deactivated, true);
	assert.equal(getSeeker()?.status, 'inactive');

	assert.ok(statements.some((entry) => /INSERT INTO talent/.test(entry.sql)));
	assert.ok(statements.some((entry) => /INSERT INTO intakes/.test(entry.sql)));
	assert.ok(statements.some((entry) => /UPDATE seekers SET status = 'inactive'/.test(entry.sql)));

	const intakeWrite = statements.find((entry) => /INSERT INTO intakes/.test(entry.sql));
	assert.ok(intakeWrite);
	const intakeData = JSON.parse(String(intakeWrite.args[2]));
	assert.equal(intakeData.source, 'concierge');
	assert.equal(intakeData.phone, '5550000001');
	assert.deepEqual(intakeData.skills, ['Triage', 'ICU', 'Telemetry']);
	assert.ok(intakeData.staff_tags.includes('license:RN'));
	assert.ok(intakeData.staff_tags.includes('state:TX'));
});

test('staff onboarding updates an existing talent profile instead of returning stale data', async () => {
	const { db, statements } = createStaffOnboardingFakeDb({ existingTalent: true, previousIntake: true });
	const response = await staffOnboardingPost({
		request: new Request('https://example.com/api/abundance/staff/onboarding', {
			method: 'POST',
			body: JSON.stringify({
				phone: '+15550000001',
				name: 'Existing Nurse',
				email: 'existing@example.com',
				specialties: ['ER', 'Pediatrics'],
				license_type: 'RN',
				license_state: 'CA',
				shift_preference: 'Days',
				availability: 'available',
				timezone: 'America/Los_Angeles',
				consent: {
					background_check: true,
					compliance_screening: true
				}
			})
		}),
		platform: { env: { DB: db } }
	} as any);

	assert.equal(response.status, 200);

	const payload = await response.json();
	assert.equal(payload.success, true);
	assert.equal(payload.data.action, 'updated');
	assert.deepEqual(payload.data.talent.skills, ['ER', 'Pediatrics']);
	assert.equal(payload.data.talent.availability, 'available');
	assert.equal(payload.data.talent.timezone, 'America/Los_Angeles');

	assert.equal(statements.some((entry) => /INSERT INTO talent/.test(entry.sql)), false);
	assert.ok(statements.some((entry) => /UPDATE talent SET/.test(entry.sql)));
	assert.ok(statements.some((entry) => /INSERT INTO intakes/.test(entry.sql)));

	const intakeWrite = statements.find((entry) => /INSERT INTO intakes/.test(entry.sql));
	assert.ok(intakeWrite);
	assert.equal(intakeWrite.args[4], 'intake_previous');
});

test('staff onboarding rejects profile writeback without explicit consent', async () => {
	const { db, statements } = createStaffOnboardingFakeDb();
	const response = await staffOnboardingPost({
		request: new Request('https://example.com/api/abundance/staff/onboarding', {
			method: 'POST',
			body: JSON.stringify({
				phone: '+15550000001',
				name: 'No Consent Nurse',
				specialties: ['ICU'],
				consent: {
					background_check: true,
					compliance_screening: false
				}
			})
		}),
		platform: { env: { DB: db } }
	} as any);

	assert.equal(response.status, 400);
	assert.equal(statements.some((entry) => /INSERT INTO talent|UPDATE talent SET|INSERT INTO intakes/.test(entry.sql)), false);
});
