ALTER TABLE template_documents ADD COLUMN cumulative_revenue REAL;

CREATE INDEX IF NOT EXISTS idx_template_documents_cumulative_revenue ON template_documents (cumulative_revenue DESC);
