export const DEMO_ADMIN_EMAIL = 'admin@outerfields.com';

function normalizeEmail(email: string | null | undefined): string {
	return (email || '').trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined): boolean {
	return normalizeEmail(email) === DEMO_ADMIN_EMAIL;
}

export function getUserRole(email: string | null | undefined): 'admin' | 'user' {
	return isAdminEmail(email) ? 'admin' : 'user';
}

export function isAdminUser(
	user: { email: string; role?: string } | null | undefined
): boolean {
	if (!user) return false;
	return user.role === 'admin' || isAdminEmail(user.email);
}
