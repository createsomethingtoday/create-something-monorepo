import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import workerModule from "./index.ts";

const worker = workerModule.default ?? workerModule;

const MCP_URL = "https://exceptions.mcp.createsomething.agency/mcp";
const TEST_KEY = "test-decider-key";

const env = {
  AIRTABLE_API_KEY: "test-airtable-token",
  DECIDERS_JSON: JSON.stringify({
    [TEST_KEY]: {
      name: "Test Operator",
      email: "operator@example.com",
      role: "operator",
    },
  }),
};

async function rpc(method, params) {
  const response = await worker.fetch(
    new Request(MCP_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TEST_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
    env,
  );
  return await response.json();
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("exception-decisions-mcp", () => {
  it("exposes the complete multi-page Exceptions table across every status", async () => {
    let airtableFetchCalls = 0;
    const airtableFetch = async (input) => {
      airtableFetchCalls += 1;
      const url = new URL(String(input));
      if (!url.pathname.endsWith("/tblnbaaIbIulWl0b7")) {
        return new Response("Not found", { status: 404 });
      }

      const offset = url.searchParams.get("offset");
      const records = offset
        ? [
            {
              id: "recRequested",
              fields: {
                fldmJcVJCytD1VY1r: "Requested item",
                fldqVk39RERL1tVPP: ["recVersionC"],
                fldFCAzKDAqw58BF4: ["recAssetC"],
                fld0D5PoJAWhYeHiI: "🆕Requested",
                fldUqjcnkOUO7RRKS: "Guideline",
              },
            },
            {
              id: "recWithdrawn",
              fields: {
                fldmJcVJCytD1VY1r: "Withdrawn item",
                fldqVk39RERL1tVPP: ["recVersionD"],
                fldFCAzKDAqw58BF4: ["recAssetD"],
                fld0D5PoJAWhYeHiI: "🔙Withdrawn",
                fldUqjcnkOUO7RRKS: "Other",
              },
            },
          ]
        : [
            {
              id: "recApproved",
              fields: {
                fldmJcVJCytD1VY1r: "Approved item",
                fldqVk39RERL1tVPP: ["recVersionA"],
                fldFCAzKDAqw58BF4: ["recAssetA"],
                fld0D5PoJAWhYeHiI: "✅Approved",
                fldUqjcnkOUO7RRKS: "Security",
              },
            },
            {
              id: "recDenied",
              fields: {
                fldmJcVJCytD1VY1r: "Denied item",
                fldqVk39RERL1tVPP: ["recVersionB"],
                fldFCAzKDAqw58BF4: ["recAssetB"],
                fld0D5PoJAWhYeHiI: "❌Denied",
                fldUqjcnkOUO7RRKS: "Custom Code / Scopes",
              },
            },
          ];
      return new Response(JSON.stringify({ records, ...(offset ? {} : { offset: "next-page" }) }), {
        headers: { "Content-Type": "application/json" },
      });
    };
    globalThis.fetch = airtableFetch;

    const tools = await rpc("tools/list");
    assert.ok(tools.result?.tools?.map((tool) => tool.name).includes("list_all_exceptions"));

    const call = await rpc("tools/call", {
      name: "list_all_exceptions",
      arguments: {},
    });
    const payload = JSON.parse(call.result?.content?.[0]?.text ?? "{}");

    assert.equal(payload.count, 4);
    assert.equal(payload.total_count, 4);
    assert.deepEqual(payload.counts_all_statuses, {
      "✅Approved": 1,
      "❌Denied": 1,
      "🆕Requested": 1,
      "🔙Withdrawn": 1,
    });
    assert.deepEqual(payload.exception_items.map(({ item_id, asset_id }) => ({ item_id, asset_id })), [
      { item_id: "recRequested", asset_id: "recAssetC" },
      { item_id: "recApproved", asset_id: "recAssetA" },
      { item_id: "recDenied", asset_id: "recAssetB" },
      { item_id: "recWithdrawn", asset_id: "recAssetD" },
    ]);
    assert.equal(airtableFetchCalls, 2);
  });
});
