-- Server-derived Knock trigger fields (creator recipient, template name, listing
-- URL) captured before the first send, so retries under the same idempotency key
-- send identical parameters even if Airtable or the index changed in between.
-- Holds no buyer data, and is cleared once the request is sent.
ALTER TABLE support_requests ADD COLUMN delivery_snapshot TEXT;
