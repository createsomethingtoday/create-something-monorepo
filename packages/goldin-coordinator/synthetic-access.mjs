export const SYNTHETIC_SUBJECT = "synthetic-test-only-operator";
export const SYNTHETIC_TENANT = "goldin-synthetic-20261022";
export function syntheticWindow(env, now = Date.now()) {
  if (env.ENVIRONMENT !== "synthetic") return;
  const start = Date.parse(env.SYNTHETIC_TEST_STARTED_AT),
    end = Date.parse(env.SYNTHETIC_TEST_EXPIRES_AT);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    end - start > 30 * 60 * 1000 ||
    now < start ||
    now >= end
  )
    throw new Error("forbidden");
  if (
    env.IDENTITY_ISSUER !== "https://id.createsomething.space" ||
    env.IDENTITY_JWKS_URL !==
      "https://id.createsomething.space/.well-known/jwks.json" ||
    env.IDENTITY_AUDIENCE !== "ona-agents"
  )
    throw new Error("forbidden");
}
export function syntheticActor(env, actor, email, now = Date.now()) {
  if (env.ENVIRONMENT !== "synthetic") return;
  syntheticWindow(env, now);
  const policy = JSON.parse(env.OPERATOR_POLICY);
  if (
    Object.keys(policy).length !== 1 ||
    !Object.hasOwn(policy, SYNTHETIC_SUBJECT) ||
    actor.operator !== SYNTHETIC_SUBJECT ||
    actor.tenant !== SYNTHETIC_TENANT ||
    !Array.isArray(actor.roles) ||
    !actor.roles.includes("operator") ||
    actor.roles.some(
      (r) => !["operator", "pricing", "integration"].includes(r),
    ) ||
    (email !== undefined && email?.toLowerCase() !== "synthetic.operator@example.test")
  )
    throw new Error("forbidden");
}
