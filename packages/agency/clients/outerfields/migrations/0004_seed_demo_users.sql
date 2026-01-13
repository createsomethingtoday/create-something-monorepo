-- Seed demo users for testing/demo purposes
-- Password: demo123 (SHA-256 hash)

INSERT OR IGNORE INTO users (id, email, password_hash, name, membership, created_at, updated_at)
VALUES
  (
    'demo-user-001',
    'demo@outerfields.com',
    'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791',
    'Demo User',
    0,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
  ),
  (
    'demo-admin-001',
    'admin@outerfields.com',
    'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791',
    'Demo Admin',
    1,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
  );
