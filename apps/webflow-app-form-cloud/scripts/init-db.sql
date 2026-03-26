-- Submissions tracking table
-- Stores all form submissions with their status and metadata

CREATE TABLE IF NOT EXISTS submissions (
  -- Primary identifier
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Submission metadata
  submission_type VARCHAR(10) NOT NULL, -- 'New' or 'Update'
  app_name VARCHAR(255) NOT NULL,
  client_id VARCHAR(255),
  creator_email VARCHAR(255),

  -- Full form data (stored as JSON for flexibility)
  form_data JSONB NOT NULL,

  -- File storage
  blob_urls JSONB, -- Array of Vercel Blob URLs
  blobs_cleaned_at TIMESTAMP WITH TIME ZONE,

  -- Submission status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'processing',
  -- Status values:
  --   'processing' - Initial state, files being uploaded
  --   'pending' - Ready to send to webhook
  --   'webhook_success' - Successfully sent to Airtable
  --   'webhook_failed' - Failed to send to Airtable

  -- Airtable integration
  airtable_submission_id VARCHAR(255), -- ID sent to Airtable webhook
  webhook_response JSONB, -- Response from Airtable
  webhook_sent_at TIMESTAMP WITH TIME ZONE,

  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_submissions_client_id ON submissions(client_id);
CREATE INDEX IF NOT EXISTS idx_submissions_creator_email ON submissions(creator_email);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_app_name ON submissions(app_name);

-- Index for failed submissions retry queue
CREATE INDEX IF NOT EXISTS idx_submissions_failed_retry
  ON submissions(status, retry_count, webhook_sent_at)
  WHERE status = 'webhook_failed';

-- Index for blob cleanup
CREATE INDEX IF NOT EXISTS idx_submissions_blob_cleanup
  ON submissions(status, created_at, blobs_cleaned_at)
  WHERE status = 'webhook_success' AND blobs_cleaned_at IS NULL;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to call the function before each update
DROP TRIGGER IF EXISTS update_submissions_updated_at ON submissions;
CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert a test record (optional, can be removed after verification)
-- INSERT INTO submissions (
--   submission_type,
--   app_name,
--   client_id,
--   creator_email,
--   form_data,
--   status
-- ) VALUES (
--   'New',
--   'Test App',
--   'test-client-id',
--   'test@example.com',
--   '{"test": "data"}'::jsonb,
--   'processing'
-- );

-- Verify table was created
SELECT 'Submissions table created successfully' as message;
SELECT COUNT(*) as initial_count FROM submissions;
