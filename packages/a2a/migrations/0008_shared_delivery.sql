-- Independent v2 event delivery; credentials are encrypted and erased at termination.
CREATE TABLE shared_subscriptions (
 id TEXT PRIMARY KEY, owner_subject TEXT NOT NULL, connection_id TEXT NOT NULL REFERENCES shared_connections(id),
 agent_id TEXT NOT NULL REFERENCES shared_agents(id), inbox_id TEXT NOT NULL REFERENCES shared_inboxes(id), generation INTEGER NOT NULL,
 callback_url TEXT NOT NULL, secret_ciphertext TEXT NOT NULL, token_ciphertext TEXT NOT NULL,
 previous_secret_ciphertext TEXT, previous_secret_until INTEGER, status TEXT NOT NULL,
 cursor INTEGER NOT NULL, replay_floor_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL,
 revision TEXT NOT NULL
);
CREATE INDEX shared_subscriptions_due ON shared_subscriptions(status,expires_at);
CREATE TABLE shared_deliveries (
 id TEXT PRIMARY KEY,event_id TEXT NOT NULL REFERENCES shared_outbox(id),subscription_id TEXT NOT NULL REFERENCES shared_subscriptions(id),
 assignment_version INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt_at INTEGER NOT NULL,lease_until INTEGER,lease_token TEXT,last_error TEXT,accepted_at INTEGER,
 UNIQUE(event_id,subscription_id,assignment_version)
);
CREATE INDEX shared_deliveries_due ON shared_deliveries(state,next_attempt_at);

-- Event replay order is independent of transcript/admission order. Reassignment
-- creates another outbox event for the same message and must get a new position.
CREATE TABLE shared_event_positions (
 cursor INTEGER PRIMARY KEY AUTOINCREMENT,
 event_id TEXT NOT NULL UNIQUE REFERENCES shared_outbox(id)
);
INSERT INTO shared_event_positions(event_id) SELECT id FROM shared_outbox ORDER BY rowid;
CREATE TRIGGER shared_outbox_position AFTER INSERT ON shared_outbox BEGIN
 INSERT INTO shared_event_positions(event_id) VALUES(NEW.id);
END;
