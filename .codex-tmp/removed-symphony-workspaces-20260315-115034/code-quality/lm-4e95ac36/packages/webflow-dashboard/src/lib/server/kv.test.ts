import { describe, expect, it, vi } from 'vitest';
import { checkRateLimit } from './kv';

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
