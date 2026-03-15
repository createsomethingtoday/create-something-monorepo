/**
 * Steel.dev REST API Helpers
 *
 * Lightweight wrapper around Steel's REST API for session lifecycle management.
 * Uses standard `fetch()` — works in both Cloudflare Workers and Node.js.
 *
 * Endpoints used:
 *   POST /v1/sessions        — Create a browser session
 *   GET  /v1/sessions/:id    — Get session info
 *   GET  /v1/sessions/:id/context — Get session context (cookies)
 *   DELETE /v1/sessions/:id  — Release a session
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SteelSession {
  id: string;
  status: string;
  websocketUrl: string;
  sessionViewerUrl: string;
  createdAt: string;
  timeout: number;
  /** Present when session was created with persistProfile: true (Steel Profiles API) */
  profileId?: string;
}

export interface SteelSessionContext {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: string;
  }>;
  localStorage?: Record<string, string>;
}

export interface CreateSessionOptions {
  /** Session timeout in milliseconds (default: 15 minutes) */
  timeout?: number;
  /** Session context (cookies, localStorage) to inject */
  sessionContext?: SteelSessionContext;
  /** Steel Profile ID to load a persisted browser profile (cookies, auth). Prefer over sessionContext when set. */
  profileId?: string;
  /** If true, persist this session as a profile after release; response will include profileId. */
  persistProfile?: boolean;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const STEEL_API_BASE = 'https://api.steel.dev/v1';

export class SteelClient {
  constructor(private readonly apiKey: string) {}

  /**
   * Create a new browser session with optional context injection.
   */
  async createSession(options: CreateSessionOptions = {}): Promise<SteelSession> {
    const body: Record<string, unknown> = {
      timeout: options.timeout ?? 15 * 60 * 1000, // 15 minutes
    };

    if (options.profileId) {
      body.profileId = options.profileId;
    }
    if (options.sessionContext) {
      body.sessionContext = options.sessionContext;
    }
    if (options.persistProfile === true) {
      body.persistProfile = true;
    }

    const response = await fetch(`${STEEL_API_BASE}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Steel-Api-Key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Steel create session failed (${response.status}): ${error}`);
    }

    return response.json() as Promise<SteelSession>;
  }

  /**
   * Get info about an existing session.
   */
  async getSession(sessionId: string): Promise<SteelSession> {
    const response = await fetch(`${STEEL_API_BASE}/sessions/${sessionId}`, {
      headers: {
        'Steel-Api-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Steel get session failed (${response.status}): ${error}`);
    }

    return response.json() as Promise<SteelSession>;
  }

  /**
   * Get session context (cookies, localStorage) from an active session.
   */
  async getSessionContext(sessionId: string): Promise<SteelSessionContext> {
    const response = await fetch(`${STEEL_API_BASE}/sessions/${sessionId}/context`, {
      method: 'GET',
      headers: {
        'Steel-Api-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Steel get context failed (${response.status}): ${error}`);
    }

    return response.json() as Promise<SteelSessionContext>;
  }

  /**
   * Release (delete) a browser session.
   */
  async releaseSession(sessionId: string): Promise<void> {
    const response = await fetch(`${STEEL_API_BASE}/sessions/${sessionId}/release`, {
      method: 'POST',
      headers: {
        'Steel-Api-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      // Don't throw on release failures — session may have already expired
      console.error(`Steel release session warning (${response.status}): ${await response.text()}`);
    }
  }

  /**
   * Get the CDP WebSocket URL for connecting to a session.
   */
  getCdpUrl(sessionId: string): string {
    return `wss://connect.steel.dev?apiKey=${this.apiKey}&sessionId=${sessionId}`;
  }
}
