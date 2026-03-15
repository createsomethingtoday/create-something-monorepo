import { describe, expect, it } from 'vitest';
import { isAdminUser } from '$lib/server/admin';

function createUser(email: string) {
	return {
		id: 'usr_1',
		email,
		name: 'Test User',
		membership: true,
		createdAt: new Date().toISOString()
	};
}

describe('isAdminUser (env allowlist + demo fallback)', () => {
	it('allows configured admin emails (case-insensitive)', () => {
		const result = isAdminUser(createUser('Admin@Outerfields.com'), {
			VIDEO_ADMIN_EMAILS: 'ops@example.com,admin@outerfields.com'
		});

		expect(result).toBe(true);
	});

	it('always allows demo admin email even when explicit allowlist excludes it', () => {
		const result = isAdminUser(createUser('admin@outerfields.com'), {
			VIDEO_ADMIN_EMAILS: 'ops@example.com'
		});

		expect(result).toBe(true);
	});

	it('allows demo admin email when allowlist is not configured', () => {
		const result = isAdminUser(createUser('admin@outerfields.com'), {});

		expect(result).toBe(true);
	});

	it('denies non-admin users when allowlist is not configured', () => {
		const result = isAdminUser(createUser('member@example.com'), {});

		expect(result).toBe(false);
	});
});
