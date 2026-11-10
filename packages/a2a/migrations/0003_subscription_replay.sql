ALTER TABLE subscriptions ADD COLUMN previous_secret_ciphertext TEXT;
ALTER TABLE subscriptions ADD COLUMN previous_secret_until INTEGER;
ALTER TABLE subscriptions ADD COLUMN verified_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN replay_floor_at INTEGER NOT NULL DEFAULT 0;
CREATE INDEX subscriptions_verification ON subscriptions(owner_subject,callback_url,verified_at);
