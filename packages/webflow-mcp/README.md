# Webflow Marketplace MCP Server

Agent-native tools for the Webflow Marketplace team. Exposes plagiarism detection and template analysis via the Model Context Protocol (MCP).

## Tools

### Plagiarism Detection

| Tool | Algorithm | Description |
|------|-----------|-------------|
| `plagiarism_health` | - | Check system health and version |
| `plagiarism_stats` | - | Get algorithm statistics |
| `plagiarism_scan` | MinHash | Scan URL for similar templates |
| `plagiarism_lsh_index` | MinHash + LSH | Index functions for O(1) lookup |
| `plagiarism_similar_functions` | LSH | Find similar JS functions |
| `plagiarism_pagerank` | PageRank (1996) | Identify originals vs copies |
| `plagiarism_pagerank_leaderboard` | PageRank | Top authoritative templates |
| `plagiarism_detect_frameworks` | Regex | Detect 15+ JS frameworks |
| `plagiarism_confidence` | Bayes' theorem | Calculate plagiarism probability |
| `plagiarism_exclude` | - | Mark pair as false positive |

## Installation

```bash
cd packages/webflow-mcp
pnpm install
pnpm build
```

## Configuration

### Claude Code / Cursor

Add to your MCP configuration (`.cursor/mcp.json` or similar):

```json
{
  "mcpServers": {
    "webflow": {
      "command": "node",
      "args": ["/path/to/create-something-monorepo/packages/webflow-mcp/dist/index.js"]
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "webflow": {
      "command": "node",
      "args": ["/path/to/create-something-monorepo/packages/webflow-mcp/dist/index.js"]
    }
  }
}
```

## Usage Examples

Once configured, your AI agent can use these tools:

```
> Use plagiarism_scan to check if https://suspicious-template.webflow.io 
  is similar to any indexed templates

> Use plagiarism_pagerank to identify which templates are likely originals

> Use plagiarism_confidence to calculate plagiarism probability between 
  template "startub" and "nimatra"

> Use plagiarism_detect_frameworks to see what JS libraries 
  https://fancy-template.webflow.io uses
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              AI Agent (Claude, Cursor, etc.)            │
│                         ↓                                │
│                   MCP Protocol                           │
│                         ↓                                │
├─────────────────────────────────────────────────────────┤
│                   webflow-mcp                            │
│   plagiarism_scan, plagiarism_pagerank, etc.            │
│                         ↓                                │
│                   HTTP Requests                          │
│                         ↓                                │
├─────────────────────────────────────────────────────────┤
│         Plagiarism Agent (Cloudflare Worker)            │
│   https://plagiarism-agent.createsomething.workers.dev  │
│                         ↓                                │
│              Classic CS Algorithms                       │
│   LSH (1998) • PageRank (1996) • Bayesian • Regex       │
└─────────────────────────────────────────────────────────┘
```

## Backend

All tools call the Plagiarism Agent Worker which handles:
- **9,500+ templates indexed** with MinHash signatures
- **85,000+ JS functions** extracted and hashed
- **D1 database** for persistence
- **Vectorize** for embedding similarity

## Adding New Tools

To add more Webflow Marketplace tools:

1. Create a new file in `src/tools/` (e.g., `submission.ts`)
2. Export async functions that call your Worker endpoints
3. Add tool definitions in `src/index.ts` under `ListToolsRequestSchema`
4. Add tool handlers in `src/index.ts` under `CallToolRequestSchema`
5. Rebuild: `pnpm build`

## Testing

```bash
# Test MCP server lists tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js

# Test a specific tool
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"plagiarism_health","arguments":{}}}' | node dist/index.js
```
