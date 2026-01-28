# @createsomething/ground-mcp

[![npm version](https://img.shields.io/npm/v/@createsomething/ground-mcp.svg)](https://www.npmjs.com/package/@createsomething/ground-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Grounded claims for code. An MCP server that prevents AI hallucination in code analysis.

**[View Landing Page →](https://createsomething.agency/products/ground)**

## The Problem

AI agents are confident. Too confident.

They'll tell you two files are "95% similar" without ever comparing them. They'll declare code "dead" without checking who uses it. They'll claim a module is "disconnected" while it's serving thousands of requests.

This is hallucination dressed up as analysis.

## The Solution

**You can't claim something until you've checked it.**

Ground is an MCP server that:
- Finds duplicates, dead code, and orphaned modules
- Requires verification before claims
- Blocks hallucinated analysis

---

## Quick Install

### Cursor (One-Click)

[**Install in Cursor →**](cursor://anysphere.cursor-deeplink/mcp/install?name=ground&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJAY3JlYXRlc29tZXRoaW5nL2dyb3VuZC1tY3AiXX0%3D)

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ground": {
      "command": "npx",
      "args": ["@createsomething/ground-mcp"]
    }
  }
}
```

### Windsurf

Settings → MCP → View raw config, add:

```json
{
  "mcpServers": {
    "ground": {
      "command": "npx",
      "args": ["@createsomething/ground-mcp"]
    }
  }
}
```

### VS Code + Copilot

1. Open Extensions panel
2. Filter by "MCP Server"
3. Search "ground"

### Codex CLI

```bash
codex mcp add ground --command "npx @createsomething/ground-mcp"
```

### npm (Global Install)

```bash
npm install -g @createsomething/ground-mcp
```

Then add to your tool's MCP config:

```json
{
  "mcpServers": {
    "ground": {
      "command": "ground-mcp"
    }
  }
}
```

## Available Tools

### Core Analysis

| Tool | What it does |
|------|--------------|
| `ground_compare` | Compare two files for similarity (0.0-1.0 score) |
| `ground_count_uses` | Count symbol uses; distinguishes runtime vs type-only usages |
| `ground_check_connections` | Check if module is connected (understands Cloudflare Workers) |
| `ground_find_duplicate_functions` | Find duplicates across AND within files; supports monorepos |

### Verified Claims (Audit Trail)

| Tool | What it does |
|------|--------------|
| `ground_claim_dead_code` | Claim code is dead — **blocked** until you've counted uses |
| `ground_claim_orphan` | Claim module is orphaned — **blocked** until you've checked connections |

### Discovery Tools

| Tool | What it does |
|------|--------------|
| `ground_find_orphans` | Find modules nothing imports |
| `ground_find_dead_exports` | Find exports never imported elsewhere |
| `ground_check_environment` | Detect Workers/Node.js API leakage |
| `ground_suggest_fix` | Get suggestions for fixing duplications |

### Graph-Based Analysis (Fast Repo-Wide Scans)

| Tool | What it does |
|------|--------------|
| `ground_build_graph` | Build symbol graph for repo-wide analysis |
| `ground_query_dead` | Query graph for dead exports (filters framework conventions) |

### AI-Native Tools

| Tool | What it does |
|------|--------------|
| `ground_analyze` | Batch analysis: duplicates + dead exports + orphans + environment |
| `ground_diff` | Incremental analysis vs git baseline (only NEW issues) |
| `ground_verify_fix` | Verify a fix was applied correctly |

## MCP Apps (Interactive UIs)

Ground supports the [MCP Apps extension](https://modelcontextprotocol.io/docs/concepts/apps) for interactive visualization directly in the conversation.

### Duplicate Explorer UI

When you call duplicate analysis tools (`ground_find_duplicate_functions`, `ground_compare`, `ground_suggest_fix`), supported MCP clients can render an interactive duplicate explorer:

- Visual similarity scores with color-coded badges
- Expandable cards showing side-by-side file comparison
- Adjustable similarity threshold slider
- One-click compare and suggest fix actions
- Real-time filtering and search

**Supported Clients**: Claude.ai, VS Code (Insiders), ChatGPT, Goose

The UI is served via `ui://ground/duplicate-explorer` resource and communicates with the server via postMessage.

### Design System Analysis (v2.1)

| Tool | What it does |
|------|--------------|
| `ground_find_drift` | Find design token violations (hardcoded colors, spacing, etc.) |
| `ground_adoption_ratio` | Calculate token adoption percentage with health thresholds |
| `ground_suggest_pattern` | Suggest tokens to replace hardcoded values |
| `ground_mine_patterns` | Discover implicit patterns that should become tokens |
| `ground_explain` | AI-native traceability — explain why files are excluded |

## Usage Examples

Ask Claude:

```
Find duplicate functions in src/ with at least 10 lines
```

```
Check if the old-utils module is still connected to anything
```

```
Run ground_analyze on packages/sdk to find dead code
```

```
What's the CSS token adoption ratio in packages/components?
```

```
Find design drift in my CSS files only (use extensions: "css")
```

## What's New in 0.2.1

- **`ground_explain`** — AI-native context traceability. Explains why files are excluded from violation checks (e.g., video-rendering contexts, third-party CSS)
- **`ground_find_drift` extensions filter** — Analyze specific file types (e.g., `extensions: "css"` for CSS-only analysis)
- **Context system** — Configure intentional exclusions in `.ground.yml` with full audit trail

## Philosophy

Ground is based on a simple principle: **no claim without evidence**.

- **Duplicates** → You have to compare the files first
- **Dead code** → You have to count the uses first  
- **Orphans** → You have to check the connections first

This prevents AI hallucination by requiring computation before synthesis.

## Configuration

Ground loads `.ground.yml` from your project root for:
- Ignore patterns (functions, files, directories)
- Known drift exceptions with documented reasons
- Context declarations for intentional exclusions
- Similarity thresholds

See [Full Documentation](https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/ground) for configuration reference.

## Links

- [Full Documentation](https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/ground)
- [Case Study: Kickstand Triad Audit](https://createsomething.io/papers/kickstand-triad-audit)
- [CREATE SOMETHING Agency](https://createsomething.agency)

## License

MIT
