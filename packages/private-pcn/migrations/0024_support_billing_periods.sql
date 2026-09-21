-- Provider-verified period boundaries survive replacement of the current billing row.
CREATE TABLE support_billing_periods (
 network_id TEXT NOT NULL REFERENCES networks(id),
 period_start INTEGER NOT NULL CHECK(period_start>0),
 period_end INTEGER NOT NULL,
 PRIMARY KEY(network_id,period_start)
);
INSERT INTO support_billing_periods SELECT network_id,period_start,period_end FROM network_billing WHERE period_start>0;
CREATE TRIGGER support_billing_period_insert AFTER INSERT ON network_billing
WHEN NEW.period_start>0
BEGIN
 INSERT INTO support_billing_periods VALUES(NEW.network_id,NEW.period_start,NEW.period_end)
 ON CONFLICT(network_id,period_start) DO UPDATE SET period_end=excluded.period_end;
END;
CREATE TRIGGER support_billing_period_update AFTER UPDATE ON network_billing
WHEN NEW.period_start>0
BEGIN
 INSERT INTO support_billing_periods VALUES(NEW.network_id,NEW.period_start,NEW.period_end)
 ON CONFLICT(network_id,period_start) DO UPDATE SET period_end=excluded.period_end;
END;
