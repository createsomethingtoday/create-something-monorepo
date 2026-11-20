import ipaddr from 'ipaddr.js';

export const MAX_REQUEST_BYTES = 256 * 1024;
export const MAX_RESPONSE_BYTES = 64 * 1024;
export const DEADLINE_MS = 10_000;
export const MAX_ENVELOPE_BYTES = MAX_REQUEST_BYTES * 6 + 16 * 1024;

/** Intentionally contains no URL, address, response body, or provider error. */
export class CallbackTransportError extends Error {
  constructor(code) { super(code); this.name = 'CallbackTransportError'; this.code = code; }
}

export function validateCallback(input) {
  if (typeof input !== 'string' || input.length > 4096 || /[\s\\\u0000-\u001f\u007f]/u.test(input) || input.includes('#') || !input.startsWith('https://')) {
    throw new CallbackTransportError('callback_url_invalid');
  }
  let url;
  try { url = new URL(input); } catch { throw new CallbackTransportError('callback_url_invalid'); }
  const authority = input.slice('https://'.length).split(/[/?]/u, 1)[0];
  const authorityPort = authority.includes(':') ? authority.slice(authority.lastIndexOf(':') + 1) : null;
  const hostname = url.hostname;
  if (url.protocol !== 'https:' || authority.includes('@') || url.username || url.password || url.hash || (authorityPort !== null && authorityPort !== '443') ||
      ipaddr.isValid(hostname.replace(/^\[|\]$/gu, '')) || hostname.length > 253 || hostname.endsWith('.') ||
      !hostname.includes('.') || !hostname.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label)) ||
      /(?:^|\.)(?:localhost|local|localdomain|internal|home|lan|corp|onion|invalid|test|arpa)$/u.test(hostname)) {
    throw new CallbackTransportError('callback_url_invalid');
  }
  return url;
}

/** Fail closed: IPv6 must also be in current global unicast 2000::/3. */
export function assertPublicAddress(address) {
  let parsed;
  try {
    if (typeof address !== 'string' || address.includes('%')) throw new Error();
    parsed = ipaddr.parse(address);
  } catch { throw new CallbackTransportError('callback_address_denied'); }
  const family = parsed.kind() === 'ipv4' ? 4 : 6;
  if (parsed.range() !== 'unicast' || (family === 6 && (
    !parsed.match(ipaddr.parse('2000::'), 3) || parsed.match(ipaddr.parse('3fff::'), 20)
  ))) throw new CallbackTransportError('callback_address_denied');
  return { address: parsed.toString(), family };
}

export function validateHeaders(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CallbackTransportError('callback_headers_invalid');
  const output = {};
  const allowed = new Set(['content-type', 'webhook-id', 'webhook-timestamp', 'webhook-signature', 'x-mcp-subscription-id']);
  for (const [key, value] of Object.entries(input)) {
    const name = key.toLowerCase();
    if (!allowed.has(name) || Object.hasOwn(output, name) || typeof value !== 'string' || value.length < 1 || value.length > 2048 || /[^\x20-\x7e]/u.test(value)) {
      throw new CallbackTransportError('callback_headers_invalid');
    }
    output[name] = value;
  }
  if (!/^application\/json(?:;\s*charset=utf-8)?$/iu.test(output['content-type'] ?? '') ||
      !['webhook-id', 'webhook-timestamp', 'webhook-signature', 'x-mcp-subscription-id'].every(key => Object.hasOwn(output, key))) {
    throw new CallbackTransportError('callback_headers_invalid');
  }
  return output;
}

export function validatePayload(url, body, headers) {
  const endpoint = validateCallback(url);
  if (typeof body !== 'string' || new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) throw new CallbackTransportError('callback_body_too_large');
  return { endpoint, body, headers: validateHeaders(headers) };
}
