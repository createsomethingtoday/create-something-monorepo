import type { ApplicationAccessState } from '@create-something/canon/auth/access';

const INSTANCE_COOKIE = 'cs_workspace_instance';
const INSTANCE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type CloudflareWorkspaceRouterErrorCode =
  | 'workspace_access_denied'
  | 'workspace_instance_invalid';

export class CloudflareWorkspaceRouterError extends Error {
  constructor(readonly code: CloudflareWorkspaceRouterErrorCode) {
    super(code);
    this.name = 'CloudflareWorkspaceRouterError';
  }
}

export interface CloudflareWorkspaceRoute {
  sandboxId: string;
  setCookie: string | null;
}

export interface CloudflareWorkspaceRouterOptions {
  cookieSecret: string;
  randomUUID?: () => string;
}

function encodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const pair of header.split(';')) {
    const [candidate, ...parts] = pair.trim().split('=');
    if (candidate === name) return parts.join('=') || null;
  }
  return null;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}

function decodeBytes(value: string): Uint8Array | null {
  try {
    const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
    return Uint8Array.from(atob(normalized + padding), (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

export class CloudflareWorkspaceRouter {
  readonly #secret: string;
  readonly #randomUUID: () => string;

  constructor(options: CloudflareWorkspaceRouterOptions) {
    if (new TextEncoder().encode(options.cookieSecret).length < 32) {
      throw new Error('workspace cookie secret must be at least 32 bytes');
    }
    this.#secret = options.cookieSecret;
    this.#randomUUID = options.randomUUID ?? (() => crypto.randomUUID());
  }

  async resolve(input: {
    access: ApplicationAccessState;
    request: Request;
  }): Promise<CloudflareWorkspaceRoute> {
    if (input.access.status !== 'allowed' || !input.access.subject) {
      throw new CloudflareWorkspaceRouterError('workspace_access_denied');
    }

    const rawCookie = parseCookie(input.request.headers.get('cookie'), INSTANCE_COOKIE);
    let instanceId: string;
    let setCookie: string | null = null;

    if (rawCookie) {
      instanceId = await this.#verifyInstanceCookie(rawCookie);
    } else {
      instanceId = this.#randomUUID().toLowerCase();
      if (!INSTANCE_PATTERN.test(instanceId)) {
        throw new CloudflareWorkspaceRouterError('workspace_instance_invalid');
      }
      setCookie = `${INSTANCE_COOKIE}=${await this.#signInstance(instanceId)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`;
    }

    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${input.access.subject}\u0000${instanceId}`)
    );
    const sandboxId = `client-workspace-${Array.from(new Uint8Array(digest))
      .slice(0, 16)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')}`;

    return { sandboxId, setCookie };
  }

  async #signInstance(instanceId: string): Promise<string> {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.#secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(instanceId)
    );
    return `${instanceId}.${encodeBytes(new Uint8Array(signature))}`;
  }

  async #verifyInstanceCookie(value: string): Promise<string> {
    const separator = value.lastIndexOf('.');
    const instanceId = value.slice(0, separator).toLowerCase();
    const supplied = decodeBytes(value.slice(separator + 1));
    if (separator < 0 || !INSTANCE_PATTERN.test(instanceId) || !supplied) {
      throw new CloudflareWorkspaceRouterError('workspace_instance_invalid');
    }
    const expectedValue = await this.#signInstance(instanceId);
    const expected = decodeBytes(expectedValue.slice(expectedValue.lastIndexOf('.') + 1));
    if (!expected || !equalBytes(supplied, expected)) {
      throw new CloudflareWorkspaceRouterError('workspace_instance_invalid');
    }
    return instanceId;
  }
}
