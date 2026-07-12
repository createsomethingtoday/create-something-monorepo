import type { ApiScope } from '../http/api.js';

class HmacTokenCodec {
  private readonly key: Promise<CryptoKey>;

  constructor(secret: string) {
    if (secret.length < 32) throw new Error('Token signing secret must be at least 32 characters.');
    this.key = crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
  }

  async encode(payload: string): Promise<string> {
    const encoded = bytesToBase64Url(new TextEncoder().encode(payload));
    const signature = await crypto.subtle.sign(
      'HMAC',
      await this.key,
      new TextEncoder().encode(encoded)
    );
    return `${encoded}.${bytesToBase64Url(new Uint8Array(signature))}`;
  }

  async decode(token: string): Promise<string | null> {
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    try {
      const valid = await crypto.subtle.verify(
        'HMAC',
        await this.key,
        base64UrlToBytes(parts[1]),
        new TextEncoder().encode(parts[0])
      );
      return valid ? new TextDecoder().decode(base64UrlToBytes(parts[0])) : null;
    } catch {
      return null;
    }
  }
}

export class HmacProposalSigner {
  private readonly codec: HmacTokenCodec;

  constructor(secret: string) {
    this.codec = new HmacTokenCodec(secret);
  }

  sign(payload: string): Promise<string> {
    return this.codec.encode(payload);
  }

  verify(token: string): Promise<string | null> {
    return this.codec.decode(token);
  }
}

export class HmacActionTokenSigner {
  private readonly codec: HmacTokenCodec;

  constructor(secret: string) {
    this.codec = new HmacTokenCodec(secret);
  }

  issue(input: { bookingId: string; expiresAt: string }): Promise<string> {
    return this.codec.encode(JSON.stringify({
      version: 1,
      subject: input.bookingId,
      expiresAt: input.expiresAt
    }));
  }

  async verify(token: string, now: string): Promise<ApiScope | null> {
    const payload = await this.codec.decode(token);
    if (!payload) return null;
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      if (
        parsed.version !== 1 ||
        typeof parsed.subject !== 'string' ||
        typeof parsed.expiresAt !== 'string' ||
        !Number.isFinite(Date.parse(parsed.expiresAt)) ||
        Date.parse(parsed.expiresAt) <= Date.parse(now)
      ) return null;
      return { role: 'booking', bookingId: parsed.subject };
    } catch {
      return null;
    }
  }
}

export type RoomRole = 'host' | 'guest';

export type RoomCapability = {
  roomId: string;
  role: RoomRole;
  nonce: string;
  expiresAt: string;
};

export class HmacRoomCapabilitySigner {
  private readonly codec: HmacTokenCodec;

  constructor(secret: string) {
    this.codec = new HmacTokenCodec(secret);
  }

  issue(capability: RoomCapability): Promise<string> {
    return this.codec.encode(JSON.stringify({
      version: 1,
      subject: capability.roomId,
      role: capability.role,
      nonce: capability.nonce,
      expiresAt: capability.expiresAt
    }));
  }

  async verify(
    token: string,
    input: { roomId: string; now: string }
  ): Promise<RoomCapability | null> {
    const payload = await this.codec.decode(token);
    if (!payload) return null;
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      if (
        parsed.version !== 1 ||
        parsed.subject !== input.roomId ||
        (parsed.role !== 'host' && parsed.role !== 'guest') ||
        typeof parsed.nonce !== 'string' ||
        parsed.nonce.length < 8 ||
        typeof parsed.expiresAt !== 'string' ||
        !Number.isFinite(Date.parse(parsed.expiresAt)) ||
        Date.parse(parsed.expiresAt) <= Date.parse(input.now)
      ) return null;
      return {
        roomId: parsed.subject,
        role: parsed.role,
        nonce: parsed.nonce,
        expiresAt: parsed.expiresAt
      };
    } catch {
      return null;
    }
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
