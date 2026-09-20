// Adapted from the Outerfields Stream integration; see docs/source-reconciliation.md.

interface StreamConfig {
  accountId: string;
  apiToken: string;
}

export interface StreamConfigEnv extends Record<string, string | undefined> {
  CLOUDFLARE_ACCOUNT_ID?: string;
  CF_ACCOUNT_ID?: string;
  CLOUDFLARE_STREAM_ACCOUNT_ID?: string;
  CLOUDFLARE_STREAM_API_TOKEN?: string;
  STREAM_API_TOKEN?: string;
  CLOUDFLARE_STREAM_CUSTOMER_CODE?: string;
  STREAM_CUSTOMER_CODE?: string;
  CLOUDFLARE_STREAM_WEBHOOK_SECRET?: string;
  CLOUDFLARE_STREAM_ALLOWED_ORIGINS?: string;
  STREAM_ALLOWED_ORIGINS?: string;
  VIDEO_STREAM_TOKEN_TTL_SECONDS?: string;
}

interface CloudflareApiEnvelope<T> {
  success: boolean;
  errors?: Array<{ code: number; message: string }>;
  messages?: Array<{ code: number; message: string }>;
  result: T;
}

export interface CreateTusDirectUploadInput {
  uploadLength: number;
  fileName?: string;
  creatorId?: string;
  maxDurationSeconds?: number;
  playbackPolicy?: 'private' | 'public';
  meta?: Record<string, string>;
}

export interface CreateTusDirectUploadResult {
  streamUid: string;
  uploadUrl: string;
  expiresAt: number;
}

export interface StreamPlaybackTokenResult {
  token: string;
  expiresAt: number;
}

export interface StreamWebhookPayload {
  uid: string;
  readyToStream?: boolean;
  status?: {
    state?: string;
    errorReasonCode?: string;
    errorReasonText?: string;
  };
  duration?: number;
  size?: number;
  meta?: Record<string, string>;
}

const DIRECT_UPLOAD_MAX_BYTES = 30 * 1024 * 1024 * 1024;
const DEFAULT_TOKEN_TTL_SECONDS = 900;

export function getMaxDirectUploadBytes(): number {
  return DIRECT_UPLOAD_MAX_BYTES;
}

function requireConfig(env: StreamConfigEnv): StreamConfig {
  const accountId =
    env.CLOUDFLARE_ACCOUNT_ID || env.CF_ACCOUNT_ID || env.CLOUDFLARE_STREAM_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_STREAM_API_TOKEN || env.STREAM_API_TOKEN;

  if (!accountId) {
    throw new Error('Missing CLOUDFLARE_ACCOUNT_ID');
  }
  if (!apiToken) {
    throw new Error('Missing CLOUDFLARE_STREAM_API_TOKEN');
  }

  return {
    accountId,
    apiToken
  };
}

function base64Encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64');
}

function normalizeUploadMetadata(input: Record<string, string>): string {
  return Object.entries(input)
    .filter(([, value]) => value.length > 0)
    .map(([key, value]) => `${key} ${base64Encode(value)}`)
    .join(',');
}

function normalizeUploadLocation(location: string): string {
  if (location.startsWith('http://') || location.startsWith('https://')) {
    return location;
  }

  return `https://upload.videodelivery.net${location.startsWith('/') ? '' : '/'}${location}`;
}

async function parseApiJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as CloudflareApiEnvelope<T>;
  if (!response.ok || !payload.success) {
    const messages =
      payload.errors?.map((entry) => entry.message).join(', ') || 'Cloudflare API error';
    throw new Error(messages);
  }
  return payload.result;
}

export function getPlaybackTokenTtlSeconds(env: StreamConfigEnv): number {
  const parsed = Number.parseInt(env.VIDEO_STREAM_TOKEN_TTL_SECONDS || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TOKEN_TTL_SECONDS;
  }
  return parsed;
}

export async function createTusDirectUpload(
  env: StreamConfigEnv,
  input: CreateTusDirectUploadInput
): Promise<CreateTusDirectUploadResult> {
  if (!Number.isFinite(input.uploadLength) || input.uploadLength <= 0) {
    throw new Error('Upload length must be a positive integer');
  }
  if (input.uploadLength > DIRECT_UPLOAD_MAX_BYTES) {
    throw new Error(`Upload exceeds max supported size (${DIRECT_UPLOAD_MAX_BYTES} bytes)`);
  }

  const config = requireConfig(env);
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/stream?direct_user=true`;
  const allowedOrigins = env.CLOUDFLARE_STREAM_ALLOWED_ORIGINS
    ? env.CLOUDFLARE_STREAM_ALLOWED_ORIGINS.split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : env.STREAM_ALLOWED_ORIGINS
      ? env.STREAM_ALLOWED_ORIGINS.split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : [];

  const metadata: Record<string, string> = {
    name: input.fileName || 'CREATE SOMETHING Private upload',
    ...(input.maxDurationSeconds ? { maxdurationseconds: String(input.maxDurationSeconds) } : {}),
    ...(input.playbackPolicy === 'private' ? { requiresignedurls: 'true' } : {}),
    ...(allowedOrigins.length > 0 ? { allowedorigins: JSON.stringify(allowedOrigins) } : {}),
    ...(input.meta || {})
  };

  const response = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Tus-Resumable': '1.0.0',
      'Upload-Length': String(input.uploadLength),
      'Upload-Metadata': normalizeUploadMetadata(metadata),
      ...(input.creatorId ? { 'Upload-Creator': input.creatorId } : {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to initialize Stream direct upload (${response.status}): ${body}`);
  }

  const location = response.headers.get('Location');
  const streamUid = response.headers.get('stream-media-id');
  const expiryHeader = response.headers.get('stream-media-expiry');

  if (!location || !streamUid) {
    throw new Error('Missing Location or stream-media-id in Stream direct upload response');
  }

  const expiresAt = expiryHeader
    ? Math.floor(new Date(expiryHeader).getTime() / 1000)
    : Math.floor(Date.now() / 1000) + 60 * 60;

  return {
    streamUid,
    uploadUrl: normalizeUploadLocation(location),
    expiresAt
  };
}

export async function createStreamPlaybackToken(
  env: StreamConfigEnv,
  streamUid: string,
  expiresAt: number
): Promise<StreamPlaybackTokenResult> {
  const config = requireConfig(env);
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/stream/${streamUid}/token`;
  const result = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ exp: expiresAt })
  });

  const parsed = await parseApiJson<{ token: string }>(result);

  if (!parsed.token) {
    throw new Error('Cloudflare Stream token response was missing token');
  }

  return {
    token: parsed.token,
    expiresAt
  };
}

export function buildSignedHlsUrl(tokenOrCustomerCode: string, maybeToken?: string): string {
  const token = (maybeToken ?? tokenOrCustomerCode).trim();
  return `https://videodelivery.net/${token}/manifest/video.m3u8`;
}
