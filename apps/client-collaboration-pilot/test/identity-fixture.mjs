import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { generateKeyPairSync, sign, randomUUID } from "node:crypto";
export async function identityFixture() {
  const root = new URL("../../../", import.meta.url);
  const compiled = await build({
    entryPoints: [
      fileURLToPath(new URL("../identity-boundary.ts", import.meta.url)),
    ],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    alias: {
      "@create-something/canon/auth/server": fileURLToPath(
        new URL("packages/canon/src/lib/auth/server.ts", root),
      ),
      "@create-something/auth-platform": fileURLToPath(
        new URL("packages/auth-platform/src/index.ts", root),
      ),
    },
  });
  const { createReviewerBoundary } = await import(
    "data:text/javascript;base64," +
      Buffer.from(compiled.outputFiles[0].text).toString("base64")
  );
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const kid = randomUUID();
  const issuer = "https://identity.fixture.invalid";
  let time = Math.floor(Date.now() / 1000);
  const now = () => time;
  const memberships = new Map([
    ["reviewer", { active: true, role: "reviewer" }],
    ["contributor", { active: true, role: "contributor" }],
  ]);
  const boundary = createReviewerBoundary({
    tenant: "maverickx",
    now,
    membership: (iss, sub, tenant) =>
      iss === issuer && tenant === "maverickx"
        ? memberships.get(sub) || null
        : null,
    verification: {
      issuer,
      audience: "client-workspace",
      jwksUrl: `https://jwks.fixture.invalid/${kid}`,
      fetch: async () =>
        new Response(
          JSON.stringify({
            keys: [
              { ...publicKey.export({ format: "jwk" }), kid, alg: "ES256" },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        ),
    },
  });
  function token(overrides = {}, header = {}) {
    const payload = {
      sub: "reviewer",
      iss: issuer,
      aud: ["client-workspace"],
      iat: time,
      exp: time + 900,
      kind: "identity_access_token",
      session_version: 2,
      email_verified: true,
      ...overrides,
    };
    const encode = (x) => Buffer.from(JSON.stringify(x)).toString("base64url");
    const data =
      encode({ alg: "ES256", kid, ...header }) + "." + encode(payload);
    return (
      data +
      "." +
      sign("sha256", Buffer.from(data), {
        key: privateKey,
        dsaEncoding: "ieee-p1363",
      }).toString("base64url")
    );
  }
  const request = (t) =>
    new Request("http://127.0.0.1/review", {
      headers: {
        authorization: "Bearer " + t,
        "x-role": "reviewer",
        "x-tenant": "maverickx",
      },
    });
  return {
    boundary,
    token,
    request,
    memberships,
    advance: (seconds) => {
      time += seconds;
    },
  };
}
