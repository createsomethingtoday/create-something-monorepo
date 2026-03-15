-- Run counts per account per period (for pricing: 100 free, then 1¢/run)
-- One row per account per calendar month; runs_this_period resets or we use a rolling window.
CREATE TABLE IF NOT EXISTS run_counts (
  account_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  runs_this_period INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (account_id, period_start)
);
