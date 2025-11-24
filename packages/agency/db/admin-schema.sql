-- Admin Tables for CREATE SOMETHING Agency
-- Contact submissions, newsletter subscribers, and experiments

-- Contact submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  service TEXT,
  company TEXT,
  status TEXT DEFAULT 'unread',
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_submitted_at ON contact_submissions(submitted_at);

-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active',
  source TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers(status);

-- Experiments table (for .io and .space)
CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  url TEXT,
  featured INTEGER DEFAULT 0,
  published INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_experiments_featured ON experiments(featured);
CREATE INDEX IF NOT EXISTS idx_experiments_category ON experiments(category);

-- Experiment executions (for tracking usage)
CREATE TABLE IF NOT EXISTS experiment_executions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  experiment_id TEXT NOT NULL,
  user_id TEXT,
  status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_experiment_executions_experiment_id ON experiment_executions(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_executions_created_at ON experiment_executions(created_at);
