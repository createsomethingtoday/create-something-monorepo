-- Anonymous service answers: no question text, raw IP, names or contact details.
-- Daily salted visitor hashes; reservations are consumed even if the provider fails.
CREATE TABLE IF NOT EXISTS contact_agent_budget (
  day TEXT NOT NULL,
  visitor TEXT NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, visitor)
);
