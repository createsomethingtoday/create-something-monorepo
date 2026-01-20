# Harness MCP Server

MCP server that exposes CREATE SOMETHING harness protocol to any agentic tool.

## Features

- **Beads operations**: get_issue, list_issues, update_issue, close_issue, get_priority
- **Quality gates**: run_quality_gate (tests/typecheck/lint), run_all_gates
- **Git operations**: get_git_status, get_diff, commit_with_issue
- **Checkpoints**: save_checkpoint, load_checkpoint, list_checkpoints
- **Canon rules**: get_canon_rules, get_quick_reference

> **Note**: Plagiarism detection tools have moved to `packages/webflow-mcp`

## Installation

```bash
cd packages/harness-mcp
pnpm install
pnpm build
```

## Configuration

### Claude Code

Add to `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "harness": {
      "command": "node",
      "args": ["/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/harness-mcp/dist/index.js"]
    }
  }
}
```

### Gemini CLI

Add the harness MCP server from the monorepo root:

```bash
gemini mcp add harness node "/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo/packages/harness-mcp/dist/index.js"
```

Verify it's configured:

```bash
gemini mcp list
# Should show: ✓ harness: node ... (stdio) - Connected
```

## Usage

### With Claude Code

Claude Code automatically discovers MCP tools. You can reference them in conversation.

### With Gemini CLI

```bash
# Start Gemini CLI with Flash model
gemini -m gemini-2.0-flash-exp

# The harness MCP tools are automatically available
# Example prompt:
> Use get_priority to find the highest priority issue, then work on it using the harness workflow

# Non-interactive mode
gemini -m gemini-2.0-flash-exp "Get issue csm-psf94 and update status to in-progress"
```

### Direct Testing

```bash
# Test MCP server directly
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js

# Test get_issue
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_issue","arguments":{"issueId":"cs-5jz5r"}}}' | node dist/index.js
```

## Architecture

```
harness-mcp (stdio MCP server)
    ↓ exposes tools
Claude Code / Gemini CLI / Any MCP client
    ↓ calls tools
Beads (bd commands)
Git (git commands)
Quality gates (pnpm, tsc, eslint)
Checkpoints (.orchestration/)
```

## Philosophy

This MCP server embodies tool-independence: the harness protocol is declarative and tool-agnostic. Any agentic system (Claude Code, Gemini CLI, future tools) can execute harness workflows identically.

**Zuhandenheit**: When working correctly, you don't think about which tool you're using—you think about the work. The infrastructure recedes.
