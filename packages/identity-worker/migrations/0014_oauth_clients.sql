-- Dynamic OAuth clients are durable security principals with exact redirect bindings.
CREATE TABLE IF NOT EXISTS oauth_clients (
  client_id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  redirect_uris_json TEXT NOT NULL,
  token_endpoint_auth_method TEXT NOT NULL CHECK (token_endpoint_auth_method = 'none'),
  grant_types_json TEXT NOT NULL,
  response_types_json TEXT NOT NULL,
  scope TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
