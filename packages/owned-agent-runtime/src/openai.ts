import type { AgentExecutor, AgentExecutorInput, ToolCallReceipt } from './types.js';

type AgentsSdk = typeof import('@openai/agents');

let agentsSdkPromise: Promise<AgentsSdk> | undefined;

async function loadAgentsSdk(): Promise<AgentsSdk> {
  if (agentsSdkPromise) return agentsSdkPromise;

  const runtimeProcess = (globalThis as { process?: { browser?: boolean; type?: string } }).process;
  if (runtimeProcess) {
    runtimeProcess.browser = true;
    runtimeProcess.type = runtimeProcess.type ?? 'renderer';
  }
  agentsSdkPromise = import('@openai/agents');
  return agentsSdkPromise;
}

function toolReceipts(
  items: unknown[],
  definition: AgentExecutorInput['definition']
): ToolCallReceipt[] {
  const serverByTool = new Map<string, string>();
  for (const server of definition.mcpServers) {
    for (const tool of server.allowedTools) serverByTool.set(tool, server.id);
  }

  return items.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as { type?: string; rawItem?: { name?: string; type?: string } };
    if (candidate.type !== 'tool_call_item' || !candidate.rawItem?.name) return [];
    return [
      {
        server: serverByTool.get(candidate.rawItem.name) ?? 'unknown',
        tool: candidate.rawItem.name,
        status: 'completed' as const
      }
    ];
  });
}

export class OpenAIAgentExecutor implements AgentExecutor {
  constructor(
    private readonly apiKey: string,
    private readonly mcpFetchers: Partial<Record<string, typeof fetch>> = {}
  ) {}

  async *run(input: AgentExecutorInput) {
    const sdk = await loadAgentsSdk();
    sdk.setDefaultOpenAIKey(this.apiKey);

    const requestedServers = input.definition.mcpServers.map(
      (server) =>
        new sdk.MCPServerStreamableHttp({
          name: server.id,
          url: server.url,
          cacheToolsList: true,
          timeout: 20_000,
          toolFilter: { allowedToolNames: server.allowedTools },
          fetch: this.mcpFetchers[server.id]
        })
    );
    const servers = await sdk.connectMcpServers(requestedServers, {
      connectInParallel: true,
      connectTimeoutMs: 20_000,
      closeTimeoutMs: 20_000,
      dropFailed: true,
      strict: false
    });

    try {
      const discovery = await Promise.allSettled(
        servers.active.map(async (server) => {
          await server.listTools();
          return server;
        })
      );
      const healthyServers = discovery.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : []
      );
      if (healthyServers.length === 0) throw new Error('No configured MCP servers are reachable.');
      const agent = new sdk.Agent({
        name: input.definition.name,
        instructions: input.definition.instructions,
        model: input.definition.model,
        mcpServers: healthyServers
      });
      const runner = new sdk.Runner({
        tracingDisabled: false,
        traceIncludeSensitiveData: false,
        workflowName: input.definition.id
      });
      const result = await runner.run(agent, input.query, {
        stream: true,
        maxTurns: input.definition.maxTurns,
        previousResponseId: input.previousResponseId
      });
      let output = '';
      for await (const delta of result.toTextStream()) {
        output += delta;
        yield { type: 'text_delta' as const, delta };
      }
      await result.completed;
      if (result.error) throw result.error;
      yield {
        type: 'completed' as const,
        output,
        providerResponseId: result.lastResponseId,
        toolCalls: toolReceipts(result.newItems, input.definition),
        connectedServers: healthyServers.map((server) => server.name)
      };
    } finally {
      await servers.close();
    }
  }
}
