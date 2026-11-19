import { authenticate } from "./authenticate.mjs";
import {
  syntheticWindow,
  SYNTHETIC_SUBJECT,
  SYNTHETIC_TENANT,
} from "./synthetic-access.mjs";

export const BROWSER_ORIGIN = "https://ona-agent-chat.pages.dev";
export const ISOLATED_ORIGIN = "https://goldin-coordination-test.pages.dev";
export const TARGET =
  "https://goldin-coordinator-synthetic-20261022.createsomething.workers.dev/";
const reply = (error, status, check) =>
  Response.json(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Goldin-Boundary": "browser-adapter",
        ...(check && { "X-Goldin-Auth-Check": check }),
        "X-Content-Type-Options": "nosniff",
      },
    },
  );

async function boundedBytes(body, limit) {
  const reader = body?.getReader();
  if (!reader) throw new Error("body required");
  const parts = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new Error("body too large");
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

// Only the host server reads its existing HttpOnly cookie. Never return or persist it.
export async function invokeSyntheticCoordinator(
  request,
  cookies,
  env,
  identityFetch = globalThis.fetch,
  expectedOrigin = BROWSER_ORIGIN,
) {
  if (env.GOLDIN_SYNTHETIC_ENABLED !== "true")
    return reply("test disabled", 503);
  if (request.method !== "POST") return reply("method not allowed", 405);
  if (
    ![BROWSER_ORIGIN, ISOLATED_ORIGIN].includes(expectedOrigin) ||
    new URL(request.url).origin !== expectedOrigin ||
    request.headers.get("Origin") !== expectedOrigin ||
    request.headers.get("Sec-Fetch-Site") !== "same-origin" ||
    request.headers.has("Authorization")
  )
    return reply("forbidden", 403);
  if (request.headers.get("Content-Type") !== "application/json")
    return reply("JSON required", 400);
  const authEnv = {
    IDENTITY_KEYS: { fetch: identityFetch },
    ENVIRONMENT: "synthetic",
    IDENTITY_ISSUER: "https://id.createsomething.space",
    IDENTITY_JWKS_URL: "https://id.createsomething.space/.well-known/jwks.json",
    IDENTITY_AUDIENCE: "ona-agents",
    OPERATOR_POLICY: JSON.stringify({
      [SYNTHETIC_SUBJECT]: {
        tenant: SYNTHETIC_TENANT,
        roles: ["operator", "pricing", "integration"],
      },
    }),
    SYNTHETIC_TEST_STARTED_AT: env.GOLDIN_SYNTHETIC_STARTED_AT,
    SYNTHETIC_TEST_EXPIRES_AT: env.GOLDIN_SYNTHETIC_EXPIRES_AT,
  };
  try {
    const token = cookies.get("cs_access_token");
    await authenticate(
      new Request(TARGET, {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      }),
      authEnv,
    );
    // Bound streamed bodies before forwarding; no automatic retries for mutations.
    let bytes;
    try {
      bytes = await boundedBytes(request.body, 65536);
    } catch {
      return reply("invalid request body", 400);
    }
    syntheticWindow(authEnv);
    // A fixed upstream URL, fresh headers and no redirects prevent credential forwarding.
    const upstream = await fetch(TARGET, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: bytes,
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    if (upstream.status >= 300 && upstream.status < 400) {
      await upstream.body?.cancel();
      return reply("upstream redirect refused; reconcile before retry", 502);
    }
    // Return only parsed coordinator JSON, never upstream cookies/headers or token text.
    const data = new TextDecoder().decode(
      await boundedBytes(upstream.body, 262144),
    );
    const normalized = JSON.stringify(JSON.parse(data));
    if (normalized.includes(token))
      return reply("invalid upstream response", 502);
    return new Response(normalized, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Goldin-Boundary": "coordinator",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error.message === "forbidden") return reply("forbidden", 403);
    if (error.message === "unauthenticated")
      return reply(
        "unauthenticated",
        401,
        ["credential", "verification", "lifetime"].includes(error.check)
          ? error.check
          : undefined,
      );
    return reply("invocation failed; reconcile before retry", 502);
  }
}
