export interface ClaimedMagicProof {
	id: string;
	email: string;
	expires_at: number;
}

export type ClaimMagicProofResult =
	| { ok: true; session: ClaimedMagicProof }
	| { ok: false; reason: 'invalid' | 'used' | 'expired' };

interface StoredMagicProof extends ClaimedMagicProof {
	status: string;
}

export async function verifyLmsMagicExchangeToken(supplied: string | null, expected: string | undefined): Promise<boolean> {
	if (!supplied || !expected) return false;
	const encoder = new TextEncoder();
	const [suppliedDigest, expectedDigest] = await Promise.all([
		crypto.subtle.digest('SHA-256', encoder.encode(supplied)),
		crypto.subtle.digest('SHA-256', encoder.encode(expected)),
	]);
	const suppliedBytes = new Uint8Array(suppliedDigest);
	const expectedBytes = new Uint8Array(expectedDigest);
	let difference = 0;
	for (let index = 0; index < suppliedBytes.length; index += 1) difference |= suppliedBytes[index] ^ expectedBytes[index];
	return difference === 0;
}

export async function hashMailboxMagicToken(token: string): Promise<string> {
	const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function claimLmsMagicProof(
	db: D1Database,
	sessionId: string,
	tokenHash: string,
	now: number,
): Promise<ClaimMagicProofResult> {
	const session = await db.prepare(
		`SELECT id, email, status, expires_at
		 FROM magic_link_sessions WHERE session_id = ? AND token_hash = ?`,
	).bind(sessionId, tokenHash).first<StoredMagicProof>();
	if (!session) return { ok: false, reason: 'invalid' };
	if (session.status !== 'pending') return { ok: false, reason: 'used' };
	if (session.expires_at <= now) {
		await db.prepare(
			`UPDATE magic_link_sessions SET status = 'expired'
			 WHERE id = ? AND token_hash = ? AND status = 'pending'`,
		).bind(session.id, tokenHash).run();
		return { ok: false, reason: 'expired' };
	}
	const claimed = await db.prepare(
		`UPDATE magic_link_sessions SET status = 'verified', verified_at = ?
		 WHERE id = ? AND token_hash = ? AND status = 'pending' AND expires_at > ?`,
	).bind(now, session.id, tokenHash, now).run();
	if (claimed.meta.changes !== 1) return { ok: false, reason: 'used' };
	return { ok: true, session: { id: session.id, email: session.email, expires_at: session.expires_at } };
}
