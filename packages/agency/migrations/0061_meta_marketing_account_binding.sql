-- Existing anonymous receipts stay anonymous. Only a new explicit signed choice binds an account.
ALTER TABLE meta_marketing_consents ADD COLUMN account_subject TEXT;
