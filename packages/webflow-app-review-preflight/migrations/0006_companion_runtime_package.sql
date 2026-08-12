ALTER TABLE companion_pairings
  ADD COLUMN runtime_test_package_id TEXT REFERENCES runtime_test_packages(id);

ALTER TABLE companion_sessions
  ADD COLUMN runtime_test_package_id TEXT REFERENCES runtime_test_packages(id);

ALTER TABLE companion_runs
  ADD COLUMN runtime_test_package_id TEXT REFERENCES runtime_test_packages(id);

CREATE INDEX idx_companion_pairings_runtime_package
  ON companion_pairings(runtime_test_package_id);

CREATE INDEX idx_companion_sessions_runtime_package
  ON companion_sessions(runtime_test_package_id);

CREATE INDEX idx_companion_runs_runtime_package
  ON companion_runs(runtime_test_package_id);
