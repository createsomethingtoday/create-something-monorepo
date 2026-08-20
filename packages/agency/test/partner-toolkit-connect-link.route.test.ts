import test from "node:test";
import assert from "node:assert/strict";

import { createPartnerToolkitConnectLinkPostHandler } from "../src/lib/server/partner-toolkit-connect-link-core.ts";

function createFakeDb() {
  const statements: Array<{ sql: string; args: unknown[] }> = [];
  return {
    statements,
    db: {
      prepare(sql: string) {
        return {
          bind(...args: unknown[]) {
            return {
              async run() {
                statements.push({ sql, args });
                return {};
              },
            };
          },
        };
      },
    },
  };
}

test("partner toolkit connect-link route authorizes before issuing a link", async () => {
  const { db, statements } = createFakeDb();
  let authorizeCalls = 0;
  let linkCalls = 0;

  const handler = createPartnerToolkitConnectLinkPostHandler({
    partnerKey: "half-dozen",
    authorizePartnerToolkitAdminAction: async () => {
      authorizeCalls += 1;
      return {
        consent: null,
        reviewStep: null,
        policy: {
          policy_id: "policy.partner-auth-governance.v1",
          decision: "allow",
          evaluation_path: "fallback",
          policy_hash: "hash",
          fallback_used: false,
          rollout_mode: "legacy_enforce",
          canary_percent: 0,
          reason: "allowed",
        },
      };
    },
    getComposioClient: () =>
      ({
        connectedAccounts: {
          link: async (userId: string, authConfigId: string, options?: { callbackUrl?: string }) => {
            linkCalls += 1;
            assert.equal(userId, "wksp_acme");
            assert.equal(authConfigId, "ac_notion");
            assert.equal(options?.callbackUrl, "https://app.example/callback");
            return {
              id: "conn_req_1",
              redirectUrl: "https://composio.example/connect",
            };
          },
        },
        toolkits: {
          authorize: async () => {
            throw new Error("toolkits.authorize should not be used when auth config is present");
          },
        },
      }) as any,
    getPartnerClientBySlug: async () =>
      ({
        id: "client_1",
        slug: "acme",
        display_name: "Acme",
        workspace_account_id: "wksp_acme",
        identity_account_id: "acct_acme",
        identity_user_id: "user_acme",
        identity_tenant_id: "tenant_acme",
        owner_email: "owner@example.com",
        status: "active",
        required_toolkits_json: "[]",
        metadata_json: "{}",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }) as any,
    normalizePartnerSlug: (value: string) => value.trim().toLowerCase(),
    normalizeToolkitSlug: (value: string) => value.trim().toLowerCase(),
    parseJsonObject: (raw?: string | null) => {
      if (!raw) return {};
      return JSON.parse(raw) as Record<string, unknown>;
    },
    randomId: () => "paconn_test",
    requirePartnerAdmin: () => "partner_admin:test",
    resolveAuthConfigId: () => "ac_notion",
    isHttpError: (error): error is { status: number; code: string; message: string } =>
      Boolean(error && typeof error === "object" && "status" in error && "code" in error && "message" in error),
  });

  const response = await handler({
    request: new Request("https://example.com/api/partners/half-dozen/clients/acme/toolkits/notion/connect-link", {
      method: "POST",
      body: JSON.stringify({
        callback_url: "https://app.example/callback",
        metadata: { source: "test" },
      }),
    }),
    params: {
      slug: "Acme",
      toolkit: "Notion",
    },
    platform: {
      env: {
        DB: db,
      },
    },
    url: new URL("https://example.com/api/partners/half-dozen/clients/acme/toolkits/notion/connect-link"),
  } as any);

  assert.equal(response.status, 200);
  assert.equal(authorizeCalls, 1);
  assert.equal(linkCalls, 1);
  assert.equal(statements.length, 1);
  assert.match(statements[0]?.sql ?? "", /INSERT INTO partner_auth_connections/);

  const payload = (await response.json()) as {
    client_slug: string;
    workspace_account_id: string;
    auth_config_id: string;
    connect_link: string;
    policy?: { decision: string };
  };
  assert.equal(payload.client_slug, "acme");
  assert.equal(payload.workspace_account_id, "wksp_acme");
  assert.equal(payload.auth_config_id, "ac_notion");
  assert.equal(payload.connect_link, "https://composio.example/connect");
  assert.equal(payload.policy?.decision, "allow");
});

test("partner toolkit connect-link route surfaces policy failures", async () => {
  const { db } = createFakeDb();

  const handler = createPartnerToolkitConnectLinkPostHandler({
    authorizePartnerToolkitAdminAction: async () => {
      throw { status: 403, code: "policy_blocked", message: "Consent required" };
    },
    partnerKey: "half-dozen",
    getComposioClient: () => ({}) as any,
    getPartnerClientBySlug: async () =>
      ({
        id: "client_1",
        slug: "acme",
        display_name: "Acme",
        workspace_account_id: "wksp_acme",
        identity_account_id: "acct_acme",
        identity_user_id: "user_acme",
        identity_tenant_id: "tenant_acme",
        owner_email: "owner@example.com",
        status: "active",
        required_toolkits_json: "[]",
        metadata_json: "{}",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }) as any,
    normalizePartnerSlug: (value: string) => value.trim().toLowerCase(),
    normalizeToolkitSlug: (value: string) => value.trim().toLowerCase(),
    parseJsonObject: () => ({}),
    randomId: () => "paconn_test",
    requirePartnerAdmin: () => "partner_admin:test",
    resolveAuthConfigId: () => "ac_notion",
    isHttpError: (error): error is { status: number; code: string; message: string } =>
      Boolean(error && typeof error === "object" && "status" in error && "code" in error && "message" in error),
  });

  const response = await handler({
    request: new Request("https://example.com/api/partners/half-dozen/clients/acme/toolkits/notion/connect-link", {
      method: "POST",
    }),
    params: {
      slug: "Acme",
      toolkit: "Notion",
    },
    platform: {
      env: {
        DB: db,
      },
    },
    url: new URL("https://example.com/api/partners/half-dozen/clients/acme/toolkits/notion/connect-link"),
  } as any);

  assert.equal(response.status, 403);
  const payload = (await response.json()) as { error: string; message: string };
  assert.equal(payload.error, "policy_blocked");
  assert.equal(payload.message, "Consent required");
});
