# Test, Debug, Iterate

## Outcome

Set up a fast debugging loop so MCP failures are easy to reproduce, isolate, and fix.

## Common Failure Modes

1. Build output missing (`dist/index.js` does not exist).
2. Wrong command/path in Codex MCP config.
3. Server writes logs to stdout and corrupts the stdio protocol.
4. Tool listed but argument shape mismatches schema.
5. `RAPIDAPI_KEY` is missing from the server environment.
6. RapidAPI subscription, rate limit, or query returns an API error.
7. Tool hangs because a promise never resolves.
8. Runtime error message does not tell Codex what to try next.

## Quick Debug Checklist

1. Ask Codex to use the MCP-building skill as a review checklist:

```text
Use the MCP-building skill to review this local stdio MCP server.

Check the TypeScript build, tool registration, Zod input schema, outputSchema, structuredContent, annotations, stderr-only logging, Codex config, and actionable RapidAPI errors.
```

2. Rebuild:
```bash
pnpm --filter @create-something/codex-demo-mcp build
```

3. Confirm output file exists:
```bash
ls packages/codex-demo-mcp/dist
```

4. Confirm the Codex app points to the right server command:

Open **Settings -> Integrations & MCP**, select `codex-demo`, and confirm the command, args, environment, and enabled state.

5. Run the server through MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node packages/codex-demo-mcp/dist/index.js
```

6. Add temporary logs in `src/index.ts`. Use stderr, not stdout:

```ts
console.error('[codex-demo-mcp] find_local_businesses called', { query, limit, region });
```

7. Restart Codex session and run the same prompt again.

## Failure Table

| Symptom | Likely Cause | First Check |
| --- | --- | --- |
| Server is not listed | Config not loaded | Codex app MCP settings, then restart the session |
| Server listed but unavailable | Bad command, path, permissions, or env | Codex app MCP settings for `codex-demo` |
| Tool is missing | Registration code did not run | Inspector tool list |
| Arguments rejected | Schema and prompt do not match | Zod schema descriptions |
| `RAPIDAPI_KEY is missing` | Key not passed into the MCP server environment | Codex MCP config env block |
| RapidAPI returns 401 or 403 | Bad key or missing API subscription | RapidAPI dashboard |
| RapidAPI returns 429 | Rate limit or quota hit | Reduce `limit`, wait, or check plan |
| Call hangs | Handler never returns or awaits forever | Add stderr logs around each await |
| Protocol errors | Logs written to stdout | Replace `console.log` with `console.error` |

## Keep the Operator Boundary

After `find_local_businesses`, do not jump straight to automated outreach. Add the next tool only when the workflow boundary is clear. Useful read-only extensions:
- `get_business_details`
- `compare_business_results`
- `summarize_market_snapshot`

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
