import { test } from "node:test";
import assert from "node:assert/strict";
import { createProjectRegistry } from "../project-registry.mjs";
import { identityFixture } from "./identity-fixture.mjs";
const entry = {
  projectId: "synthetic-maverickx",
  tenant: "maverickx",
  repositoryKey: "synthetic:maverickx",
  previewTargetId: "synthetic-preview-only",
  origins: [
    "https://preview.maverick-x.pages.dev",
    "https://www.maverickx.com",
  ],
  pages: ["/", "/petrox"],
};
test("URL discovers only server-owned scope after cryptographically verified project membership", async () => {
  const f = await identityFixture();
  f.memberships.set("member", { active: true, role: "member" });
  const p = await f.boundary.resolve(f.request(f.token({ sub: "member" })));
  const registry = createProjectRegistry({
    entries: [entry],
    authorizePrincipal: f.boundary.accepts,
  });
  const resolved = registry.resolve(
    "https://PREVIEW.MAVERICK-X.PAGES.DEV:443/petrox",
    p,
  );
  assert.equal(resolved.repositoryKey, entry.repositoryKey);
  assert.equal(resolved.previewTargetId, entry.previewTargetId);
  assert.equal(resolved.credentialAccess, false);
  assert.throws(
    () => registry.resolve(entry.origins[0], { ...p }),
    /project_unavailable/,
  );
  assert.throws(
    () => registry.resolve(entry.origins[0], { ...p, tenant: "other-client" }),
    /project_unavailable/,
  );
  f.memberships.delete("member");
  assert.throws(
    () => registry.resolve(entry.origins[0], p),
    /project_unavailable/,
  );
});
test("unregistered URL, userinfo, network literals, spoofed subdomains, redirects and arbitrary paths are rejected without fetch", async () => {
  const f = await identityFixture();
  const p = await f.boundary.resolve(f.request(f.token()));
  const registry = createProjectRegistry({
    entries: [entry],
    authorizePrincipal: f.boundary.accepts,
  });
  for (const url of [
    "http://preview.maverick-x.pages.dev/",
    "https://preview.maverick-x.pages.dev.evil.invalid/",
    "https://preview.maverick-x.pages.dev@evil.invalid/",
    "https://user:pass@preview.maverick-x.pages.dev/",
    "https://127.0.0.1/",
    "https://[::1]/",
    "https://localhost/",
    "https://169.254.169.254/",
    "https://preview.maverick-x.pages.dev/?redirect=https://evil.invalid",
    "https://preview.maverick-x.pages.dev/#token",
    "https://preview.maverick-x.pages.dev:8443/",
    "https://preview.maverick-x.pages.dev./",
    "https://preview.maverick-x.pages.dev/unknown",
    "https://preview.maverick-x.pages.dev\\@evil.invalid",
  ])
    assert.throws(() => registry.resolve(url, p), /project_unavailable/);
});
test("registry rejects ambiguous origin ownership", () => {
  assert.throws(
    () =>
      createProjectRegistry({
        entries: [entry, { ...entry, tenant: "other-client" }],
        authorizePrincipal: () => true,
      }),
    /ambiguous_project_origin/,
  );
});
