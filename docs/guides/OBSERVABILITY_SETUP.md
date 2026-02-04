# Agent Observability Setup

This guide covers the observability stack for CREATE SOMETHING agents, combining Cloudflare Workers Automatic Tracing with Langfuse for LLM/MCP-specific observability.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                          │
│    Cloudflare Workers Automatic Tracing (OTLP Export)           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Agent Layer                                 │
│    Langfuse (MCP Tracing, Claude SDK, Cost Tracking)            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Unified Dashboard                              │
│    SvelteKit + Loom + Agentic Executor + Langfuse               │
└─────────────────────────────────────────────────────────────────┘
```

## Layer 1: Cloudflare Workers Automatic Tracing

### Enabling Tracing

Tracing is enabled in `wrangler.jsonc` for each package:

```jsonc
{
  "observability": {
    "enabled": true,
    "traces": {
      "enabled": true,
      "head_sampling_rate": 0.1  // 10% sampling rate
    }
  }
}
```

For `.toml` configs:

```toml
[observability]
enabled = true

[observability.traces]
enabled = true
head_sampling_rate = 0.1
```

### What Gets Traced Automatically

- **Fetch calls** - Outbound HTTP requests
- **Binding calls** - KV, D1, Durable Objects, R2, Queues
- **Handler calls** - fetch, scheduled, queue handlers

### Configuring OTLP Export

1. Go to Cloudflare Dashboard → Workers & Pages → Settings → Observability
2. Add an OTLP destination:
   - **Langfuse**: `https://cloud.langfuse.com/api/public/otel/v1/traces`
   - Headers: `Authorization: Bearer <LANGFUSE_PUBLIC_KEY>`

## Layer 2: Langfuse Integration

### Account Setup

1. Create a Langfuse account at https://cloud.langfuse.com
2. Create a new project for CREATE SOMETHING
3. Get your API keys from Settings → API Keys

### Environment Variables

Add to your worker/package secrets:

```bash
# Set via wrangler for each Pages project
wrangler pages secret put LANGFUSE_PUBLIC_KEY --project-name=create-something-space
wrangler pages secret put LANGFUSE_SECRET_KEY --project-name=create-something-space
wrangler pages secret put LANGFUSE_BASE_URL --project-name=create-something-space

# Repeat for other projects
wrangler pages secret put LANGFUSE_PUBLIC_KEY --project-name=create-something-io
wrangler pages secret put LANGFUSE_SECRET_KEY --project-name=create-something-io
wrangler pages secret put LANGFUSE_BASE_URL --project-name=create-something-io

# Or in .dev.vars for local development
LANGFUSE_PUBLIC_KEY=pk-lf-xxx
LANGFUSE_SECRET_KEY=sk-lf-xxx
LANGFUSE_BASE_URL=https://us.cloud.langfuse.com
```

**CREATE SOMETHING Project Details:**
- Host: `https://us.cloud.langfuse.com`
- Project ID: `cml83rz4i02nkad07i4zwm5mw`
- Region: US

### Using the Tracing Module

```typescript
import { createTrace, createSpan, createGeneration } from '@create-something/observability';

// Create a trace for an operation
const trace = createTrace({
  name: 'mcp-tool-call',
  metadata: {
    // AI Interaction Atlas dimensions
    'touchpoint.mcp_server': 'procore-mcp',
    'ai_task.type': 'generate',
    'system_task.type': 'tool_execution',
  }
});

// Create a span for a sub-operation
const span = createSpan(trace, {
  name: 'fetch-project-data',
  input: { projectId: '123' }
});

// Track an LLM generation
const generation = createGeneration(trace, {
  name: 'claude-completion',
  model: 'claude-sonnet-4-20250514',
  input: messages,
  output: response,
  usage: {
    input_tokens: 150,
    output_tokens: 500
  }
});
```

## AI Interaction Atlas Integration

Apply Atlas vocabulary as trace metadata for consistent observability:

| Atlas Dimension | Trace Key | Example Values |
|-----------------|-----------|----------------|
| **Touchpoints** | `touchpoint.mcp_server` | `procore-mcp`, `github-mcp` |
| **AI Tasks** | `ai_task.type` | `generate`, `classify`, `verify`, `transform` |
| **Human Tasks** | `human_task.oversight_level` | `required`, `recommended`, `optional`, `none` |
| **System Tasks** | `system_task.type` | `routing`, `logging`, `state_management` |
| **Data Artifacts** | `data_artifact.schema` | `rfi`, `daily_log`, `submittal` |
| **Constraints** | `constraint.type` | `budget`, `latency`, `permission` |

## Viewing Traces

### Cloudflare Dashboard

1. Workers & Pages → Your Worker → Traces tab
2. View automatic spans for bindings and fetch calls

### Langfuse Dashboard

1. https://cloud.langfuse.com → Your Project
2. **Traces** - Full trace timeline with nested spans
3. **Generations** - LLM calls with token usage and cost
4. **Sessions** - Group traces by user session
5. **Metrics** - Latency, cost, error rates

## Cost Tracking

Langfuse automatically tracks costs for supported models. Configure custom pricing:

```typescript
createGeneration(trace, {
  name: 'claude-completion',
  model: 'claude-sonnet-4-20250514',
  // Custom cost if not auto-detected
  modelParameters: {
    inputCost: 0.003,  // per 1K tokens
    outputCost: 0.015
  }
});
```

## Self-Hosting (Future)

When volume justifies, migrate to self-hosted Langfuse:

1. Deploy via Docker Compose or Kubernetes
2. Requires: PostgreSQL, ClickHouse, Redis
3. Update `LANGFUSE_HOST` to your self-hosted URL

See: https://langfuse.com/docs/deployment/self-host

## MCP Server Instrumentation

The `@create-something/observability/mcp` module provides utilities for instrumenting MCP servers.

### Basic Integration

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createInstrumentedMcpServer } from '@create-something/observability/mcp';

// Initialize instrumented server
const { wrapToolHandler, shutdown } = createInstrumentedMcpServer({
  serverName: 'my-mcp-server',
  serverVersion: '1.0.0',
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY
});

const server = new Server({ name: 'my-mcp-server', version: '1.0.0' }, { capabilities: { tools: {} } });

// Wrap tool handler with automatic tracing
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return wrapToolHandler(request, async (name, args, context) => {
    switch (name) {
      case 'get_data':
        const data = await fetchData(args.id);
        return { content: [{ type: 'text', text: JSON.stringify(data) }] };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });
});

// Cleanup on exit
process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});
```

### With Tool Metadata

Define Atlas metadata per tool for richer observability:

```typescript
const toolMetadata = {
  get_project: { aiTaskType: 'extract' as const },
  create_rfi: { aiTaskType: 'generate' as const },
  validate_submittal: { aiTaskType: 'verify' as const }
};

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return wrapToolHandler(request, async (name, args, context) => {
    // Handler logic
  }, toolMetadata);
});
```

### Using Traced Handlers Pattern

For cleaner code, use the `createTracedHandlers` utility:

```typescript
import { createTracedHandlers, createInstrumentedMcpServer } from '@create-something/observability/mcp';

const handlers = createTracedHandlers('procore-mcp', {
  get_project: {
    aiTaskType: 'extract',
    handler: async (args, context) => {
      const project = await procoreClient.getProject(args.projectId);
      return { content: [{ type: 'text', text: JSON.stringify(project) }] };
    }
  },
  create_rfi: {
    aiTaskType: 'generate',
    handler: async (args, context) => {
      const rfi = await procoreClient.createRfi(args);
      return { content: [{ type: 'text', text: JSON.stringify(rfi) }] };
    }
  }
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return wrapToolHandler(request, async (n, a, ctx) => {
    return handlers.handle(n, a, ctx);
  }, handlers.metadata);
});
```

### What Gets Traced

For each MCP tool call, the instrumentation captures:

- **Trace**: Full request lifecycle with Atlas metadata
- **Span**: Execution timing and success/failure
- **Events**: Errors with stack traces
- **Metadata**: Server name, tool name, AI task type

View traces in Langfuse Dashboard → Traces → Filter by tag `mcp`.

## Related Documentation

- [MCP First Thesis](../MCP_FIRST_THESIS.md) - Strategic context
- [Harness Patterns](../../.claude/rules/harness-patterns.md) - Agent orchestration
- [Loom Patterns](../../.claude/rules/loom-patterns.md) - Task coordination
