import { describe, expect, it, vi } from 'vitest';
import { checkRateLimit, consumeSessionHandoff, createSessionHandoff } from './kv';

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
