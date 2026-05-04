-- Add Policy OS margin fields to commercial and contract state.
--
-- Canon: owner-compensation fit must be durable account state, not only proposal copy.

ALTER TABLE agency_contract_state
  ADD COLUMN service_tier TEXT NOT NULL DEFAULT 'mcp_only';

ALTER TABLE agency_contract_state
  ADD COLUMN monthly_recurring_revenue_cents INTEGER;

ALTER TABLE agency_contract_state
  ADD COLUMN gross_margin_floor_percent INTEGER;

ALTER TABLE agency_contract_state
  ADD COLUMN owner_compensation_fit TEXT;

ALTER TABLE agency_contract_state
  ADD COLUMN operator_load_budget_json TEXT NOT NULL DEFAULT '{}';

ALTER TABLE agency_contract_state
  ADD COLUMN expansion_triggers_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE agency_commercial_accounts
  ADD COLUMN monthly_recurring_revenue_cents INTEGER;

ALTER TABLE agency_commercial_accounts
  ADD COLUMN gross_margin_floor_percent INTEGER;

ALTER TABLE agency_commercial_accounts
  ADD COLUMN owner_compensation_fit TEXT;

ALTER TABLE agency_commercial_accounts
  ADD COLUMN operator_load_budget_json TEXT NOT NULL DEFAULT '{}';

ALTER TABLE agency_commercial_accounts
  ADD COLUMN expansion_triggers_json TEXT NOT NULL DEFAULT '[]';
