#!/usr/bin/env node
// Regenerates src/ruleset-v1.ts from the runbook's "## Ruleset v1" section.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const doc = readFileSync(resolve(PKG_DIR, "docs/dify-recommendation-runbook.md"), "utf8");
const start = doc.indexOf("## Ruleset v1");
const end = doc.indexOf("## Guardrails");
if (start < 0 || end < 0) throw new Error("Could not slice Ruleset v1 out of the runbook.");
const slice = doc.slice(start, end).trim();
const out = `// GENERATED from docs/dify-recommendation-runbook.md ("## Ruleset v1" … "## Guardrails").
// Regenerate with: pnpm --filter @create-something/exception-decisions-mcp run ruleset:sync
// The test suite asserts this string matches the runbook slice, so rules still change by PR to the
// runbook (and the Dify prompt) — this file only makes the policy artifact available at runtime,
// where a Worker cannot read the markdown from disk.
export const RULESET_V1 = ${JSON.stringify(slice)};
`;
writeFileSync(resolve(PKG_DIR, "src/ruleset-v1.ts"), out);
console.log(`src/ruleset-v1.ts regenerated (${slice.length} chars)`);
