-- partner_amount is the original fee-net share; transfer_amount records what
-- actually left the platform before subsequent reversals. NULL is unknown until
-- historical provider reconciliation; do not infer it from the original share.
ALTER TABLE support_settlements ADD COLUMN transfer_amount INTEGER
 CHECK(transfer_amount IS NULL OR (transfer_amount>=0 AND transfer_amount<=partner_amount));
