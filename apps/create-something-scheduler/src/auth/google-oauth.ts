import { Temporal } from '@js-temporal/polyfill';
import { z } from 'zod';
import type { Clock } from '../application/booking-service.js';

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
] as const;

export type OAuthStateRecord = {
  state: string;
  expiresAt: string;
};

export type OAuthStateStore = {
  save(record: OAuthStateRecord): Promise<void>;
  consume(state: string, now: string): Promise<boolean>;
};

export type GoogleCredentials = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  grantedScopes: string[];
};

export type GoogleCredentialStore = {
  read(): Promise<GoogleCredentials | null>;
  write(credentials: GoogleCredentials): Promise<void>;
};

export class InMemoryOAuthStateStore implements OAuthStateStore {
  private readonly records = new Map<string, OAuthStateRecord>();

  async save(record: OAuthStateRecord): Promise<void> {
    this.records.set(record.state, record);
  }

  async consume(state: string, now: string): Promise<boolean> {
    const record = this.records.get(state);
    this.records.delete(state);
    if (!record) return false;
    return Temporal.Instant.compare(
      Temporal.Instant.from(now),
      Temporal.Instant.from(record.expiresAt)
    ) < 0;
  }
}

export class InMemoryGoogleCredentialStore implements GoogleCredentialStore {
  private credentials: GoogleCredentials | null = null;

  async read(): Promise<GoogleCredentials | null> {
    return this.credentials ? structuredClone(this.credentials) : null;
  }

  async write(credentials: GoogleCredentials): Promise<void> {
    this.credentials = structuredClone(credentials);
  }
}

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().int().positive(),
  scope: z.string().min(1).optional(),
  token_type: z.string().min(1)
});

export class GoogleOAuthClient {
  private readonly fetch: typeof fetch;
  private readonly randomState: () => string;

  constructor(
    private readonly config: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      clock: Clock;
      states: OAuthStateStore;
      credentials: GoogleCredentialStore;
      fetch?: typeof fetch;
      randomState?: () => string;
    }
  ) {
    this.fetch = config.fetch ?? ((input, init) => globalThis.fetch(input, init));
    this.randomState = config.randomState ?? secureRandomState;
  }

  async createAuthorizationRequest(): Promise<{ url: string; expiresAt: string }> {
    const state = this.randomState();
    const expiresAt = Temporal.Instant.from(this.config.clock.now())
      .add({ minutes: 10 })
      .toString();
    await this.config.states.save({ state, expiresAt });
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: GOOGLE_CALENDAR_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state
    }).toString();
    return { url: url.toString(), expiresAt };
  }

  async exchangeAuthorizationCode(input: {
    code: string;
    state: string;
  }): Promise<
    | { status: 'connected'; expiresAt: string; grantedScopes: string[] }
    | { status: 'rejected' | 'retryable'; reason: string }
  > {
    const now = Temporal.Instant.from(this.config.clock.now()).toString();
    if (!await this.config.states.consume(input.state, now)) {
      return { status: 'rejected', reason: 'invalid_oauth_state' };
    }

    let response: Response;
    try {
      response = await this.fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code: input.code,
          redirect_uri: this.config.redirectUri,
          grant_type: 'authorization_code'
        }).toString()
      });
    } catch {
      return { status: 'retryable', reason: 'oauth_token_unavailable' };
    }
    if (!response.ok) {
      return { status: 'rejected', reason: `oauth_token_http_${response.status}` };
    }
    const parsed = tokenResponseSchema.safeParse(await response.json());
    if (!parsed.success || !parsed.data.refresh_token) {
      return { status: 'rejected', reason: 'oauth_token_invalid_response' };
    }
    const grantedScopes = (parsed.data.scope ?? '').split(/\s+/).filter(Boolean);
    if (!GOOGLE_CALENDAR_SCOPES.every((scope) => grantedScopes.includes(scope))) {
      return { status: 'rejected', reason: 'oauth_required_scope_missing' };
    }
    const expiresAt = Temporal.Instant.from(now)
      .add({ seconds: parsed.data.expires_in })
      .toString();
    await this.config.credentials.write({
      accessToken: parsed.data.access_token,
      refreshToken: parsed.data.refresh_token,
      expiresAt,
      grantedScopes
    });
    return { status: 'connected', expiresAt, grantedScopes };
  }

  async getAccessToken(): Promise<string> {
    const credentials = await this.config.credentials.read();
    if (!credentials) throw new Error('oauth_credentials_missing');
    const now = Temporal.Instant.from(this.config.clock.now());
    const refreshBoundary = now.add({ seconds: 60 });
    if (
      Temporal.Instant.compare(
        Temporal.Instant.from(credentials.expiresAt),
        refreshBoundary
      ) > 0
    ) {
      return credentials.accessToken;
    }

    let response: Response;
    try {
      response = await this.fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: credentials.refreshToken,
          grant_type: 'refresh_token'
        }).toString()
      });
    } catch {
      throw new Error('oauth_refresh_unavailable');
    }
    if (!response.ok) throw new Error(`oauth_refresh_http_${response.status}`);
    const parsed = tokenResponseSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error('oauth_refresh_invalid_response');
    const grantedScopes = parsed.data.scope
      ? parsed.data.scope.split(/\s+/).filter(Boolean)
      : credentials.grantedScopes;
    if (!GOOGLE_CALENDAR_SCOPES.every((scope) => grantedScopes.includes(scope))) {
      throw new Error('oauth_required_scope_missing');
    }
    const expiresAt = now.add({ seconds: parsed.data.expires_in }).toString();
    await this.config.credentials.write({
      accessToken: parsed.data.access_token,
      refreshToken: parsed.data.refresh_token ?? credentials.refreshToken,
      expiresAt,
      grantedScopes
    });
    return parsed.data.access_token;
  }
}

function secureRandomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
