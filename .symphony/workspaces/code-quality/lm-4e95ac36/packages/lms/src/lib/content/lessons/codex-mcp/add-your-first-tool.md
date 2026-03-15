# Add Your First Tool

## Outcome

Add one useful tool and validate its input.

## Tool Design Rule

Start with one tool that is:
- easy to verify,
- useful in real prompts,
- and impossible to misuse silently.

## Example Tool: `echo_text`

Update `src/index.ts`:

```ts
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'echo_text',
      description: 'Return input text exactly as provided.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to echo back' }
        },
        required: ['text']
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'echo_text') {
    const text = typeof args?.text === 'string' ? args.text : null;

    if (!text) {
      return {
        content: [{ type: 'text', text: 'Missing required string field: text' }],
        isError: true
      };
    }

    return {
      content: [{ type: 'text', text: `Echo: ${text}` }]
    };
  }

  return {
    content: [{ type: 'text', text: `Unknown tool: ${name}` }],
    isError: true
  };
});
```

## Why This Matters

This simple tool forces you to implement the full MCP flow:
- advertise tool schema,
- parse arguments,
- return structured responses,
- handle bad input clearly.

## Build Again

```bash
pnpm --filter @create-something/codex-demo-mcp build
```

## Next

Continue to **Connect the Server to Codex**.
