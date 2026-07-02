# Add Your First Tool

## Outcome

Add one focused tool with Zod input validation and structured output.

## Tool Design Rule

Start with one tool that is:
- easy to verify,
- useful in real prompts,
- and impossible to misuse silently.

For the first pass, prefer a read-only or no-op tool. Writes need a stronger contract: dry-run first, explicit confirmation, changed IDs or files, evidence, and a rollback note.

## Example Tool: `echo_text`

Update `src/index.ts` so it imports Zod and registers a tool before connecting the transport:

```ts
import { z } from 'zod/v4';

server.registerTool(
  'echo_text',
  {
    title: 'Echo text',
    description: 'Return input text exactly as provided. Use this only to verify the MCP connection.',
    inputSchema: {
      text: z.string().min(1).describe('Text to echo back')
    },
    outputSchema: {
      text: z.string().describe('The echoed text without the display prefix')
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async ({ text }) => {
    return {
      content: [{ type: 'text', text: `Echo: ${text}` }],
      structuredContent: { text }
    };
  }
);
```

## Why This Matters

This simple tool forces you to implement the full MCP flow:
- advertise a tool name and description,
- validate arguments before work starts,
- tell Codex whether the tool is read-only or destructive,
- return human-readable content,
- return machine-readable `structuredContent`,
- and let the SDK handle bad input clearly.

The schema is part of the product. If Codex has to guess what a field means, the MCP is not ready.

## Build Again

```bash
pnpm --filter @create-something/codex-demo-mcp build
```

## Checkpoint

Your first tool should be boring. That is the point. Before adding real integrations, prove that Codex can discover the tool, pass valid arguments, receive structured data, and explain failures.

## Next

Continue to **Connect the Server to Codex**.
