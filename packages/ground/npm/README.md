# @createsomething/ground-mcp

Grounded claims for code. An MCP server that prevents AI hallucination in code analysis.

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

## Installation

```bash
npm install -g @createsomething/ground-mcp
```

## MCP Configuration

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "ground": {
      "command": "ground-mcp"
    }
  }
}
```

Restart Cursor. Ground tools are now available.

## Available Tools

| Tool | What it does |
|------|--------------|
| `ground_compare` | Compare two files for similarity |
| `ground_count_uses` | Count symbol uses (distinguishes definitions vs actual uses) |
| `ground_check_connections` | Check if a module is connected (understands Workers) |
| `ground_find_duplicate_functions` | Find copied functions across files |
| `ground_find_orphans` | Find modules nothing imports |
| `ground_find_dead_exports` | Find exports never imported elsewhere |
| `ground_check_environment` | Detect Workers/Node.js API leakage |
| `ground_analyze` | Batch analysis: duplicates + orphans + dead exports |
| `ground_claim_*` | Make verified claims (requires checking first) |

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

## Philosophy

Ground is based on a simple principle: **no claim without evidence**.

- **Duplicates** → You have to compare the files first
- **Dead code** → You have to count the uses first  
- **Orphans** → You have to check the connections first

This prevents AI hallucination by requiring computation before synthesis.

## Links

- [Full Documentation](https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/ground)
- [Case Study: Kickstand Triad Audit](https://createsomething.io/papers/kickstand-triad-audit)
- [CREATE SOMETHING Agency](https://createsomething.agency)

## License

MIT
