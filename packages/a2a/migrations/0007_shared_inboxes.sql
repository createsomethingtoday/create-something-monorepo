-- Additive v2 product. No v1 identity/grant conversion.
CREATE TABLE shared_agents(id TEXT PRIMARY KEY,owner_subject TEXT NOT NULL,name TEXT NOT NULL,paused INTEGER NOT NULL DEFAULT 0,deleted_at INTEGER,created_at INTEGER NOT NULL);
CREATE INDEX shared_agents_owner ON shared_agents(owner_subject);
CREATE TABLE shared_inboxes(id TEXT PRIMARY KEY,owner_subject TEXT NOT NULL,name TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'active',policy_version INTEGER NOT NULL DEFAULT 2,created_at INTEGER NOT NULL);
CREATE TABLE shared_connections(id TEXT PRIMARY KEY,owner_subject TEXT NOT NULL,family_id TEXT NOT NULL,label TEXT NOT NULL,client_id TEXT,agent_id TEXT REFERENCES shared_agents(id),state TEXT NOT NULL DEFAULT 'pending',created_at INTEGER NOT NULL,UNIQUE(owner_subject,family_id));
CREATE TABLE shared_invitations(id TEXT PRIMARY KEY,inbox_id TEXT NOT NULL REFERENCES shared_inboxes(id),agent_id TEXT NOT NULL REFERENCES shared_agents(id),owner_subject TEXT NOT NULL,capabilities TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'pending',expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL,admission_cursor INTEGER);
CREATE TABLE shared_memberships(inbox_id TEXT NOT NULL REFERENCES shared_inboxes(id),agent_id TEXT NOT NULL REFERENCES shared_agents(id),generation INTEGER NOT NULL,state TEXT NOT NULL,capabilities TEXT NOT NULL,admission_cursor INTEGER NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(inbox_id,agent_id));
CREATE TABLE shared_messages(cursor INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE NOT NULL,inbox_id TEXT NOT NULL REFERENCES shared_inboxes(id),author_agent_id TEXT,author_kind TEXT NOT NULL DEFAULT 'agent',author_name TEXT NOT NULL DEFAULT '',actor_key TEXT,kind TEXT NOT NULL,text TEXT NOT NULL,assignee_agent_id TEXT,assignment_version INTEGER NOT NULL DEFAULT 1,state TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,idempotency_key TEXT,claim_token TEXT,claim_connection_id TEXT,claim_generation INTEGER,claim_until INTEGER,UNIQUE(inbox_id,author_agent_id,idempotency_key),UNIQUE(inbox_id,actor_key,idempotency_key));
CREATE INDEX shared_messages_inbox ON shared_messages(inbox_id,cursor);
CREATE TABLE shared_context(id TEXT PRIMARY KEY,inbox_id TEXT NOT NULL,cursor INTEGER NOT NULL,title TEXT NOT NULL,text TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,uploader_subject TEXT NOT NULL,sha256 TEXT NOT NULL,revoked_at INTEGER);
CREATE TABLE shared_outbox(id TEXT PRIMARY KEY,message_id TEXT NOT NULL,inbox_id TEXT NOT NULL,cursor INTEGER NOT NULL,assignment_version INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,published_at INTEGER,UNIQUE(message_id,assignment_version));
CREATE TABLE shared_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,resource_type TEXT NOT NULL,resource_id TEXT NOT NULL,event TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TRIGGER shared_connection_audit AFTER UPDATE ON shared_connections WHEN OLD.state!=NEW.state OR OLD.agent_id IS NOT NEW.agent_id BEGIN INSERT INTO shared_audit(resource_type,resource_id,event,created_at) VALUES('connection',NEW.id,OLD.state||'>'||NEW.state,unixepoch()*1000); END;
CREATE TRIGGER shared_invitation_audit AFTER UPDATE ON shared_invitations WHEN OLD.state!=NEW.state BEGIN INSERT INTO shared_audit(resource_type,resource_id,event,created_at) VALUES('invitation',NEW.id,OLD.state||'>'||NEW.state,unixepoch()*1000); END;
CREATE TRIGGER shared_membership_audit AFTER UPDATE ON shared_memberships BEGIN INSERT INTO shared_audit(resource_type,resource_id,event,created_at) VALUES('membership',NEW.inbox_id||'/'||NEW.agent_id,OLD.state||'>'||NEW.state||':'||NEW.generation,unixepoch()*1000); END;
CREATE TRIGGER shared_membership_join_audit AFTER INSERT ON shared_memberships BEGIN INSERT INTO shared_audit(resource_type,resource_id,event,created_at) VALUES('membership',NEW.inbox_id||'/'||NEW.agent_id,'admitted:'||NEW.generation,unixepoch()*1000); END;
CREATE TRIGGER shared_agent_audit AFTER UPDATE ON shared_agents BEGIN INSERT INTO shared_audit(resource_type,resource_id,event,created_at) VALUES('agent',NEW.id,'paused:'||NEW.paused||'/deleted:'||coalesce(NEW.deleted_at,0),unixepoch()*1000); END;
CREATE TRIGGER shared_inbox_audit AFTER UPDATE ON shared_inboxes BEGIN INSERT INTO shared_audit(resource_type,resource_id,event,created_at) VALUES('inbox',NEW.id,OLD.state||'>'||NEW.state,unixepoch()*1000); END;
-- Compact non-content retention floors persist with the inbox so old catch-up
-- requests still disclose loss after ninety-day content metadata is erased.
CREATE TABLE shared_retention_watermarks (
 inbox_id TEXT PRIMARY KEY REFERENCES shared_inboxes(id),
 pruned_through_cursor INTEGER NOT NULL DEFAULT 0,
 pruned_through_event_cursor INTEGER NOT NULL DEFAULT 0,
 last_pruned_at INTEGER NOT NULL
);
