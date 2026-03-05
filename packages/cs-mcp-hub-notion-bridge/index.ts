interface Env {
  HUB_UPSTREAM_URL: string;
  HUB_API_TOKEN?: string;
  BRIDGE_BASIC_PASSWORD?: string;
  BRIDGE_API_KEY?: string;
  BRIDGE_DEFAULT_ACCOUNT_ID?: string;
  BRIDGE_SESSION_TOKENS_JSON?: string;
}

const UNAUTHORIZED_HEADERS = {
  "www-authenticate": 'Basic realm="Hub MCP Bridge"',
  "content-type": "application/json; charset=utf-8",
};

const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

type AuthResult =
  | { ok: true; accountId: string; authMode: "basic" | "api_key"; allowClientSessionToken: boolean }
  | { ok: false; status: number; error: string };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const incomingUrl = new URL(request.url);
    if (incomingUrl.pathname !== "/mcp") {
      return json({ error: "Not Found" }, 404);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    const auth = authenticate(request, env);
    if (auth.ok === false) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: UNAUTHORIZED_HEADERS,
      });
    }

    const upstreamUrl = new URL(env.HUB_UPSTREAM_URL);
    upstreamUrl.search = incomingUrl.search;

    const upstreamHeaders = new Headers(request.headers);
    upstreamHeaders.delete("authorization");
    upstreamHeaders.delete("Authorization");
    upstreamHeaders.delete("x-api-key");
    upstreamHeaders.delete("api-key");

    if (env.HUB_API_TOKEN?.trim()) {
      upstreamHeaders.set("Authorization", `Bearer ${env.HUB_API_TOKEN.trim()}`);
    }

    upstreamHeaders.set("x-mcp-account-id", auth.accountId);
    upstreamHeaders.set("x-hub-account-id", auth.accountId);

    const sessionToken =
      resolveSessionToken(auth.accountId, env.BRIDGE_SESSION_TOKENS_JSON) ??
      (auth.allowClientSessionToken
        ? normalizeValue(request.headers.get("x-mcp-session-token"))
        : null);
    if (sessionToken) {
      upstreamHeaders.set("x-mcp-session-token", sessionToken);
    }

    ensureStreamableHttpAcceptHeader(upstreamHeaders);

    const init: RequestInit = {
      method: request.method,
      headers: upstreamHeaders,
      redirect: "manual",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetch(new Request(upstreamUrl.toString(), init));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return json({ error: `Upstream hub request failed: ${message}` }, 502);
    }

    return relayResponse(upstreamResponse);
  },
};

function authenticate(request: Request, env: Env): AuthResult {
  const authorization = normalizeValue(request.headers.get("authorization"));
  if (authorization?.toLowerCase().startsWith("basic ")) {
    const credentials = parseBasicCredentials(authorization);
    if (!credentials) {
      return { ok: false, status: 401, error: "Invalid Basic credentials encoding." };
    }

    const expectedPassword = normalizeValue(env.BRIDGE_BASIC_PASSWORD);
    if (!expectedPassword) {
      return { ok: false, status: 500, error: "Bridge Basic password is not configured." };
    }
    if (!timingSafeEqual(credentials.password, expectedPassword)) {
      return { ok: false, status: 401, error: "Invalid Basic credentials." };
    }

    const accountId = normalizeValue(credentials.username) ?? normalizeValue(env.BRIDGE_DEFAULT_ACCOUNT_ID);
    if (!accountId) {
      return { ok: false, status: 400, error: "Missing account id (use Basic username or default)." };
    }

    return { ok: true, accountId, authMode: "basic", allowClientSessionToken: true };
  }

  const providedApiKey = extractApiKey(request);
  const expectedApiKey = normalizeValue(env.BRIDGE_API_KEY);
  if (expectedApiKey && providedApiKey && timingSafeEqual(providedApiKey, expectedApiKey)) {
    const defaultAccountId = normalizeValue(env.BRIDGE_DEFAULT_ACCOUNT_ID);
    const accountId =
      defaultAccountId ??
      normalizeValue(request.headers.get("x-mcp-account-id")) ??
      normalizeValue(request.headers.get("x-account-id"));
    if (!accountId) {
      return { ok: false, status: 400, error: "Missing account id header and no default account is configured." };
    }
    return {
      ok: true,
      accountId,
      authMode: "api_key",
      allowClientSessionToken: defaultAccountId === null,
    };
  }

  return {
    ok: false,
    status: 401,
    error: "Unauthorized. Use Basic auth or API key accepted by this bridge.",
  };
}

function extractApiKey(request: Request): string | null {
  const fromHeader =
    normalizeValue(request.headers.get("x-api-key")) ??
    normalizeValue(request.headers.get("api-key"));
  if (fromHeader) {
    return fromHeader;
  }

  const authorization = normalizeValue(request.headers.get("authorization"));
  if (!authorization) {
    return null;
  }

  const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
  if (!bearerMatch) {
    return null;
  }
  return normalizeValue(bearerMatch[1]);
}

function parseBasicCredentials(authorization: string): { username: string; password: string } | null {
  const raw = authorization.replace(/^Basic\s+/i, "");
  let decoded: string;
  try {
    decoded = atob(raw);
  } catch {
    return null;
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex < 0) {
    return null;
  }

  const username = decoded.slice(0, separatorIndex).trim();
  const password = decoded.slice(separatorIndex + 1).trim();
  if (!password) {
    return null;
  }

  return { username, password };
}

function resolveSessionToken(accountId: string, rawJson?: string): string | null {
  const source = normalizeValue(rawJson);
  if (!source) {
    return null;
  }

  try {
    const parsed = JSON.parse(source) as Record<string, unknown>;
    const token = parsed[accountId];
    return typeof token === "string" && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

function ensureStreamableHttpAcceptHeader(headers: Headers): void {
  const acceptHeader = headers.get("accept") ?? "";
  const normalizedAccept = acceptHeader.toLowerCase();
  const hasJson = normalizedAccept.includes("application/json");
  const hasEventStream = normalizedAccept.includes("text/event-stream");

  if (hasJson && hasEventStream) {
    return;
  }

  const parts = acceptHeader
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (!hasJson) {
    parts.push("application/json");
  }
  if (!hasEventStream) {
    parts.push("text/event-stream");
  }

  headers.set("Accept", parts.join(", "));
}

function relayResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key] of headers.entries()) {
    if (HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      headers.delete(key);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function normalizeValue(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
