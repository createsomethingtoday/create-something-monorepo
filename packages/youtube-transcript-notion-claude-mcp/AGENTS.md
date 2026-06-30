# Agent Entry

This package is a Claude-compatible OAuth wrapper for the existing
`youtube-transcript-notion-mcp` Worker. It does not implement transcript or
Notion tools itself; it authenticates Claude and proxies MCP traffic upstream.

Start in `index.ts`.

## Validation

Use focused package checks:

```bash
pnpm --filter @create-something/youtube-transcript-notion-claude-mcp typecheck
pnpm --filter @create-something/youtube-transcript-notion-claude-mcp test
```

Do not check bearer tokens, OAuth passwords, or signing secrets into the repo.
