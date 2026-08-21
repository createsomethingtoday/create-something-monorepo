#!/usr/bin/env node
// Lean generator — Claude as the engine, until the Dify workflow app exists (Phase 1 of
// docs/dify-recommendation-runbook.md). Same methodology as the 8/18 shadow run: Ruleset v1
// applied verbatim (read from the runbook at runtime, so the doc stays the single policy
// artifact), over each pending item's full detail. Output is a leans file in the exact schema
// of docs/shadow-leans-2026-08-18.json, meant to be fed to:
//
//   node scripts/runner.mjs --leans <file> --write
//
// This script makes NO writes to Airtable or the MCP beyond read tools. All enforcement
// (identity, tech-lane filter, confidence floor, already-recommended skip, cap) stays in
// runner.mjs. When the Dify app ships, delete this and drop the --leans flag.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MCP_URL = process.env.EXCEPTIONS_MCP_URL ?? "https://exceptions.mcp.createsomething.agency/mcp";
const CLAUDE_BIN = process.env.CLAUDE_BIN ?? "/Users/micahjohnson/.local/bin/claude";
const TECH_TYPES = new Set(["Security", "Custom Code / Scopes", "Guideline"]);

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

function rulesetV1() {
  const doc = readFileSync(resolve(PKG_DIR, "docs/dify-recommendation-runbook.md"), "utf8");
  const start = doc.indexOf("## Ruleset v1");
  const end = doc.indexOf("## Guardrails");
  if (start < 0 || end < 0) throw new Error("Could not slice Ruleset v1 out of the runbook.");
  return doc.slice(start, end).trim();
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(raw);
}

async function main() {
  const key = loadKey();
  const whoami = await mcpCall(key, "whoami");
  if (!/\(automation\)/.test(whoami)) throw new Error(`Refusing to run: key is not an automation identity.\n${whoami}`);

  const queue = parseQueue(await mcpCall(key, "list_pending_exceptions"));
  const candidates = [];
  for (const item of queue) {
    if (!item.undecided) continue;
    if (!TECH_TYPES.has(item.type)) continue;
    if (item.status.includes("👀")) continue; // already Under Review — assumed recommended
    const detail = await mcpCall(key, "get_exception_item", { item_id: item.id });
    if (alreadyRecommended(detail)) continue;
    candidates.push({ ...item, detail });
  }

  if (!candidates.length) {
    console.log("No pending technical items without a recommendation. Nothing to lean on.");
    return;
  }

  const runDate = new Date().toISOString().slice(0, 16).replace(":", "");
  const prompt = [
    "You are the recommendation engine for Webflow's app-review exception loop. Apply the ruleset",
    "below VERBATIM to each item. You only produce leans; a separate enforcement layer and a human",
    "decision-maker sit downstream. Never invent facts not present in an item's detail.",
    "",
    rulesetV1(),
    "",
    "Respond with ONLY a JSON object in exactly this schema (no prose before or after):",
    '{ "source": "claude-engine scheduled run ' + runDate + '",',
    '  "leans": [ { "item_id": "recXXXXXXXXXXXXXX", "recommendation": "approve" | "deny",',
    '               "confidence": 0.0-1.0, "notes": "..." } ],',
    '  "needs_human": [ { "item_id": "recXXXXXXXXXXXXXX", "route": "Greg" | "Adam", "reason": "..." } ] }',
    "",
    "Every item below must appear in exactly one of the two arrays. Each lean's notes must state",
    "what a yes would mean for the business, follow the note style from the ruleset, and end with",
    '"[confidence N · Ruleset v1 · scheduled run ' + runDate + ']".',
    "",
    "## Items",
    ...candidates.map((c) => `### ${c.id} · [${c.type}] ${c.title}\n\n${c.detail}`),
  ].join("\n");

  const out = execFileSync(CLAUDE_BIN, ["-p", prompt, "--output-format", "text"], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    timeout: 10 * 60 * 1000,
  });

  const leans = extractJson(out);
  const wanted = new Set(candidates.map((c) => c.id));
  leans.leans = (leans.leans ?? []).filter(
    (l) => wanted.has(l.item_id) && ["approve", "deny"].includes(l.recommendation) && typeof l.confidence === "number"
  );
  leans.needs_human = (leans.needs_human ?? []).filter((n) => wanted.has(n.item_id));

  mkdirSync(resolve(PKG_DIR, "runs"), { recursive: true });
  const file = resolve(PKG_DIR, `runs/leans-${runDate}.json`);
  writeFileSync(file, JSON.stringify(leans, null, 2));
  console.log(`Candidates: ${candidates.length} · Leans: ${leans.leans.length} · Needs-human: ${leans.needs_human.length}`);
  console.log(`LEANS_FILE=${file}`);
}

main().catch((err) => {
  console.error(`Lean generation failed: ${err.message}`);
  process.exit(1);
});
