---
name: claude-agent-cli-handoff
description: Use the local Claude CLI as an execution agent when Claude owns tools or connectors that Codex does not, especially Webflow operations across Airtable, Slack, Google, Datadog, Amplitude, and related MCPs.
---

# Claude Agent CLI Handoff

Use this skill when the user explicitly asks Codex to use Claude as the agent,
or when Claude has the required connector or MCP access and Codex does not.

This is a handoff skill, not a substitute for evidence. Claude may own the
tooling, but Codex still owns the operator-facing claim about what happened.

## When To Use

Use the Claude CLI handoff when:

- the requested work depends on Claude-only tools, MCP servers, or connectors
- the work belongs to the Webflow operations toolbelt Claude can access, such
  as Airtable, Slack, Google, Datadog, Amplitude, Zendesk, Webflow, or adjacent
  internal MCPs
- the user says the work must happen through Claude
- Codex can prepare the packet and inspect the final evidence, but cannot safely
  perform the underlying tool action itself
- the action is bounded enough to describe with exact inputs, stop conditions,
  and readback requirements

Do not use this skill just because Claude could also do the work. If Codex has
the right tools and permission boundary locally, use the local owning surface
instead.

## Control Surface

Prefer the local CLI:

```bash
claude --print --output-format json --name "<short task name>" "<handoff prompt>"
```

Use `--mcp-config <path-or-json>` only when the relevant Claude MCP server is not
already configured in Claude's project or user settings.

Use background mode for long-running work:

```bash
claude --bg --name "<short task name>" "<handoff prompt>"
claude agents
```

Do not claim live control from local transcript visibility. Transcript files
under `~/.claude/projects` can support review, but they do not prove the current
Claude process can be steered.

## Handoff Packet

Every packet must include:

```text
Operator request:
Source context:
Owning system:
Claude tools expected:
Exact records or lookup keys:
Action requested:
Required workflow:
Allowed writes:
Forbidden writes:
Stop conditions:
Readback evidence required:
Return format:
```

Keep the packet self-contained. Include URLs, ticket IDs, creator names, record
keys, and field names exactly as observed. Do not rely on screenshots when a
source link or copied text is available.

For multi-tool Webflow operations, tell Claude which tools are expected and
which system owns the final truth. For example, Slack may own the intake thread,
Zendesk may own the customer-support trail, Airtable may own marketplace record
state, Datadog may own runtime health, and Amplitude may own product analytics.
Claude should use the source-of-truth tool for the claim it returns, not the
most convenient secondary surface.

## Airtable Write Guardrails

For Airtable mutations, require Claude to:

- identify the base and table it used
- inspect comparable existing records before deciding field values
- locate the target creator through the Creator table or email table
- list candidate Asset records before writing
- confirm counts and names match the operator request
- write only the fields needed for the requested state change
- avoid deleting records unless the user explicitly requested deletion
- read back every changed record after the write

If the schema, creator match, record count, or archived-state pattern is
ambiguous, Claude must stop and return a blocker instead of guessing.

## Template Archive Packet

Use this shape for Webflow Marketplace creator archive requests:

```text
Operator request:
Archive or remove all marketplace templates for the named creator.

Source context:
- Creator: <creator name>
- Marketplace designer page: <url>
- Zendesk ticket: <url or ticket id>
- Request summary: <copied request text>

Owning system:
Airtable Marketplace Assets base. Claude has Airtable access; Codex does not.

Claude tools expected:
- Airtable for Creator and Asset records.
- Slack or Zendesk only for intake context if needed.

Exact records or lookup keys:
- Creator name: <creator name>
- Creator marketplace URL: <url>
- Creator email: <email if available, otherwise locate through Creator/email tables>

Action requested:
Update all linked template Asset records for this creator to match the existing
Archived template item pattern used in the Asset table.

Required workflow:
1. Review several existing Archived template items in the Asset table and record
   the field values that define the archived/removed-from-marketplace state.
2. Locate the creator in the Creator table or email table.
3. Find all template Asset records linked to that creator.
4. Confirm the count against the request before writing.
5. Update only the fields needed to archive/remove those Asset records.
6. Read back every changed Asset record.

Allowed writes:
- Asset table fields required to match the existing Archived template pattern.

Forbidden writes:
- Deleting Airtable records.
- Mutating unrelated creators, creator records, payments, or workspace records.
- Guessing missing creator matches or archive status fields.

Stop conditions:
- Creator is not found or multiple creators match.
- Asset count does not match the request.
- Existing archived pattern is inconsistent.
- Airtable write fails or readback does not match.

Readback evidence required:
- Airtable base and table names.
- Creator record ID or unique creator identifier.
- Each updated Asset record ID.
- Template name.
- Previous field values.
- New field values.
- Confirmation that post-write readback matched the requested archived state.

Return format:
Summary:
Updated records:
Blockers:
Evidence:
```

## Completion Bar

Codex may report the workflow complete only after Claude returns readback
evidence for every intended mutation. If Claude returns a partial result, a
blocked result, or only a plan, report that state plainly and do not imply the
Airtable records changed.
