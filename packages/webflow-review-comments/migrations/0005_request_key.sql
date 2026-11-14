-- One save, one comment. The caller sends a key with a save; a repeat of that
-- save (a second click, a retry after a lost answer) finds the first row and
-- writes nothing. Keys are per author, so two people cannot collide.
ALTER TABLE review_comments ADD COLUMN request_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_review_comments_request
	ON review_comments (author_email, request_key)
	WHERE request_key IS NOT NULL;
