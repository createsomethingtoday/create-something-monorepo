// HMAC SHA-256 verification of Bettermode webhook signatures.
// Bettermode signs `${timestamp}:${rawBody}` with the app's signing secret
// and sends the hex digest in `x-bettermode-signature` plus the timestamp
// in `x-bettermode-request-timestamp`.

const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000;

export async function verifySignature(
  request: Request,
  rawBody: string,
  signingSecret: string | undefined,
): Promise<boolean> {
  if (!signingSecret) return false;

  const timestampHeader = request.headers.get('x-bettermode-request-timestamp');
  const signature = request.headers.get('x-bettermode-signature') || '';
  const timestamp = Number(timestampHeader);

  if (!Number.isFinite(timestamp) || !signature) return false;
  if (Math.abs(Date.now() - timestamp) > SIGNATURE_MAX_AGE_MS) return false;

  const expected = await hmacSha256Hex(signingSecret, `${timestamp}:${rawBody}`);
  return constantTimeEqual(signature, expected);
}

async function hmacSha256Hex(secret: string, value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return [...new Uint8Array(sig)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(left: string, right: string): boolean {
  const enc = new TextEncoder();
  const a = enc.encode(left);
  const b = enc.encode(right);
  const length = Math.max(a.length, b.length);
  const padA = new Uint8Array(length);
  const padB = new Uint8Array(length);
  padA.set(a);
  padB.set(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) diff |= padA[i] ^ padB[i];
  return diff === 0;
}
