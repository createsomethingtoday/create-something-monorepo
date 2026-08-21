#!/usr/bin/env node
// Lean generator — Dify engine. Calls the "Exception Decisions — Partner Lead" Dify AGENT app
// via its Chat API (POST /chat-messages) purely as a judgment engine: analysis-only prompts,
// JSON out, one fresh conversation per item. ALL writes stay in runner.mjs under the automation
// identity — this script only reads via the MCP and talks to Dify.
//
// Agent-mode quirks (per Dify docs): blocking mode is unsupported, so we parse the SSE stream
// and accumulate `agent_message`/`message` events until `message_end`.
//
// Identity note (runbook guardrail): the Dify app's own MCP tools act as the partner-lead
// identity. Every prompt opens with a hard ANALYSIS-ONLY / no-tools instruction, and the app's
// own design requires explicit user confirmation before recording. Writes in this lane are
// made only by runner.mjs with the automation key.
//
// Modes:
//   node scripts/leans-dify.mjs                    # scheduled flow: pending technical items
//   node scripts/leans-dify.mjs --items r1,r2,...  # parity mode: exactly these items, no filters
//
// Env: DIFY_PARTNER_LEAD_APP_KEY (required), EXCEPTIONS_MCP_URL, RECOMMENDER_MCP_KEY (optional).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MCP_URL = process.env.EXCEPTIONS_MCP_URL ?? "https://exceptions.mcp.createsomething.agency/mcp";
const DIFY_CHAT_URL = process.env.DIFY_CHAT_URL ?? "https://api.dify.ai/v1/chat-messages";
const TECH_TYPES = new Set(["Security", "Custom Code / Scopes", "Guideline"]);

const args = process.argv.slice(2);
const itemsOpt = (() => {
  const i = args.indexOf("--items");
  return i >= 0 && args[i + 1] ? args[i + 1].split(",").map((s) => s.trim()).filter(Boolean) : null;
})();

const DIFY_KEY = process.env.DIFY_PARTNER_LEAD_APP_KEY;
if (!DIFY_KEY) {
  console.error("DIFY_PARTNER_LEAD_APP_KEY unset — fetch it from Infisical (prod /exception-decisions-mcp).");
  process.exit(1);
}

function loadMcpKey() {
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

// The engine judges the FINDING, not the conversation about it. Notes may contain prior
// recommendations (ours or a human's) — stripping them keeps every lean independent, which is
// also what makes parity comparisons honest.
function stripNotes(detailText) {
  return detailText.split("## Decision notes so far")[0].trim();
}

function rulesetV1() {
  const doc = readFileSync(resolve(PKG_DIR, "docs/dify-recommendation-runbook.md"), "utf8");
  const start = doc.indexOf("## Ruleset v1");
  const end = doc.indexOf("## Guardrails");
  if (start < 0 || end < 0) throw new Error("Could not slice Ruleset v1 out of the runbook.");
  return doc.slice(start, end).trim();
}

async function difyChatOnce(query) {
  const res = await fetch(DIFY_CHAT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${DIFY_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      inputs: {},
      query,
      response_mode: "streaming",
      conversation_id: "",
      user: "exception-reco-automation",
    }),
  });
  if (!res.ok) throw new Error(`Dify HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let answer = "";
  let sawToolCall = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const frames = buf.split("\n\n");
    buf = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      let ev;
      try { ev = JSON.parse(line.slice(5)); } catch { continue; }
      if (ev.event === "message" || ev.event === "agent_message") answer += ev.answer ?? "";
      else if (ev.event === "agent_thought" && ev.tool) sawToolCall = ev.tool;
      else if (ev.event === "error") throw new Error(`Dify stream error: ${ev.message}`);
    }
  }
  return { answer, sawToolCall };
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(raw);
}

async function main() {
  const mcpKey = loadMcpKey();
  const whoami = await mcpCall(mcpKey, "whoami");
  if (!/\(automation\)/.test(whoami)) throw new Error(`Refusing to run: key is not an automation identity.\n${whoami}`);

  const queue = parseQueue(await mcpCall(mcpKey, "list_pending_exceptions"));
  const byId = new Map(queue.map((q) => [q.id, q]));

  let targets = [];
  if (itemsOpt) {
    for (const id of itemsOpt) {
      const q = byId.get(id) ?? { id, type: "?", title: "(parity item)", undecided: true, status: "?" };
      targets.push(q);
    }
  } else {
    for (const item of queue) {
      if (!item.undecided) continue;
      if (!TECH_TYPES.has(item.type)) continue;
      if (item.status.includes("👀")) continue;
      targets.push(item);
    }
  }

  const ruleset = rulesetV1();
  const runDate = new Date().toISOString().slice(0, 16).replace(":", "");
  const leans = [];
  const needsHuman = [];
  const errors = [];
  const toolWarnings = [];

  for (const item of targets) {
    try {
      const rawDetail = await mcpCall(mcpKey, "get_exception_item", { item_id: item.id });
      if (!itemsOpt && alreadyRecommended(rawDetail)) continue;
      const detail = stripNotes(rawDetail);
      const query = [
        "ANALYSIS ONLY. Do not call any tool. Do not record, recommend, or decide anything through",
        "your tools. Do not send anything. Reply with ONLY a JSON object and no other text.",
        "",
        "Apply this ruleset verbatim to the exception item below and produce your lean:",
        "",
        ruleset,
        "",
        'Reply schema: { "recommendation": "approve" | "deny" | "needs-human",',
        '  "confidence": 0.0-1.0, "route": "Greg" | "Adam" | null,',
        '  "notes": "what a yes means for the business, note style per the ruleset, ending with',
        `[confidence N · Ruleset v1 · dify run ${runDate}]" }`,
        "",
        `## Item ${item.id} · [${item.type}] ${item.title}`,
        "",
        detail,
      ].join("\n");

      const { answer, sawToolCall } = await difyChatOnce(query);
      if (sawToolCall) toolWarnings.push(`${item.id}: agent invoked tool "${sawToolCall}" despite analysis-only instruction — check the record`);
      const lean = extractJson(answer);
      const rec = String(lean.recommendation ?? "").toLowerCase();
      if (rec === "approve" || rec === "deny") {
        leans.push({ item_id: item.id, recommendation: rec, confidence: Number(lean.confidence ?? 0), notes: String(lean.notes ?? "") });
      } else {
        needsHuman.push({ item_id: item.id, route: lean.route ?? "Adam", reason: String(lean.notes ?? "no confident lean") });
      }
    } catch (err) {
      errors.push(`${item.id}: ${err.message}`);
    }
  }

  mkdirSync(resolve(PKG_DIR, "runs"), { recursive: true });
  const prefix = itemsOpt ? "parity-dify" : "leans-dify";
  const file = resolve(PKG_DIR, `runs/${prefix}-${runDate}.json`);
  writeFileSync(file, JSON.stringify({ source: `dify chat engine run ${runDate}`, leans, needs_human: needsHuman }, null, 2));
  console.log(`Targets: ${targets.length} · Leans: ${leans.length} · Needs-human: ${needsHuman.length} · Errors: ${errors.length}`);
  for (const w of toolWarnings) console.log(`⚠️  ${w}`);
  for (const e of errors) console.log(`error: ${e}`);
  console.log(`LEANS_FILE=${file}`);
  if (errors.length && !leans.length && !needsHuman.length) process.exit(1);
}

main().catch((err) => {
  console.error(`Dify lean generation failed: ${err.message}`);
  process.exit(1);
});
