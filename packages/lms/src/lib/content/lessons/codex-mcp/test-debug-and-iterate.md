# Test, Debug, Iterate

## Outcome

Set up a fast debugging loop so MCP issues are easy to diagnose.

## Common Failure Modes

1. Build output missing (`dist/index.js` does not exist).
2. Wrong command/path in Codex MCP config.
3. Tool listed but argument shape mismatches schema.
4. Unhandled runtime errors inside tool handlers.

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

4. Add temporary logs in `src/index.ts`:
```ts
console.error('[codex-demo-mcp] tool call', request.params.name, request.params.arguments);
```

5. Restart Codex session and run the same prompt again.

## Add One Real Tool

After `echo_text`, add a tool tied to your daily work. Example:
- `list_workspace_packages`
- `find_todos`
- `summarize_changed_files`

Keep each tool focused and deterministic.

## Next

Continue to **Ship and Extend**.
