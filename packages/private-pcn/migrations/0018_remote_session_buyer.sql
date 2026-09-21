-- The authenticated buyer identity helps creators recognize who requested support.
ALTER TABLE remote_sessions ADD COLUMN buyer_email TEXT NOT NULL DEFAULT '';
