/**
 * Cryptographic Services
 *
 * Supports multiple password hash formats for migration:
 * - WORKWAY platform (scrypt): hashHex.saltHex
 * - F(n) (PBKDF2): pbkdf2:saltHex:hashHex
 * - Identity native (PBKDF2): saltB64:hashB64
 *
 * Canon: Security through simplicity. No magic, no obscurity.
 */

import { scrypt, timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

// PBKDF2 configuration for new hashes
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = 'SHA-256';
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Hash a password using PBKDF2
 *
 * Returns: salt:hash (both base64 encoded)
 */
export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
	const hash = await pbkdf2(password, salt);

	const saltB64 = btoa(String.fromCharCode(...salt));
	const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hash)));

	return `${saltB64}:${hashB64}`;
}

/**
 * Verify a password against a stored hash
 *
 * Supports three formats:
 * 1. F(n) format: pbkdf2:saltHex:hashHex (PBKDF2)
 * 2. WORKWAY platform format: hashHex.saltHex (scrypt, 128+32 chars)
 * 3. Identity format: saltB64:hashB64 (PBKDF2)
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
	// Check for F(n) format: pbkdf2:saltHex:hashHex
	if (storedHash.startsWith('pbkdf2:')) {
		return verifyPbkdf2Fn(password, storedHash);
	}

	// Check for WORKWAY platform format: hashHex.saltHex (scrypt)
	// 128 (hash) + 1 (.) + 32 (salt) = 161 chars
	if (storedHash.includes('.') && storedHash.length === 161) {
		return verifyScrypt(password, storedHash);
	}

	// Check for Identity format: saltB64:hashB64
	if (storedHash.includes(':')) {
		return verifyPbkdf2Identity(password, storedHash);
	}

	return false;
}

/**
 * Verify WORKWAY platform scrypt hash
 * Format: hashHex.saltHex (128 char hash, 32 char salt)
 */
async function verifyScrypt(password: string, storedHash: string): Promise<boolean> {
	try {
		const [hashHex, saltHex] = storedHash.split('.');
		if (!hashHex || !saltHex || hashHex.length !== 128 || saltHex.length !== 32) {
			return false;
		}

		const storedHashBytes = Buffer.from(hashHex, 'hex');
		const derivedKey = (await scryptAsync(password, saltHex, 64)) as Buffer;

		return nodeTimingSafeEqual(storedHashBytes, derivedKey);
	} catch (error) {
		console.error('Scrypt verification error:', error);
		return false;
	}
}

/**
 * Verify F(n) PBKDF2 hash
 * Format: pbkdf2:saltHex:hashHex
 */
async function verifyPbkdf2Fn(password: string, storedHash: string): Promise<boolean> {
	try {
		const parts = storedHash.split(':');
		if (parts.length !== 3) return false;
		const [, saltHex, hashHex] = parts;
		if (!saltHex || !hashHex) return false;

		const salt = hexToBytes(saltHex);
		const storedHashBytes = hexToBytes(hashHex);
		const computedHash = await pbkdf2(password, salt);

		return timingSafeEqual(new Uint8Array(computedHash), storedHashBytes);
	} catch (error) {
		console.error('PBKDF2 F(n) verification error:', error);
		return false;
	}
}

/**
 * Verify Identity native PBKDF2 hash
 * Format: saltB64:hashB64
 */
async function verifyPbkdf2Identity(password: string, storedHash: string): Promise<boolean> {
	try {
		const parts = storedHash.split(':');
		if (parts.length !== 2) return false;
		const [saltB64, hashB64] = parts;
		if (!saltB64 || !hashB64) return false;

		const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
		const storedHashBytes = Uint8Array.from(atob(hashB64), (c) => c.charCodeAt(0));
		const computedHash = await pbkdf2(password, salt);

		return timingSafeEqual(new Uint8Array(computedHash), storedHashBytes);
	} catch (error) {
		console.error('PBKDF2 Identity verification error:', error);
		return false;
	}
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
	}
	return bytes;
}

/**
 * Core PBKDF2 derivation
 */
async function pbkdf2(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
	const encoder = new TextEncoder();
	const passwordKey = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
		'deriveBits',
	]);

	return crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt,
			iterations: PBKDF2_ITERATIONS,
			hash: PBKDF2_HASH,
		},
		passwordKey,
		KEY_LENGTH * 8
	);
}

/**
 * Constant-time comparison to prevent timing attacks
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a[i] ^ b[i];
	}
	return result === 0;
}

/**
 * Generate a cryptographically secure random string
 */
export function generateSecureToken(length: number = 32): string {
	const bytes = crypto.getRandomValues(new Uint8Array(length));
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Hash a token for storage (SHA-256)
 */
export async function hashToken(token: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(token);
	const hash = await crypto.subtle.digest('SHA-256', data);
	return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
	return crypto.randomUUID();
}
