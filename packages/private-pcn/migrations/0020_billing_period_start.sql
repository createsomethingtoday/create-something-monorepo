-- Zero means unknown until verified against Stripe; never infer a month from its end.
ALTER TABLE network_billing ADD COLUMN period_start INTEGER NOT NULL DEFAULT 0;
