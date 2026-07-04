# @createsomething/learn

MCP server for learning through the Codex app from the lens of creating your first business MCP.

## Recommended Setup: Codex App

Open the Codex app and go to:

```text
Settings -> Integrations & MCP
```

Add a local stdio MCP server:

```text
Name: learn
Command: npx
Args: -y @createsomething/learn
```

The CLI helper below exists for technical setup and automation, but the learning experience should start in the Codex app.

## Manual Config

You can also open Codex config from the app settings and configure manually:

```toml
[mcp_servers.learn]
command = "npx"
args = ["-y", "@createsomething/learn"]
```

## Course

The learning flow is a single path: `codex-mcp`, shown in the LMS as **Build Your First Business MCP**.

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

Use this only as a setup helper, not as the learner-facing product surface:

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
