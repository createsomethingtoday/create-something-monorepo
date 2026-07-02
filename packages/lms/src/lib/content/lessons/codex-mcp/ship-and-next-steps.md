# Ship and Extend

## Outcome

Package your MCP so it is easy to reuse, inspect, and improve without changing the tool contract accidentally.

## Ship Checklist

- `README.md` explains purpose, install, config, tools, security posture, and examples.
- `pnpm --filter @create-something/codex-demo-mcp build` works from a clean checkout.
- `codex mcp get codex-demo` shows the expected command and args.
- One MCP Inspector call and one Codex chat call have been tested.
- Tool names, input schemas, and output schemas are treated as public contracts.
- Errors include what failed, why it matters, and the next check.
- Read tools are clearly read-only.
- Write tools have dry-run, explicit confirmation, evidence, and rollback notes.
- Secrets live in local config or a secret manager, not in source.
- Changes to tool behavior are captured in a versioned changelog.

## Suggested Next Tools

1. `repo_status` - read git status, branch, and configured remote without mutating anything.
2. `changed_files_summary` - summarize the current diff for handoff.
3. `run_quality_gate` - run a named check and return command, exit code, and key failure lines.
4. `create_handoff_note` - produce a standard note with evidence, risks, and next steps.

## Do Not Ship If

- The tool shells out to arbitrary user input.
- Writes happen without dry-run or confirmation.
- Output is vague prose with no structured evidence.
- Logs go to stdout on a stdio server.
- The server depends on secrets that are only present on your machine.
- Codex has to guess whether the tool succeeded.

## Course Complete

You now have the core skill this platform focuses on:

`Use Codex effectively by giving it custom, inspectable MCP capabilities.`

If you can add and validate a new tool quickly, you are ready to build domain-specific MCP servers for real agentic engineering work.
