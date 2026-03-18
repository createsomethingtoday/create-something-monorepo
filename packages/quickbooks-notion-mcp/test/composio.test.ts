import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveQuickBooksAuthConfigId,
  selectActiveQuickBooksConnection,
  type ComposioConnectedAccount,
} from "../src/tools/composio.ts";

function makeAccount(id: string, status = "ACTIVE"): ComposioConnectedAccount {
  return {
    id,
    appUniqueId: "quickbooks",
    status,
    connectionParams: {
      access_token: `${id}-access`,
      refresh_token: `${id}-refresh`,
    },
  };
}

test("resolveQuickBooksAuthConfigId trims configured values", () => {
  assert.equal(resolveQuickBooksAuthConfigId("  ac_qbo_123  "), "ac_qbo_123");
  assert.equal(resolveQuickBooksAuthConfigId("   "), null);
  assert.equal(resolveQuickBooksAuthConfigId(undefined), null);
});

test("selectActiveQuickBooksConnection returns the exact connected account when provided", () => {
  const selection = selectActiveQuickBooksConnection([
    makeAccount("conn_old"),
    makeAccount("conn_new"),
  ], {
    connectedAccountId: "conn_new",
  });

  assert.equal(selection.status, 200);
  assert.equal(selection.connection?.id, "conn_new");
});

test("selectActiveQuickBooksConnection rejects ambiguous active connections without a connected account id", () => {
  const selection = selectActiveQuickBooksConnection([
    makeAccount("conn_old"),
    makeAccount("conn_new"),
  ]);

  assert.equal(selection.status, 409);
  assert.match(selection.error ?? "", /Multiple active QuickBooks connections/);
});

test("selectActiveQuickBooksConnection returns the only active QuickBooks connection when unambiguous", () => {
  const selection = selectActiveQuickBooksConnection([
    makeAccount("conn_active"),
    makeAccount("conn_inactive", "DISCONNECTED"),
  ]);

  assert.equal(selection.status, 200);
  assert.equal(selection.connection?.id, "conn_active");
});
