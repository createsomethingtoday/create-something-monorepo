import type { AgentConversation, AgentRunReceipt, AgentStore } from './types.js';

type ConversationRow = {
  id: string;
  agent_id: string;
  previous_response_id: string | null;
};

export class D1AgentStore implements AgentStore {
  constructor(private readonly database: D1Database) {}

  async getConversation(id: string): Promise<AgentConversation | null> {
    const row = await this.database
      .prepare('SELECT id, agent_id, previous_response_id FROM agent_conversations WHERE id = ?1')
      .bind(id)
      .first<ConversationRow>();
    if (!row) return null;
    return {
      id: row.id,
      agentId: row.agent_id,
      previousResponseId: row.previous_response_id ?? undefined
    };
  }

  async saveConversation(conversation: AgentConversation): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO agent_conversations (id, agent_id, previous_response_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           previous_response_id = excluded.previous_response_id,
           updated_at = datetime('now')`
      )
      .bind(conversation.id, conversation.agentId, conversation.previousResponseId ?? null)
      .run();
  }

  async saveReceipt(receipt: AgentRunReceipt): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO agent_run_receipts
          (id, conversation_id, agent_id, provider, model, status, tool_calls_json,
           connected_servers_json, started_at, completed_at, error)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
      )
      .bind(
        receipt.id,
        receipt.conversationId,
        receipt.agentId,
        receipt.provider,
        receipt.model,
        receipt.status,
        JSON.stringify(receipt.toolCalls),
        JSON.stringify(receipt.connectedServers),
        receipt.startedAt,
        receipt.completedAt,
        receipt.error ?? null
      )
      .run();
  }
}
