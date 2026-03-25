import { getEnvValue } from './cloudflareRuntime';

const TOKEN_TTL_SECONDS = 10 * 60;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function base64UrlEncode(value) {
  const bytes = typeof value === 'string' ? textEncoder.encode(value) : value;
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');

  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function getAutofillTokenSecret(runtime = {}) {
  return (
    await getEnvValue('AUTOFILL_TOKEN_SECRET', runtime) ||
    await getEnvValue('ADMIN_API_TOKEN', runtime) ||
    ''
  );
}

async function signPayload(encodedPayload, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(encodedPayload));
  return base64UrlEncode(new Uint8Array(signature));
}

export async function createAutofillToken({ clientId }, runtime = {}) {
  const secret = await getAutofillTokenSecret(runtime);
  if (!secret || !clientId) {
    return null;
  }

  const encodedPayload = base64UrlEncode(JSON.stringify({
    clientId,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  }));

  const signature = await signPayload(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export async function verifyAutofillToken({ token, clientId }, runtime = {}) {
  const secret = await getAutofillTokenSecret(runtime);
  if (!secret || !token || !clientId) {
    return false;
  }

  const [encodedPayload, providedSignature] = token.split('.');
  if (!encodedPayload || !providedSignature) {
    return false;
  }

  const expectedSignature = await signPayload(encodedPayload, secret);
  if (expectedSignature !== providedSignature) {
    return false;
  }

  try {
    const payload = JSON.parse(textDecoder.decode(base64UrlDecode(encodedPayload)));
    return payload.clientId === clientId && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
