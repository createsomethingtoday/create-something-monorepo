export interface IndeedSignatureInput {
  secret?: string;
  payload: string;
  signature?: string | null;
}

export interface IndeedSignatureResult {
  enabled: boolean;
  verified: boolean;
  reason?: string;
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

export async function computeIndeedSignature(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return bytesToBase64(new Uint8Array(signed));
}

export async function verifyIndeedSignature(input: IndeedSignatureInput): Promise<IndeedSignatureResult> {
  const { secret, payload, signature } = input;

  if (!secret) {
    return {
      enabled: false,
      verified: false,
      reason: 'secret_not_configured',
    };
  }

  if (!signature) {
    return {
      enabled: true,
      verified: false,
      reason: 'missing_signature',
    };
  }

  const expected = await computeIndeedSignature(secret, payload);
  if (!constantTimeEqual(expected, signature)) {
    return {
      enabled: true,
      verified: false,
      reason: 'signature_mismatch',
    };
  }

  return {
    enabled: true,
    verified: true,
  };
}

