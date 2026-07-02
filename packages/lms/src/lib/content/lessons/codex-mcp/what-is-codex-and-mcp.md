# What Codex + MCP Actually Do

## Outcome

By the end of this lesson, you should be able to explain this in one sentence:

`Codex handles agentic engineering work; MCP gives Codex focused, inspectable capabilities it can call safely.`

## Mental Model

1. You ask Codex for work.
2. Codex reasons, edits, runs commands, and asks for more context when needed.
3. If the workflow needs a repeatable capability, Codex calls an MCP server.
4. The MCP server exposes a tool, resource, or prompt through a strict contract.
5. Codex uses the response as evidence, then continues the engineering loop.

## When To Build An MCP

Build an MCP when a capability should be more repeatable, inspectable, and bounded than an ad hoc shell command or chat instruction.

Examples:
- Validate all route files with your project rules.
- Pull project-specific status from an internal API.
- Run a custom analysis pipeline with one tool call.
- Produce a standard handoff note after a quality gate.

Do not build an MCP just to hide a vague workflow behind a tool. Codex works best when each tool has a narrow verb, explicit inputs, actionable failures, and an output that can be checked.

## MCP Primitives

- **Tools** perform actions. This course starts here because tools are the most direct way to give Codex a new engineering capability.
- **Resources** expose read-only context. Use them for durable facts, docs, logs, records, or generated artifacts that Codex should inspect.
- **Prompts** package repeatable workflows. Use them when the instruction pattern matters as much as the data.

## Agentic Engineering Standard

A useful Codex MCP tool should have:

- a focused name like `repo_status`, not a broad name like `do_everything`;
- a Zod schema with constraints and descriptions;
- deterministic output where possible;
- structured data for Codex to inspect;
- clear error messages with next steps;
- no secrets committed to source;
- safe behavior for writes, including preview, confirmation, evidence, and rollback notes.

Avoid tools that silently mutate production, expose unbounded shell execution, return ambiguous prose only, or require Codex to guess whether a call succeeded.

## Course Goal

You will build one local MCP server and connect it to Codex.

At the end of this course, you should be able to:
- scaffold a stable TypeScript MCP server,
- add one validated tool,
- register the server in Codex,
- debug failures with Inspector and Codex config checks,
- and package the server for reuse.

## Next

Continue to **Scaffold an MCP Server**.
