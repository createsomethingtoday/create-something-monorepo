/**
 * DM Delivery Broker
 *
 * Secure one-time package delivery for client onboarding secrets.
 * - Stores only hashed delivery token/code.
 * - Stores encrypted payload ciphertext in D1.
 * - Supports issue -> redeem -> revoke lifecycle with audit events.
 */

interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  ALLOWED_ORIGINS?: string;
  DELIVERY_BASE_URL?: string;
  DELIVERY_ADMIN_TOKEN?: string;
  DELIVERY_ENCRYPTION_KEY?: string;
}

interface IssueRequest {
  client_id?: string;
  payload?: unknown;
  ttl_seconds?: number;
  max_redemptions?: number;
  recipient?: string;
  note?: string;
}

interface RevokeRequest {
  reason?: string;
}

interface DeliveryPackageRow {
  id: string;
  client_id: string;
  code_hash: string;
  payload_ciphertext: string;
  expires_at_epoch: number;
  max_redemptions: number;
  redemption_count: number;
  revoked_at_epoch: number | null;
  last_redeemed_at_epoch: number | null;
  created_by: string | null;
  recipient: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_TTL_SECONDS = 15 * 60;
const MIN_TTL_SECONDS = 60;
const MAX_TTL_SECONDS = 60 * 60;
const MAX_REDEMPTIONS = 5;
const MAX_PAYLOAD_BYTES = 32 * 1024;
const MAX_LIST_LIMIT = 200;

let cachedEncryptionKey: CryptoKey | null = null;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    if (method === "OPTIONS") {
      return cors(new Response(null, { status: 204 }), request, env);
    }

    try {
      const response = await route(request, env, method, path, url);
      return cors(response, request, env);
    } catch (error) {
      console.error("Delivery broker error:", error);
      return cors(
        json(
          {
            error: "internal_error",
            message: "Unexpected server error",
            status: 500,
          },
          500
        ),
        request,
        env
      );
    }
  },
};

async function route(request: Request, env: Env, method: string, path: string, url: URL): Promise<Response> {
  if ((path === "/" || path === "/health") && method === "GET") {
    return json({
      service: "dm-delivery-broker",
      version: "0.1.0",
      status: "healthy",
      now: new Date().toISOString(),
    });
  }

  if (path === "/v1/delivery/issue" && method === "POST") {
    return handleIssue(request, env, url);
  }

  if (path === "/v1/delivery/redeem" && method === "GET") {
    return handleRedeem(request, env, url);
  }

  if (path === "/v1/delivery" && method === "GET") {
    return handleList(request, env, url);
  }

  if (path === "/v1/delivery/events" && method === "GET") {
    return handleListEvents(request, env, url);
  }

  const revokeMatch = path.match(/^\/v1\/delivery\/([^/]+)\/revoke$/);
  if (revokeMatch && method === "POST") {
    return handleRevoke(request, env, revokeMatch[1]);
  }

  const inspectMatch = path.match(/^\/v1\/delivery\/([^/]+)$/);
  if (inspectMatch && method === "GET") {
    return handleInspect(request, env, inspectMatch[1]);
  }

  return json({ error: "not_found", message: "Endpoint not found", status: 404 }, 404);
}

async function handleIssue(request: Request, env: Env, url: URL): Promise<Response> {
  const operator = requireOperator(request, env);
  if (operator.error) return operator.error;

  const body = await parseJSON<IssueRequest>(request);
  if (!body) {
    return json({ error: "invalid_request", message: "Invalid JSON body", status: 400 }, 400);
  }

  if (!isPlainObject(body.payload)) {
    return json({ error: "invalid_request", message: "`payload` object is required", status: 400 }, 400);
  }

  const clientId = sanitizeClientId(body.client_id);
  if (!clientId) {
    return json(
      {
        error: "invalid_request",
        message: "`client_id` is required (lowercase letters, numbers, hyphen, underscore)",
        status: 400,
      },
      400
    );
  }

  const payloadJson = JSON.stringify(body.payload);
  const payloadBytes = new TextEncoder().encode(payloadJson);
  if (payloadBytes.byteLength > MAX_PAYLOAD_BYTES) {
    return json(
      {
        error: "payload_too_large",
        message: `Payload exceeds ${MAX_PAYLOAD_BYTES} bytes`,
        status: 413,
      },
      413
    );
  }

  const ttlSeconds = clampInt(body.ttl_seconds, DEFAULT_TTL_SECONDS, MIN_TTL_SECONDS, MAX_TTL_SECONDS);
  const maxRedemptions = clampInt(body.max_redemptions, 1, 1, MAX_REDEMPTIONS);
  const expiresAtEpoch = Math.floor(Date.now() / 1000) + ttlSeconds;

  const deliveryId = `dlv_${randomBase64Url(12)}`;
  const deliveryToken = randomBase64Url(32);
  const deliveryCode = randomCode(12);

  const tokenHash = await sha256Hex(deliveryToken);
  const codeHash = await sha256Hex(deliveryCode);
  const encryptedPayload = await encryptPayload(body.payload, env);
  const note = truncate(body.note, 500);
  const recipient = truncate(body.recipient, 255);

  await env.DB.prepare(
    `
      INSERT INTO delivery_packages (
        id, client_id, token_hash, code_hash, payload_ciphertext, expires_at_epoch,
        max_redemptions, redemption_count, created_by, recipient, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `
  )
    .bind(
      deliveryId,
      clientId,
      tokenHash,
      codeHash,
      encryptedPayload,
      expiresAtEpoch,
      maxRedemptions,
      operator.actorId,
      recipient,
      note
    )
    .run();

  await createDeliveryEvent(env, {
    packageId: deliveryId,
    clientId,
    eventType: "issued",
    actorType: "operator",
    actorId: operator.actorId,
    request,
    metadata: {
      client_id: clientId,
      ttl_seconds: ttlSeconds,
      max_redemptions: maxRedemptions,
      recipient: recipient ?? null,
      note: note ?? null,
    },
  });

  const baseUrl = env.DELIVERY_BASE_URL?.trim() || url.origin;
  const deliveryUrl = `${baseUrl}/v1/delivery/redeem?token=${encodeURIComponent(deliveryToken)}`;

  return noStore(
    json(
      {
        delivery_id: deliveryId,
        client_id: clientId,
        delivery_url: deliveryUrl,
        delivery_code: deliveryCode,
        expires_at: new Date(expiresAtEpoch * 1000).toISOString(),
        ttl_seconds: ttlSeconds,
        max_redemptions: maxRedemptions,
      },
      201
    )
  );
}

async function handleRedeem(request: Request, env: Env, url: URL): Promise<Response> {
  const deliveryToken = url.searchParams.get("token")?.trim();
  const deliveryCode = request.headers.get("X-Delivery-Code")?.trim();

  if (!deliveryToken || !deliveryCode) {
    return json(
      {
        error: "invalid_request",
        message: "Both token query param and X-Delivery-Code header are required",
        status: 400,
      },
      400
    );
  }

  const tokenHash = await sha256Hex(deliveryToken);
  const row = await env.DB.prepare(
    `
      SELECT
        id, client_id, code_hash, payload_ciphertext, expires_at_epoch, max_redemptions,
        redemption_count, revoked_at_epoch, last_redeemed_at_epoch, created_by,
        recipient, note, created_at, updated_at
      FROM delivery_packages
      WHERE token_hash = ?
      LIMIT 1
    `
  )
    .bind(tokenHash)
    .first<DeliveryPackageRow>();

  if (!row) {
    await createDeliveryEvent(env, {
      packageId: null,
      clientId: null,
      eventType: "redeem_failed_unknown_token",
      actorType: "client",
      actorId: null,
      request,
      metadata: null,
    });
    return json({ error: "not_found", message: "Delivery package not found", status: 404 }, 404);
  }

  const nowEpoch = Math.floor(Date.now() / 1000);
  if (row.revoked_at_epoch) {
    return json({ error: "revoked", message: "Delivery package has been revoked", status: 410 }, 410);
  }
  if (row.expires_at_epoch <= nowEpoch) {
    return json({ error: "expired", message: "Delivery package has expired", status: 410 }, 410);
  }
  if (row.redemption_count >= row.max_redemptions) {
    return json({ error: "already_redeemed", message: "Delivery package already redeemed", status: 410 }, 410);
  }

  const codeHash = await sha256Hex(deliveryCode);
  if (!constantTimeEqual(codeHash, row.code_hash)) {
    await createDeliveryEvent(env, {
      packageId: row.id,
      clientId: row.client_id,
      eventType: "redeem_failed_bad_code",
      actorType: "client",
      actorId: null,
      request,
      metadata: null,
    });
    return json({ error: "unauthorized", message: "Invalid delivery code", status: 401 }, 401);
  }

  const updateResult = await env.DB.prepare(
    `
      UPDATE delivery_packages
      SET
        redemption_count = redemption_count + 1,
        last_redeemed_at_epoch = ?,
        updated_at = datetime('now')
      WHERE
        id = ?
        AND revoked_at_epoch IS NULL
        AND expires_at_epoch > unixepoch('now')
        AND redemption_count < max_redemptions
    `
  )
    .bind(nowEpoch, row.id)
    .run();

  const updated = (updateResult.meta?.changes ?? 0) > 0;
  if (!updated) {
    return json({ error: "conflict", message: "Delivery package cannot be redeemed", status: 409 }, 409);
  }

  const payload = await decryptPayload(row.payload_ciphertext, env);
  const remainingRedemptions = Math.max(0, row.max_redemptions - (row.redemption_count + 1));

  await createDeliveryEvent(env, {
    packageId: row.id,
    clientId: row.client_id,
    eventType: "redeemed",
    actorType: "client",
    actorId: null,
    request,
    metadata: {
      remaining_redemptions: remainingRedemptions,
    },
  });

  return noStore(
    json({
      delivery_id: row.id,
      client_id: row.client_id,
      expires_at: new Date(row.expires_at_epoch * 1000).toISOString(),
      remaining_redemptions: remainingRedemptions,
      payload,
    })
  );
}

async function handleRevoke(request: Request, env: Env, deliveryId: string): Promise<Response> {
  const operator = requireOperator(request, env);
  if (operator.error) return operator.error;

  const body = await parseJSON<RevokeRequest>(request);
  const reason = truncate(body?.reason, 500);

  const revokeResult = await env.DB.prepare(
    `
      UPDATE delivery_packages
      SET
        revoked_at_epoch = unixepoch('now'),
        updated_at = datetime('now')
      WHERE id = ? AND revoked_at_epoch IS NULL
    `
  )
    .bind(deliveryId)
    .run();

  const row = await env.DB.prepare("SELECT id, client_id, revoked_at_epoch FROM delivery_packages WHERE id = ? LIMIT 1")
    .bind(deliveryId)
    .first<{ id: string; client_id: string; revoked_at_epoch: number | null }>();

  const changed = revokeResult.meta?.changes ?? 0;
  if (!changed) {
    if (!row) {
      return json({ error: "not_found", message: "Delivery package not found", status: 404 }, 404);
    }
    return json({ error: "already_revoked", message: "Delivery package already revoked", status: 409 }, 409);
  }

  await createDeliveryEvent(env, {
    packageId: deliveryId,
    clientId: row?.client_id ?? null,
    eventType: "revoked",
    actorType: "operator",
    actorId: operator.actorId,
    request,
    metadata: {
      reason: reason ?? null,
    },
  });

  return json({
    success: true,
    delivery_id: deliveryId,
    client_id: row?.client_id ?? null,
    revoked_at: new Date().toISOString(),
  });
}

async function handleInspect(request: Request, env: Env, deliveryId: string): Promise<Response> {
  const operator = requireOperator(request, env);
  if (operator.error) return operator.error;

  const row = await env.DB.prepare(
    `
      SELECT
        id,
        client_id,
        expires_at_epoch,
        max_redemptions,
        redemption_count,
        revoked_at_epoch,
        last_redeemed_at_epoch,
        created_by,
        recipient,
        note,
        created_at,
        updated_at
      FROM delivery_packages
      WHERE id = ?
      LIMIT 1
    `
  )
    .bind(deliveryId)
    .first<{
      id: string;
      client_id: string;
      expires_at_epoch: number;
      max_redemptions: number;
      redemption_count: number;
      revoked_at_epoch: number | null;
      last_redeemed_at_epoch: number | null;
      created_by: string | null;
      recipient: string | null;
      note: string | null;
      created_at: string;
      updated_at: string;
    }>();

  if (!row) {
    return json({ error: "not_found", message: "Delivery package not found", status: 404 }, 404);
  }

  return json({
    delivery_id: row.id,
    client_id: row.client_id,
    expires_at: new Date(row.expires_at_epoch * 1000).toISOString(),
    max_redemptions: row.max_redemptions,
    redemption_count: row.redemption_count,
    revoked: Boolean(row.revoked_at_epoch),
    revoked_at: row.revoked_at_epoch ? new Date(row.revoked_at_epoch * 1000).toISOString() : null,
    last_redeemed_at: row.last_redeemed_at_epoch ? new Date(row.last_redeemed_at_epoch * 1000).toISOString() : null,
    created_by: row.created_by,
    recipient: row.recipient,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
    active:
      !row.revoked_at_epoch &&
      row.expires_at_epoch > Math.floor(Date.now() / 1000) &&
      row.redemption_count < row.max_redemptions,
  });
}

async function handleList(request: Request, env: Env, url: URL): Promise<Response> {
  const operator = requireOperator(request, env);
  if (operator.error) return operator.error;

  const rawClientId = url.searchParams.get("client_id");
  const clientId = rawClientId ? sanitizeClientId(rawClientId) : null;
  if (rawClientId && !clientId) {
    return json({ error: "invalid_request", message: "Invalid client_id", status: 400 }, 400);
  }

  const status = url.searchParams.get("status")?.trim().toLowerCase() || "active";
  if (!["active", "all", "revoked", "expired"].includes(status)) {
    return json({ error: "invalid_request", message: "status must be one of: active, all, revoked, expired", status: 400 }, 400);
  }

  const limit = clampInt(parseInt(url.searchParams.get("limit") || "", 10), 50, 1, MAX_LIST_LIMIT);

  const where: string[] = [];
  const binds: unknown[] = [];

  if (clientId) {
    where.push("client_id = ?");
    binds.push(clientId);
  }

  if (status === "active") {
    where.push("revoked_at_epoch IS NULL");
    where.push("expires_at_epoch > unixepoch('now')");
    where.push("redemption_count < max_redemptions");
  } else if (status === "revoked") {
    where.push("revoked_at_epoch IS NOT NULL");
  } else if (status === "expired") {
    where.push("expires_at_epoch <= unixepoch('now')");
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const sql = `
    SELECT
      id,
      client_id,
      expires_at_epoch,
      max_redemptions,
      redemption_count,
      revoked_at_epoch,
      last_redeemed_at_epoch,
      created_by,
      recipient,
      note,
      created_at,
      updated_at
    FROM delivery_packages
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ?
  `;

  binds.push(limit);
  const rowsResult = await env.DB.prepare(sql).bind(...binds).all<{
    id: string;
    client_id: string;
    expires_at_epoch: number;
    max_redemptions: number;
    redemption_count: number;
    revoked_at_epoch: number | null;
    last_redeemed_at_epoch: number | null;
    created_by: string | null;
    recipient: string | null;
    note: string | null;
    created_at: string;
    updated_at: string;
  }>();

  const packages = (rowsResult.results || []).map((row) => ({
    delivery_id: row.id,
    client_id: row.client_id,
    expires_at: new Date(row.expires_at_epoch * 1000).toISOString(),
    max_redemptions: row.max_redemptions,
    redemption_count: row.redemption_count,
    revoked: Boolean(row.revoked_at_epoch),
    revoked_at: row.revoked_at_epoch ? new Date(row.revoked_at_epoch * 1000).toISOString() : null,
    last_redeemed_at: row.last_redeemed_at_epoch ? new Date(row.last_redeemed_at_epoch * 1000).toISOString() : null,
    created_by: row.created_by,
    recipient: row.recipient,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
    active:
      !row.revoked_at_epoch &&
      row.expires_at_epoch > Math.floor(Date.now() / 1000) &&
      row.redemption_count < row.max_redemptions,
  }));

  return json({
    count: packages.length,
    filters: {
      client_id: clientId,
      status,
      limit,
    },
    packages,
  });
}

async function handleListEvents(request: Request, env: Env, url: URL): Promise<Response> {
  const operator = requireOperator(request, env);
  if (operator.error) return operator.error;

  const rawClientId = url.searchParams.get("client_id");
  const clientId = rawClientId ? sanitizeClientId(rawClientId) : null;
  if (rawClientId && !clientId) {
    return json({ error: "invalid_request", message: "Invalid client_id", status: 400 }, 400);
  }

  const deliveryId = url.searchParams.get("delivery_id")?.trim() || null;
  const limit = clampInt(parseInt(url.searchParams.get("limit") || "", 10), 100, 1, MAX_LIST_LIMIT);

  const where: string[] = [];
  const binds: unknown[] = [];

  if (deliveryId) {
    where.push("package_id = ?");
    binds.push(deliveryId);
  }
  if (clientId) {
    where.push("client_id = ?");
    binds.push(clientId);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const sql = `
    SELECT id, package_id, client_id, event_type, actor_type, actor_id, ip, user_agent, metadata_json, created_at
    FROM delivery_events
    ${whereSql}
    ORDER BY id DESC
    LIMIT ?
  `;

  binds.push(limit);
  const rowsResult = await env.DB.prepare(sql).bind(...binds).all<{
    id: number;
    package_id: string | null;
    client_id: string | null;
    event_type: string;
    actor_type: string;
    actor_id: string | null;
    ip: string | null;
    user_agent: string | null;
    metadata_json: string | null;
    created_at: string;
  }>();

  const events = (rowsResult.results || []).map((row) => ({
    id: row.id,
    delivery_id: row.package_id,
    client_id: row.client_id,
    event_type: row.event_type,
    actor_type: row.actor_type,
    actor_id: row.actor_id,
    ip: row.ip,
    user_agent: row.user_agent,
    metadata: parseMaybeJson(row.metadata_json),
    created_at: row.created_at,
  }));

  return json({
    count: events.length,
    filters: {
      client_id: clientId,
      delivery_id: deliveryId,
      limit,
    },
    events,
  });
}

function requireOperator(request: Request, env: Env): { actorId: string; error?: undefined } | { actorId?: undefined; error: Response } {
  const configuredToken = env.DELIVERY_ADMIN_TOKEN?.trim();
  if (!configuredToken) {
    return {
      error: json(
        {
          error: "misconfigured",
          message: "DELIVERY_ADMIN_TOKEN is not configured",
          status: 503,
        },
        503
      ),
    };
  }

  const suppliedToken = extractBearerToken(request.headers.get("Authorization"));
  if (!suppliedToken || !constantTimeEqual(configuredToken, suppliedToken)) {
    return {
      error: json(
        {
          error: "unauthorized",
          message: "Missing or invalid bearer token",
          status: 401,
        },
        401
      ),
    };
  }

  const actorId = request.headers.get("X-Operator-Id")?.trim() || "operator";
  return { actorId };
}

async function createDeliveryEvent(
  env: Env,
  options: {
    packageId: string | null;
    clientId: string | null;
    eventType: string;
    actorType: "operator" | "client" | "system";
    actorId: string | null;
    request: Request;
    metadata: unknown;
  }
): Promise<void> {
  const ip = requestIp(options.request);
  const userAgent = options.request.headers.get("User-Agent");
  const metadataJson = options.metadata == null ? null : JSON.stringify(options.metadata);

  await env.DB.prepare(
    `
      INSERT INTO delivery_events (
        package_id, client_id, event_type, actor_type, actor_id, ip, user_agent, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
  )
    .bind(
      options.packageId,
      options.clientId,
      options.eventType,
      options.actorType,
      options.actorId,
      ip,
      userAgent,
      metadataJson
    )
    .run();
}

async function getEncryptionKey(env: Env): Promise<CryptoKey> {
  if (cachedEncryptionKey) return cachedEncryptionKey;

  const encodedKey = env.DELIVERY_ENCRYPTION_KEY?.trim();
  if (!encodedKey) {
    throw new Error("DELIVERY_ENCRYPTION_KEY is not configured");
  }

  const rawKey = decodeBase64Flexible(encodedKey);
  if (rawKey.length !== 32) {
    throw new Error("DELIVERY_ENCRYPTION_KEY must decode to exactly 32 bytes");
  }

  cachedEncryptionKey = await crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
  return cachedEncryptionKey;
}

async function encryptPayload(payload: unknown, env: Env): Promise<string> {
  const key = await getEncryptionKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));

  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const cipherBytes = new Uint8Array(cipherBuffer);
  return `${encodeBase64Url(iv)}.${encodeBase64Url(cipherBytes)}`;
}

async function decryptPayload(ciphertext: string, env: Env): Promise<unknown> {
  const key = await getEncryptionKey(env);
  const [ivEncoded, payloadEncoded] = ciphertext.split(".");
  if (!ivEncoded || !payloadEncoded) {
    throw new Error("Invalid encrypted payload format");
  }

  const iv = decodeBase64Flexible(ivEncoded);
  const payloadBytes = decodeBase64Flexible(payloadEncoded);
  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, payloadBytes);
  const text = new TextDecoder().decode(plainBuffer);
  return JSON.parse(text);
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomBase64Url(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return encodeBase64Url(bytes);
}

function randomCode(length: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Flexible(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function extractBearerToken(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function requestIp(request: Request): string | null {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For");
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function sanitizeClientId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(normalized)) return null;
  return normalized;
}

function truncate(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMaybeJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function cors(response: Response, request: Request, env: Env): Response {
  const allowedOrigins = (env.ALLOWED_ORIGINS?.split(",") || [])
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (env.ENVIRONMENT !== "production") {
    allowedOrigins.push("http://localhost:3000", "http://localhost:5173");
  }

  const requestOrigin = request.headers.get("Origin");
  const headers = new Headers(response.headers);

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    headers.set("Access-Control-Allow-Origin", requestOrigin);
    headers.set("Vary", "Origin");
  }

  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Delivery-Code, X-Operator-Id"
  );
  headers.set("Access-Control-Max-Age", "86400");

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

function noStore(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function parseJSON<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
