# Test, Debug, Iterate

## Outcome

Set up a fast debugging loop so MCP failures are easy to reproduce, isolate, and fix.

## Common Failure Modes

1. Build output missing (`dist/index.js` does not exist).
2. Wrong command/path in Codex MCP config.
3. Server writes logs to stdout and corrupts the stdio protocol.
4. Tool listed but argument shape mismatches schema.
5. Tool hangs because a promise never resolves.
6. Runtime error message does not tell Codex what to try next.

## Quick Debug Checklist

1. Rebuild:
```bash
pnpm --filter @create-something/codex-demo-mcp build
```

2. Confirm output file exists:
```bash
ls packages/codex-demo-mcp/dist
```

3. Confirm Codex points to the right server command:
```bash
codex mcp get codex-demo
```

4. Run the server through MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node packages/codex-demo-mcp/dist/index.js
```

5. Add temporary logs in `src/index.ts`. Use stderr, not stdout:

```ts
console.error('[codex-demo-mcp] echo_text called', { length: text.length });
```

6. Restart Codex session and run the same prompt again.

## Failure Table

| Symptom | Likely Cause | First Check |
| --- | --- | --- |
| Server is not listed | Config not loaded | `codex mcp list`, then restart the session |
| Server listed but unavailable | Bad command, path, permissions, or env | `codex mcp get codex-demo` |
| Tool is missing | Registration code did not run | Inspector tool list |
| Arguments rejected | Schema and prompt do not match | Zod schema descriptions |
| Call hangs | Handler never returns or awaits forever | Add stderr logs around each await |
| Protocol errors | Logs written to stdout | Replace `console.log` with `console.error` |

## Add One Real Tool

After `echo_text`, add a tool tied to your daily work. Example:
- `list_workspace_packages`
- `find_todos`
- `summarize_changed_files`

Keep each tool focused and deterministic.

For tools that write, require a safer contract:

- default to dry-run;
- require an explicit confirmation flag for mutation;
- return changed files, record IDs, or external URLs;
- report partial failure instead of hiding it;
- include a rollback note when rollback is possible.

## Checkpoint

A working MCP is not just "the tool ran once." It is working when you can reproduce success, reproduce failure, and give Codex enough evidence to recover.

## Next

Continue to **Ship and Extend**.
