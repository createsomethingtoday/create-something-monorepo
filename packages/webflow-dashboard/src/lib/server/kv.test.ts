import { describe, expect, it, vi } from 'vitest';
import {
	checkRateLimit,
	consumeSessionHandoff,
	createSessionHandoff,
	getSession,
	refreshSession,
	setSession,
	shouldRefreshSession,
	type SessionData
} from './kv';

/** Minimal KV double: stores raw strings, parses on `'json'` reads like real KV. */
function createKv(initial: Record<string, string> = {}) {
	const store = new Map<string, string>(Object.entries(initial));

	const kv = {
		get: vi.fn(async (key: string, type?: 'json' | 'text') => {
			const value = store.get(key) ?? null;
			if (value === null) return null;
			return type === 'json' ? JSON.parse(value) : value;
		}),
		put: vi.fn(async (key: string, value: string) => {
			store.set(key, value);
		}),
		delete: vi.fn(async (key: string) => {
			store.delete(key);
		})
	} as unknown as KVNamespace;

	return { kv, store };
}

describe('checkRateLimit', () => {
	it('fails closed by default when KV operations throw', async () => {
		const kv = {
			get: vi.fn(async () => {
				throw new Error('KV unavailable');
			}),
			put: vi.fn()
		} as unknown as KVNamespace;

		const result = await checkRateLimit(kv, 'auth:test', 5, 60);

		expect(result.allowed).toBe(false);
		expect(result.remaining).toBe(0);
		expect(result.retryAfter).toBe(60);
	});

	it('supports explicit fail-open mode', async () => {
		const kv = {
			get: vi.fn(async () => {
				throw new Error('KV unavailable');
			}),
			put: vi.fn()
		} as unknown as KVNamespace;

		const result = await checkRateLimit(kv, 'noncritical:test', 5, 60, { failOpen: true });

		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(5);
		expect(result.retryAfter).toBe(0);
	});

	it('increments and blocks once the limit is reached', async () => {
		let count = 0;
		const kv = {
			get: vi.fn(async () => String(count)),
			put: vi.fn(async (_key: string, value: string) => {
				count = Number.parseInt(value, 10);
			})
		} as unknown as KVNamespace;

		const first = await checkRateLimit(kv, 'auth:test', 1, 60);
		const second = await checkRateLimit(kv, 'auth:test', 1, 60);

		expect(first.allowed).toBe(true);
		expect(first.remaining).toBe(0);
		expect(second.allowed).toBe(false);
		expect(second.remaining).toBe(0);
		expect(second.retryAfter).toBeGreaterThan(0);
	});
});

describe('getSession', () => {
	it('returns a well-formed session', async () => {
		const { kv } = createKv();
		await setSession(kv, 'session_123', 'creator@example.com');

		const session = await getSession(kv, 'session_123');

		expect(session).toMatchObject({ email: 'creator@example.com' });
		expect(typeof session?.createdAt).toBe('number');
	});

	it('returns null when the key is missing', async () => {
		const { kv } = createKv();

		expect(await getSession(kv, 'session_missing')).toBeNull();
	});

	it('returns null for an empty session token without touching KV', async () => {
		const { kv } = createKv();

		expect(await getSession(kv, '')).toBeNull();
		expect(kv.get).not.toHaveBeenCalled();
	});

	// The SESSIONS namespace also holds rate-limit counters and other non-session
	// values. Anything that is not a session must not authenticate a request.
	it.each([
		['a bare number (rate-limit counter)', '3'],
		['a bare string', '"creator@example.com"'],
		['an array', '[{"email":"creator@example.com"}]'],
		['an object with no email', '{"createdAt":123}'],
		['an object with a non-string email', '{"email":42,"createdAt":123}'],
		['an object with an empty email', '{"email":"","createdAt":123}']
	])('returns null for %s', async (_label, stored) => {
		const { kv } = createKv({ 'session_forged': stored });

		expect(await getSession(kv, 'session_forged')).toBeNull();
	});

	it('rejects a real rate-limit counter key used as a session token', async () => {
		const { kv, store } = createKv();

		// checkRateLimit writes the counter itself — no hand-written key shape.
		const rateLimitKey = 'auth:login:203.0.113.7';
		await checkRateLimit(kv, rateLimitKey, 5, 60);

		const counterKey = Array.from(store.keys()).find((key) =>
			key.startsWith(`ratelimit:${rateLimitKey}:`)
		);
		expect(counterKey).toBeDefined();
		expect(store.get(counterKey as string)).toBe('1');

		// An attacker who guesses this key must not get an authenticated session.
		expect(await getSession(kv, counterKey as string)).toBeNull();
	});
});

describe('session refresh', () => {
	const HOUR = 60 * 60 * 1000;

	it('does not refresh a session that was just issued', () => {
		const now = Date.UTC(2026, 6, 24, 12, 0, 0);
		const session: SessionData = { email: 'creator@example.com', createdAt: now, issuedAt: now };

		expect(shouldRefreshSession(session, now + 60_000)).toBe(false);
	});

	it('refreshes once the session passes the refresh threshold', () => {
		const now = Date.UTC(2026, 6, 24, 12, 0, 0);
		const session: SessionData = { email: 'creator@example.com', createdAt: now, issuedAt: now };

		expect(shouldRefreshSession(session, now + 31 * 60 * 1000)).toBe(true);
	});

	it('stops refreshing past the absolute lifetime cap', () => {
		const issuedAt = Date.UTC(2026, 6, 24, 12, 0, 0);
		const session: SessionData = {
			email: 'creator@example.com',
			createdAt: issuedAt + 23 * HOUR,
			issuedAt
		};

		expect(shouldRefreshSession(session, issuedAt + 25 * HOUR)).toBe(false);
	});

	it('preserves the original issue time when extending the TTL', async () => {
		const issuedAt = Date.UTC(2026, 6, 24, 12, 0, 0);
		const stored = new Map<string, string>();
		const kv = {
			put: vi.fn(async (key: string, value: string) => {
				stored.set(key, value);
			})
		} as unknown as KVNamespace;

		await refreshSession(
			kv,
			'session_123',
			{ email: 'creator@example.com', createdAt: issuedAt, issuedAt },
			issuedAt + HOUR
		);

		expect(JSON.parse(stored.get('session_123') as string)).toEqual({
			email: 'creator@example.com',
			createdAt: issuedAt + HOUR,
			issuedAt
		});
	});
});

describe('session handoff', () => {
	it('creates and consumes a one-time handoff token', async () => {
		const store = new Map<string, string>();
		const kv = {
			get: vi.fn(async (key: string, type?: 'json' | 'text') => {
				const value = store.get(key) ?? null;
				if (!value) return null;
				return type === 'json' ? JSON.parse(value) : value;
			}),
			put: vi.fn(async (key: string, value: string) => {
				store.set(key, value);
			}),
			delete: vi.fn(async (key: string) => {
				store.delete(key);
			})
		} as unknown as KVNamespace;

		const handoffToken = await createSessionHandoff(kv, 'session_123', 'creator@example.com');
		expect(handoffToken).toMatch(/^handoff_/);

		const handoffData = await consumeSessionHandoff(kv, handoffToken);
		expect(handoffData).toMatchObject({
			sessionToken: 'session_123',
			email: 'creator@example.com'
		});

		const secondRead = await consumeSessionHandoff(kv, handoffToken);
		expect(secondRead).toBeNull();
	});
});
