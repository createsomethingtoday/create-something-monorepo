import { Data, Effect, Either } from 'effect';
import { LoginError } from './auth.ts';

export type SourceProvider = 'gmail' | 'googlecalendar';
export type ConnectionProvider = SourceProvider | 'instagram';
export interface InstagramAccount {connectedAccountId:string;instagramAccountId:string;username:string;accountType:'BUSINESS'|'MEDIA_CREATOR'|'CREATOR';publishingPermission:'not_verified'}
export interface InstagramPublishInput {requestId:string;connectedAccountId:string;instagramAccountId:string;caption:string;imageUrl:string;expectedImageSha256:string;confirmed:true}
export interface InstagramReceipt {requestId:string;state:'not_published'|'unknown'|'published_unverified'|'published';mediaId?:string;permalink?:string;reason?:string}
export type ConnectionState = 'disconnected' | 'pending' | 'connected' | 'attention';

export interface ConnectionStatus {
  provider: ConnectionProvider;
  state: ConnectionState;
  connectedAccountId?: string;
  scopes?: string[];
  accountLabel?: { kind: 'gmail_address' | 'primary_calendar' | 'instagram_username'; value: string };
  reconnectable?: boolean;
  recovery?: 'operator_review';
}

export interface BeginConnectionResult {
  provider: ConnectionProvider;
  status: 'awaiting_consent' | 'readback_required';
  attemptId: string;
  connectedAccountId?: string;
  url?: string;
  expiresAt?: string;
}

export interface SourceRecord {
  externalId: string;
  kind: 'message' | 'event';
  observedAt: string;
  data: Record<string, unknown>;
}

export interface SourcePage {
  provider: SourceProvider;
  connectedAccountId: string;
  records: SourceRecord[];
  nextCursor: string | null;
}

export class IntegrationError extends Data.TaggedError('IntegrationError')<{
  readonly operation: string;
  readonly reason: 'invalid_configuration' | 'unauthorized' | 'session_expired' | 'access_denied' | 'provider_unavailable' | 'unconfigured' | 'unavailable' | 'invalid_readback' | 'journal_unavailable' | 'link_outcome_unknown' | 'connection_changed' | 'connection_not_found' | 'image_changed' | 'jpeg_required' | 'image_dimensions' | 'media_too_large' | 'media_host_not_allowed' | 'media_staging_unconfigured' | 'publication_conflict' | 'account_changed' | 'account_unsupported' | 'connection_unavailable' | 'caption_limits' | 'invalid_media_url';
  readonly cause?: unknown;
}> {}

export interface BrokerOptions {
  /** The broker verifies this token and derives the owner; callers never supply owner IDs. */
  getAccessToken: () => Promise<string>;
  baseUrl: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface BrokerClient {
  instagramPreview(imageUrl:string,signal?:AbortSignal):Promise<{imageUrl:string;expectedImageSha256:string;width:number;height:number;dataUrl:string}>;
  instagramAccount(connectedAccountId:string,signal?:AbortSignal):Promise<InstagramAccount>;
  publishInstagram(input:InstagramPublishInput,signal?:AbortSignal):Promise<InstagramReceipt>;
  instagramReceipt(requestId:string,signal?:AbortSignal,continueConfirmed?:boolean):Promise<InstagramReceipt>;
  connectionStatus(provider: ConnectionProvider, signal?: AbortSignal): Promise<ConnectionStatus>;
  beginConnection(provider: ConnectionProvider, requestId: string, signal?: AbortSignal): Promise<BeginConnectionResult>;
  reconcileConnection(provider: ConnectionProvider, connectedAccountId: string, signal?: AbortSignal): Promise<ConnectionStatus>;
  readSourcePage(provider: SourceProvider, connectedAccountId: string, cursor?: string, signal?: AbortSignal): Promise<SourcePage>;
}

export function createBrokerClient(options: BrokerOptions): BrokerClient {
  const url = new URL(options.baseUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new IntegrationError({ operation: 'configure', reason: 'invalid_configuration' });
  }
  const request = options.fetch ?? fetch;
  const timeoutMs = Math.min(Math.max(options.timeoutMs ?? 10_000, 1_000), 30_000);

  async function call(path: string, operation: string, method: 'GET' | 'POST', body?: unknown, signal?: AbortSignal): Promise<unknown> {
    const effect = Effect.tryPromise({
      try: async () => {
        const token = await options.getAccessToken();
        if (!token || /[\r\n]/u.test(token)) throw new Error('invalid access token');
        const endpoint = new URL(path, url);
        const requestTimeout = operation === 'instagram_publish' || operation === 'instagram_preview' ? 30_000 : timeoutMs;
        const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(requestTimeout)]) : AbortSignal.timeout(requestTimeout);
        const response = await request(new Request(endpoint, {
          method,
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
          redirect: 'error',
          signal: requestSignal,
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }));
        if (response.status === 401) throw new IntegrationError({ operation, reason: 'session_expired' });
        if (!response.ok) {
          // Only fixed, recognized codes cross the process/UI boundary, never provider text.
          let reason: IntegrationError['reason'] = response.status === 403 ? 'provider_unavailable' : 'unavailable';
          try {
            const failure = await readBoundedJson(response) as { error?: unknown; status?: unknown };
            if (operation.startsWith('instagram_') && ['image_changed','jpeg_required','image_dimensions','media_too_large','media_host_not_allowed','media_staging_unconfigured','publication_conflict','account_changed','account_unsupported','connection_unavailable','caption_limits','invalid_media_url'].includes(String(failure?.error))) reason = failure.error as IntegrationError['reason'];
            else if (response.status === 403 && failure?.error === 'access_denied') reason = 'access_denied';
            else if (response.status === 503 && failure?.error === 'unconfigured') reason = 'unconfigured';
            else if (response.status === 503 && ['provider_unavailable', 'source_unavailable'].includes(String(failure?.error))) reason = 'provider_unavailable';
            else if (response.status === 502 && failure?.error === 'provider_readback_invalid') reason = 'invalid_readback';
            else if (response.status === 503 && operation === 'begin_connection' && failure?.error === 'journal_unavailable') reason = 'journal_unavailable';
            else if (response.status === 409 && operation === 'reconcile_connection' && failure?.error === 'connection_changed') reason = 'connection_changed';
            else if (response.status === 404 && failure?.error === 'not_found' && operation === 'reconcile_connection') reason = 'connection_not_found';
            else if (response.status === 503 && operation === 'begin_connection' && failure?.status === 'readback_required') reason = 'link_outcome_unknown';
          } catch { /* Preserve a safe generic error for malformed diagnostics. */ }
          throw new IntegrationError({ operation, reason });
        }
        const value = await readBoundedJson(response, operation==='instagram_preview'?12*1024*1024:131072);
        return value;
      },
      catch: (cause) => cause instanceof IntegrationError || cause instanceof LoginError ? cause : new IntegrationError({ operation, reason: 'unavailable', cause }),
    });
    const outcome = await Effect.runPromise(Effect.either(effect));
    if (Either.isLeft(outcome)) throw outcome.left;
    return outcome.right;
  }

  return {
    async instagramPreview(imageUrl,signal){
      if(typeof imageUrl!=='string'||imageUrl.length>2048)throw new IntegrationError({operation:'instagram_preview',reason:'invalid_configuration'});
      const wire=await call('/v1/gigi/instagram/preview','instagram_preview','POST',{imageUrl},signal);
      if(!wire||typeof wire!=='object')throw invalidReadback('instagram_preview');const v=wire as Record<string,unknown>;
      if(v.imageUrl!==imageUrl||typeof v.expectedImageSha256!=='string'||!/^[a-f0-9]{64}$/u.test(v.expectedImageSha256)||typeof v.dataUrl!=='string'||!v.dataUrl.startsWith('data:image/jpeg;base64,')||typeof v.width!=='number'||typeof v.height!=='number')throw invalidReadback('instagram_preview');
      const encoded=v.dataUrl.slice('data:image/jpeg;base64,'.length);
      if(!Number.isSafeInteger(v.width)||!Number.isSafeInteger(v.height)||v.width<320||v.height<1||encoded.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/u.test(encoded))throw invalidReadback('instagram_preview');
      const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
      if(bytes.length<4||bytes.length>8*1024*1024)throw invalidReadback('instagram_preview');
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
      if(hash!==v.expectedImageSha256)throw invalidReadback('instagram_preview');
      return {imageUrl,expectedImageSha256:v.expectedImageSha256,width:v.width,height:v.height,dataUrl:v.dataUrl};
    },
    async instagramAccount(connectedAccountId, signal) {
      requireId(connectedAccountId);
      const value = await call(`/v1/gigi/instagram/account?connectedAccountId=${encodeURIComponent(connectedAccountId)}`, 'instagram_account', 'GET', undefined, signal);
      if (!value || typeof value !== 'object') throw invalidReadback('instagram_account');
      const v = value as Record<string,unknown>;
      if(v.connectedAccountId!==connectedAccountId || typeof v.instagramAccountId!=='string'||!/^\d{1,32}$/u.test(v.instagramAccountId)||typeof v.username!=='string'||!/^[A-Za-z0-9._]{1,30}$/u.test(v.username)||!['BUSINESS','MEDIA_CREATOR','CREATOR'].includes(String(v.accountType))||v.publishingPermission!=='not_verified')throw invalidReadback('instagram_account');
      return {connectedAccountId,instagramAccountId:v.instagramAccountId,username:v.username,accountType:v.accountType as InstagramAccount['accountType'],publishingPermission:'not_verified'};
    },
    async publishInstagram(input, signal) {
      requireId(input.requestId);requireId(input.connectedAccountId);
      if(input.confirmed!==true||typeof input.caption!=='string'||input.caption.length>2200)throw new IntegrationError({operation:'instagram_publish',reason:'invalid_configuration'});
      return decodeInstagramReceipt(await call('/v1/gigi/instagram/publish','instagram_publish','POST',input,signal),input.requestId);
    },
    async instagramReceipt(requestId:string, signal?:AbortSignal, continueConfirmed=false) {
      requireId(requestId);
      return decodeInstagramReceipt(await call(`/v1/gigi/instagram/receipts/${encodeURIComponent(requestId)}`,'instagram_receipt',continueConfirmed?'POST':'GET',continueConfirmed?{continueConfirmed:true}:undefined,signal),requestId);
    },
    async connectionStatus(provider, signal) {
      requireProvider(provider);
      const wire = await call(`/v1/gigi/connections/${provider}`, 'connection_status', 'GET', undefined, signal);
      return decodeConnectionStatus(wire, provider);
    },
    async beginConnection(provider, requestId, signal) {
      requireProvider(provider);
      requireId(requestId);
      const wire = await call(`/v1/gigi/connections/${provider}/link`, 'begin_connection', 'POST', { requestId }, signal);
      return decodeBeginConnection(wire, provider);
    },
    async reconcileConnection(provider, connectedAccountId, signal) {
      requireProvider(provider);
      requireId(connectedAccountId);
      const wire = await call(`/v1/gigi/connections/${provider}/${encodeURIComponent(connectedAccountId)}`, 'reconcile_connection', 'GET', undefined, signal);
      const result = decodeConnectionStatus(wire, provider);
      if (result.connectedAccountId !== connectedAccountId) throw invalidReadback('reconcile_connection');
      return result;
    },
    async readSourcePage(provider, connectedAccountId, cursor, signal) {
      requireProvider(provider);
      requireId(connectedAccountId);
      if (cursor !== undefined && (cursor.length > 512 || !/^[A-Za-z0-9._:=-]+$/u.test(cursor))) throw new IntegrationError({ operation: 'read_source_page', reason: 'invalid_configuration' });
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      const wire = await call(`/v1/gigi/sources/${provider}/${encodeURIComponent(connectedAccountId)}/page${query}`, 'read_source_page', 'GET', undefined, signal);
      return decodeSourcePage(wire, provider, connectedAccountId);
    },
  };
}

function requireProvider(provider: ConnectionProvider): void {
  if (provider !== 'gmail' && provider !== 'googlecalendar' && provider !== 'instagram') {
    throw new IntegrationError({ operation: 'provider', reason: 'invalid_configuration' });
  }
}

function requireId(value: string): void {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u.test(value)) {
    throw new IntegrationError({ operation: 'identifier', reason: 'invalid_configuration' });
  }
}

function decodeConnectionStatus(value: unknown, provider: ConnectionProvider): ConnectionStatus {
  if (!value || typeof value !== 'object') throw invalidReadback('connection_status');
  const data = value as Record<string, unknown>;
  if (data.provider !== provider || !['disconnected', 'pending', 'connected', 'attention'].includes(String(data.state))) {
    throw invalidReadback('connection_status');
  }
  if (data.connectedAccountId !== undefined && (typeof data.connectedAccountId !== 'string' || !data.connectedAccountId)) {
    throw invalidReadback('connection_status');
  }
  if (data.state === 'connected' && typeof data.connectedAccountId !== 'string') throw invalidReadback('connection_status');
  if (data.scopes !== undefined && (!Array.isArray(data.scopes) || !data.scopes.every((scope) => typeof scope === 'string'))) {
    throw invalidReadback('connection_status');
  }
  if (data.accountLabel !== undefined) {
    const label = data.accountLabel as Record<string, unknown> | null;
    if (data.state !== 'connected' || !label || typeof label !== 'object' || Array.isArray(label) ||
      label.kind !== (provider === 'instagram' ? 'instagram_username' : provider === 'gmail' ? 'gmail_address' : 'primary_calendar') ||
      typeof label.value !== 'string' || !label.value.trim() || label.value.length > 320 || /[\u0000-\u001f\u007f<>]/u.test(label.value)) throw invalidReadback('connection_status');
  }
  if (data.reconnectable !== undefined && (data.reconnectable !== true || data.state !== 'attention')) throw invalidReadback('connection_status');
  if (data.recovery !== undefined && (data.recovery !== 'operator_review' || data.state !== 'attention')) throw invalidReadback('connection_status');
  return data as unknown as ConnectionStatus;
}

function invalidReadback(operation: string): IntegrationError {
  return new IntegrationError({ operation, reason: 'invalid_readback' });
}

function decodeBeginConnection(value: unknown, provider: ConnectionProvider): BeginConnectionResult {
  if (!value || typeof value !== 'object') throw invalidReadback('begin_connection');
  const data = value as Record<string, unknown>;
  if (data.provider !== provider || !['awaiting_consent', 'readback_required'].includes(String(data.status))) throw invalidReadback('begin_connection');
  requireId(String(data.attemptId ?? ''));
  if (data.status === 'awaiting_consent') {
    if (typeof data.url !== 'string' || typeof data.expiresAt !== 'string' ||
        typeof data.connectedAccountId !== 'string' || !/^ca_[A-Za-z0-9_-]{1,128}$/u.test(data.connectedAccountId)) throw invalidReadback('begin_connection');
    const consent = new URL(data.url);
    if (consent.protocol !== 'https:' || consent.hostname !== 'connect.composio.dev' || consent.port || consent.username || consent.password || consent.hash || data.url.length > 2048 || !Number.isFinite(Date.parse(data.expiresAt)) || Date.parse(data.expiresAt) <= Date.now()) throw invalidReadback('begin_connection');
  }
  return data as unknown as BeginConnectionResult;
}

function decodeSourcePage(value: unknown, provider: SourceProvider, connectedAccountId: string): SourcePage {
  if (!value || typeof value !== 'object') throw invalidReadback('read_source_page');
  const data = value as Record<string, unknown>;
  if (data.provider !== provider || data.connectedAccountId !== connectedAccountId || !Array.isArray(data.records) || data.records.length > 25 ||
    !(data.nextCursor === null || (typeof data.nextCursor === 'string' && data.nextCursor.length <= 512))) throw invalidReadback('read_source_page');
  for (const item of data.records) {
    if (!item || typeof item !== 'object') throw invalidReadback('read_source_page');
    const record = item as Record<string, unknown>;
    if (typeof record.externalId !== 'string' || !record.externalId || !['message', 'event'].includes(String(record.kind)) ||
      typeof record.observedAt !== 'string' || !Number.isFinite(Date.parse(record.observedAt)) ||
      !record.data || typeof record.data !== 'object' || Array.isArray(record.data)) throw invalidReadback('read_source_page');
  }
  return data as unknown as SourcePage;
}

async function readBoundedJson(response: Response, maximumBytes=131072): Promise<unknown> {
  if (!response.body) throw invalidReadback('broker_response');
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > maximumBytes) throw invalidReadback('broker_response');
      parts.push(next.value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw invalidReadback('broker_response'); }
}

function decodeInstagramReceipt(value:unknown,requestId:string):InstagramReceipt {
 if(!value||typeof value!=='object')throw invalidReadback('instagram_receipt');
 const v=value as Record<string,unknown>;
 if(v.requestId!==requestId||!['not_published','unknown','published_unverified','published'].includes(String(v.state)))throw invalidReadback('instagram_receipt');
 if(v.mediaId!==undefined&&(typeof v.mediaId!=='string'||!/^\d{1,32}$/u.test(v.mediaId)))throw invalidReadback('instagram_receipt');
 if(v.state==='published'&&v.mediaId===undefined)throw invalidReadback('instagram_receipt');
 if(v.permalink!==undefined){try{const u=new URL(String(v.permalink));if(u.protocol!=='https:'||u.hostname!=='www.instagram.com'||u.username||u.password||u.port)throw new Error();}catch{throw invalidReadback('instagram_receipt');}}
 if(v.reason!==undefined&&(typeof v.reason!=='string'||! /^[a-z_]{1,100}$/u.test(v.reason)))throw invalidReadback('instagram_receipt');
 return {requestId,state:v.state as InstagramReceipt['state'],...(v.mediaId?{mediaId:v.mediaId as string}:{}),...(v.permalink?{permalink:v.permalink as string}:{}),...(v.reason?{reason:v.reason as string}:{})};
}
