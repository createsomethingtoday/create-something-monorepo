---
name: airtable-system-architect
description: Map, design, implement, and verify Airtable bases as governed operational systems using Airtable's official MCP. Use for base architecture, table and field design, relationships, interface and page planning, automation topology, schema migrations, architecture audits, and approved administrator changes. Do not use this broad operator lane for routine Webflow Marketplace review decisions when a bounded review MCP exists.
---

# Airtable System Architect

Treat Airtable as an operational system, not a spreadsheet. Use Airtable's official MCP as the execution adapter and this skill as the policy boundary.

## Start here

1. Read [references/capability-matrix.md](references/capability-matrix.md) before promising a mutation.
2. Read [references/policy.airtable-system-architect.v1.md](references/policy.airtable-system-architect.v1.md) before any write, publish, delete, bulk operation, or browser fallback.
3. Read [references/authentication.md](references/authentication.md) when diagnosing access, scopes, or PAT delivery.
4. Use [references/receipt-template.md](references/receipt-template.md) for every mutation handoff.

## Architecture loop

### 1. Establish intent and authority

- Name the business workflow, operators, decisions, source-of-truth requirements, and expected outputs.
- Separate system-architecture work from routine record operations.
- A request to build this plugin or analyze a base does not authorize a live Airtable mutation.
- An exact user request can authorize one bounded, reversible mutation only when the base and target are unambiguous. Structural, destructive, public, bulk, or UI-fallback actions still require the policy's proposal and approval gate.

### 2. Discover before designing

- Use `search_bases` or `list_bases`; never guess a base ID.
- If more than one base plausibly matches, ask the user to select the base.
- Use `list_tables_for_base` to map tables and field summaries.
- Use `get_table_schema` for every table whose field type, relationship, select choice, formula, or permission affects the design.
- Use `list_views_for_table`, `list_pages_for_base`, and `list_automations` when those surfaces affect the workflow.
- Preserve stable Airtable IDs in the proposal and receipt; use names only for human readability.

### 3. Map the system

Classify the design using CREATE SOMETHING's three tiers:

- **Database:** tables, fields, linked records, views, source-of-truth ownership, retention, and permissions.
- **Automation:** triggers, actions, integrations, drafts, retries, and failure paths.
- **Judgment:** approval rules, exception handling, publication authority, and escalation.

Identify duplicated truth, denormalized status, orphaned links, brittle formulas, hidden interface dependencies, automation loops, permission mismatches, and missing receipts. Do not change the base while mapping it.

### 4. Produce the proposal artifact

Before a governed mutation, state:

- objective and non-goals;
- workspace/base/table/interface/page/automation IDs;
- observed before state and timestamp;
- proposed operations in execution order;
- affected records, fields, pages, automations, and downstream integrations;
- Airtable MCP tool or approved browser action for each operation;
- capability gaps or UI-only dependencies;
- policy risk class and approval requirement;
- validation/readback plan;
- rollback or compensating action.

Prefer creating a new structure and migrating deliberately over destructive in-place replacement. Do not invent unsupported tool capabilities.

### 5. Apply the approval gate

- Read-only discovery and architecture analysis can proceed without a write approval.
- Bounded record writes require an exact target and user-authorized intent.
- Schema changes, new interfaces/pages, and automation drafts require an architecture proposal plus explicit approval.
- Publication, deletion, bulk mutation, permission-affecting work, and every browser UI mutation require explicit approval for the exact operation after the proposal is visible.
- Approval never expands scope. A new target or materially different operation requires a new gate.

Stop if the base, target, capability, permissions, before state, impact, or rollback is unclear.

### 6. Execute the smallest supported operation

- Re-read the target immediately before a high-impact write.
- Use the official MCP tool named in the proposal.
- Keep batches bounded and respect Airtable rate and batch limits.
- Do not bypass a missing MCP capability with undocumented HTTP endpoints.
- Do not use browser automation simply because an MCP call failed. Diagnose Database, then Automation, then Judgment.

### 7. Use browser fallback narrowly

Browser fallback is eligible only when the capability matrix marks the operation as UI-only or unsupported and the user approved that exact UI operation.

- The PAT does not authenticate or authorize browser UI actions.
- Require an existing authenticated Airtable session and inspect the visible target before changing it.
- Capture before state, perform one bounded action, then capture visible after state.
- Never enable an automation, change permissions, delete a field/table/interface, or edit an existing interface layout through the UI without explicit approval.
- If the UI does not provide reliable readback, report the action as attempted rather than confirmed.

### 8. Verify and receipt

- Read back the changed schema, record, page list, interface publication state, or automation draft with the official MCP whenever supported.
- Distinguish MCP-confirmed state, browser-visible state, and an unverified client action.
- Compare intended and observed state. Do not call partial success complete.
- Return the receipt defined in [references/receipt-template.md](references/receipt-template.md), including unsupported gaps and rollback.

## Existing bounded lanes

For Webflow Marketplace review assignment, reviewer feedback, status transitions, and normal review records, use the existing Template Review MCP or App Review MCP. Use this system-architect lane only for an explicitly approved base/schema/interface/automation architecture task. Never use broad Airtable access to silently bypass review capability flags or field maps.

## Safety

- Never expose, echo, log, or persist `AIRTABLE_API_TOKEN` or any Airtable credential.
- Never treat PAT scopes as human approval.
- Never guess IDs, field types, select choice IDs, formulas, or interface relationships.
- Never claim an interface is published, an automation is live, or a mutation is complete without the matching readback evidence.
- Never mutate a development app/base that Airtable's MCP does not support.
