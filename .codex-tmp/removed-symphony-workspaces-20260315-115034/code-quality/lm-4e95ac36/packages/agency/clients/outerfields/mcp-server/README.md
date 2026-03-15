# OUTERFIELDS PCN Tools

AI-native platform exploration for your Premium Content Network. Get intelligent guidance, architecture explanations, and extension help directly in Claude Desktop.

## What is this?

This MCP (Model Context Protocol) server gives you an AI assistant that understands your OUTERFIELDS platform inside and out. Ask questions about how components work, get step-by-step guides for adding features, and explore architectural patterns—all from any Claude Desktop conversation.

**Think of it as: Built-in AI documentation and development support for your PCN platform.**

## Installation

### 1. Install the package

```bash
npm install -g @outerfields/pcn-tools
```

### 2. Configure Claude Desktop

Add to your Claude Desktop config file:

**macOS/Linux**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "outerfields-pcn": {
      "command": "npx",
      "args": ["@outerfields/pcn-tools"]
    }
  }
}
```

### 3. Restart Claude Desktop

Close and reopen Claude Desktop. The MCP server will be available in all your chats.

## Usage

Just ask Claude about your platform:

**Understand components**:
- "How does the engagement tracking work in my PCN platform?"
- "Explain the VideoModal component"
- "What does the Heatmap component do?"

**Learn patterns**:
- "Explain how analytics data flows through the system"
- "How is authentication handled?"
- "Show me the Cloudflare integration pattern"

**Get implementation guidance**:
- "How do I add a new analytics metric?"
- "Guide me through adding a video player feature"
- "How do I create a custom heatmap visualization?"

**Deployment help**:
- "How do I deploy to production?"
- "What environment variables do I need?"
- "How do I troubleshoot build errors?"

**System overview**:
- "Show me the architecture of my PCN platform"
- "What's the technology stack?"
- "How does data flow through the system?"

## Available Tools

The MCP server provides five specialized tools:

### 1. `pcn_explore_component`
Deep dive into how specific components work (VideoModal, Heatmap, MetricsDashboard, etc.)

### 2. `pcn_explain_pattern`
Understand architectural patterns (engagement tracking, analytics pipeline, Cloudflare integration, auth, deployment)

### 3. `pcn_guide_extension`
Step-by-step guidance for adding features (new metrics, video features, custom heatmaps, API endpoints, admin features)

### 4. `pcn_deployment`
Deployment and maintenance help (build/deploy, environment vars, troubleshooting, migrations, monitoring)

### 5. `pcn_architecture`
High-level system overview with diagrams

## Example Conversation

```
You: How does video engagement tracking work?

Claude: [Uses pcn_explain_pattern]

The engagement tracking pattern works like this:

1. VideoModal tracks playback every 10 seconds
2. POST /api/videos/[id]/engagement stores data in Cloudflare KV
3. engagementStats Svelte store fetches and caches the data
4. Heatmap and MetricsDashboard components reactively display it

Here's the code...
[detailed implementation details]
```

## Why This Matters

**Traditional documentation**: Static, out of date, hard to search

**AI-native documentation**:
- Contextual answers to your specific questions
- Live code examples
- Guidance tailored to what you're building
- Always available, no searching required

This is what "better than Uscreen" means—your platform ships with AI understanding built in.

## Troubleshooting

### MCP server not showing up in Claude Desktop

1. Check config file location is correct
2. Verify JSON syntax (use a JSON validator)
3. Restart Claude Desktop completely
4. Check Claude Desktop logs: `~/Library/Logs/Claude/mcp*.log`

### Commands not working

1. Ensure package is installed: `npm list -g @outerfields/pcn-tools`
2. Try reinstalling: `npm install -g @outerfields/pcn-tools`
3. Check Node.js version: `node --version` (requires 18+)

## Development

Want to extend this MCP server?

```bash
# Clone the repo
cd packages/agency/clients/outerfields/mcp-server

# Install dependencies
pnpm install

# Build
pnpm build

# Test locally
node dist/index.js
```

## Support

Questions? Issues?
- Email: micah@createsomething.io
- Docs: https://outerfields.io/docs

## License

UNLICENSED - Proprietary to OUTERFIELDS clients

---

**Built by CREATE SOMETHING**
AI-native development for Premium Content Networks
