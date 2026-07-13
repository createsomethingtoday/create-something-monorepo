import type {
  AgentConversation,
  AgentRunReceipt,
  AgentStore,
  ConversationClaim
} from './types.js';

type ConversationRow = {
  id: string;
  agent_id: string;
  previous_response_id: string | null;
};

export class D1AgentStore implements AgentStore {
  constructor(private readonly database: D1Database) {}

  async claimConversation(input: {
    id: string;
    agentId: string;
    runId: string;
  }): Promise<ConversationClaim> {
    const claimed = await this.database
      .prepare(
        `INSERT INTO agent_conversations
          (id, agent_id, previous_response_id, active_run_id, active_run_started_at, created_at, updated_at)
         VALUES (?1, ?2, NULL, ?3, datetime('now'), datetime('now'), datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           active_run_id = excluded.active_run_id,
           active_run_started_at = excluded.active_run_started_at,
           updated_at = datetime('now')
         WHERE agent_conversations.agent_id = excluded.agent_id
           AND (
             agent_conversations.active_run_id IS NULL
             OR agent_conversations.active_run_started_at < datetime('now', '-10 minutes')
           )
         RETURNING id, agent_id, previous_response_id`
      )
      .bind(input.id, input.agentId, input.runId)
      .first<ConversationRow>();

    if (claimed) {
      return {
        status: 'claimed',
        conversation: {
          id: claimed.id,
          agentId: claimed.agent_id,
          previousResponseId: claimed.previous_response_id ?? undefined
        }
      };
    }

    const existing = await this.database
      .prepare('SELECT agent_id FROM agent_conversations WHERE id = ?1')
      .bind(input.id)
      .first<{ agent_id: string }>();
    return existing?.agent_id !== input.agentId
      ? { status: 'agent_mismatch' }
      : { status: 'busy' };
  }

  async completeRun(input: {
    conversation: AgentConversation;
    runId: string;
    receipt: AgentRunReceipt;
  }): Promise<void> {
    await this.finishRun(
      input.conversation.id,
      input.runId,
      input.receipt,
      input.conversation.previousResponseId
    );
  }

  async failRun(input: {
    conversationId: string;
    runId: string;
    receipt: AgentRunReceipt;
  }): Promise<void> {
    await this.finishRun(input.conversationId, input.runId, input.receipt);
  }

  private async finishRun(
    conversationId: string,
    runId: string,
    receipt: AgentRunReceipt,
    previousResponseId?: string
  ): Promise<void> {
    const insertReceipt = this.database
      .prepare(
        `INSERT INTO agent_run_receipts
          (id, conversation_id, agent_id, provider, model, status, tool_calls_json,
           connected_servers_json, started_at, completed_at, error)
         SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11
         FROM agent_conversations
         WHERE id = ?2 AND active_run_id = ?12`
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
        receipt.error ?? null,
        runId
      );
    const release = this.database
      .prepare(
        `UPDATE agent_conversations
         SET previous_response_id = COALESCE(?3, previous_response_id),
             active_run_id = NULL,
             active_run_started_at = NULL,
             updated_at = datetime('now')
         WHERE id = ?1 AND active_run_id = ?2`
      )
      .bind(conversationId, runId, previousResponseId ?? null);

    const [receiptResult, releaseResult] = await this.database.batch([insertReceipt, release]);
    if (receiptResult.meta.changes !== 1 || releaseResult.meta.changes !== 1) {
      throw new Error('Conversation run lease was not held.');
    }
  }
}
