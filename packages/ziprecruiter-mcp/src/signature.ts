export interface ZipRecruiterSignatureInput {
  secret?: string;
  payload: string;
  timestamp?: string | null;
  signature?: string | null;
  version?: string | null;
  nowMs?: number;
  toleranceMs?: number;
}

export interface ZipRecruiterSignatureResult {
  enabled: boolean;
  verified: boolean;
  reason?: string;
  ageMs?: number;
  version?: string | null;
  timestamp?: string | null;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

export async function computeZipRecruiterSignature(
  secret: string,
  timestamp: string,
  payload: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payload}`));
  return bytesToBase64(new Uint8Array(signed));
}

export async function verifyZipRecruiterSignature(
  input: ZipRecruiterSignatureInput,
): Promise<ZipRecruiterSignatureResult> {
  const {
    secret,
    payload,
    timestamp,
    signature,
    version = null,
    nowMs = Date.now(),
    toleranceMs = 300_000,
  } = input;

  if (!secret) {
    return {
      enabled: false,
      verified: false,
      reason: 'secret_not_configured',
      version,
      timestamp: timestamp ?? null,
    };
  }

  if (!timestamp || !signature) {
    return {
      enabled: true,
      verified: false,
      reason: 'missing_headers',
      version,
      timestamp: timestamp ?? null,
    };
  }

  const parsedTimestamp = Date.parse(timestamp);
  if (!Number.isFinite(parsedTimestamp)) {
    return {
      enabled: true,
      verified: false,
      reason: 'invalid_timestamp',
      version,
      timestamp,
    };
  }

  const ageMs = Math.abs(nowMs - parsedTimestamp);
  if (ageMs > toleranceMs) {
    return {
      enabled: true,
      verified: false,
      reason: 'stale_timestamp',
      ageMs,
      version,
      timestamp,
    };
  }

  const expectedSignature = await computeZipRecruiterSignature(secret, timestamp, payload);
  if (!constantTimeEqual(expectedSignature, signature)) {
    return {
      enabled: true,
      verified: false,
      reason: 'signature_mismatch',
      ageMs,
      version,
      timestamp,
    };
  }

  return {
    enabled: true,
    verified: true,
    ageMs,
    version,
    timestamp,
  };
}
