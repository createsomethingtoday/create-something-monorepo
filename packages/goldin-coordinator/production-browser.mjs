import { authenticate } from "./authenticate.mjs";
import { productionProfile } from "./production-profile.mjs";

const reply = (error, status) =>
  Response.json(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
export async function bounded(stream, limit) {
  if (!stream) throw new Error("missing body");
  const reader = stream.getReader(),
    parts = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new Error("body limit");
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const p of parts) {
    bytes.set(p, offset);
    offset += p.length;
  }
  return bytes;
}
// Server-side adapter only. Host owns normal first-party login/HttpOnly cookies.
// A private service binding removes the need for a public coordinator write URL.
export async function invokeProductionCoordinator(request, cookies, env) {
  let p;
  try {
    p = productionProfile(env);
  } catch {
    return reply("production disabled", 503);
  }
  if (!env.COORDINATOR_SERVICE?.fetch || !env.IDENTITY_KEYS?.fetch)
    return reply("production unconfigured", 503);
  if (request.method !== "POST") return reply("method not allowed", 405);
  const url = new URL(request.url);
  if (
    url.origin !== p.appOrigin ||
    url.pathname !== "/api/goldin" ||
    url.search ||
    request.headers.get("Origin") !== p.appOrigin ||
    request.headers.get("Sec-Fetch-Site") !== "same-origin" ||
    request.headers.has("Authorization")
  )
    return reply("forbidden", 403);
  if (request.headers.get("Content-Type") !== "application/json")
    return reply("JSON required", 400);
  const token = cookies.get("cs_access_token");
  try {
    await authenticate(
      new Request(p.coordinatorOrigin, {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      }),
      env,
    );
    const bytes = await bounded(request.body, 65536);
    productionProfile(env); // recheck after a slow request body
    const response = await env.COORDINATOR_SERVICE.fetch(
      new Request(p.coordinatorOrigin + "/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: bytes,
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      }),
    );
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      throw new Error("redirect refused");
    }
    const result = JSON.stringify(
      JSON.parse(
        new TextDecoder().decode(await bounded(response.body, 262144)),
      ),
    );
    if (result.includes(token)) throw new Error("credential echo refused");
    return new Response(result, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (e.message === "unauthenticated") return reply("unauthenticated", 401);
    if (e.message === "forbidden") return reply("forbidden", 403);
    if (e.message === "production promotion unavailable")
      return reply("production disabled", 503);
    return reply("invocation failed; reconcile before retry", 502);
  }
}

// Fetch entry point can be mounted behind an existing supported sign-in host.
// No sign-in, refresh, credential issuance or token-return endpoint is introduced.
export default {
  fetch(request, env) {
    const cookie = request.headers.get("Cookie") || "";
    const matches = cookie
      .split(";")
      .map((x) => x.trim())
      .filter((x) => x.startsWith("cs_access_token="));
    const cookies = {
      get: () =>
        matches.length === 1
          ? matches[0].slice("cs_access_token=".length)
          : undefined,
    };
    return invokeProductionCoordinator(request, cookies, env);
  },
};
