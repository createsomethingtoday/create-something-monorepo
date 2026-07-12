import type {
  GoogleCredentials,
  GoogleCredentialStore,
  OAuthStateRecord,
  OAuthStateStore
} from './google-oauth.js';

type EncryptedEnvelope = {
  version: 1;
  iv: string;
  ciphertext: string;
};

export class DurableOAuthStore implements OAuthStateStore, GoogleCredentialStore {
  private readonly key: Promise<CryptoKey>;

  constructor(
    private readonly state: DurableObjectState,
    encryptionSecret: string
  ) {
    if (encryptionSecret.length < 16) {
      throw new Error('OAuth credential encryption secret must be at least 16 characters.');
    }
    state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS oauth_states (
        state_hash TEXT PRIMARY KEY,
        expires_at TEXT NOT NULL
      );
    `);
    this.key = deriveKey(encryptionSecret);
  }

  async save(record: OAuthStateRecord): Promise<void> {
    const stateHash = await sha256Hex(record.state);
    this.state.storage.sql.exec(
      `INSERT INTO oauth_states(state_hash, expires_at) VALUES (?, ?)
       ON CONFLICT(state_hash) DO UPDATE SET expires_at = excluded.expires_at`,
      stateHash,
      record.expiresAt
    );
  }

  async consume(state: string, now: string): Promise<boolean> {
    const stateHash = await sha256Hex(state);
    const record = this.state.storage.sql.exec<{ expires_at: string }>(
      'SELECT expires_at FROM oauth_states WHERE state_hash = ?',
      stateHash
    ).toArray()[0];
    this.state.storage.sql.exec(
      'DELETE FROM oauth_states WHERE state_hash = ?',
      stateHash
    );
    return Boolean(record && record.expires_at > now);
  }

  async read(): Promise<GoogleCredentials | null> {
    const envelope = this.state.storage.kv.get<EncryptedEnvelope>('google:credentials');
    if (!envelope) return null;
    try {
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToBytes(envelope.iv) },
        await this.key,
        base64ToBytes(envelope.ciphertext)
      );
      return JSON.parse(new TextDecoder().decode(plaintext)) as GoogleCredentials;
    } catch {
      throw new Error('oauth_credentials_decryption_failed');
    }
  }

  async write(credentials: GoogleCredentials): Promise<void> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await this.key,
      new TextEncoder().encode(JSON.stringify(credentials))
    );
    this.state.storage.kv.put('google:credentials', {
      version: 1,
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(ciphertext))
    } satisfies EncryptedEnvelope);
  }
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(secret)
  );
  return crypto.subtle.importKey(
    'raw',
    digest,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
