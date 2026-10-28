-- Review/apply only after the target D1 binding is explicitly approved.
-- No existing application tables or tenants are modified.
CREATE TABLE IF NOT EXISTS collaboration_projects (
  id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL CHECK(json_valid(state))
);
CREATE TABLE IF NOT EXISTS collaboration_members (
  project TEXT NOT NULL REFERENCES collaboration_projects(id),
  issuer TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  revision INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(project, issuer, email),
  UNIQUE(project, issuer, subject)
);
-- This is the authorized roster, not a claim that accounts already exist.
INSERT OR IGNORE INTO collaboration_projects(id,state) VALUES
('maverickx','{"feedback":[],"proposals":[],"jobs":[],"receipts":[],"replay":{}}');
INSERT OR IGNORE INTO collaboration_members(project,issuer,email) VALUES
('maverickx','https://id.createsomething.space','vanessa.ortiz@maverickx.com'),
('maverickx','https://id.createsomething.space','estefania.fernandez@maverickx.com'),
('maverickx','https://id.createsomething.space','rajat.sehgal@maverickenergy.com');
-- No Micah subject, agent credential or production permission is guessed/seeded.
-- Existing verified owner, resolved by read-only Identity lookup on 2026-10-09.
-- This local migration still requires target approval before live application.
INSERT OR IGNORE INTO collaboration_members(project,issuer,email,subject) VALUES
('maverickx','https://id.createsomething.space','micah@createsomething.io','b8adb839-ddbb-4747-968e-7668687cf140');
