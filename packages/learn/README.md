# @createsomething/learn

MCP server for learning Codex by building an MCP.

## Install

```bash
npx @createsomething/learn init
```

Or add to Codex settings manually:

```json
{
  "mcpServers": {
    "learn": {
      "command": "npx",
      "args": ["@createsomething/learn"]
    }
  }
}
```

## Course

The learning flow is a single path: `codex-mcp`.

Start lesson:

```text
learn_lesson pathId="codex-mcp" lessonId="what-is-codex-and-mcp"
```

## Tools (Core 4)

| Tool | Description |
|------|-------------|
| `learn_authenticate` | Sign in with magic link |
| `learn_status` | View learning progress |
| `learn_lesson` | Fetch lesson content |
| `learn_complete` | Mark lesson complete with reflection |

## CLI

```bash
npx @createsomething/learn init        # Setup instructions
npx @createsomething/learn init --auto # Write MCP config automatically
npx @createsomething/learn status      # Auth + cache status
npx @createsomething/learn clear       # Clear credentials
```

`init --full` has been removed.

## Progress Sync

Progress syncs with [learn.createsomething.space](https://learn.createsomething.space).

## License

MIT
