# What Codex + MCP Actually Do

## Outcome

By the end of this lesson, you should be able to explain this in one sentence:

`Codex handles reasoning and edits; MCP gives Codex safe, structured capabilities.`

## Mental Model

1. You ask Codex for work.
2. Codex decides whether it can do the work directly.
3. If it needs a capability, it calls an MCP tool.
4. The MCP server returns structured output.
5. Codex continues with better context.

## Why Build Your Own MCP

Build an MCP when you repeat the same workflow and want Codex to do it consistently.

Examples:
- Validate all route files with your project rules.
- Pull project-specific status from an internal API.
- Run a custom analysis pipeline with one tool call.

## Course Goal

You will build one local MCP server and connect it to Codex.

At the end of this course, you should be able to:
- add a new tool in minutes,
- debug MCP failures quickly,
- and package your server for re-use.

## Next

Continue to **Scaffold an MCP Server**.
