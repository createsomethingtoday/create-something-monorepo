# OUTERFIELDS PCN - Remote MCP Server

AI-native platform exploration for Claude Desktop. Ask Claude about your OUTERFIELDS Premium Content Network platform and get intelligent answers about components, patterns, implementation guidance, deployment, and architecture.

## What This Is

A remote MCP (Model Context Protocol) server that gives Claude Desktop deep knowledge about your OUTERFIELDS PCN platform. Once configured, you can ask Claude questions like:

- "How does the VideoModal component work?"
- "Show me the engagement tracking pattern"
- "How do I add a new analytics metric?"
- "What's the deployment process?"
- "Explain the platform architecture"

Claude will respond with detailed documentation, code examples, and implementation guidance specific to your platform.

## Quick Start

### 1. Add to Claude Desktop

Open your Claude Desktop settings and add this to your MCP servers configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "outerfields-pcn": {
      "url": "https://mcp.outerfields.io"
    }
  }
}
```

### 2. Restart Claude Desktop

Close and reopen Claude Desktop to load the MCP server.

### 3. Verify

In a new Claude chat, type:

```
What tools do you have access to for OUTERFIELDS?
```

Claude should list 5 PCN tools:
- `pcn_explore_component` - Component documentation
- `pcn_explain_pattern` - Architectural patterns
- `pcn_guide_extension` - Extension guides
- `pcn_deployment` - Deployment guidance
- `pcn_architecture` - System overview

### 4. Start Exploring

Ask Claude about your platform:

```
Explain how the VideoModal component works
```

```
Show me the engagement tracking pattern
```

```
How do I add a new analytics metric to the dashboard?
```

```
What's the platform architecture?
```

## Available Documentation

### Components
- **VideoModal**: Cinematic video player with engagement tracking
- **Heatmap**: Visual replay pattern analysis
- **MetricsDashboard**: Real-time analytics display
- **ComponentLab**: Live component preview system
- **Navigation**: Fixed header with auth state

### Patterns
- **engagement-tracking**: How video engagement is tracked and stored
- **analytics-pipeline**: Real-time metrics collection and display
- **cloudflare-integration**: D1, KV, R2 usage patterns
- **authentication**: Auth flow and protected routes
- **deployment**: Build and deploy process

### Extension Guides
- **add-metric**: Add new analytics metrics
- **new-video-feature**: Add video player features
- **custom-heatmap**: Create custom heatmap visualizations
- **api-endpoint**: Create new API endpoints
- **admin-feature**: Add admin-only functionality

### Deployment Topics
- **build-deploy**: Build process and Cloudflare Pages deployment
- **environment-vars**: Required environment variables
- **troubleshooting**: Common deployment issues
- **database-migrations**: D1 database schema updates
- **monitoring**: Analytics and error tracking

## Technical Details

- **Server**: Cloudflare Workers (global edge, no cold starts)
- **Protocol**: MCP (Model Context Protocol) via JSON-RPC 2.0
- **Transport**: HTTPS
- **Authentication**: None required (read-only documentation)
- **Rate Limit**: 100,000 requests/day (Cloudflare free tier)

## Example Queries

**Component exploration**:
```
Claude, explore the VideoModal component
```

**Pattern explanation**:
```
Explain the engagement tracking pattern
```

**Extension guidance**:
```
How do I add a new analytics metric? I want to track average watch time per user.
```

**Deployment help**:
```
Show me the deployment process
```

**Architecture overview**:
```
Give me a high-level overview of the platform architecture
```

## Support

Questions or issues? Contact CREATE SOMETHING at micah@createsomething.io
