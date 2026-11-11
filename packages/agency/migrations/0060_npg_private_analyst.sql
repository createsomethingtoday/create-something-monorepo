-- NPG-only private state. Identity subject + fixed scope is the ownership boundary.
CREATE TABLE npg_analyst_conversations (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, scope TEXT NOT NULL DEFAULT 'npg' CHECK(scope='npg'),
 version INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'idle'
 CHECK(status IN ('idle','running','review','interrupted','ambiguous')),
 state_json TEXT NOT NULL DEFAULT '{"messages":[],"sources":[]}',
 run_id TEXT, lease_token TEXT, lease_until INTEGER NOT NULL DEFAULT 0,
 paid_dispatched INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX npg_analyst_owner ON npg_analyst_conversations(owner_id,scope,updated_at);
CREATE TABLE npg_analyst_admission (
 owner_id TEXT PRIMARY KEY, window_at INTEGER NOT NULL, requests INTEGER NOT NULL,
 lease_token TEXT, lease_until INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE npg_analyst_actions (
 id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES npg_analyst_conversations(id),
 owner_id TEXT NOT NULL, version INTEGER NOT NULL, tool TEXT NOT NULL, arguments_json TEXT NOT NULL,
 call_id TEXT NOT NULL, response_id TEXT NOT NULL, review_json TEXT NOT NULL, expires_at INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','rejected','expired','dispatching','completed','ambiguous'))
);
CREATE TRIGGER npg_action_immutable BEFORE UPDATE ON npg_analyst_actions
 WHEN NEW.id IS NOT OLD.id OR NEW.conversation_id IS NOT OLD.conversation_id
 OR NEW.owner_id IS NOT OLD.owner_id OR NEW.version IS NOT OLD.version OR NEW.tool IS NOT OLD.tool
 OR NEW.arguments_json IS NOT OLD.arguments_json OR NEW.call_id IS NOT OLD.call_id
 OR NEW.response_id IS NOT OLD.response_id OR NEW.review_json IS NOT OLD.review_json OR NEW.expires_at IS NOT OLD.expires_at
 BEGIN SELECT RAISE(ABORT,'NPG action is immutable'); END;
CREATE TABLE npg_analyst_receipts (
 run_id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, owner_id TEXT NOT NULL,
 version INTEGER NOT NULL, outcome TEXT NOT NULL, tool_count INTEGER NOT NULL,
 policy_sha256 TEXT NOT NULL, finished_at INTEGER NOT NULL
);
CREATE TRIGGER npg_receipt_no_update BEFORE UPDATE ON npg_analyst_receipts
 BEGIN SELECT RAISE(ABORT,'NPG receipt is immutable'); END;
CREATE TRIGGER npg_receipt_no_delete BEFORE DELETE ON npg_analyst_receipts
 BEGIN SELECT RAISE(ABORT,'NPG receipt is immutable'); END;
-- Serialize shared-allowance readiness and dispatch across NPG users as well as conversations.
CREATE TABLE npg_analyst_paid_lease (
 scope TEXT PRIMARY KEY CHECK(scope='npg'), token TEXT NOT NULL, lease_until INTEGER NOT NULL
);
