CREATE TABLE IF NOT EXISTS agent_conversations (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  previous_response_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_agent
  ON agent_conversations(agent_id, updated_at);

CREATE TABLE IF NOT EXISTS agent_run_receipts (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed')),
  tool_calls_json TEXT NOT NULL,
  connected_servers_json TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  error TEXT,
  FOREIGN KEY (conversation_id) REFERENCES agent_conversations(id)
);

CREATE INDEX IF NOT EXISTS idx_agent_run_receipts_conversation
  ON agent_run_receipts(conversation_id, started_at);
