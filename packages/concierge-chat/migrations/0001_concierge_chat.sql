CREATE TABLE IF NOT EXISTS chat_threads (
	id TEXT PRIMARY KEY,
	session_id TEXT NOT NULL,
	title TEXT NOT NULL,
	subtitle TEXT NOT NULL,
	user_name TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	status TEXT NOT NULL,
	pending_action TEXT NOT NULL,
	badges_json TEXT NOT NULL,
	thread_json TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_session_updated
	ON chat_threads (session_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
	id TEXT PRIMARY KEY,
	session_id TEXT NOT NULL,
	thread_id TEXT NOT NULL,
	role TEXT NOT NULL,
	author TEXT NOT NULL,
	body TEXT NOT NULL,
	created_at TEXT NOT NULL,
	status TEXT,
	evidence_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created
	ON chat_messages (thread_id, created_at ASC);

CREATE TABLE IF NOT EXISTS profile_snapshots (
	id TEXT PRIMARY KEY,
	session_id TEXT NOT NULL,
	thread_id TEXT NOT NULL,
	completion INTEGER NOT NULL,
	confirmed_count INTEGER NOT NULL,
	inferred_count INTEGER NOT NULL,
	candidate_count INTEGER NOT NULL,
	missing_required_json TEXT NOT NULL,
	blockers_json TEXT NOT NULL,
	profile_json TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profile_snapshots_thread_created
	ON profile_snapshots (thread_id, created_at DESC);

CREATE TABLE IF NOT EXISTS profile_field_events (
	id TEXT PRIMARY KEY,
	session_id TEXT NOT NULL,
	thread_id TEXT NOT NULL,
	field_key TEXT NOT NULL,
	label TEXT NOT NULL,
	value TEXT NOT NULL,
	status TEXT NOT NULL,
	confidence REAL NOT NULL,
	field_class TEXT NOT NULL,
	source_message_ids_json TEXT NOT NULL,
	source_artifact_ids_json TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	confirmed_by TEXT,
	note TEXT
);

CREATE INDEX IF NOT EXISTS idx_profile_field_events_thread_key
	ON profile_field_events (thread_id, field_key);

CREATE TABLE IF NOT EXISTS widget_events (
	id TEXT PRIMARY KEY,
	session_id TEXT NOT NULL,
	thread_id TEXT NOT NULL,
	widget_id TEXT NOT NULL,
	widget_type TEXT NOT NULL,
	placement TEXT NOT NULL,
	priority INTEGER NOT NULL,
	widget_json TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_widget_events_thread_created
	ON widget_events (thread_id, created_at DESC);

CREATE TABLE IF NOT EXISTS handoff_events (
	id TEXT PRIMARY KEY,
	session_id TEXT NOT NULL,
	thread_id TEXT NOT NULL,
	queue_name TEXT NOT NULL,
	eta TEXT NOT NULL,
	reason_codes_json TEXT NOT NULL,
	summary TEXT NOT NULL,
	operator_brief TEXT NOT NULL,
	pending_tasks_json TEXT NOT NULL,
	created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_handoff_events_thread_created
	ON handoff_events (thread_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tool_action_events (
	id TEXT PRIMARY KEY,
	session_id TEXT NOT NULL,
	thread_id TEXT NOT NULL,
	tool_name TEXT NOT NULL,
	status TEXT NOT NULL,
	note TEXT NOT NULL,
	action_href TEXT,
	created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tool_action_events_thread_created
	ON tool_action_events (thread_id, created_at DESC);
