import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, it } from "node:test";

import workerModule from "./index.ts";
import rulesetModule from "./ruleset-v1.ts";

// The package has no "type": "module", so tsx loads these .ts files as CJS — read exports off the
// namespace object (same pattern index.test.mjs uses for the default export).
const worker = workerModule.default ?? workerModule;
const runRecommendationPass = workerModule.runRecommendationPass ?? workerModule.default?.runRecommendationPass;
const RULESET_V1 = rulesetModule.RULESET_V1 ?? rulesetModule.default?.RULESET_V1;
const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const AUTOMATION_KEY = "exd_test_automation";
const OPERATOR_KEY = "exd_test_operator";
const VIEWER_KEY = "exd_test_viewer";

const env = {
  AIRTABLE_API_KEY: "test-airtable-token",
  DIFY_RECOMMENDER_COMPLETION_APP_KEY: "app-test-dify",
  DECIDERS_JSON: JSON.stringify({
    [AUTOMATION_KEY]: { name: "Exception Recommendation Automation", email: "micah@webflow.com", role: "automation", surface: "runner" },
    [OPERATOR_KEY]: { name: "Test Operator", email: "operator@example.com", role: "operator" },
    [VIEWER_KEY]: { name: "Demo Viewer", email: "viewer@example.com", role: "viewer" },
  }),
};

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function json(body, init = {}) {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" }, ...init });
}

// A queue with one version and five items covering every guardrail branch.
function makeAirtable({ leans, patches, difyCalls }) {
  const items = {
    recTechNew: { title: "Token in GET URL", type: "Security", status: "🆕Requested", notes: "" },
    recTechRecd: { title: "Already recommended", type: "Security", status: "🆕Requested", notes: "Partner-lead recommendation: DENY — carried" },
    recUnderReview: { title: "Under review already", type: "Guideline", status: "👀Under Review", notes: "" },
    recPricing: { title: "Fee disclosure", type: "Pricing / Billing", status: "🆕Requested", notes: "" },
    recLowConf: { title: "Ambiguous iframe", type: "Custom Code / Scopes", status: "🆕Requested", notes: "" },
    recDecided: { title: "Decided long ago", type: "Security", status: "✅Approved", notes: "" },
  };
  return async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.hostname === "api.dify.ai") {
      const body = JSON.parse(init.body);
      difyCalls.push(body);
      assert.equal(url.pathname, "/v1/completion-messages");
      assert.equal(body.response_mode, "blocking");
      const itemId = body.inputs.prompt.match(/## Item (rec[A-Za-z]+)/)[1];
      const lean = leans[itemId];
      return json({ answer: "```json\n" + JSON.stringify(lean) + "\n```" });
    }
    assert.equal(url.hostname, "api.airtable.com");
    const path = url.pathname.replace("/v0/appMoIgXMTTTNIc3p/", "");
    if (init.method === "PATCH") {
      patches.push({ path, body: JSON.parse(init.body) });
      return json({ records: [] });
    }
    if (path === "tblHxZ2hgSFLZxsZu") {
      return json({
        records: [
          {
            id: "recVersion1",
            fields: {
              fldKA9eJja5uajlok: "Test App v9",
              fldQo0XS9zJp5PifI: "🆕Requested",
              fldiVQqWSw5shDkZS: 5,
              fldzwlnjdAapVFkzp: 0,
              fld8hWsxsAssmFi6u: Object.keys(items),
            },
          },
        ],
      });
    }
    if (path === "tblnbaaIbIulWl0b7") {
      const formula = url.searchParams.get("filterByFormula") ?? "";
      const ids = [...formula.matchAll(/RECORD_ID\(\)='(rec[A-Za-z0-9]+)'/g)].map((m) => m[1]);
      return json({
        records: ids.map((id) => ({
          id,
          fields: {
            fldmJcVJCytD1VY1r: items[id].title,
            fld0D5PoJAWhYeHiI: items[id].status,
            fldUqjcnkOUO7RRKS: items[id].type,
            fldqVk39RERL1tVPP: ["recVersion1"],
          },
        })),
      });
    }
    const one = path.match(/^tblnbaaIbIulWl0b7\/(rec[A-Za-z0-9]+)$/);
    if (one) {
      const item = items[one[1]];
      return json({
        id: one[1],
        fields: {
          fldmJcVJCytD1VY1r: item.title,
          fld0D5PoJAWhYeHiI: item.status,
          fldUqjcnkOUO7RRKS: item.type,
          fldHNABt611HJ6JxI: `Technical finding for ${item.title}. In plain English (test): it leaks. Why it matters: shoppers.`,
          fldZvSg7gpbBw89Hz: item.notes,
          fldqVk39RERL1tVPP: ["recVersion1"],
        },
      });
    }
    return new Response("Not found", { status: 404 });
  };
}

describe("recommendation lane (cron)", () => {
  for (const confidence of ["invalid", "0.9", true, 1.5, -1, null]) {
    it(`rejects malformed confidence ${JSON.stringify(confidence)} without writing`, async () => {
      const patches = [];
      globalThis.fetch = makeAirtable({ patches, difyCalls: [], leans: {
        recTechNew: { recommendation: "approve", confidence, notes: "unsafe confidence" },
        recLowConf: { recommendation: "needs-human", confidence: 0.1, notes: "review" },
      }});
      await runRecommendationPass(env);
      assert.equal(patches.length, 0);
    });
  }

  it("refuses the old tool-enabled agent key even for a dry run", async () => {
    let calls = 0;
    globalThis.fetch = async () => { calls++; throw new Error("No network permitted"); };
    const receipt = await runRecommendationPass({ ...env,
      DIFY_RECOMMENDER_COMPLETION_APP_KEY: undefined,
      DIFY_PARTNER_LEAD_APP_KEY: "legacy-agent-key"
    }, { dryRun: true });
    assert.equal(receipt.mode, "misconfigured");
    assert.equal(calls, 0);
  });

  it("embeds the runbook's Ruleset v1 verbatim", () => {
    const doc = readFileSync(resolve(PKG_DIR, "docs/dify-recommendation-runbook.md"), "utf8");
    const slice = doc.slice(doc.indexOf("## Ruleset v1"), doc.indexOf("## Guardrails")).trim();
    assert.equal(RULESET_V1, slice);
    assert.ok(RULESET_V1.includes("Always NEEDS-HUMAN"));
  });

  it("writes confident technical leans under the automation identity and honors every guardrail", async () => {
    const patches = [];
    const difyCalls = [];
    globalThis.fetch = makeAirtable({
      patches,
      difyCalls,
      leans: {
        recTechNew: { recommendation: "deny", confidence: 0.9, route: null, notes: "A yes means a token rides in URLs. [confidence 0.9]" },
        recLowConf: { recommendation: "approve", confidence: 0.4, route: "Adam", notes: "unsure" },
      },
    });

    const receipt = await runRecommendationPass(env);

    assert.equal(receipt.mode, "write");
    assert.equal(receipt.engine, "dify");
    assert.match(receipt.decider, /Exception Recommendation Automation/);
    // Targets: only 🆕Requested technical items (recTechNew, recTechRecd, recLowConf).
    assert.equal(receipt.targets, 3);
    // Dify is consulted only for items without an existing recommendation.
    assert.deepEqual(
      difyCalls.map((c) => c.inputs.prompt.match(/## Item (rec[A-Za-z]+)/)[1]).sort(),
      ["recLowConf", "recTechNew"],
    );
    assert.ok(difyCalls.every((c) => c.inputs.prompt.includes("ANALYSIS ONLY") && c.inputs.prompt.includes("## Ruleset v1")));
    assert.ok(difyCalls.every((c) => !c.inputs.prompt.includes("Partner-lead recommendation")), "notes must be stripped from the judged detail");

    assert.deepEqual(receipt.written, ["recTechNew — Token in GET URL → DENY (0.9)"]);
    assert.equal(receipt.needs_human.length, 1);
    assert.match(receipt.needs_human[0], /recLowConf .* confidence 0.4, route Adam/);
    assert.ok(receipt.skipped.some((s) => s.startsWith("recTechRecd") && s.includes("already in notes")));
    assert.ok(receipt.skipped.some((s) => s.startsWith("recUnderReview") && s.includes("Under Review")));
    assert.ok(receipt.skipped.some((s) => s.startsWith("recPricing") && s.includes("not the technical lane")));
    assert.ok(!receipt.skipped.some((s) => s.startsWith("recDecided")), "decided items are silently ignored");
    assert.deepEqual(receipt.errors, []);

    // Exactly one Airtable write: the recommendation, as 👀Under Review with the advisory label + attribution.
    assert.equal(patches.length, 1);
    const [patch] = patches;
    assert.equal(patch.path, "tblnbaaIbIulWl0b7");
    const fields = patch.body.records[0].fields;
    assert.equal(patch.body.records[0].id, "recTechNew");
    assert.equal(fields.fld0D5PoJAWhYeHiI, "👀Under Review");
    assert.match(fields.fldZvSg7gpbBw89Hz, /^Automated recommendation \(advisory\): DENY — A yes means/);
    assert.match(fields.fldZvSg7gpbBw89Hz, /Recommendation recorded by Exception Recommendation Automation \(micah@webflow.com\) via exception-decisions-mcp/);
    assert.equal(fields.fldcPJTTphd9MGnjT, undefined, "recommendations never stamp ⚖️Decision By");
  });

  it("fails closed when Dify rejects an agent key on the completion endpoint", async () => {
    const patches = [];
    const endpoints = [];
    const airtable = makeAirtable({ patches, difyCalls: [], leans: {} });
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      if (url.hostname === "api.dify.ai") {
        endpoints.push(url.pathname);
        return json({ code: "app_unavailable" }, { status: 400 });
      }
      return airtable(input, init);
    };
    const receipt = await runRecommendationPass(env, { dryRun: true });
    assert.deepEqual(endpoints, ["/v1/completion-messages", "/v1/completion-messages"]);
    assert.equal(receipt.errors.length, 2);
    assert.equal(patches.length, 0);
    assert.equal(receipt.written.length, 0);
  });

  it("dry run consults the engine but writes nothing", async () => {
    const patches = [];
    const difyCalls = [];
    globalThis.fetch = makeAirtable({
      patches,
      difyCalls,
      leans: {
        recTechNew: { recommendation: "approve", confidence: 0.8, route: null, notes: "Category-inherent." },
        recLowConf: { recommendation: "deny", confidence: 0.95, route: null, notes: "CORS open." },
      },
    });
    const receipt = await runRecommendationPass(env, { dryRun: true, cap: 1 });
    assert.equal(receipt.mode, "dry_run");
    assert.equal(patches.length, 0);
    assert.equal(receipt.written.length, 1);
    assert.match(receipt.written[0], /would write/);
    assert.ok(receipt.skipped.some((s) => s.includes("run cap 1 reached")));
  });

  it("is a no-op when disabled or misconfigured, and never throws out of the cron", async () => {
    globalThis.fetch = async () => {
      throw new Error("must not be called");
    };
    const disabled = await runRecommendationPass({ ...env, RECOMMENDER_DISABLED: "true" });
    assert.equal(disabled.mode, "disabled");

    const noDify = await runRecommendationPass({ ...env, DIFY_RECOMMENDER_COMPLETION_APP_KEY: undefined });
    assert.equal(noDify.mode, "misconfigured");
    assert.match(noDify.errors[0], /DIFY_RECOMMENDER_COMPLETION_APP_KEY missing/);

    const noAutomation = await runRecommendationPass({
      ...env,
      DECIDERS_JSON: JSON.stringify({ [OPERATOR_KEY]: { name: "Op", email: "op@example.com", role: "operator" } }),
    });
    assert.equal(noAutomation.mode, "misconfigured");
    assert.match(noAutomation.errors[0], /no role=automation identity/);

    const logs = [];
    const originalLog = console.log;
    console.log = (line) => logs.push(line);
    try {
      let pending;
      await worker.scheduled({ cron: "30 13 * * 1-5", scheduledTime: Date.now() }, { ...env, RECOMMENDER_DISABLED: "true" }, {
        waitUntil: (p) => {
          pending = p;
        },
      });
      await pending;
    } finally {
      console.log = originalLog;
    }
    const logged = JSON.parse(logs[0]);
    assert.equal(logged.event, "recommendation_pass");
    assert.equal(logged.trigger, "cron");
    assert.equal(logged.mode, "disabled");
  });

  it("exposes POST /runs/recommend to operator and automation keys only", async () => {
    globalThis.fetch = makeAirtable({ patches: [], difyCalls: [], leans: {} });
    const call = (key, body) =>
      worker.fetch(
        new Request("https://exception-decisions-mcp.webflow-inc.workers.dev/runs/recommend", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        { ...env, RECOMMENDER_DISABLED: "true" },
      );

    const viewer = await call(VIEWER_KEY, {});
    assert.equal(viewer.status, 403);
    const anon = await worker.fetch(new Request("https://x/runs/recommend", { method: "POST" }), env);
    assert.equal(anon.status, 401);
    const get = await worker.fetch(new Request("https://x/runs/recommend", { method: "GET", headers: { Authorization: `Bearer ${OPERATOR_KEY}` } }), env);
    assert.equal(get.status, 405);

    const operator = await call(OPERATOR_KEY, { dry_run: true });
    assert.equal(operator.status, 200);
    const payload = await operator.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.receipt.mode, "disabled");

    const automation = await call(AUTOMATION_KEY, {});
    assert.equal(automation.status, 200);
  });

  it("health reports the recommendation lane configuration", async () => {
    const response = await worker.fetch(new Request("https://x/health"), env);
    const body = await response.json();
    assert.equal(body.version, "1.5.1");
    assert.equal(body.configured.recommender, true);
    assert.equal(body.configured.recommender_disabled, false);
  });
});
