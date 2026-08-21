import type { Cookies } from '@sveltejs/kit';
import type { Db } from './db';
import { addSeconds, nowIso } from './db';
import type { RuntimeEnv } from './env';
import { getSharedAdminPassword, normalizeEmail } from './env';
import {
	constantTimeEqual,
	hashPassword,
	randomToken,
	sha256Token,
	verifyPassword
} from './password';

export const ADMIN_SESSION_COOKIE = 'jj_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const SHARED_ADMIN_EMAIL = 'shared-admin@jandj.local';

export interface AdminRecord {
	email: string;
	password_hash: string;
	created_at: string;
	updated_at: string;
}

export interface AdminIdentity {
	email: string;
}

export function verifySharedAdminPassword(env: RuntimeEnv, password: string): boolean {
	const configuredPassword = getSharedAdminPassword(env);
	return Boolean(configuredPassword && constantTimeEqual(password, configuredPassword));
}

export async function getAdmin(db: Db, email: string): Promise<AdminRecord | null> {
	return (
		(await db
			.prepare(
				`SELECT email, password_hash, created_at, updated_at
				 FROM admins
				 WHERE email = ?`
			)
			.bind(normalizeEmail(email))
			.first<AdminRecord>()) ?? null
	);
}

export async function upsertAdminPassword(
	db: Db,
	email: string,
	password: string
): Promise<AdminRecord> {
	const normalizedEmail = normalizeEmail(email);
	const passwordHash = await hashPassword(password);
	const now = nowIso();

	await db
		.prepare(
			`INSERT INTO admins (email, password_hash, created_at, updated_at)
			 VALUES (?, ?, ?, ?)
			 ON CONFLICT(email) DO UPDATE SET
			   password_hash = excluded.password_hash,
			   updated_at = excluded.updated_at`
		)
		.bind(normalizedEmail, passwordHash, now, now)
		.run();

	const admin = await getAdmin(db, normalizedEmail);
	if (!admin) throw new Error('Failed to load admin after password update.');
	return admin;
}

export async function verifyAdminLogin(
	db: Db,
	env: RuntimeEnv,
	password: string
): Promise<AdminIdentity | null> {
	if (!verifySharedAdminPassword(env, password)) return null;

	const admin = await getAdmin(db, SHARED_ADMIN_EMAIL);
	if (!admin || !(await verifyPassword(password, admin.password_hash))) {
		await upsertAdminPassword(db, SHARED_ADMIN_EMAIL, password);
	}

	return { email: SHARED_ADMIN_EMAIL };
}

export async function createAdminSession(
	db: Db,
	cookies: Cookies,
	email: string,
	isSecure: boolean
): Promise<void> {
	const token = randomToken();
	const tokenHash = await sha256Token(token);
	const createdAt = new Date();
	const expiresAt = addSeconds(createdAt, SESSION_TTL_SECONDS);

	await db
		.prepare(
			`INSERT INTO admin_sessions (token_hash, email, created_at, expires_at)
			 VALUES (?, ?, ?, ?)`
		)
		.bind(tokenHash, normalizeEmail(email), createdAt.toISOString(), expiresAt.toISOString())
		.run();

	cookies.set(ADMIN_SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		secure: isSecure,
		sameSite: 'lax',
		maxAge: SESSION_TTL_SECONDS
	});
}

export async function getAdminFromCookie(
	db: Db,
	cookies: Cookies
): Promise<AdminIdentity | null> {
	const token = cookies.get(ADMIN_SESSION_COOKIE);
	if (!token) return null;

	const tokenHash = await sha256Token(token);
	const session = await db
		.prepare(
			`SELECT email, expires_at
			 FROM admin_sessions
			 WHERE token_hash = ?`
		)
		.bind(tokenHash)
		.first<{ email: string; expires_at: string }>();

	if (!session) return null;

	if (Date.parse(session.expires_at) <= Date.now()) {
		await db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(tokenHash).run();
		return null;
	}

	return { email: session.email };
}

export async function deleteCurrentSession(db: Db, cookies: Cookies): Promise<void> {
	const token = cookies.get(ADMIN_SESSION_COOKIE);
	if (token) {
		await db
			.prepare('DELETE FROM admin_sessions WHERE token_hash = ?')
			.bind(await sha256Token(token))
			.run();
	}

	cookies.delete(ADMIN_SESSION_COOKIE, { path: '/' });
}
