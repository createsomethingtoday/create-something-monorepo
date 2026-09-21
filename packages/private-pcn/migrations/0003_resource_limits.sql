-- Enforce member capacity in the database so concurrent invites cannot oversubscribe.
CREATE TRIGGER members_capacity_insert BEFORE INSERT ON members
WHEN NEW.active=1 AND NOT EXISTS(SELECT 1 FROM members WHERE network_id=NEW.network_id AND email=NEW.email AND active=1)
 AND (SELECT COUNT(*) FROM members WHERE network_id=NEW.network_id AND active=1)>=100
BEGIN SELECT RAISE(ABORT,'member_capacity_reached'); END;
CREATE TRIGGER members_capacity_update BEFORE UPDATE OF active ON members
WHEN NEW.active=1 AND OLD.active=0 AND (SELECT COUNT(*) FROM members WHERE network_id=NEW.network_id AND active=1)>=100
BEGIN SELECT RAISE(ABORT,'member_capacity_reached'); END;
-- Reserve before allocating provider storage. Unknown provider outcomes retain their
-- reservation until reconciliation; time alone is not proof that no asset exists.
CREATE TABLE upload_reservations (
 id TEXT PRIMARY KEY,
 network_id TEXT NOT NULL REFERENCES networks(id),
 title TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'initializing' CHECK(state IN ('initializing','uncertain')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX upload_reservations_network ON upload_reservations(network_id);
