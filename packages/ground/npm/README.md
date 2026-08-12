# @createsomething/ground-mcp

[![npm version](https://img.shields.io/npm/v/@createsomething/ground-mcp.svg)](https://www.npmjs.com/package/@createsomething/ground-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Grounded claims for code.** An MCP server that prevents AI hallucination in code analysis.

Works with Claude Code, Cursor, Windsurf, VS Code Copilot, Claude Desktop, and any MCP-compatible AI coding assistant.

**[View Landing Page →](https://createsomething.agency/products/ground)**

## Why Ground?

| Capability | Without Ground | With Ground |
|------------|---------------|-------------|
| Duplicate detection | "These look 95% similar" | Computed 87.3% similarity via AST + token analysis |
| Dead code claims | "This appears unused" | Verified: 0 imports, 0 type references |
| Orphan detection | "Nothing imports this" | Checked: not a Worker entry point, not framework-implicit |
| Design drift | "Colors look hardcoded" | Adoption ratio: 73% tokens, 27% violations |

**The difference**: Ground requires computation before claims. No hallucinated analysis.

## Recommended agent path

Use CTX and Ground for different evidence:

- **CTX** retrieves the history of earlier agent work.
- **Ground** computes facts about the code that is on disk now.

For a current-source review, start with the compact verified loop:

1. `ground_analyze` — get machine-readable findings for a directory.
2. `ground_diff` — restrict the same checks to changes since a Git baseline.
3. `ground_verify_fix` — confirm the specific reported issue is gone.
4. `ground_explain` — inspect why Ground included, excluded, or scored a result.

The MCP server also retains targeted and graph tools for deeper investigations.
The installed CLI exposes the same batch and Git-aware entry points:

```bash
ground analyze ./src --checks duplicates,dead_exports
ground diff ./src --base origin/main --checks duplicates
```

Both commands print JSON evidence. `ground diff` only returns files inside the
requested directory and resolves Git paths from the repository root, so it is
safe to run from a package inside a monorepo.

### Diff coverage

`ground diff` analyzes TypeScript, JavaScript, `.mjs`, and Rust source paths.
Its legacy `changed_files` and `changed_file_list` fields continue to describe
only analyzable source files. Use the added `discovered_changed_files`,
`analyzable_changed_files`, and `excluded_changed_files` fields to see the full
Git change scope and why a path was not analyzed. If no changed source is
eligible, the result explicitly says so; it does not describe excluded files as
clean.

The release package includes the native Apple Silicon binaries directly; other
supported platforms download the matching verified release asset during install.

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
- Provides confidence scores with evidence

---

## Installation

Pick your tool. We've tested these so you don't have to discover config file locations through trial and error.

### Claude Code (CLI)

This is the one everyone gets wrong. Claude Code doesn't read `.claude/mcp.json`. It reads `~/.claude.json` for user-scoped servers and `.mcp.json` at project root for project-scoped servers. Two different files. Two different places. Now you know.

**Option A: User scope (available everywhere)**

```bash
npm install @createsomething/ground-mcp
claude mcp add --scope user --transport stdio ground -- npx @createsomething/ground-mcp
```

Restart Claude Code, run `/mcp`, and you should see "ground" connected.

**Option B: Project scope (shared with team)**

Create `.mcp.json` in your project root:

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

Claude Code will prompt you to approve it on first use.

### Cursor (One-Click)

[**Install in Cursor →**](cursor://anysphere.cursor-deeplink/mcp/install?name=ground&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyJAY3JlYXRlc29tZXRoaW5nL2dyb3VuZC1tY3AiXX0%3D)

Or add to `.mcp.json` at your project root:

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

### Claude Desktop

Add to `claude_desktop_config.json`:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

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

### Global Install (When npx Isn't Your Thing)

```bash
npm install -g @createsomething/ground-mcp
```

Now `ground-mcp` is in your PATH. Use it in any config:

```json
{
  "mcpServers": {
    "ground": {
      "command": "ground-mcp"
    }
  }
}
```

## Troubleshooting

**"Server not showing up"**

Run `/mcp` in your tool. If ground isn't listed, your config file is in the wrong place or has a typo. Claude Code in particular has... opinions about where configs live.

**"Connection closed" or "Download failed: HTTP 404"**

The npm package downloads a platform-specific binary on install. If that failed:

```bash
# Check if the binary exists
ls node_modules/@createsomething/ground-mcp/bin/

# Re-install
npm install @createsomething/ground-mcp
```

**"No files analyzed" or "0 results"**

Ground needs to know where your code is. For project-specific analysis, run it from your project directory, or pass `--workspace`:

```json
{
  "mcpServers": {
    "ground": {
      "command": "npx",
      "args": ["@createsomething/ground-mcp", "--workspace", "/path/to/your/project"]
    }
  }
}
```

**CSS/HTML analysis shows "100% adoption" or "0 drift"**

Ground's sweet spot is TypeScript/JavaScript projects with design tokens (CSS variables). If you're analyzing plain HTML with inline styles and no token system defined, there's nothing to measure drift against—it's a vacuous pass. For CSS-only linting, try Stylelint.

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

## What's New in 0.2.2

- **Fixed npm installer** — Binary downloads now work correctly across all platforms
- **Improved documentation** — Claude Code setup instructions (because nobody should have to discover `~/.claude.json` vs `.mcp.json` the hard way)

### 0.2.1

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

## Native service pilot

The CRE-1473 pilot keeps TypeScript as the control plane and invokes the existing Rust `ground-mcp` binary through a small, typed MCP adapter. It is a bounded proof for analysis workloads, not a production routing change or a broad language migration.

The pilot owns four things:

- `pilot/ground-native-client.ts` — discovers and calls `ground_analyze` over stdio MCP with explicit timeout and error behavior
- `pilot/benchmark.ts` — captures repeated native samples plus a directional comparison with the existing TypeScript duplicate-analysis script
- `pilot/ground-benchmark-receipt.schema.json` — makes the retained evidence machine-checkable
- `pilot/validate-receipt.ts` — independently rejects incomplete, failed, or inconsistent receipts

From the repository root, run:

```bash
pnpm --filter @createsomething/ground-mcp run pilot:verify
```

The benchmark defaults to `packages/mcp-core/src`, five retained samples, one warmup, and the release binary at `packages/ground/target/release/ground-mcp`. Metrics between the Rust MCP path and TypeScript script are directional only because the implementations do not use identical parsers or algorithms.

Rollback is removal of the pilot adapter, benchmark, and package-local development scripts. No existing Ground command, npm installer path, Cloudflare surface, or production consumer is redirected by this pilot.

## Links

- [Full Documentation](https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/ground)
- [Case Study: Kickstand Triad Audit](https://createsomething.io/papers/kickstand-triad-audit)
- [CREATE SOMETHING Agency](https://createsomething.agency)

## License

MIT

---

## Related

Looking for task coordination? Use Linear with the CREATE SOMETHING `pnpm linear:*` wrappers for tracked work, ownership, status, and delivery evidence.

## Keywords

MCP server, Model Context Protocol, AI code analysis, static analysis, duplicate detection, dead code detection, orphan detection, code quality, hallucination prevention, LLM tools, Claude Code, Cursor IDE, Windsurf, VS Code Copilot, Anthropic Claude, AI coding assistant, Rust, TypeScript, JavaScript, monorepo analysis, design tokens, CSS analysis, code verification.
