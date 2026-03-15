# outerfields-presentations

Client-managed presentation decks for OUTERFIELDS.

This repo is intentionally **presentations-only** so clients can create/edit decks via PRs (including through Claude Desktop) without needing access to the full monorepo.

## What’s in here

This repository mirrors the contents of the OUTERFIELDS SvelteKit presentations routes directory.

- `+page.svelte` — presentations index
- `investor/+page.svelte` — investor deck
- `user/+page.svelte` — user deck

These pages compose the shared deck primitives:
- `Presentation` (`$lib/components/Presentation.svelte`)
- `Slide` (`$lib/components/Slide.svelte`)

> Note: Imports like `$lib/...` resolve when this repo is mounted into the main OUTERFIELDS app.

## How it gets used

CREATE SOMETHING integrates this repo into the main app via **git subtree** (or submodule) at:

- `packages/agency/clients/outerfields/src/routes/presentations/`

So:
- You edit deck files here
- Open a PR
- Merge
- The OUTERFIELDS site auto-deploys and serves the updated decks

## Claude Desktop setup (recommended)

Use two MCP servers:

1) **OUTERFIELDS PCN tools** (guidance): `@outerfields/pcn-tools`
2) **Filesystem MCP** (write access): restricted to this repo’s local folder

In your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS), add something like:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/ABSOLUTE/PATH/TO/outerfields-presentations"
      ]
    },
    "outerfields-pcn": {
      "command": "npx",
      "args": ["@outerfields/pcn-tools"]
    }
  }
}
```

## Conventions

- New decks should be added as: `<slug>/+page.svelte`
- Keep URLs stable under `/presentations/<slug>`
- Embedded components are allowed, but should stick to the approved set (CREATE SOMETHING will maintain the allowlist)
