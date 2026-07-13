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

export type ConversationClaim =
  | { status: 'claimed'; conversation: AgentConversation }
  | { status: 'busy' }
  | { status: 'agent_mismatch' };

export interface AgentStore {
  claimConversation(input: {
    id: string;
    agentId: string;
    runId: string;
  }): Promise<ConversationClaim>;
  completeRun(input: {
    conversation: AgentConversation;
    runId: string;
    receipt: AgentRunReceipt;
  }): Promise<void>;
  failRun(input: {
    conversationId: string;
    runId: string;
    receipt: AgentRunReceipt;
  }): Promise<void>;
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

export type AgentAdmissionDecision = 'allowed' | 'rate_limited';

export interface AgentAdmission {
  check(input: { request: Request; agentId: string }): Promise<AgentAdmissionDecision>;
}
