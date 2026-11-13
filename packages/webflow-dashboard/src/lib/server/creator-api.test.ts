import { describe, expect, it } from 'vitest';
import { mapApiKeyRecord, buildCreatorRecordIdMatchFormula, buildRecordIdsFormula } from './airtable';
import {
	consumeRateLimit,
	getApiKeyUsage,
	parseAssetListQuery,
	rateLimitAddress,
	recordApiKeyUse
} from './creator-api';
import { CREATOR_API_MIGRATION, createSqliteD1 } from './testing/sqlite-d1';

const HOUR = 3600;
const NOON = Date.UTC(2026, 10, 13, 12, 0, 0);

describe('consumeRateLimit', () => {
	it('allows exactly the limit inside one window', async () => {
		const db = createSqliteD1(CREATOR_API_MIGRATION);

		const results = [];
		for (let request = 0; request < 4; request++) {
			results.push(await consumeRateLimit(db, 'creator:a', 3, HOUR, NOON + request * 1000));
		}

		expect(results.map((result) => result.allowed)).toEqual([true, true, true, false]);
		expect(results.map((result) => result.remaining)).toEqual([2, 1, 0, 0]);
		expect(results[3].retryAfter).toBe(HOUR - 3);
		expect(results[0].resetAt).toBe(NOON / 1000 + HOUR);
	});

	it('holds the limit when requests arrive together', async () => {
		const db = createSqliteD1(CREATOR_API_MIGRATION);

		const results = await Promise.all(
			Array.from({ length: 25 }, () => consumeRateLimit(db, 'creator:a', 10, HOUR, NOON))
		);

		expect(results.filter((result) => result.allowed)).toHaveLength(10);
	});

	it('starts again in the next window', async () => {
		const db = createSqliteD1(CREATOR_API_MIGRATION);

		await consumeRateLimit(db, 'creator:a', 1, HOUR, NOON);
		expect((await consumeRateLimit(db, 'creator:a', 1, HOUR, NOON + 1000)).allowed).toBe(false);
		expect((await consumeRateLimit(db, 'creator:a', 1, HOUR, NOON + HOUR * 1000)).allowed).toBe(true);
	});

	it('keeps subjects apart', async () => {
		const db = createSqliteD1(CREATOR_API_MIGRATION);

		await consumeRateLimit(db, 'creator:a', 1, HOUR, NOON);
		expect((await consumeRateLimit(db, 'creator:b', 1, HOUR, NOON)).allowed).toBe(true);
	});

	it('drops windows more than a day old, for every subject', async () => {
		const db = createSqliteD1(CREATOR_API_MIGRATION);
		const count = async () =>
			(await db.prepare('SELECT COUNT(*) AS rows FROM api_rate_limits').first<{ rows: number }>())?.rows;

		await consumeRateLimit(db, 'ip:198.51.100.1', 5, HOUR, NOON);
		await consumeRateLimit(db, 'ip:198.51.100.2', 5, HOUR, NOON);
		expect(await count()).toBe(2);

		// One request from someone else, 25 hours later, clears both.
		await consumeRateLimit(db, 'creator:a', 5, HOUR, NOON + 25 * HOUR * 1000);
		expect(await count()).toBe(1);
	});

	it('drops a subject’s own finished windows at once', async () => {
		const db = createSqliteD1(CREATOR_API_MIGRATION);
		const count = async () =>
			(await db.prepare('SELECT COUNT(*) AS rows FROM api_rate_limits').first<{ rows: number }>())?.rows;

		// A one-second window, as the lookup limit across all callers uses.
		for (let second = 0; second < 30; second++) {
			await consumeRateLimit(db, 'key-lookups', 2, 1, NOON + second * 1000);
		}
		expect(await count()).toBe(1);
	});
});

describe('rateLimitAddress', () => {
	it('counts an IPv4 caller by its address', () => {
		expect(rateLimitAddress('203.0.113.10')).toBe('203.0.113.10');
		expect(rateLimitAddress('::ffff:203.0.113.10')).toBe('203.0.113.10');
	});

	it('counts an IPv6 caller by its /64, so rotating addresses in it gains nothing', () => {
		const subject = rateLimitAddress('2001:db8:1234:5678:aaaa:bbbb:cccc:dddd');
		expect(subject).toBe('2001:db8:1234:5678::/64');
		expect(rateLimitAddress('2001:0db8:1234:5678::1')).toBe(subject);
		expect(rateLimitAddress('2001:DB8:1234:5678:0:0:0:ffff')).toBe(subject);
	});

	it('keeps different /64 blocks apart, in any written form', () => {
		expect(rateLimitAddress('2001:db8:1234:5679::1')).toBe('2001:db8:1234:5679::/64');
		expect(rateLimitAddress('2001:db8::1')).toBe('2001:db8:0:0::/64');
		expect(rateLimitAddress('::1')).toBe('0:0:0:0::/64');
	});
});

describe('API key usage', () => {
	it('counts requests per key and keeps the latest time', async () => {
		const db = createSqliteD1(CREATOR_API_MIGRATION);

		await recordApiKeyUse(db, 'recTestKey0000001', '2026-11-13T12:00:00.000Z');
		await recordApiKeyUse(db, 'recTestKey0000001', '2026-11-13T12:05:00.000Z');
		await recordApiKeyUse(db, 'recTestKey0000002', '2026-11-13T12:01:00.000Z');

		const usage = await getApiKeyUsage(db, ['recTestKey0000001', 'recTestKey0000002', 'recTestKey0000003']);
		expect(usage.get('recTestKey0000001')).toEqual({
			requestCount: 2,
			lastUsedAt: '2026-11-13T12:05:00.000Z'
		});
		expect(usage.get('recTestKey0000002')?.requestCount).toBe(1);
		expect(usage.has('recTestKey0000003')).toBe(false);
	});

	it('reads more keys than one statement can bind', async () => {
		const db = createSqliteD1(CREATOR_API_MIGRATION);
		const keyIds = Array.from({ length: 205 }, (_, index) => `recTestKey${String(index).padStart(7, '0')}`);
		for (const keyId of keyIds) await recordApiKeyUse(db, keyId, '2026-11-13T12:00:00.000Z');

		expect((await getApiKeyUsage(db, keyIds)).size).toBe(205);
	});
});

describe('parseAssetListQuery', () => {
	const parse = (query: string) => parseAssetListQuery(new URLSearchParams(query));

	it('defaults to the first 50 assets of every status and type', () => {
		expect(parse('')).toEqual({ ok: true, query: { limit: 50, offset: 0 } });
	});

	it('reads filters without caring about letter case', () => {
		expect(parse('status=delisted&type=app&limit=5&offset=10')).toEqual({
			ok: true,
			query: { status: 'Delisted', type: 'App', limit: 5, offset: 10 }
		});
	});

	it('caps the page size instead of failing', () => {
		expect(parse('limit=5000')).toMatchObject({ ok: true, query: { limit: 100 } });
	});

	it('refuses values it cannot use', () => {
		for (const query of ['limit=0', 'limit=1.5', 'limit=', 'offset=-1', 'offset=x', 'status=', 'type=Font']) {
			expect(parse(query).ok, query).toBe(false);
		}
	});
});

describe('API key rows', () => {
	const row = (fields: Record<string, unknown>) => ({ id: 'recTestKey0000001', fields });

	it('reads the columns of the API Keys table', () => {
		const key = mapApiKeyRecord(
			row({
				'API Key Hash': 'a'.repeat(64),
				Creator: ['recTestCreatorA00'],
				Status: 'Active',
				Scopes: ['read:assets', 'read:profile', 'write:assets'],
				'Key Name': 'Portfolio site',
				'Key Prefix': 'wf_live_12345678',
				'Expiration Date': '2027-11-13',
				'Request Count': 7,
				'Last Used': '2026-11-01T00:00:00.000Z',
				'Created Date': '2026-11-13T19:00:00.000Z'
			}),
			new Date('2026-11-13T20:00:00Z')
		);

		expect(key).toEqual({
			id: 'recTestKey0000001',
			name: 'Portfolio site',
			keyPrefix: 'wf_live_12345678',
			createdAt: '2026-11-13T19:00:00.000Z',
			expiresAt: '2027-11-13',
			lastUsedAt: '2026-11-01T00:00:00.000Z',
			// A permission this API does not serve is dropped, not trusted.
			scopes: ['read:assets', 'read:profile'],
			status: 'Active',
			requestCount: 7,
			keyHash: 'a'.repeat(64),
			creatorIds: ['recTestCreatorA00']
		});
	});

	it('reports an active key past its date as expired', () => {
		const key = mapApiKeyRecord(
			row({ Status: 'Active', 'Expiration Date': '2026-11-13' }),
			new Date('2026-11-13T00:00:00Z')
		);
		expect(key.status).toBe('Expired');
	});

	it('keeps a revoked key revoked whatever its date', () => {
		expect(mapApiKeyRecord(row({ Status: 'Revoked', 'Expiration Date': '2020-01-01' })).status).toBe('Revoked');
	});
});

describe('Airtable formulas', () => {
	it('never embeds a malformed record ID', () => {
		expect(buildRecordIdsFormula(['recTestKey0000001', "x') , TRUE(), ('"])).toBe(
			"OR(RECORD_ID() = 'recTestKey0000001')"
		);
		expect(buildRecordIdsFormula([])).toBe('FALSE()');
		expect(() => buildCreatorRecordIdMatchFormula(["rec' & TRUE() & '"])).toThrow();
		expect(() => buildCreatorRecordIdMatchFormula(['recTestCreatorA00', 'nope'])).toThrow();
		// No creators must never turn into "every asset".
		expect(() => buildCreatorRecordIdMatchFormula([])).toThrow();
	});

	it('matches a creator ID as a whole value', () => {
		expect(buildCreatorRecordIdMatchFormula(['recTestCreatorA00'])).toBe(
			"FIND(',recTestCreatorA00,', ',' & ARRAYJOIN({⚙️🎨Creator Record ID}, ',') & ',') > 0"
		);
	});

	it('matches any of several creators', () => {
		const formula = buildCreatorRecordIdMatchFormula(['recTestCreatorA00', 'recTestCreatorB00']);
		expect(formula.startsWith('OR(')).toBe(true);
		expect(formula).toContain("FIND(',recTestCreatorA00,'");
		expect(formula).toContain("FIND(',recTestCreatorB00,'");
	});
});
