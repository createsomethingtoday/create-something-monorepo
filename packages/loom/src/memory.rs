//! Session Memory & Crash Recovery
//!
//! Agents need to remember context across tasks and recover from crashes.
//! This is what makes Gas Town reliable - we need to be better.

use std::path::Path;
use chrono::{DateTime, Utc};
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum MemoryError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    
    #[error("Session not found: {0}")]
    SessionNotFound(String),
    
    #[error("Checkpoint not found: {0}")]
    CheckpointNotFound(String),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// Session status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionStatus {
    /// Session is active
    Active,
    /// Session completed successfully
    Completed,
    /// Session failed
    Failed,
    /// Session was interrupted (crash)
    Interrupted,
    /// Session was manually cancelled
    Cancelled,
}

impl SessionStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            SessionStatus::Active => "active",
            SessionStatus::Completed => "completed",
            SessionStatus::Failed => "failed",
            SessionStatus::Interrupted => "interrupted",
            SessionStatus::Cancelled => "cancelled",
        }
    }
    
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "active" => Some(SessionStatus::Active),
            "completed" => Some(SessionStatus::Completed),
            "failed" => Some(SessionStatus::Failed),
            "interrupted" => Some(SessionStatus::Interrupted),
            "cancelled" => Some(SessionStatus::Cancelled),
            _ => None,
        }
    }
    
    pub fn is_terminal(&self) -> bool {
        matches!(self, SessionStatus::Completed | SessionStatus::Failed | SessionStatus::Cancelled)
    }
}

/// A work session - tracks an agent working on a task
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    /// Unique session ID
    pub id: String,
    /// Agent performing the work
    pub agent_id: String,
    /// Task being worked on
    pub task_id: String,
    /// Current status
    pub status: SessionStatus,
    /// When the session started
    pub started_at: DateTime<Utc>,
    /// When the session ended (if ended)
    pub ended_at: Option<DateTime<Utc>>,
    /// Working directory
    pub working_dir: Option<String>,
    /// Git branch (if any)
    pub git_branch: Option<String>,
    /// Last checkpoint ID
    pub last_checkpoint: Option<String>,
    /// Session context (agent-specific state)
    pub context: SessionContext,
}

/// Session context - what the agent remembers
/// Enhanced to match Harness AgentContext for full unification
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SessionContext {
    /// Files the agent has read
    pub files_read: Vec<String>,
    /// Files the agent has modified (with metadata)
    pub files_modified: Vec<FileModification>,
    /// Issues touched with status changes
    pub issues_updated: Vec<IssueUpdate>,
    /// Current task progress
    pub current_task: Option<TaskProgress>,
    /// Test state at checkpoint time
    pub test_state: Option<TestState>,
    /// Agent's free-form notes and observations
    pub agent_notes: String,
    /// Blockers encountered during work
    pub blockers: Vec<String>,
    /// Decisions made and their rationale
    pub decisions: Vec<Decision>,
    /// Sub-tasks spawned
    pub sub_tasks: Vec<String>,
    /// Dependencies discovered
    pub dependencies: Vec<String>,
    /// Custom key-value store
    pub custom: std::collections::HashMap<String, String>,
    /// Timestamp of context capture
    pub captured_at: Option<DateTime<Utc>>,
}

/// Record of a file modification for context preservation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileModification {
    /// File path
    pub path: String,
    /// Brief summary of changes
    pub summary: String,
    /// Type of change
    pub change_type: ChangeType,
    /// Lines added (approximate)
    pub lines_added: Option<u32>,
    /// Lines removed (approximate)
    pub lines_removed: Option<u32>,
}

/// Type of file change
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ChangeType {
    Created,
    Modified,
    Deleted,
    Renamed,
}

/// Record of an issue status change
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IssueUpdate {
    /// Issue ID
    pub issue_id: String,
    /// Issue title
    pub title: String,
    /// Previous status
    pub from_status: String,
    /// New status
    pub to_status: String,
    /// Optional reason for status change
    pub reason: Option<String>,
}

/// Current task progress state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskProgress {
    /// Issue ID being worked on
    pub issue_id: String,
    /// Issue title
    pub issue_title: String,
    /// Current step description
    pub current_step: String,
    /// Progress percentage (0-100)
    pub progress_percent: u8,
    /// Remaining steps description
    pub remaining_work: String,
    /// Time spent on this task in ms
    pub time_spent_ms: u64,
}

/// Test state at checkpoint time
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestState {
    /// Number of passed tests
    pub passed: u32,
    /// Number of failed tests
    pub failed: u32,
    /// Number of skipped tests
    pub skipped: u32,
    /// Names of failing tests
    pub failing_tests: Vec<String>,
    /// Total duration of test run in ms
    pub duration_ms: u64,
}

/// Record of a decision made during work
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Decision {
    /// What was decided
    pub decision: String,
    /// Why this choice was made
    pub rationale: String,
    /// Alternatives considered
    pub alternatives: Option<Vec<String>>,
    /// Timestamp
    pub made_at: DateTime<Utc>,
}

impl SessionContext {
    pub fn add_file_read(&mut self, path: &str) {
        if !self.files_read.contains(&path.to_string()) {
            self.files_read.push(path.to_string());
        }
    }
    
    pub fn add_file_modified(&mut self, modification: FileModification) {
        // Update existing or add new
        if let Some(existing) = self.files_modified.iter_mut().find(|f| f.path == modification.path) {
            *existing = modification;
        } else {
            self.files_modified.push(modification);
        }
    }
    
    pub fn add_decision(&mut self, decision: &str, rationale: &str) {
        self.decisions.push(Decision {
            decision: decision.to_string(),
            rationale: rationale.to_string(),
            alternatives: None,
            made_at: Utc::now(),
        });
    }
    
    pub fn add_blocker(&mut self, blocker: &str) {
        self.blockers.push(blocker.to_string());
    }
    
    pub fn add_note(&mut self, note: &str) {
        if !self.agent_notes.is_empty() {
            self.agent_notes.push_str("\n\n");
        }
        self.agent_notes.push_str(note);
    }
    
    pub fn update_task_progress(&mut self, progress: TaskProgress) {
        self.current_task = Some(progress);
    }
    
    pub fn record_test_state(&mut self, state: TestState) {
        self.test_state = Some(state);
    }
    
    pub fn record_issue_update(&mut self, update: IssueUpdate) {
        self.issues_updated.push(update);
    }
    
    /// Generate a resume brief for session continuity
    /// This is injected into the session priming prompt when resuming
    pub fn generate_resume_brief(&self) -> String {
        let mut lines = Vec::new();
        
        lines.push("## Session Resume Brief".to_string());
        lines.push(String::new());
        
        if let Some(ref captured) = self.captured_at {
            lines.push(format!("*Context captured at: {}*", captured.to_rfc3339()));
            lines.push(String::new());
        }
        
        // Current task (most important for resumption)
        if let Some(ref task) = self.current_task {
            lines.push("### Current Task".to_string());
            lines.push(format!("**Issue**: {} - {}", task.issue_id, task.issue_title));
            lines.push(format!("**Progress**: {}%", task.progress_percent));
            lines.push(format!("**Current Step**: {}", task.current_step));
            lines.push(format!("**Remaining**: {}", task.remaining_work));
            lines.push(String::new());
        }
        
        // Files modified
        if !self.files_modified.is_empty() {
            lines.push("### Files Modified This Session".to_string());
            for file in self.files_modified.iter().take(10) {
                let stats = match (file.lines_added, file.lines_removed) {
                    (Some(added), Some(removed)) => format!(" (+{}/-{})", added, removed),
                    (Some(added), None) => format!(" (+{})", added),
                    _ => String::new(),
                };
                lines.push(format!("- `{}`{}: {}", file.path, stats, file.summary));
            }
            if self.files_modified.len() > 10 {
                lines.push(format!("- ... and {} more files", self.files_modified.len() - 10));
            }
            lines.push(String::new());
        }
        
        // Issues updated
        if !self.issues_updated.is_empty() {
            lines.push("### Issues Updated".to_string());
            for update in self.issues_updated.iter().take(5) {
                lines.push(format!("- {}: {} → {}", update.issue_id, update.from_status, update.to_status));
            }
            if self.issues_updated.len() > 5 {
                lines.push(format!("- ... and {} more updates", self.issues_updated.len() - 5));
            }
            lines.push(String::new());
        }
        
        // Test state
        if let Some(ref test_state) = self.test_state {
            lines.push("### Test State".to_string());
            lines.push(format!("- Passed: {}", test_state.passed));
            lines.push(format!("- Failed: {}", test_state.failed));
            lines.push(format!("- Skipped: {}", test_state.skipped));
            if !test_state.failing_tests.is_empty() {
                lines.push("- **Failing tests**:".to_string());
                for test in test_state.failing_tests.iter().take(5) {
                    lines.push(format!("  - {}", test));
                }
            }
            lines.push(String::new());
        }
        
        // Blockers
        if !self.blockers.is_empty() {
            lines.push("### Blockers Encountered".to_string());
            for blocker in &self.blockers {
                lines.push(format!("- {}", blocker));
            }
            lines.push(String::new());
        }
        
        // Key decisions
        if !self.decisions.is_empty() {
            lines.push("### Key Decisions Made".to_string());
            for decision in self.decisions.iter().rev().take(3) {
                lines.push(format!("- **{}**: {}", decision.decision, decision.rationale));
            }
            if self.decisions.len() > 3 {
                lines.push(format!("- ... and {} earlier decisions", self.decisions.len() - 3));
            }
            lines.push(String::new());
        }
        
        // Agent notes
        if !self.agent_notes.is_empty() {
            lines.push("### Notes".to_string());
            let notes = if self.agent_notes.len() > 500 {
                format!("{}...", &self.agent_notes[..500])
            } else {
                self.agent_notes.clone()
            };
            lines.push(notes);
            lines.push(String::new());
        }
        
        lines.push("---".to_string());
        lines.push("*Resume from this context. The AI should figure out where work left off.*".to_string());
        
        lines.join("\n")
    }
    
    /// Check if context has meaningful data to resume from
    pub fn has_resumable_context(&self) -> bool {
        self.current_task.is_some()
            || !self.files_modified.is_empty()
            || !self.issues_updated.is_empty()
            || !self.blockers.is_empty()
            || !self.agent_notes.is_empty()
    }
}

/// A checkpoint - snapshot of session state for recovery
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Checkpoint {
    /// Unique checkpoint ID
    pub id: String,
    /// Session this checkpoint belongs to
    pub session_id: String,
    /// Sequence number (for ordering)
    pub sequence: u32,
    /// What was accomplished
    pub summary: String,
    /// Full context at this point
    pub context: SessionContext,
    /// Git commit (if any)
    pub git_commit: Option<String>,
    /// When checkpoint was created
    pub created_at: DateTime<Utc>,
}

/// Memory store - manages sessions, checkpoints, and context
pub struct MemoryStore {
    conn: Connection,
}

impl MemoryStore {
    /// Open or create a memory store
    pub fn open(db_path: impl AsRef<Path>) -> Result<Self, MemoryError> {
        let conn = Connection::open(db_path)?;
        
        // Enable WAL mode for better concurrency
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;")?;
        
        let store = Self { conn };
        store.init_schema()?;
        Ok(store)
    }
    
    fn init_schema(&self) -> Result<(), MemoryError> {
        self.conn.execute_batch(r#"
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL,
                task_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                started_at TEXT NOT NULL,
                ended_at TEXT,
                working_dir TEXT,
                git_branch TEXT,
                last_checkpoint TEXT,
                context_json TEXT NOT NULL DEFAULT '{}'
            );
            
            CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_task ON sessions(task_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
            
            CREATE TABLE IF NOT EXISTS checkpoints (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                sequence INTEGER NOT NULL,
                summary TEXT NOT NULL,
                context_json TEXT NOT NULL,
                git_commit TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            );
            
            CREATE INDEX IF NOT EXISTS idx_checkpoints_session ON checkpoints(session_id);
            
            -- Recovery queue for interrupted sessions
            CREATE TABLE IF NOT EXISTS recovery_queue (
                session_id TEXT PRIMARY KEY,
                priority INTEGER NOT NULL DEFAULT 0,
                retry_count INTEGER NOT NULL DEFAULT 0,
                last_retry TEXT,
                error_message TEXT,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            );
        "#)?;
        Ok(())
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // Session Management
    // ─────────────────────────────────────────────────────────────────────
    
    /// Start a new session
    pub fn start_session(
        &mut self,
        agent_id: &str,
        task_id: &str,
        working_dir: Option<&str>,
        git_branch: Option<&str>,
    ) -> Result<Session, MemoryError> {
        let id = format!("ses-{}", &uuid::Uuid::new_v4().to_string()[..8]);
        let now = Utc::now();
        let context = SessionContext::default();
        let context_json = serde_json::to_string(&context)?;
        
        self.conn.execute(
            r#"INSERT INTO sessions 
               (id, agent_id, task_id, status, started_at, working_dir, git_branch, context_json)
               VALUES (?1, ?2, ?3, 'active', ?4, ?5, ?6, ?7)"#,
            params![id, agent_id, task_id, now.to_rfc3339(), working_dir, git_branch, context_json],
        )?;
        
        Ok(Session {
            id,
            agent_id: agent_id.to_string(),
            task_id: task_id.to_string(),
            status: SessionStatus::Active,
            started_at: now,
            ended_at: None,
            working_dir: working_dir.map(String::from),
            git_branch: git_branch.map(String::from),
            last_checkpoint: None,
            context,
        })
    }
    
    /// Get a session by ID
    pub fn get_session(&self, id: &str) -> Result<Option<Session>, MemoryError> {
        let result = self.conn.query_row(
            r#"SELECT id, agent_id, task_id, status, started_at, ended_at, 
                      working_dir, git_branch, last_checkpoint, context_json
               FROM sessions WHERE id = ?1"#,
            params![id],
            |row| {
                let context_json: String = row.get(9)?;
                Ok(Session {
                    id: row.get(0)?,
                    agent_id: row.get(1)?,
                    task_id: row.get(2)?,
                    status: SessionStatus::from_str(&row.get::<_, String>(3)?).unwrap_or(SessionStatus::Active),
                    started_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now()),
                    ended_at: row.get::<_, Option<String>>(5)?
                        .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                        .map(|dt| dt.with_timezone(&Utc)),
                    working_dir: row.get(6)?,
                    git_branch: row.get(7)?,
                    last_checkpoint: row.get(8)?,
                    context: serde_json::from_str(&context_json).unwrap_or_default(),
                })
            },
        );
        
        match result {
            Ok(session) => Ok(Some(session)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
    
    /// Get active session for a task
    pub fn get_active_session_for_task(&self, task_id: &str) -> Result<Option<Session>, MemoryError> {
        let result = self.conn.query_row(
            r#"SELECT id, agent_id, task_id, status, started_at, ended_at,
                      working_dir, git_branch, last_checkpoint, context_json
               FROM sessions 
               WHERE task_id = ?1 AND status = 'active'
               ORDER BY started_at DESC LIMIT 1"#,
            params![task_id],
            |row| {
                let context_json: String = row.get(9)?;
                Ok(Session {
                    id: row.get(0)?,
                    agent_id: row.get(1)?,
                    task_id: row.get(2)?,
                    status: SessionStatus::Active,
                    started_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now()),
                    ended_at: None,
                    working_dir: row.get(6)?,
                    git_branch: row.get(7)?,
                    last_checkpoint: row.get(8)?,
                    context: serde_json::from_str(&context_json).unwrap_or_default(),
                })
            },
        );
        
        match result {
            Ok(session) => Ok(Some(session)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
    
    /// Update session context
    pub fn update_context(&mut self, session_id: &str, context: &SessionContext) -> Result<(), MemoryError> {
        let json = serde_json::to_string(context)?;
        
        self.conn.execute(
            "UPDATE sessions SET context_json = ?1 WHERE id = ?2",
            params![json, session_id],
        )?;
        
        Ok(())
    }
    
    /// End a session
    pub fn end_session(&mut self, session_id: &str, status: SessionStatus) -> Result<(), MemoryError> {
        let now = Utc::now();
        
        self.conn.execute(
            "UPDATE sessions SET status = ?1, ended_at = ?2 WHERE id = ?3",
            params![status.as_str(), now.to_rfc3339(), session_id],
        )?;
        
        // Remove from recovery queue if present
        self.conn.execute(
            "DELETE FROM recovery_queue WHERE session_id = ?1",
            params![session_id],
        )?;
        
        Ok(())
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // Checkpoints
    // ─────────────────────────────────────────────────────────────────────
    
    /// Create a checkpoint
    pub fn create_checkpoint(
        &mut self,
        session_id: &str,
        summary: &str,
        git_commit: Option<&str>,
    ) -> Result<Checkpoint, MemoryError> {
        // Get the session
        let session = self.get_session(session_id)?
            .ok_or_else(|| MemoryError::SessionNotFound(session_id.to_string()))?;
        
        // Get next sequence number
        let sequence: u32 = self.conn.query_row(
            "SELECT COALESCE(MAX(sequence), 0) + 1 FROM checkpoints WHERE session_id = ?1",
            params![session_id],
            |row| row.get(0),
        )?;
        
        let id = format!("chk-{}-{}", &session_id[4..], sequence);
        let now = Utc::now();
        let context_json = serde_json::to_string(&session.context)?;
        
        self.conn.execute(
            r#"INSERT INTO checkpoints (id, session_id, sequence, summary, context_json, git_commit, created_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"#,
            params![id, session_id, sequence, summary, context_json, git_commit, now.to_rfc3339()],
        )?;
        
        // Update session's last checkpoint
        self.conn.execute(
            "UPDATE sessions SET last_checkpoint = ?1 WHERE id = ?2",
            params![id, session_id],
        )?;
        
        Ok(Checkpoint {
            id,
            session_id: session_id.to_string(),
            sequence,
            summary: summary.to_string(),
            context: session.context,
            git_commit: git_commit.map(String::from),
            created_at: now,
        })
    }
    
    /// Get a checkpoint
    pub fn get_checkpoint(&self, id: &str) -> Result<Option<Checkpoint>, MemoryError> {
        let result = self.conn.query_row(
            r#"SELECT id, session_id, sequence, summary, context_json, git_commit, created_at
               FROM checkpoints WHERE id = ?1"#,
            params![id],
            |row| {
                let context_json: String = row.get(4)?;
                Ok(Checkpoint {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    sequence: row.get(2)?,
                    summary: row.get(3)?,
                    context: serde_json::from_str(&context_json).unwrap_or_default(),
                    git_commit: row.get(5)?,
                    created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(6)?)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now()),
                })
            },
        );
        
        match result {
            Ok(checkpoint) => Ok(Some(checkpoint)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
    
    /// Get all checkpoints for a session
    pub fn get_checkpoints(&self, session_id: &str) -> Result<Vec<Checkpoint>, MemoryError> {
        let mut stmt = self.conn.prepare(
            r#"SELECT id, session_id, sequence, summary, context_json, git_commit, created_at
               FROM checkpoints WHERE session_id = ?1 ORDER BY sequence ASC"#
        )?;
        
        let checkpoints = stmt.query_map(params![session_id], |row| {
            let context_json: String = row.get(4)?;
            Ok(Checkpoint {
                id: row.get(0)?,
                session_id: row.get(1)?,
                sequence: row.get(2)?,
                summary: row.get(3)?,
                context: serde_json::from_str(&context_json).unwrap_or_default(),
                git_commit: row.get(5)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(6)?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        
        Ok(checkpoints)
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // Recovery
    // ─────────────────────────────────────────────────────────────────────
    
    /// Mark interrupted sessions for recovery
    pub fn mark_interrupted_sessions(&mut self) -> Result<u32, MemoryError> {
        // Find sessions that are still "active" but haven't been updated recently
        // This handles crash scenarios
        let count = self.conn.execute(
            r#"UPDATE sessions SET status = 'interrupted'
               WHERE status = 'active' 
               AND datetime(started_at) < datetime('now', '-1 hour')"#,
            [],
        )?;
        
        Ok(count as u32)
    }
    
    /// Get sessions needing recovery
    pub fn get_recoverable_sessions(&self) -> Result<Vec<Session>, MemoryError> {
        let mut stmt = self.conn.prepare(
            r#"SELECT id, agent_id, task_id, status, started_at, ended_at,
                      working_dir, git_branch, last_checkpoint, context_json
               FROM sessions 
               WHERE status = 'interrupted'
               ORDER BY started_at DESC"#
        )?;
        
        let sessions = stmt.query_map([], |row| {
            let context_json: String = row.get(9)?;
            Ok(Session {
                id: row.get(0)?,
                agent_id: row.get(1)?,
                task_id: row.get(2)?,
                status: SessionStatus::Interrupted,
                started_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                ended_at: row.get::<_, Option<String>>(5)?
                    .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                    .map(|dt| dt.with_timezone(&Utc)),
                working_dir: row.get(6)?,
                git_branch: row.get(7)?,
                last_checkpoint: row.get(8)?,
                context: serde_json::from_str(&context_json).unwrap_or_default(),
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        
        Ok(sessions)
    }
    
    /// Resume a session from last checkpoint
    pub fn resume_session(&mut self, session_id: &str) -> Result<Session, MemoryError> {
        let session = self.get_session(session_id)?
            .ok_or_else(|| MemoryError::SessionNotFound(session_id.to_string()))?;
        
        // If there's a checkpoint, restore context from it
        if let Some(ref checkpoint_id) = session.last_checkpoint {
            if let Some(checkpoint) = self.get_checkpoint(checkpoint_id)? {
                self.update_context(session_id, &checkpoint.context)?;
            }
        }
        
        // Mark as active again
        self.conn.execute(
            "UPDATE sessions SET status = 'active' WHERE id = ?1",
            params![session_id],
        )?;
        
        self.get_session(session_id)?
            .ok_or_else(|| MemoryError::SessionNotFound(session_id.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    
    #[test]
    fn test_session_lifecycle() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("memory.db");
        let mut store = MemoryStore::open(&db_path).unwrap();
        
        // Start session
        let session = store.start_session("claude-code", "task-123", Some("/tmp"), Some("feature/test")).unwrap();
        assert_eq!(session.status, SessionStatus::Active);
        
        // Update context
        let mut context = session.context.clone();
        context.add_file_read("src/lib.rs");
        context.add_decision("Use SQLite for storage", "SQLite provides embedded persistence without external dependencies");
        store.update_context(&session.id, &context).unwrap();
        
        // Create checkpoint
        let checkpoint = store.create_checkpoint(&session.id, "Initial setup complete", None).unwrap();
        assert_eq!(checkpoint.sequence, 1);
        
        // End session
        store.end_session(&session.id, SessionStatus::Completed).unwrap();
        
        let ended = store.get_session(&session.id).unwrap().unwrap();
        assert_eq!(ended.status, SessionStatus::Completed);
    }
    
    #[test]
    fn test_recovery() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("memory.db");
        let mut store = MemoryStore::open(&db_path).unwrap();
        
        // Start session
        let session = store.start_session("claude-code", "task-456", None, None).unwrap();
        
        // Create checkpoint
        store.create_checkpoint(&session.id, "Mid-work checkpoint", None).unwrap();
        
        // Simulate crash by directly updating status
        store.conn.execute(
            "UPDATE sessions SET status = 'interrupted' WHERE id = ?1",
            params![session.id],
        ).unwrap();
        
        // Get recoverable sessions
        let recoverable = store.get_recoverable_sessions().unwrap();
        assert_eq!(recoverable.len(), 1);
        
        // Resume
        let resumed = store.resume_session(&session.id).unwrap();
        assert_eq!(resumed.status, SessionStatus::Active);
    }
}
