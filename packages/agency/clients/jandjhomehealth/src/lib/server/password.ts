const HASH_PREFIX = 'pbkdf2_sha256';
const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;

function base64UrlFromBytes(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function bytesFromBase64Url(value: string): Uint8Array {
	const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
	const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return copy.buffer;
}

export function randomToken(byteLength = 32): string {
	const bytes = new Uint8Array(byteLength);
	crypto.getRandomValues(bytes);
	return base64UrlFromBytes(bytes);
}

export async function sha256Token(value: string): Promise<string> {
	const input = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest('SHA-256', input);
	return base64UrlFromBytes(new Uint8Array(digest));
}

export function constantTimeEqual(a: string, b: string): boolean {
	const left = new TextEncoder().encode(a);
	const right = new TextEncoder().encode(b);
	let diff = left.length ^ right.length;
	const length = Math.max(left.length, right.length);

	for (let i = 0; i < length; i += 1) {
		diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
	}

	return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
	const salt = new Uint8Array(16);
	crypto.getRandomValues(salt);

	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveBits']
	);

	const bits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			hash: 'SHA-256',
			salt: toArrayBuffer(salt),
			iterations: PBKDF2_ITERATIONS
		},
		key,
		KEY_LENGTH_BITS
	);

	return [
		HASH_PREFIX,
		String(PBKDF2_ITERATIONS),
		base64UrlFromBytes(salt),
		base64UrlFromBytes(new Uint8Array(bits))
	].join('$');
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
	const [prefix, iterationsText, saltText, hashText] = storedHash.split('$');
	const iterations = Number(iterationsText);

	if (prefix !== HASH_PREFIX || !Number.isInteger(iterations) || !saltText || !hashText) {
		return false;
	}

	const salt = bytesFromBase64Url(saltText);
	const expected = bytesFromBase64Url(hashText);
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveBits']
	);

	const bits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			hash: 'SHA-256',
			salt: toArrayBuffer(salt),
			iterations
		},
		key,
		expected.length * 8
	);

	return constantTimeEqual(
		base64UrlFromBytes(new Uint8Array(bits)),
		base64UrlFromBytes(expected)
	);
}

export function validateNewPassword(password: string): string | null {
	if (password.length < 10) return 'Use at least 10 characters.';
	if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
		return 'Use at least one letter and one number.';
	}
	return null;
}
