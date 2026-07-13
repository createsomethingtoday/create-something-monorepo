export type AgentAccess = 'public_read_only';

export type McpServerDefinition = {
  id: string;
  url: string;
  allowedTools: string[];
};

export type AgentDefinition = {
  id: string;
  name: string;
  description: string;
  access: AgentAccess;
  model: string;
  maxTurns: number;
  instructions: string;
  mcpServers: McpServerDefinition[];
  allowedTools: string[];
};

export type AgentConversation = {
  id: string;
  agentId: string;
  previousResponseId?: string;
};

export type ToolCallReceipt = {
  server: string;
  tool: string;
  status: 'completed' | 'failed';
};

export type AgentRunReceipt = {
  id: string;
  conversationId: string;
  agentId: string;
  provider: 'openai';
  model: string;
  status: 'completed' | 'failed';
  toolCalls: ToolCallReceipt[];
  connectedServers: string[];
  startedAt: string;
  completedAt: string;
  error?: string;
};

export interface AgentStore {
  getConversation(id: string): Promise<AgentConversation | null>;
  saveConversation(conversation: AgentConversation): Promise<void>;
  saveReceipt(receipt: AgentRunReceipt): Promise<void>;
}

export type AgentExecutorInput = {
  definition: AgentDefinition;
  query: string;
  previousResponseId?: string;
  conversationId: string;
};

export type AgentExecutorEvent =
  | { type: 'text_delta'; delta: string }
  | {
      type: 'completed';
      output: string;
      providerResponseId?: string;
      toolCalls: ToolCallReceipt[];
      connectedServers: string[];
    };

export interface AgentExecutor {
  run(input: AgentExecutorInput): AsyncIterable<AgentExecutorEvent>;
}
