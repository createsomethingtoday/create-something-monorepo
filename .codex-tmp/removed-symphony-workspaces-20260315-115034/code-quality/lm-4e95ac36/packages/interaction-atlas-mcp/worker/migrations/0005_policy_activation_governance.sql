CREATE TABLE IF NOT EXISTS policy_activations (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  automation_id TEXT NOT NULL,
  contract_version INTEGER NOT NULL,
  old_policy_version_id TEXT,
  new_policy_version_id TEXT NOT NULL,
  reason TEXT,
  changed_by TEXT NOT NULL,
  changed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (account_id, automation_id, contract_version)
    REFERENCES automation_contracts(account_id, automation_id, version),
  FOREIGN KEY (old_policy_version_id) REFERENCES judgment_policy_versions(id),
  FOREIGN KEY (new_policy_version_id) REFERENCES judgment_policy_versions(id)
);

CREATE INDEX IF NOT EXISTS idx_policy_activations_lookup
  ON policy_activations (account_id, automation_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_policy_activations_new_policy
  ON policy_activations (new_policy_version_id);
