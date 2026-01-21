//! Work Store
//!
//! SQLite-backed task persistence with Yegge's beads principles.
//! This is the external memory that agents read from and write to.

use std::path::Path;
use chrono::{DateTime, Utc};
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

#[derive(Error, Debug)]
pub enum WorkError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    
    #[error("Task not found: {0}")]
    NotFound(String),
    
    #[error("Task already claimed by {0}")]
    AlreadyClaimed(String),
    
    #[error("Cannot complete task: {reason}")]
    CannotComplete { reason: String },
    
    #[error("Dependency cycle detected")]
    CycleDetected,
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

/// Task status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    /// Can be claimed by an agent
    Ready,
    /// Agent is working on it
    Claimed,
    /// Waiting on dependencies
    Blocked,
    /// Completed with evidence
    Done,
    /// No longer needed
    Cancelled,
}

/// Task priority (simple, explicit, no magic scoring)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum Priority {
    /// Blocks convoy progress
    Critical,
    /// User-facing features
    High,
    /// Standard work
    #[default]
    Normal,
    /// Nice-to-have
    Low,
}

impl Status {
    pub fn as_str(&self) -> &'static str {
        match self {
            Status::Ready => "ready",
            Status::Claimed => "claimed",
            Status::Blocked => "blocked",
            Status::Done => "done",
            Status::Cancelled => "cancelled",
        }
    }
    
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "ready" => Some(Status::Ready),
            "claimed" => Some(Status::Claimed),
            "blocked" => Some(Status::Blocked),
            "done" => Some(Status::Done),
            "cancelled" => Some(Status::Cancelled),
            _ => None,
        }
    }
}

impl Priority {
    pub fn as_str(&self) -> &'static str {
        match self {
            Priority::Critical => "critical",
            Priority::High => "high",
            Priority::Normal => "normal",
            Priority::Low => "low",
        }
    }
    
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "critical" => Some(Priority::Critical),
            "high" => Some(Priority::High),
            "normal" => Some(Priority::Normal),
            "low" => Some(Priority::Low),
            _ => None,
        }
    }
}

/// A task in the work store
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    /// Unique identifier (e.g., "lm-a1b2")
    pub id: String,
    /// Human-readable title
    pub title: String,
    /// Optional description
    pub description: Option<String>,
    /// Current status
    pub status: Status,
    /// Task priority (Critical > High > Normal > Low)
    pub priority: Priority,
    /// Agent that claimed this task (if any)
    pub agent: Option<String>,
    /// Labels for routing and filtering
    pub labels: Vec<String>,
    /// Parent task ID (for sub-tasks)
    pub parent: Option<String>,
    /// Link to Ground evidence (if any)
    pub evidence: Option<String>,
    /// Actual cost in USD (recorded after completion)
    pub actual_cost_usd: Option<f64>,
    /// When the task was created
    pub created_at: DateTime<Utc>,
    /// When the task was last updated
    pub updated_at: DateTime<Utc>,
}

/// Dependency between tasks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dependency {
    /// Task that is blocked
    pub task_id: String,
    /// Task that blocks it
    pub depends_on: String,
    /// When the dependency was created
    pub created_at: DateTime<Utc>,
}

/// Parameters for creating a new task
#[derive(Debug, Clone, Default)]
pub struct CreateTask {
    pub title: String,
    pub description: Option<String>,
    pub priority: Priority,
    pub labels: Vec<String>,
    pub parent: Option<String>,
    pub evidence: Option<String>,
}

/// The work store - SQLite-backed task persistence
pub struct WorkStore {
    conn: Connection,
    prefix: String,
}

impl WorkStore {
    /// Open or create a work store at the given path
    pub fn open(db_path: impl AsRef<Path>) -> Result<Self, WorkError> {
        let conn = Connection::open(db_path)?;
        
        // Enable WAL mode for better concurrency (multiple readers, single writer)
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;")?;
        
        let store = Self { 
            conn, 
            prefix: "lm".to_string(),
        };
        store.init_schema()?;
        Ok(store)
    }
    
    /// Create an in-memory work store (for testing)
    pub fn in_memory() -> Result<Self, WorkError> {
        let conn = Connection::open_in_memory()?;
        let store = Self { 
            conn,
            prefix: "lm".to_string(),
        };
        store.init_schema()?;
        Ok(store)
    }
    
    /// Set the task ID prefix (default: "lm")
    pub fn with_prefix(mut self, prefix: impl Into<String>) -> Self {
        self.prefix = prefix.into();
        self
    }
    
    fn init_schema(&self) -> Result<(), WorkError> {
        // Create base tables first (without new columns for compatibility)
        self.conn.execute_batch(r#"
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'ready',
                agent TEXT,
                labels TEXT NOT NULL DEFAULT '[]',
                parent TEXT,
                evidence TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS dependencies (
                task_id TEXT NOT NULL,
                depends_on TEXT NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (task_id, depends_on),
                FOREIGN KEY (task_id) REFERENCES tasks(id),
                FOREIGN KEY (depends_on) REFERENCES tasks(id)
            );
        "#)?;
        
        // Migration: add columns if they don't exist (for existing databases)
        // These silently fail if columns already exist
        let _ = self.conn.execute("ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal'", []);
        let _ = self.conn.execute("ALTER TABLE tasks ADD COLUMN actual_cost_usd REAL", []);
        
        // Create indexes (after columns exist)
        self.conn.execute_batch(r#"
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
            CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
            CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent);
            CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent);
            CREATE INDEX IF NOT EXISTS idx_deps_task ON dependencies(task_id);
            CREATE INDEX IF NOT EXISTS idx_deps_depends ON dependencies(depends_on);
        "#)?;
        
        Ok(())
    }
    
    /// Generate a new task ID
    fn generate_id(&self) -> String {
        let uuid = Uuid::new_v4();
        let short = &uuid.to_string()[..4];
        format!("{}-{}", self.prefix, short)
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // CRUD Operations
    // ─────────────────────────────────────────────────────────────────────
    
    /// Create a new task
    pub fn create(&mut self, params: CreateTask) -> Result<Task, WorkError> {
        let now = Utc::now();
        let id = self.generate_id();
        let labels_json = serde_json::to_string(&params.labels)?;
        
        self.conn.execute(
            r#"INSERT INTO tasks (id, title, description, status, priority, labels, parent, evidence, created_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)"#,
            params![
                id,
                params.title,
                params.description,
                "ready",
                params.priority.as_str(),
                labels_json,
                params.parent,
                params.evidence,
                now.to_rfc3339(),
                now.to_rfc3339(),
            ],
        )?;
        
        Ok(Task {
            id,
            title: params.title,
            description: params.description,
            status: Status::Ready,
            priority: params.priority,
            agent: None,
            labels: params.labels,
            parent: params.parent,
            evidence: params.evidence,
            actual_cost_usd: None,
            created_at: now,
            updated_at: now,
        })
    }
    
    /// Get a task by ID
    pub fn get(&self, id: &str) -> Result<Option<Task>, WorkError> {
        let result = self.conn.query_row(
            "SELECT id, title, description, status, priority, agent, labels, parent, evidence, actual_cost_usd, created_at, updated_at FROM tasks WHERE id = ?1",
            params![id],
            |row| Self::row_to_task(row),
        );
        
        match result {
            Ok(task) => Ok(Some(task)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
    
    /// Helper to convert a row to a Task (reduces duplication)
    fn row_to_task(row: &rusqlite::Row) -> rusqlite::Result<Task> {
        let labels_json: String = row.get(6)?;
        let created_str: String = row.get(10)?;
        let updated_str: String = row.get(11)?;
        
        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            status: Status::from_str(&row.get::<_, String>(3)?).unwrap_or(Status::Ready),
            priority: Priority::from_str(&row.get::<_, String>(4).unwrap_or_default()).unwrap_or_default(),
            agent: row.get(5)?,
            labels: serde_json::from_str(&labels_json).unwrap_or_default(),
            parent: row.get(7)?,
            evidence: row.get(8)?,
            actual_cost_usd: row.get(9)?,
            created_at: DateTime::parse_from_rfc3339(&created_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
            updated_at: DateTime::parse_from_rfc3339(&updated_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
        })
    }
    
    /// Standard SELECT columns for tasks
    const TASK_COLUMNS: &'static str = "id, title, description, status, priority, agent, labels, parent, evidence, actual_cost_usd, created_at, updated_at";
    
    /// Update a task's status
    pub fn update_status(&mut self, id: &str, status: Status) -> Result<(), WorkError> {
        let now = Utc::now();
        let rows = self.conn.execute(
            "UPDATE tasks SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![status.as_str(), now.to_rfc3339(), id],
        )?;
        
        if rows == 0 {
            return Err(WorkError::NotFound(id.to_string()));
        }
        Ok(())
    }
    
    /// Update a task's priority
    pub fn update_priority(&mut self, id: &str, priority: Priority) -> Result<(), WorkError> {
        let now = Utc::now();
        let rows = self.conn.execute(
            "UPDATE tasks SET priority = ?1, updated_at = ?2 WHERE id = ?3",
            params![priority.as_str(), now.to_rfc3339(), id],
        )?;
        
        if rows == 0 {
            return Err(WorkError::NotFound(id.to_string()));
        }
        Ok(())
    }
    
    /// Claim a task for an agent
    pub fn claim(&mut self, id: &str, agent: &str) -> Result<Task, WorkError> {
        let task = self.get(id)?.ok_or_else(|| WorkError::NotFound(id.to_string()))?;
        
        // Check if already claimed by someone else
        if let Some(ref current_agent) = task.agent {
            if current_agent != agent && task.status == Status::Claimed {
                return Err(WorkError::AlreadyClaimed(current_agent.clone()));
            }
        }
        
        let now = Utc::now();
        self.conn.execute(
            "UPDATE tasks SET status = 'claimed', agent = ?1, updated_at = ?2 WHERE id = ?3",
            params![agent, now.to_rfc3339(), id],
        )?;
        
        self.get(id)?.ok_or_else(|| WorkError::NotFound(id.to_string()))
    }
    
    /// Release a claimed task back to ready
    pub fn release(&mut self, id: &str) -> Result<(), WorkError> {
        let now = Utc::now();
        let rows = self.conn.execute(
            "UPDATE tasks SET status = 'ready', agent = NULL, updated_at = ?1 WHERE id = ?2",
            params![now.to_rfc3339(), id],
        )?;
        
        if rows == 0 {
            return Err(WorkError::NotFound(id.to_string()));
        }
        Ok(())
    }
    
    /// Complete a task with optional evidence, returns list of newly unblocked task IDs
    pub fn complete(&mut self, id: &str, evidence: Option<&str>) -> Result<Vec<String>, WorkError> {
        // Check that all dependencies are satisfied
        let blocking = self.get_blocking_tasks(id)?;
        let incomplete: Vec<_> = blocking.iter()
            .filter(|t| t.status != Status::Done && t.status != Status::Cancelled)
            .collect();
        
        if !incomplete.is_empty() {
            let names: Vec<_> = incomplete.iter().map(|t| t.id.as_str()).collect();
            return Err(WorkError::CannotComplete {
                reason: format!("Blocked by: {}", names.join(", ")),
            });
        }
        
        let now = Utc::now();
        self.conn.execute(
            "UPDATE tasks SET status = 'done', evidence = COALESCE(?1, evidence), updated_at = ?2 WHERE id = ?3",
            params![evidence, now.to_rfc3339(), id],
        )?;
        
        // Auto-unblock: find tasks that were blocked by this one and are now ready
        let unblocked = self.auto_unblock(id)?;
        
        Ok(unblocked)
    }
    
    /// Complete a task with cost tracking
    pub fn complete_with_cost(
        &mut self, 
        id: &str, 
        evidence: Option<&str>,
        cost_usd: f64,
    ) -> Result<Vec<String>, WorkError> {
        // Record the cost first
        self.record_cost(id, cost_usd)?;
        // Then complete
        self.complete(id, evidence)
    }
    
    /// Record actual cost for a task
    pub fn record_cost(&mut self, id: &str, cost_usd: f64) -> Result<(), WorkError> {
        let now = Utc::now();
        let rows = self.conn.execute(
            "UPDATE tasks SET actual_cost_usd = ?1, updated_at = ?2 WHERE id = ?3",
            params![cost_usd, now.to_rfc3339(), id],
        )?;
        
        if rows == 0 {
            return Err(WorkError::NotFound(id.to_string()));
        }
        Ok(())
    }
    
    /// Auto-unblock tasks that were blocked by a completed task
    /// Returns the IDs of tasks that are now ready
    fn auto_unblock(&self, completed_id: &str) -> Result<Vec<String>, WorkError> {
        // Find tasks that were blocked by this task
        let mut stmt = self.conn.prepare(
            "SELECT task_id FROM dependencies WHERE depends_on = ?1"
        )?;
        
        let dependent_ids: Vec<String> = stmt.query_map(params![completed_id], |row| row.get(0))?
            .collect::<Result<Vec<_>, _>>()?;
        
        // Recompute blocked status for all tasks
        self.recompute_blocked_status()?;
        
        // Check which of the dependent tasks are now ready
        let mut unblocked = Vec::new();
        for task_id in dependent_ids {
            if let Some(task) = self.get(&task_id)? {
                if task.status == Status::Ready {
                    unblocked.push(task_id);
                }
            }
        }
        
        Ok(unblocked)
    }
    
    /// Cancel a task
    pub fn cancel(&mut self, id: &str) -> Result<(), WorkError> {
        let now = Utc::now();
        let rows = self.conn.execute(
            "UPDATE tasks SET status = 'cancelled', updated_at = ?1 WHERE id = ?2",
            params![now.to_rfc3339(), id],
        )?;
        
        if rows == 0 {
            return Err(WorkError::NotFound(id.to_string()));
        }
        
        // Update any tasks that were blocked by this one
        self.recompute_blocked_status()?;
        
        Ok(())
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // Dependencies
    // ─────────────────────────────────────────────────────────────────────
    
    /// Add a dependency: task_id is blocked by depends_on
    pub fn add_dependency(&mut self, task_id: &str, depends_on: &str) -> Result<(), WorkError> {
        // Verify both tasks exist
        self.get(task_id)?.ok_or_else(|| WorkError::NotFound(task_id.to_string()))?;
        self.get(depends_on)?.ok_or_else(|| WorkError::NotFound(depends_on.to_string()))?;
        
        // Check for cycles (simple check: depends_on can't depend on task_id)
        let reverse_deps = self.get_all_dependencies(depends_on)?;
        if reverse_deps.iter().any(|d| d.depends_on == task_id) {
            return Err(WorkError::CycleDetected);
        }
        
        let now = Utc::now();
        self.conn.execute(
            "INSERT OR IGNORE INTO dependencies (task_id, depends_on, created_at) VALUES (?1, ?2, ?3)",
            params![task_id, depends_on, now.to_rfc3339()],
        )?;
        
        // Update blocked status
        self.recompute_blocked_status()?;
        
        Ok(())
    }
    
    /// Remove a dependency
    pub fn remove_dependency(&mut self, task_id: &str, depends_on: &str) -> Result<(), WorkError> {
        self.conn.execute(
            "DELETE FROM dependencies WHERE task_id = ?1 AND depends_on = ?2",
            params![task_id, depends_on],
        )?;
        
        self.recompute_blocked_status()?;
        Ok(())
    }
    
    /// Get tasks that block a given task
    pub fn get_blocking_tasks(&self, task_id: &str) -> Result<Vec<Task>, WorkError> {
        let sql = format!(
            "SELECT t.{} FROM tasks t JOIN dependencies d ON t.id = d.depends_on WHERE d.task_id = ?1",
            Self::TASK_COLUMNS.replace(", ", ", t.")
        );
        let mut stmt = self.conn.prepare(&sql)?;
        let tasks = stmt.query_map(params![task_id], |row| Self::row_to_task(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tasks)
    }
    
    /// Get all dependencies for a task
    fn get_all_dependencies(&self, task_id: &str) -> Result<Vec<Dependency>, WorkError> {
        let mut stmt = self.conn.prepare(
            "SELECT task_id, depends_on, created_at FROM dependencies WHERE task_id = ?1"
        )?;
        
        let deps = stmt.query_map(params![task_id], |row| {
            let created_str: String = row.get(2)?;
            Ok(Dependency {
                task_id: row.get(0)?,
                depends_on: row.get(1)?,
                created_at: DateTime::parse_from_rfc3339(&created_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        
        Ok(deps)
    }
    
    /// Recompute blocked status for all tasks
    fn recompute_blocked_status(&self) -> Result<(), WorkError> {
        // Find tasks with incomplete dependencies
        self.conn.execute_batch(r#"
            -- Set to blocked if has incomplete dependencies
            UPDATE tasks SET status = 'blocked'
            WHERE status IN ('ready', 'blocked')
            AND id IN (
                SELECT d.task_id FROM dependencies d
                JOIN tasks t ON d.depends_on = t.id
                WHERE t.status NOT IN ('done', 'cancelled')
            );
            
            -- Set to ready if all dependencies are complete
            UPDATE tasks SET status = 'ready'
            WHERE status = 'blocked'
            AND id NOT IN (
                SELECT d.task_id FROM dependencies d
                JOIN tasks t ON d.depends_on = t.id
                WHERE t.status NOT IN ('done', 'cancelled')
            );
        "#)?;
        Ok(())
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // Queries
    // ─────────────────────────────────────────────────────────────────────
    
    /// Get all tasks that are ready to be worked on
    pub fn ready(&self) -> Result<Vec<Task>, WorkError> {
        self.list_by_status(Status::Ready)
    }
    
    /// Get all tasks claimed by a specific agent
    pub fn mine(&self, agent: &str) -> Result<Vec<Task>, WorkError> {
        let sql = format!(
            "SELECT {} FROM tasks WHERE agent = ?1 AND status = 'claimed'",
            Self::TASK_COLUMNS
        );
        let mut stmt = self.conn.prepare(&sql)?;
        let tasks = stmt.query_map(params![agent], |row| Self::row_to_task(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tasks)
    }
    
    /// Get all blocked tasks
    pub fn blocked(&self) -> Result<Vec<Task>, WorkError> {
        self.list_by_status(Status::Blocked)
    }
    
    /// List tasks by status
    pub fn list_by_status(&self, status: Status) -> Result<Vec<Task>, WorkError> {
        let sql = format!(
            "SELECT {} FROM tasks WHERE status = ?1 ORDER BY created_at DESC",
            Self::TASK_COLUMNS
        );
        let mut stmt = self.conn.prepare(&sql)?;
        let tasks = stmt.query_map(params![status.as_str()], |row| Self::row_to_task(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tasks)
    }
    
    /// List all tasks
    pub fn list_all(&self) -> Result<Vec<Task>, WorkError> {
        let sql = format!(
            "SELECT {} FROM tasks ORDER BY created_at DESC",
            Self::TASK_COLUMNS
        );
        let mut stmt = self.conn.prepare(&sql)?;
        let tasks = stmt.query_map([], |row| Self::row_to_task(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tasks)
    }
    
    /// List tasks by label
    pub fn list_by_label(&self, label: &str) -> Result<Vec<Task>, WorkError> {
        let pattern = format!("%\"{}%", label);
        let sql = format!(
            "SELECT {} FROM tasks WHERE labels LIKE ?1 ORDER BY created_at DESC",
            Self::TASK_COLUMNS
        );
        let mut stmt = self.conn.prepare(&sql)?;
        let tasks = stmt.query_map(params![pattern], |row| Self::row_to_task(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tasks)
    }
    
    /// Get sub-tasks of a parent task
    pub fn children(&self, parent_id: &str) -> Result<Vec<Task>, WorkError> {
        let sql = format!(
            "SELECT {} FROM tasks WHERE parent = ?1 ORDER BY created_at ASC",
            Self::TASK_COLUMNS
        );
        let mut stmt = self.conn.prepare(&sql)?;
        let tasks = stmt.query_map(params![parent_id], |row| Self::row_to_task(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tasks)
    }
    
    /// Get summary statistics
    pub fn summary(&self) -> Result<WorkSummary, WorkError> {
        self.summary_with_filter(None)
    }
    
    /// Get summary statistics filtered by label
    pub fn summary_by_label(&self, label: &str) -> Result<WorkSummary, WorkError> {
        self.summary_with_filter(Some(label))
    }
    
    /// Internal summary with optional label filter
    fn summary_with_filter(&self, label: Option<&str>) -> Result<WorkSummary, WorkError> {
        let (where_clause, pattern) = match label {
            Some(l) => ("WHERE labels LIKE ?1", Some(format!("%\"{}%", l))),
            None => ("", None),
        };
        
        let count_by_status = |status: &str| -> Result<i64, WorkError> {
            let sql = match &pattern {
                Some(p) => {
                    let sql = format!(
                        "SELECT COUNT(*) FROM tasks {} AND status = ?2",
                        where_clause
                    );
                    self.conn.query_row(&sql, params![p, status], |row| row.get(0))?
                }
                None => {
                    let sql = format!(
                        "SELECT COUNT(*) FROM tasks WHERE status = ?1"
                    );
                    self.conn.query_row(&sql, params![status], |row| row.get(0))?
                }
            };
            Ok(sql)
        };
        
        let total_cost: Option<f64> = match &pattern {
            Some(p) => {
                let sql = format!(
                    "SELECT SUM(actual_cost_usd) FROM tasks {}",
                    where_clause
                );
                self.conn.query_row(&sql, params![p], |row| row.get(0))?
            }
            None => {
                self.conn.query_row(
                    "SELECT SUM(actual_cost_usd) FROM tasks",
                    [],
                    |row| row.get(0),
                )?
            }
        };
        
        Ok(WorkSummary {
            ready: count_by_status("ready")? as u32,
            claimed: count_by_status("claimed")? as u32,
            blocked: count_by_status("blocked")? as u32,
            done: count_by_status("done")? as u32,
            cancelled: count_by_status("cancelled")? as u32,
            total_cost_usd: total_cost.unwrap_or(0.0),
            label: label.map(|s| s.to_string()),
        })
    }
}

/// Summary of work store state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkSummary {
    pub ready: u32,
    pub claimed: u32,
    pub blocked: u32,
    pub done: u32,
    pub cancelled: u32,
    /// Total cost of completed tasks (USD)
    pub total_cost_usd: f64,
    /// Label filter applied (if any)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

impl WorkSummary {
    pub fn total(&self) -> u32 {
        self.ready + self.claimed + self.blocked + self.done + self.cancelled
    }
    
    pub fn active(&self) -> u32 {
        self.ready + self.claimed + self.blocked
    }
    
    /// Progress percentage (done / total)
    pub fn progress_pct(&self) -> u32 {
        let total = self.total();
        if total == 0 { 0 } else { (self.done as f64 / total as f64 * 100.0) as u32 }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_create_and_get_task() {
        let mut store = WorkStore::in_memory().unwrap();
        
        let task = store.create(CreateTask {
            title: "Test task".to_string(),
            ..Default::default()
        }).unwrap();
        
        assert!(task.id.starts_with("lm-"));
        assert_eq!(task.status, Status::Ready);
        
        let retrieved = store.get(&task.id).unwrap().unwrap();
        assert_eq!(retrieved.title, "Test task");
    }
    
    #[test]
    fn test_claim_and_complete() {
        let mut store = WorkStore::in_memory().unwrap();
        
        let task = store.create(CreateTask {
            title: "Claimable task".to_string(),
            ..Default::default()
        }).unwrap();
        
        // Claim it
        let claimed = store.claim(&task.id, "agent-1").unwrap();
        assert_eq!(claimed.status, Status::Claimed);
        assert_eq!(claimed.agent, Some("agent-1".to_string()));
        
        // Complete it
        store.complete(&task.id, Some("evidence-123")).unwrap();
        
        let completed = store.get(&task.id).unwrap().unwrap();
        assert_eq!(completed.status, Status::Done);
        assert_eq!(completed.evidence, Some("evidence-123".to_string()));
    }
    
    #[test]
    fn test_dependencies_block_completion() {
        let mut store = WorkStore::in_memory().unwrap();
        
        let blocker = store.create(CreateTask {
            title: "Blocker".to_string(),
            ..Default::default()
        }).unwrap();
        
        let blocked = store.create(CreateTask {
            title: "Blocked".to_string(),
            ..Default::default()
        }).unwrap();
        
        // Add dependency
        store.add_dependency(&blocked.id, &blocker.id).unwrap();
        
        // Blocked task should now be blocked
        let task = store.get(&blocked.id).unwrap().unwrap();
        assert_eq!(task.status, Status::Blocked);
        
        // Trying to complete should fail
        let result = store.complete(&blocked.id, None);
        assert!(result.is_err());
        
        // Complete the blocker
        store.complete(&blocker.id, None).unwrap();
        
        // Now the blocked task should be ready
        let task = store.get(&blocked.id).unwrap().unwrap();
        assert_eq!(task.status, Status::Ready);
        
        // And should complete successfully
        store.complete(&blocked.id, None).unwrap();
    }
    
    #[test]
    fn test_ready_query() {
        let mut store = WorkStore::in_memory().unwrap();
        
        store.create(CreateTask {
            title: "Ready 1".to_string(),
            ..Default::default()
        }).unwrap();
        
        store.create(CreateTask {
            title: "Ready 2".to_string(),
            ..Default::default()
        }).unwrap();
        
        let ready = store.ready().unwrap();
        assert_eq!(ready.len(), 2);
    }
}
