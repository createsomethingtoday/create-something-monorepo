/**
 * Token encryption service — AES-GCM encryption for Notion tokens at rest.
 *
 * Three-Tier Framework alignment:
 *   - Database tier: Protects secrets stored in D1
 *   - Cross-cutting: Security concern that spans all tiers
 *
 * Uses Web Crypto API (available in both Node.js 18+ and Cloudflare Workers).
 *
 * Key derivation: PBKDF2-HMAC-SHA256 with a unique random salt per token
 * and 310,000 iterations (OWASP 2025 recommendation).
 *
 * Format v2: base64("v2" + salt + iv + ciphertext)
 *   - Version tag: 2 bytes ("v2")
 *   - Salt: 32 bytes (random per encryption, used for PBKDF2)
 *   - IV: 12 bytes (random per encryption, used for AES-GCM)
 *   - Ciphertext: variable length (includes AES-GCM 16-byte auth tag)
 *
 * Backwards compatible: detects and decrypts v1 format (fixed salt)
 * for migration from the previous implementation.
 */

const ALGORITHM = 'AES-GCM';
const SALT_LENGTH = 32;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;
const PBKDF2_ITERATIONS = 310000;
const VERSION_TAG = new Uint8Array([0x76, 0x32]); // "v2" in ASCII

// Legacy v1 constants (for backwards-compatible decryption only)
const V1_SALT = new TextEncoder().encode('notion-sync-mcp-v1');
const V1_ITERATIONS = 100000;

// ─── Key Derivation ─────────────────────────────────────────────────

/**
 * Derive an AES-GCM key from a passphrase + salt using PBKDF2.
 */
async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const encodedPassphrase = new TextEncoder().encode(passphrase);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encodedPassphrase.buffer as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// ─── Encrypt / Decrypt ──────────────────────────────────────────────

/**
 * Encrypt a plaintext string with a per-token random salt.
 * Returns base64-encoded (version + salt + iv + ciphertext).
 */
export async function encrypt(plaintext: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );

  // Combine: version(2) + salt(32) + iv(12) + ciphertext(variable)
  const combined = new Uint8Array(
    VERSION_TAG.length + salt.length + iv.length + ciphertext.byteLength
  );
  let offset = 0;
  combined.set(VERSION_TAG, offset); offset += VERSION_TAG.length;
  combined.set(salt, offset);        offset += salt.length;
  combined.set(iv, offset);          offset += iv.length;
  combined.set(new Uint8Array(ciphertext), offset);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64-encoded encrypted string.
 * Auto-detects v2 (per-token salt) vs v1 (fixed salt) format.
 */
export async function decrypt(encrypted: string, passphrase: string): Promise<string> {
  const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));

  // Detect version: v2 starts with 0x76 0x32 ("v2")
  if (combined.length > 2 && combined[0] === 0x76 && combined[1] === 0x32) {
    return decryptV2(combined, passphrase);
  }

  // Fall back to v1 (legacy fixed-salt format)
  return decryptV1(combined, passphrase);
}

/**
 * Decrypt v2 format: version(2) + salt(32) + iv(12) + ciphertext
 */
async function decryptV2(combined: Uint8Array, passphrase: string): Promise<string> {
  let offset = VERSION_TAG.length; // skip version tag
  const salt = combined.slice(offset, offset + SALT_LENGTH);       offset += SALT_LENGTH;
  const iv = combined.slice(offset, offset + IV_LENGTH);           offset += IV_LENGTH;
  const ciphertext = combined.slice(offset);

  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Decrypt v1 format (legacy): iv(12) + ciphertext
 * Uses the old fixed salt and 100k iterations.
 */
async function decryptV1(combined: Uint8Array, passphrase: string): Promise<string> {
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const key = await deriveKey(passphrase, V1_SALT, V1_ITERATIONS);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

// ─── Detection Helpers ──────────────────────────────────────────────

/**
 * Check if a string appears to be encrypted (base64-encoded with minimum
 * length for the smallest valid encrypted payload).
 */
export function isEncrypted(value: string): boolean {
  // v2 minimum: 2 + 32 + 12 + 1 + 16 = 63 bytes → ~84 base64 chars
  // v1 minimum: 12 + 1 + 16 = 29 bytes → ~40 base64 chars
  if (value.length < 40) return false;
  return /^[A-Za-z0-9+/]+=*$/.test(value);
}

// ─── Token Helpers ──────────────────────────────────────────────────

/**
 * Token encryption helper — encrypts if a key is provided, returns plaintext otherwise.
 * This allows graceful degradation when no encryption key is configured.
 */
export async function encryptToken(
  token: string,
  encryptionKey: string | undefined
): Promise<string> {
  if (!encryptionKey) return token;
  return encrypt(token, encryptionKey);
}

/**
 * Token decryption helper — decrypts if a key is provided and value appears encrypted,
 * returns as-is otherwise (handles migration from plaintext).
 */
export async function decryptToken(
  token: string,
  encryptionKey: string | undefined
): Promise<string> {
  if (!encryptionKey) return token;
  if (!isEncrypted(token)) return token; // Plaintext (pre-encryption migration)
  try {
    return await decrypt(token, encryptionKey);
  } catch {
    // If decryption fails, assume it's plaintext (migration scenario)
    return token;
  }
}
