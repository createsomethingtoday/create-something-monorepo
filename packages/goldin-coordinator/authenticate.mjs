import { verifyIdentityToken } from "@create-something/canon/auth/server";
import { syntheticWindow, syntheticActor } from "./synthetic-access.mjs";
const unauthenticated = (check) =>
  Object.assign(new Error("unauthenticated"), { check });
export async function authenticate(request, env) {
  if (
    !env.IDENTITY_ISSUER ||
    !env.IDENTITY_AUDIENCE ||
    !env.IDENTITY_JWKS_URL ||
    !env.OPERATOR_POLICY
  )
    throw new Error("identity unconfigured");
  syntheticWindow(env);
  const issuer = new URL(env.IDENTITY_ISSUER),
    jwks = new URL(env.IDENTITY_JWKS_URL);
  if (issuer.protocol !== "https:" || jwks.origin !== issuer.origin)
    throw new Error("identity unconfigured");
  const token = request.headers
    .get("Authorization")
    ?.match(/^Bearer ([^ ]+)$/)?.[1];
  if (!token || token.length > 8192) throw unauthenticated("credential");
  const identity = await verifyIdentityToken(token, {
    issuer: issuer.href.replace(/\/$/, ""),
    audience: env.IDENTITY_AUDIENCE,
    jwksUrl: jwks.href,
    fetch: async (url) => {
      const identityFetch = env.IDENTITY_KEYS
        ? env.IDENTITY_KEYS.fetch.bind(env.IDENTITY_KEYS)
        : fetch;
      const r = await identityFetch(url, {
        signal: AbortSignal.timeout(5000),
        redirect: "manual",
      });
      if (r.status >= 300 && r.status < 400) {
        await r.body?.cancel();
        throw new Error("identity redirect refused");
      }
      return r;
    },
  });
  if (!identity) throw unauthenticated("verification");
  const now = Math.floor(Date.now() / 1000);
  if (
    token.split(".").length !== 3 ||
    (identity.claims.nbf !== undefined &&
      (!Number.isFinite(identity.claims.nbf) || identity.claims.nbf > now)) ||
    !Number.isFinite(identity.claims.iat) ||
    identity.claims.exp - identity.claims.iat > 900
  )
    throw unauthenticated("lifetime");
  const policy = JSON.parse(env.OPERATOR_POLICY);
  const grant = Object.hasOwn(policy, identity.subject)
    ? policy[identity.subject]
    : null;
  if (
    !grant ||
    typeof grant.tenant !== "string" ||
    !grant.tenant ||
    !Array.isArray(grant.roles) ||
    !grant.roles.includes("operator")
  )
    throw new Error("forbidden");
  const actor = {
    tenant: grant.tenant,
    operator: identity.subject,
    roles: grant.roles,
  };
  syntheticActor(env, actor, identity.email);
  return actor;
}
