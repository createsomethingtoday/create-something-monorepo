# MCP Server Development

## The Question

**"What operations should compose transparently?"**

MCP (Model Context Protocol) servers are not about adding features. They're about creating tools that recede into transparent use—enabling Claude Code to perform complex, multi-step operations as if they were single actions.

## Why MCP Servers?

When you find yourself repeatedly asking Claude to chain operations:
- "List my KV namespaces, then get all keys from namespace X, then read key Y"
- "Query database A, join with data from API B, transform the result"
- "Check git status, run tests, commit if passing, push to remote"

You've found a candidate for an MCP server. **The pattern reveals the need.**

### Zuhandenheit: The Tool Recedes

A well-designed MCP server makes the complexity invisible:

```typescript
// Without MCP: Multiple manual steps
// 1. Claude reads file via Read tool
// 2. User asks Claude to parse data
// 3. Claude processes, user asks for transform
// 4. Claude writes via Write tool
// 5. User asks for validation

// With MCP: Single composed operation
// Claude: "Transform user data using the data-pipeline MCP server"
// Server handles: read → parse → transform → validate → write
```

**The tool disappears; only the transformation remains.**

## MCP Architecture

```
┌─────────────────────────────────────────────┐
│            Claude Code                      │
│  (Orchestrates tool calls)                  │
└─────────────────────────────────────────────┘
                    ↓
         JSON-RPC over stdio
                    ↓
┌─────────────────────────────────────────────┐
│           MCP Server Process                │
│  • Receives requests                        │
│  • Executes operations                      │
│  • Returns structured responses             │
└─────────────────────────────────────────────┘
                    ↓
         Your Resources
    ┌──────┬──────┬──────┬──────┐
    │  D1  │  KV  │  R2  │ APIs │
    └──────┴──────┴──────┴──────┘
```

### Communication Pattern

MCP servers communicate via JSON-RPC over standard input/output:

```json
// Claude → Server
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "kv_get",
    "arguments": {
      "namespace_id": "abc123",
      "key": "user:42"
    }
  }
}

// Server → Claude
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "value": "{\"name\":\"Alice\",\"role\":\"admin\"}",
    "metadata": {
      "created": 1699564800
    }
  }
}
```

## Building a Custom MCP Server

### When to Build

Ask the Subtractive Triad:

1. **DRY**: Am I repeating this operation pattern?
2. **Rams**: Does this server earn its existence, or is it premature abstraction?
3. **Heidegger**: Does this serve the whole system, or just one use case?

**Rule of thumb**: Build an MCP server after the third time you manually chain the same operations.

### Structure

```
packages/mcp-server-example/
├── src/
│   ├── index.ts           # Server entry point
│   ├── tools/             # Tool implementations
│   │   ├── analyze.ts
│   │   ├── transform.ts
│   │   └── export.ts
│   ├── types.ts           # Shared types
│   └── utils.ts           # Helper functions
├── package.json
├── tsconfig.json
└── README.md
```

### Minimal Server Implementation

```typescript
// src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Tool definitions
const TOOLS = [
  {
    name: 'analyze_codebase',
    description: 'Analyze codebase for duplication patterns (DRY)',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to analyze' },
        patterns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Patterns to search for (regex)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'extract_component',
    description: 'Extract repeated code into a shared component',
    inputSchema: {
      type: 'object',
      properties: {
        sourcePath: { type: 'string' },
        targetPath: { type: 'string' },
        codeBlock: { type: 'string', description: 'Code to extract' },
      },
      required: ['sourcePath', 'targetPath', 'codeBlock'],
    },
  },
] as const;

// Create server
const server = new Server(
  {
    name: 'create-something-refactor',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'analyze_codebase':
      return await analyzeCodebase(args.path, args.patterns);

    case 'extract_component':
      return await extractComponent(
        args.sourcePath,
        args.targetPath,
        args.codeBlock
      );

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Tool implementations
async function analyzeCodebase(
  path: string,
  patterns?: string[]
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // Implementation:
  // 1. Walk directory tree
  // 2. Search for patterns
  // 3. Group by similarity
  // 4. Return structured findings

  const findings = {
    duplicates: [
      {
        pattern: 'Email validation regex',
        occurrences: 3,
        locations: [
          'src/auth/validate.ts:12',
          'src/users/check.ts:45',
          'src/newsletter/subscribe.ts:78',
        ],
      },
    ],
    candidates: [
      {
        type: 'function',
        signature: 'formatDate(date: Date): string',
        occurrences: 5,
        extractTo: 'src/shared/utils/format.ts',
      },
    ],
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(findings, null, 2),
      },
    ],
  };
}

async function extractComponent(
  sourcePath: string,
  targetPath: string,
  codeBlock: string
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // Implementation:
  // 1. Read source file
  // 2. Extract code block
  // 3. Create new file at target
  // 4. Replace source with import
  // 5. Update all occurrences

  return {
    content: [
      {
        type: 'text',
        text: `Extracted component to ${targetPath}\nUpdated ${sourcePath} to import`,
      },
    ],
  };
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
```

### Package Configuration

```json
// package.json
{
  "name": "@create-something/mcp-server-refactor",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "create-something-refactor": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "prepare": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0"
  }
}
```

## Integration with Claude Code

### Configure MCP Server

Add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "refactor": {
      "command": "node",
      "args": [
        "/absolute/path/to/packages/mcp-server-refactor/dist/index.js"
      ],
      "env": {
        "PROJECT_ROOT": "/Users/you/project"
      }
    }
  }
}
```

**For published servers**:
```json
{
  "mcpServers": {
    "refactor": {
      "command": "npx",
      "args": ["-y", "@create-something/mcp-server-refactor"]
    }
  }
}
```

### Usage

```
User: "Analyze packages/space for duplicate patterns"

Claude: [Uses analyze_codebase tool via MCP]
Found 3 duplicate email validations. Extract to shared utility?

User: "Yes, extract to src/shared/validation/email.ts"

Claude: [Uses extract_component tool via MCP]
Done. Updated 3 files to import from shared module.
```

**The complexity is hidden. The tool has receded.**

## Advanced Patterns

### Stateful Operations

MCP servers can maintain state across calls:

```typescript
class RefactorSession {
  private pendingChanges: Map<string, string> = new Map();

  async proposeExtraction(source: string, target: string, code: string) {
    // Store pending change
    this.pendingChanges.set(source, target);
    return { status: 'pending', preview: '...' };
  }

  async commitChanges() {
    // Apply all pending changes atomically
    for (const [source, target] of this.pendingChanges) {
      await applyChange(source, target);
    }
    this.pendingChanges.clear();
  }
}
```

### Resource Providers

MCP servers can expose resources (not just tools):

```typescript
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'canon://tokens',
        name: 'CSS Canon Tokens',
        mimeType: 'application/json',
      },
      {
        uri: 'canon://patterns',
        name: 'Component Patterns',
        mimeType: 'application/json',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === 'canon://tokens') {
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(CANON_TOKENS),
        },
      ],
    };
  }
});
```

Claude can then reference these resources in context.

### Prompts

MCP servers can provide structured prompts:

```typescript
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'dry-audit',
        description: 'Audit for DRY violations',
        arguments: [
          {
            name: 'path',
            description: 'Path to audit',
            required: true,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'dry-audit') {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze ${args.path} for duplicate code patterns. Apply DRY principle: identify repeated logic, suggest unified implementations.`,
          },
        },
      ],
    };
  }
});
```

## Error Handling

MCP servers should fail gracefully:

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    // Tool execution
  } catch (error) {
    // Return structured error
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}\n\nSuggested fix: ${suggestFix(error)}`,
        },
      ],
      isError: true,
    };
  }
});

function suggestFix(error: Error): string {
  if (error.message.includes('ENOENT')) {
    return 'File not found. Check the path and try again.';
  }
  if (error.message.includes('permission')) {
    return 'Permission denied. Run with appropriate privileges.';
  }
  return 'Unknown error. Check server logs.';
}
```

## Testing MCP Servers

### Unit Tests

```typescript
// src/tools/analyze.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeCodebase } from './analyze';

describe('analyzeCodebase', () => {
  it('detects exact duplication', async () => {
    const result = await analyzeCodebase('test/fixtures/duplicates');

    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].occurrences).toBe(3);
  });

  it('suggests extraction location', async () => {
    const result = await analyzeCodebase('test/fixtures/patterns');

    expect(result.candidates[0].extractTo).toMatch(/shared\/utils/);
  });
});
```

### Integration Tests

```typescript
// test/integration.test.ts
import { createTestServer } from './helpers';

describe('MCP Server Integration', () => {
  it('handles full refactor workflow', async () => {
    const server = await createTestServer();

    // 1. Analyze
    const analysis = await server.call('analyze_codebase', {
      path: 'test/fixtures',
    });

    // 2. Extract
    const extraction = await server.call('extract_component', {
      sourcePath: analysis.duplicates[0].locations[0],
      targetPath: 'shared/utils/validate.ts',
      codeBlock: 'function isValidEmail...',
    });

    expect(extraction.status).toBe('success');
  });
});
```

### Manual Testing

```bash
# Start server in debug mode
node dist/index.js

# Send JSON-RPC request
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js

# Expected response:
# {"jsonrpc":"2.0","id":1,"result":{"tools":[...]}}
```

## Publishing

### NPM Package

```bash
# Build
pnpm build

# Publish
npm publish --access public
```

### Usage by Others

```json
// User's .mcp.json
{
  "mcpServers": {
    "create-something-refactor": {
      "command": "npx",
      "args": ["-y", "@create-something/mcp-server-refactor"]
    }
  }
}
```

## Real-World Example: Cloudflare MCP Server

Study the official Cloudflare MCP server:

```typescript
// Tools provided:
// - kv_list_namespaces
// - kv_get
// - kv_put
// - d1_query
// - pages_deploy

// Pattern:
// 1. Tool takes high-level intent
// 2. Server composes multiple API calls
// 3. Returns unified result
```

**Why this works**: Cloudflare operations frequently compose (list → get → transform → put). The MCP server makes this feel like one operation.

## The Discipline

### When NOT to Build

Don't build an MCP server for:
- One-off operations (use Bash tool)
- Simple wrappers (just use the CLI)
- Operations that don't compose (separate tools are fine)

**Anti-pattern**: Building an MCP server that just wraps `git status`. This doesn't compose; it's a single operation. Use Bash directly.

### When TO Build

Build an MCP server when:
- Operations naturally chain together
- You're repeating the same sequence multiple times
- Context needs to persist across steps
- The workflow is complex but the intent is simple

**Pattern**: "I find myself always doing X, then Y, then Z" → MCP server candidate.

## Praxis Integration

This lesson pairs with:
- **Praxis**: Build a custom MCP server for CREATE SOMETHING canon queries
- **Skill**: `mcp-development` — guides server creation
- **Paper**: Code Mode Hermeneutic Analysis — theoretical grounding

---

## Reflection

Before the praxis exercise:

1. What operations do you repeatedly chain in your workflow?
2. Which of these are truly compositional (output of one feeds the next)?
3. What would disappearing this complexity enable you to do?

**The goal isn't automation—it's transparent composition.**

When the tool recedes, the work reveals itself.
