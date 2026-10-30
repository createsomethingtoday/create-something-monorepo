import { readiness } from "./policy-model.mjs";

const requiredFields = [
  "source",
  "payment",
  "production",
  "delivery",
  "receipt",
];
export function productionProfile(env, actor, now = Date.now()) {
  const fail = () => {
    throw new Error("production promotion unavailable");
  };
  if (env.ENVIRONMENT !== "production" || env.PRODUCTION_ENABLED !== "true")
    fail();
  let p, policies, mappings;
  try {
    p = JSON.parse(env.PRODUCTION_PROFILE || "null");
    policies = JSON.parse(env.OPERATOR_POLICY || "null");
    mappings = JSON.parse(env.NOTION_MAPPINGS || "null");
  } catch {
    fail();
  }
  if (
    p?.version !== 1 ||
    p.status !== "approved" ||
    typeof p.tenant !== "string" ||
    !p.tenant ||
    typeof p.approvedBy !== "string" ||
    !p.approvedBy.trim() ||
    typeof p.evidence !== "string" ||
    !p.evidence.trim() ||
    !Number.isSafeInteger(p.issuedAt) ||
    !Number.isSafeInteger(p.expiresAt) ||
    p.issuedAt > now ||
    p.expiresAt <= now ||
    p.expiresAt <= p.issuedAt ||
    p.expiresAt - p.issuedAt > 86400000 ||
    !readiness(p, now).decisionsComplete ||
    p.intakeMode !== "staff-reviewed" ||
    p.deliveryMode !== "reviewed-no-send" ||
    p.tenant.startsWith("goldin-synthetic") ||
    env.IDENTITY_ISSUER !== "https://id.createsomething.space" ||
    env.IDENTITY_JWKS_URL !==
      "https://id.createsomething.space/.well-known/jwks.json" ||
    env.IDENTITY_AUDIENCE !== "ona-agents"
  )
    fail();
  for (const origin of [p.appOrigin, p.coordinatorOrigin]) {
    try {
      const u = new URL(origin);
      if (
        u.protocol !== "https:" ||
        u.origin !== origin ||
        /goldin-(coordination-test|coordinator-synthetic)/.test(u.hostname)
      )
        fail();
    } catch {
      fail();
    }
  }
  if (
    !policies ||
    !Object.keys(policies).length ||
    Object.values(policies).some(
      (v) =>
        v.tenant !== p.tenant ||
        !Array.isArray(v.roles) ||
        !v.roles.includes("operator") ||
        new Set(v.roles).size !== v.roles.length ||
        v.roles.some(
          (r) => !["operator", "pricing", "integration"].includes(r),
        ),
    )
  )
    fail();
  const m = mappings?.[p.tenant];
  if (
    !m ||
    Object.keys(mappings).length !== 1 ||
    p.notion?.createPolicy !== "existing-only" ||
    m.dataSourceId !== p.notion?.dataSourceId ||
    !m.dataSourceId ||
    Object.keys(m.fields ?? {}).length !== 5 ||
    Object.keys(p.notion.fields ?? {}).length !== 5 ||
    new Set(Object.values(m.fields)).size !== 5 ||
    requiredFields.some(
      (k) =>
        typeof m.fields[k] !== "string" ||
        !m.fields[k] ||
        m.fields[k] !== p.notion.fields[k],
    ) ||
    !Array.isArray(p.prices) ||
    !p.prices.length ||
    p.prices.some(
      (v) =>
        !v?.version ||
        Object.keys(v).some(
          (k) =>
            ![
              "version",
              "currency",
              "kind",
              "unit",
              "deposit",
              "min",
              "max",
              "basis",
              "durationMinutes",
              "bufferBeforeMinutes",
              "bufferAfterMinutes",
            ].includes(k),
        ),
    ) ||
    !Array.isArray(p.staffEmails) ||
    !p.staffEmails.length ||
    p.staffEmails.some(
      (email) =>
        typeof email !== "string" ||
        email !== email.toLowerCase() ||
        !/^[^\s@]+@[^\s@]+$/.test(email),
    ) ||
    !Array.isArray(p.releaseReviewers) ||
    !p.releaseReviewers.length ||
    p.releaseReviewers.some((subject) => !Object.hasOwn(policies, subject)) ||
    new Set(p.prices.map((v) => v.version)).size !== p.prices.length
  )
    fail();
  if (
    actor &&
    (!Object.hasOwn(policies, actor.operator) ||
      actor.tenant !== p.tenant ||
      JSON.stringify(policies[actor.operator].roles) !==
        JSON.stringify(actor.roles))
  )
    fail();
  return p;
}

export function productionCommand(env, actor, command) {
  const p = productionProfile(env, actor);
  if (command.action === "intake")
    throw new Error("staff-reviewed intake required");
  if (
    command.action === "price" &&
    !p.prices.some((price) => sameJson(price, command.price))
  )
    throw new Error("approved catalog required");
  if (
    command.action === "reviewed-intake" &&
    !p.prices.some((v) => v.version === command.input?.booking?.priceVersion)
  )
    throw new Error("approved catalog required");
  if (
    command.action === "event" &&
    command.event?.type === "release_review" &&
    !p.releaseReviewers.includes(actor.operator)
  )
    throw new Error("forbidden");
  if (
    ["get", "event"].includes(command.action) &&
    !command.source?.startsWith("pixieset-supervised:")
  )
    throw new Error("staff-reviewed source required");
  if (command.testFault) throw new Error("test fault disabled");
  return p;
}
function sameJson(a, b) {
  if (
    a === null ||
    b === null ||
    typeof a !== "object" ||
    typeof b !== "object"
  )
    return a === b;
  const keys = Object.keys(a).sort(),
    other = Object.keys(b).sort();
  return (
    JSON.stringify(keys) === JSON.stringify(other) &&
    keys.every((k) => sameJson(a[k], b[k]))
  );
}

export function assertProductionPrice(env, actor, version, stored) {
  const expected = productionProfile(env, actor).prices.find(
    (p) => p.version === version,
  );
  const terms = { ...stored };
  delete terms.approvedBy;
  if (!expected || !sameJson(expected, terms))
    throw new Error("catalog version conflict");
}
