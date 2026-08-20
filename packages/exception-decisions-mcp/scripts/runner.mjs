#!/usr/bin/env node
// Exception recommendation runner — the automation lane of the app-review exceptions loop.
// See docs/dify-recommendation-runbook.md for the operating rules this implements.
//
// Modes:
//   node scripts/runner.mjs                       # dry run, leans from Dify (needs DIFY_RECOMMENDER_APP_KEY)
//   node scripts/runner.mjs --leans <file.json>   # dry run, leans from a reviewed leans file
//   node scripts/runner.mjs --leans <f> --write   # record recommendations via the MCP
//   node scripts/runner.mjs --leans <f> --decide --write
//       # record item-level DENY DECISIONS (deny-only) on items that already carry this
//       # automation's own "Automated recommendation (advisory): DENY" note. Never approves,
//       # never touches items with a conflicting human recommendation, never acts at the
//       # version level — the release that emails the developer stays a person's command.
//
// Flags: --write            actually write (default is dry run)
//        --decide           decision mode (deny-only; requires --leans)
//        --leans <path>     use a leans file (schema: docs/shadow-leans-2026-08-18.json) instead of Dify
//        --cap <n>          max writes per run (default 25)
//        --skip <rec,rec>   extra item ids to leave alone
//
// Identity: reads the role=automation key from .deciders.local.json (or RECOMMENDER_MCP_KEY env).
// The MCP enforces the hard guarantees server-side: automation keys cannot decide, and
// already-decided items refuse writes. This runner adds the soft guarantees: skip items that
// already carry any recommendation, only technical types, confidence >= 0.7, capped volume.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MCP_URL = process.env.EXCEPTIONS_MCP_URL ?? "https://exceptions.mcp.createsomething.agency/mcp";
const DIFY_URL = process.env.DIFY_API_URL ?? "https://api.dify.ai/v1/workflows/run";
const TECH_TYPES = new Set(["Security", "Custom Code / Scopes", "Guideline"]);
const CONFIDENCE_FLOOR = 0.7;

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : null;
};

const WRITE = flag("write");
const DECIDE = flag("decide");
const CAP = Number(opt("cap") ?? 25);
const SKIP = new Set((opt("skip") ?? "").split(",").map((s) => s.trim()).filter(Boolean));
const LEANS_PATH = opt("leans");
if (DECIDE && !LEANS_PATH) {
  console.error("--decide requires --leans <file>: decisions only execute against a reviewed leans file.");
  process.exit(1);
}

// Note style follows the humanizer pass (blader/humanizer): short sentences, no em dashes,
// concrete subjects. These notes post to Slack where non-engineers read them.
const DECISION_NOTE =
  "Automated decision (deny-only): the guideline stands and the fix is required. The rationale is in the advisory " +
  "recommendation above. A person can still grant an exception by setting this item ✅Approved before release. " +
  "Sending anything to the developer is a separate step that a person runs. [Ruleset v1 · 8/18]";

function loadKey() {
  if (process.env.RECOMMENDER_MCP_KEY) return process.env.RECOMMENDER_MCP_KEY;
  const deciders = JSON.parse(readFileSync(resolve(PKG_DIR, ".deciders.local.json"), "utf8"));
  const entry = Object.entries(deciders).find(([, v]) => v.role === "automation");
  if (!entry) throw new Error("No role=automation key in .deciders.local.json and RECOMMENDER_MCP_KEY unset.");
  return entry[0];
}

let rpcId = 0;
async function mcpCall(key, name, toolArgs = {}) {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method: "tools/call", params: { name, arguments: toolArgs } }),
  });
  if (!res.ok) throw new Error(`MCP HTTP ${res.status} on ${name}`);
  const body = await res.json();
  if (body.error) throw new Error(`MCP error on ${name}: ${body.error.message}`);
  const text = body.result?.content?.[0]?.text ?? "";
  if (body.result?.isError) throw new Error(`MCP tool error on ${name}: ${text}`);
  return text;
}

// list_pending_exceptions renders one line per item:  "  ☐ recXXX · [Type] Title — status"
function parseQueue(text) {
  const items = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([☐☑])\s+(rec[A-Za-z0-9]{14}) · \[([^\]]*)\] (.*?) — (.*)$/u);
    if (m) items.push({ undecided: m[1] === "☐", id: m[2], type: m[3], title: m[4], status: m[5] });
  }
  return items;
}

function alreadyRecommended(detailText) {
  const notes = detailText.split("## Decision notes so far")[1] ?? "";
  return /recommendation[^:]*:/i.test(notes);
}

async function difyLean(itemDetail, itemId) {
  const key = process.env.DIFY_RECOMMENDER_APP_KEY;
  if (!key) throw new Error("DIFY_RECOMMENDER_APP_KEY unset — pass --leans <file> or provision the Dify app key.");
  const res = await fetch(DIFY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      inputs: { item_id: itemId, detail: itemDetail },
      response_mode: "blocking",
      user: "exception-reco-automation",
    }),
  });
  if (!res.ok) throw new Error(`Dify HTTP ${res.status}`);
  const body = await res.json();
  if (body.data?.status !== "succeeded") throw new Error(`Dify run ${body.data?.status ?? "failed"}`);
  const out = body.data.outputs ?? {};
  return {
    recommendation: String(out.recommendation ?? "NEEDS-HUMAN").toLowerCase(),
    confidence: Number(out.confidence ?? 0),
    notes: [out.business_meaning, out.reasoning, out.precedent_citations?.length ? `[precedents: ${out.precedent_citations.join("; ")}]` : ""]
      .filter(Boolean)
      .join(" "),
  };
}

async function main() {
  const key = loadKey();
  const leansFile = LEANS_PATH ? JSON.parse(readFileSync(resolve(LEANS_PATH), "utf8")) : null;
  const leansById = new Map((leansFile?.leans ?? []).map((l) => [l.item_id, l]));
  for (const nh of leansFile?.needs_human ?? []) SKIP.add(nh.item_id);

  const whoami = await mcpCall(key, "whoami");
  if (!/\(automation\)/.test(whoami)) throw new Error(`Refusing to run: key does not resolve to an automation identity.\n${whoami}`);

  const queueText = await mcpCall(key, "list_pending_exceptions");
  const queue = parseQueue(queueText);

  const receipt = { written: [], skipped: [], needsHuman: [], errors: [] };
  let writes = 0;

  for (const item of queue) {
    if (!item.undecided) continue;
    if (SKIP.has(item.id)) {
      receipt.needsHuman.push(`${item.id} — ${item.title} (routed per skip/needs-human list)`);
      continue;
    }
    if (!TECH_TYPES.has(item.type)) {
      receipt.skipped.push(`${item.id} — ${item.title} (type "${item.type}" is not the technical lane)`);
      continue;
    }
    if (!DECIDE && item.status.includes("👀")) {
      receipt.skipped.push(`${item.id} — ${item.title} (already Under Review — assumed recommended)`);
      continue;
    }
    try {
      const detail = await mcpCall(key, "get_exception_item", { item_id: item.id });
      const notes = detail.split("## Decision notes so far")[1] ?? "";

      if (DECIDE) {
        const lean = leansById.get(item.id);
        if (!lean || lean.recommendation !== "deny" || lean.confidence < CONFIDENCE_FLOOR) {
          receipt.needsHuman.push(`${item.id} — ${item.title} (no confident deny lean in file)`);
          continue;
        }
        if (!notes.includes("Automated recommendation (advisory): DENY")) {
          receipt.skipped.push(`${item.id} — ${item.title} (no standing automated DENY recommendation — recommend first)`);
          continue;
        }
        if (/Partner-lead recommendation: APPROVE/i.test(notes)) {
          receipt.needsHuman.push(`${item.id} — ${item.title} (conflicting human APPROVE recommendation — person decides)`);
          continue;
        }
        if (writes >= CAP) {
          receipt.skipped.push(`${item.id} — ${item.title} (run cap ${CAP} reached)`);
          continue;
        }
        if (WRITE) {
          const result = await mcpCall(key, "decide_exception_item", {
            item_id: item.id,
            decision: "denied",
            notes: DECISION_NOTE,
          });
          writes += 1;
          receipt.written.push(`${item.id} — ${item.title} → ❌DENIED (deny-only, conf ${lean.confidence})`);
          if (!result.startsWith("Recorded")) receipt.errors.push(`${item.id}: unexpected response: ${result.slice(0, 120)}`);
        } else {
          writes += 1;
          receipt.written.push(`${item.id} — ${item.title} → would DENY (conf ${lean.confidence})`);
        }
        continue;
      }

      if (alreadyRecommended(detail)) {
        receipt.skipped.push(`${item.id} — ${item.title} (recommendation already in notes)`);
        continue;
      }
      const lean = leansById.get(item.id) ?? (await difyLean(detail, item.id));
      if (!["approve", "deny"].includes(lean.recommendation) || lean.confidence < CONFIDENCE_FLOOR) {
        receipt.needsHuman.push(`${item.id} — ${item.title} (${lean.recommendation}, confidence ${lean.confidence})`);
        continue;
      }
      if (writes >= CAP) {
        receipt.skipped.push(`${item.id} — ${item.title} (run cap ${CAP} reached)`);
        continue;
      }
      if (WRITE) {
        const result = await mcpCall(key, "recommend_exception_item", {
          item_id: item.id,
          recommendation: lean.recommendation,
          notes: lean.notes,
        });
        writes += 1;
        receipt.written.push(`${item.id} — ${item.title} → ${lean.recommendation.toUpperCase()} (${lean.confidence})`);
        if (!result.includes("Recorded recommendation")) receipt.errors.push(`${item.id}: unexpected response: ${result.slice(0, 120)}`);
      } else {
        writes += 1;
        receipt.written.push(`${item.id} — ${item.title} → would write ${lean.recommendation.toUpperCase()} (${lean.confidence})`);
      }
    } catch (err) {
      receipt.errors.push(`${item.id} — ${item.title}: ${err.message}`);
    }
  }

  const mode = `${DECIDE ? "DECIDE (deny-only) " : ""}${WRITE ? "WRITE" : "DRY RUN"}`;
  console.log(`# ${DECIDE ? "Decision" : "Recommendation"} run receipt — ${mode}${LEANS_PATH ? ` (leans: ${LEANS_PATH})` : " (leans: Dify)"}`);
  console.log(`${WRITE ? "Written" : "Would write"}: ${receipt.written.length} · Skipped: ${receipt.skipped.length} · Needs-human: ${receipt.needsHuman.length} · Errors: ${receipt.errors.length}\n`);
  for (const [label, rows] of [
    [WRITE ? "## Written" : "## Would write", receipt.written],
    ["## Needs-human (no write)", receipt.needsHuman],
    ["## Skipped", receipt.skipped],
    ["## Errors", receipt.errors],
  ]) {
    if (rows.length) console.log(`${label}\n${rows.map((r) => `- ${r}`).join("\n")}\n`);
  }
  if (receipt.errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`Runner failed: ${err.message}`);
  process.exit(1);
});
