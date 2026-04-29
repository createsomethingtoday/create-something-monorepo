# Agent Observability Setup

This guide covers the observability stack for CREATE SOMETHING agents, combining Cloudflare Workers Automatic Tracing with Langfuse for governed MCP execution visibility and Braintrust for LLM and eval trace amplification.

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                        │
│    Cloudflare Workers Automatic Tracing (OTLP Export)         │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Agent Layer                               │
│    Langfuse + house telemetry (governed MCP execution)        │
│    Braintrust (LLM spans, evals, operator trace amplification)│
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Unified Dashboard                            │
│    SvelteKit + Linear + Agentic Executor + Langfuse           │
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
      "head_sampling_rate": 0.1
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

1. Go to Cloudflare Dashboard -> Workers & Pages -> Settings -> Observability
2. Add an OTLP destination:
   - **Langfuse**: `https://cloud.langfuse.com/api/public/otel/v1/traces`
   - Headers: `Authorization: Bearer <LANGFUSE_PUBLIC_KEY>`

## Layer 2: Langfuse Integration

### Account Setup

1. Create a Langfuse account at https://cloud.langfuse.com
2. Create a new project for CREATE SOMETHING
3. Get your API keys from Settings -> API Keys

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

const trace = createTrace({
  name: 'mcp-tool-call',
  metadata: {
    'touchpoint.mcp_server': 'procore-mcp',
    'ai_task.type': 'generate',
    'system_task.type': 'tool_execution',
  }
});

const span = createSpan(trace, {
  name: 'fetch-project-data',
  input: { projectId: '123' }
});

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

1. Workers & Pages -> Your Worker -> Traces tab
2. View automatic spans for bindings and fetch calls

### Langfuse Dashboard

1. https://cloud.langfuse.com -> Your Project
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
  modelParameters: {
    inputCost: 0.003,
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

const { wrapToolHandler, shutdown } = createInstrumentedMcpServer({
  serverName: 'my-mcp-server',
  serverVersion: '1.0.0',
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY
});

const server = new Server({ name: 'my-mcp-server', version: '1.0.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return wrapToolHandler(request, async (name, args) => {
    switch (name) {
      case 'get_data':
        const data = await fetchData(args.id);
        return { content: [{ type: 'text', text: JSON.stringify(data) }] };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });
});

process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});
```

### Governance Metadata For Policy-Aware Traces

For Hub paths, named lanes, and other governed MCP surfaces, automatic SDK spans are not enough on their own. Traces must carry explicit governance fields that explain the business decision behind execution.

Required fields for governed execution traces:

- `account_id`
- `tenant_id`
- `correlation_id`
- route classification
- policy or review outcome when applicable
- lane slug or bound host for named-lane traffic

Recommended wrapper usage:

```typescript
const { wrapToolHandler } = createInstrumentedMcpServer({
  serverName: 'my-mcp-server',
  getTraceContext: ({ toolName, args }) => ({
    accountId: String(args.accountId ?? ''),
    tenantId: String(args.tenantId ?? ''),
    correlationId: String(args.correlationId ?? ''),
    routeClassification: toolName.startsWith('delete_') ? 'destructive' : 'read',
    policyId: 'policy.hub-route-authorization.v1',
    authzDecision: String(args.authzDecision ?? ''),
    laneSlug: String(args.laneSlug ?? ''),
  }),
});
```

The wrapper keeps traces intentionally DRY:

- governance fields are attached once as metadata
- only business-relevant governance tags are added: `policy`, `route`, `authz`, `lane`
- low-signal transport details stay in metadata or raw logs instead of high-cardinality tags

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
    return { content: [{ type: 'text', text: JSON.stringify({ name, args, trace: context.trace.id }) }] };
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
    handler: async (args) => {
      const project = await procoreClient.getProject(args.projectId);
      return { content: [{ type: 'text', text: JSON.stringify(project) }] };
    }
  },
  create_rfi: {
    aiTaskType: 'generate',
    handler: async (args) => {
      const rfi = await procoreClient.createRfi(args);
      return { content: [{ type: 'text', text: JSON.stringify(rfi) }] };
    }
  }
});
```

### What Gets Traced

For each MCP tool call, the instrumentation captures:

- **Trace** - Full request lifecycle with Atlas metadata
- **Span** - Execution timing and success/failure
- **Events** - Errors with stack traces
- **Metadata** - Server name, tool name, AI task type, and optional governance fields

View traces in Langfuse Dashboard -> Traces -> Filter by tag `mcp`.

## Braintrust Usage Boundary

Braintrust is useful for:

- OpenAI and Agents SDK auto-instrumentation
- eval runs and smoke traces
- operator-facing debugging across named lanes

Braintrust is not the source of truth for policy enforcement. Shared telemetry plus explicit hub/runtime trace records remain the authoritative evidence surface for authorization, quotas, retries, and hub-to-downstream correlation.

## Related Documentation

- [MCP First Thesis](../MCP_FIRST_THESIS.md) - Strategic context
- [docs/BRAINTRUST_TRACING_QUICKSTART.md](../BRAINTRUST_TRACING_QUICKSTART.md) - Braintrust quickstart
- [docs/HUB_EXECUTION_GOVERNANCE_PLAN.md](../HUB_EXECUTION_GOVERNANCE_PLAN.md) - Governance execution order
