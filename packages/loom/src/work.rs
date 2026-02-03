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

/// Issue type (from Beads)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum IssueType {
    /// Bug fix
    Bug,
    /// New feature
    Feature,
    /// Generic task
    #[default]
    Task,
    /// Large feature grouping
    Epic,
    /// Maintenance/cleanup work
    Chore,
}

/// Dependency type (from Beads)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum DependencyType {
    /// Task A blocks Task B (B cannot start until A completes)
    #[default]
    Blocks,
    /// Hierarchical grouping (epic → feature → task)
    ParentChild,
    /// Non-blocking relationship
    Related,
    /// Work extracted from checkpoints/reviews
    DiscoveredFrom,
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

impl IssueType {
    pub fn as_str(&self) -> &'static str {
        match self {
            IssueType::Bug => "bug",
            IssueType::Feature => "feature",
            IssueType::Task => "task",
            IssueType::Epic => "epic",
            IssueType::Chore => "chore",
        }
    }
    
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "bug" => Some(IssueType::Bug),
            "feature" => Some(IssueType::Feature),
            "task" => Some(IssueType::Task),
            "epic" => Some(IssueType::Epic),
            "chore" => Some(IssueType::Chore),
            _ => None,
        }
    }
}

impl DependencyType {
    pub fn as_str(&self) -> &'static str {
        match self {
            DependencyType::Blocks => "blocks",
            DependencyType::ParentChild => "parent-child",
            DependencyType::Related => "related",
            DependencyType::DiscoveredFrom => "discovered-from",
        }
    }
    
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "blocks" => Some(DependencyType::Blocks),
            "parent-child" | "parent_child" => Some(DependencyType::ParentChild),
            "related" => Some(DependencyType::Related),
            "discovered-from" | "discovered_from" => Some(DependencyType::DiscoveredFrom),
            _ => None,
        }
    }
    
    /// Returns true if this dependency type blocks completion
    pub fn is_blocking(&self) -> bool {
        matches!(self, DependencyType::Blocks)
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
    /// Issue type (bug, feature, task, epic, chore)
    #[serde(default)]
    pub issue_type: IssueType,
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
    /// Repository identifier (for multi-repo support)
    /// When None, task belongs to the primary/local repository
    #[serde(default)]
    pub repo: Option<String>,
    /// Reason for closing (when status is done or cancelled)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub close_reason: Option<String>,
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
    /// Type of dependency (blocks, parent-child, related, discovered-from)
    #[serde(default)]
    pub dep_type: DependencyType,
    /// When the dependency was created
    pub created_at: DateTime<Utc>,
}

/// Parameters for creating a new task
#[derive(Debug, Clone, Default)]
pub struct CreateTask {
    pub title: String,
    pub description: Option<String>,
    pub priority: Priority,
    pub issue_type: IssueType,
    pub labels: Vec<String>,
    pub parent: Option<String>,
    pub evidence: Option<String>,
    /// Repository identifier (for multi-repo tracking)
    pub repo: Option<String>,
}

/// The work store - SQLite-backed task persistence
pub struct WorkStore {
    conn: Connection,
    prefix: String,
    /// Default repository for new tasks
    default_repo: Option<String>,
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
            default_repo: None,
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
            default_repo: None,
        };
        store.init_schema()?;
        Ok(store)
    }
    
    /// Set the task ID prefix (default: "lm")
    pub fn with_prefix(mut self, prefix: impl Into<String>) -> Self {
        self.prefix = prefix.into();
        self
    }
    
    /// Set the default repository for new tasks
    pub fn with_repo(mut self, repo: impl Into<String>) -> Self {
        self.default_repo = Some(repo.into());
        self
    }
    
    fn init_schema(&self) -> Result<(), WorkError> {
        // Create base tables first
        // Column order MUST match TASK_COLUMNS: id, title, description, status, priority, issue_type, agent, labels, parent, evidence, actual_cost_usd, repo, close_reason, created_at, updated_at
        self.conn.execute_batch(r#"
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'ready',
                priority TEXT NOT NULL DEFAULT 'normal',
                issue_type TEXT NOT NULL DEFAULT 'task',
                agent TEXT,
                labels TEXT NOT NULL DEFAULT '[]',
                parent TEXT,
                evidence TEXT,
                actual_cost_usd REAL,
                repo TEXT,
                close_reason TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS dependencies (
                task_id TEXT NOT NULL,
                depends_on TEXT NOT NULL,
                dep_type TEXT NOT NULL DEFAULT 'blocks',
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
        let _ = self.conn.execute("ALTER TABLE tasks ADD COLUMN repo TEXT", []);
        let _ = self.conn.execute("ALTER TABLE tasks ADD COLUMN issue_type TEXT NOT NULL DEFAULT 'task'", []);
        let _ = self.conn.execute("ALTER TABLE tasks ADD COLUMN close_reason TEXT", []);
        let _ = self.conn.execute("ALTER TABLE dependencies ADD COLUMN dep_type TEXT NOT NULL DEFAULT 'blocks'", []);
        
        // Create indexes (after columns exist)
        self.conn.execute_batch(r#"
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
            CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
            CREATE INDEX IF NOT EXISTS idx_tasks_issue_type ON tasks(issue_type);
            CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent);
            CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent);
            CREATE INDEX IF NOT EXISTS idx_deps_task ON dependencies(task_id);
            CREATE INDEX IF NOT EXISTS idx_deps_depends ON dependencies(depends_on);
            CREATE INDEX IF NOT EXISTS idx_deps_type ON dependencies(dep_type);
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
        
        // Apply default repo if not specified
        let repo = params.repo.or_else(|| self.default_repo.clone());
        
        self.conn.execute(
            r#"INSERT INTO tasks (id, title, description, status, priority, issue_type, labels, parent, evidence, repo, created_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)"#,
            params![
                id,
                params.title,
                params.description,
                "ready",
                params.priority.as_str(),
                params.issue_type.as_str(),
                labels_json,
                params.parent,
                params.evidence,
                repo,
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
            issue_type: params.issue_type,
            agent: None,
            labels: params.labels,
            parent: params.parent,
            evidence: params.evidence,
            actual_cost_usd: None,
            repo,
            close_reason: None,
            created_at: now,
            updated_at: now,
        })
    }
    
    /// Get a task by ID
    pub fn get(&self, id: &str) -> Result<Option<Task>, WorkError> {
        let sql = format!(
            "SELECT {} FROM tasks WHERE id = ?1",
            Self::TASK_COLUMNS
        );
        let result = self.conn.query_row(
            &sql,
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
    /// Column order: id(0), title(1), description(2), status(3), priority(4), issue_type(5), agent(6), labels(7), parent(8), evidence(9), actual_cost_usd(10), repo(11), close_reason(12), created_at(13), updated_at(14)
    fn row_to_task(row: &rusqlite::Row) -> rusqlite::Result<Task> {
        let labels_json: String = row.get(7)?;
        let created_str: String = row.get(13)?;
        let updated_str: String = row.get(14)?;
        
        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            status: Status::from_str(&row.get::<_, String>(3)?).unwrap_or(Status::Ready),
            priority: Priority::from_str(&row.get::<_, String>(4).unwrap_or_default()).unwrap_or_default(),
            issue_type: IssueType::from_str(&row.get::<_, String>(5).unwrap_or_default()).unwrap_or_default(),
            agent: row.get(6)?,
            labels: serde_json::from_str(&labels_json).unwrap_or_default(),
            parent: row.get(8)?,
            evidence: row.get(9)?,
            actual_cost_usd: row.get(10)?,
            repo: row.get(11)?,
            close_reason: row.get(12)?,
            created_at: DateTime::parse_from_rfc3339(&created_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
            updated_at: DateTime::parse_from_rfc3339(&updated_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
        })
    }
    
    /// Standard SELECT columns for tasks
    /// Column order: id(0), title(1), description(2), status(3), priority(4), issue_type(5), agent(6), labels(7), parent(8), evidence(9), actual_cost_usd(10), repo(11), close_reason(12), created_at(13), updated_at(14)
    const TASK_COLUMNS: &'static str = "id, title, description, status, priority, issue_type, agent, labels, parent, evidence, actual_cost_usd, repo, close_reason, created_at, updated_at";
    
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
    
    /// Complete a task with optional evidence and close reason, returns list of newly unblocked task IDs
    pub fn complete(&mut self, id: &str, evidence: Option<&str>) -> Result<Vec<String>, WorkError> {
        self.complete_with_reason(id, evidence, None)
    }
    
    /// Complete a task with optional evidence and close reason
    pub fn complete_with_reason(&mut self, id: &str, evidence: Option<&str>, close_reason: Option<&str>) -> Result<Vec<String>, WorkError> {
        // Check that all blocking dependencies are satisfied
        let blocking = self.get_blocking_dependencies(id)?;
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
            "UPDATE tasks SET status = 'done', evidence = COALESCE(?1, evidence), close_reason = COALESCE(?2, close_reason), updated_at = ?3 WHERE id = ?4",
            params![evidence, close_reason, now.to_rfc3339(), id],
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
        close_reason: Option<&str>,
    ) -> Result<Vec<String>, WorkError> {
        // Record the cost first
        self.record_cost(id, cost_usd)?;
        // Then complete
        self.complete_with_reason(id, evidence, close_reason)
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
        self.cancel_with_reason(id, None)
    }
    
    /// Cancel a task with a reason
    pub fn cancel_with_reason(&mut self, id: &str, close_reason: Option<&str>) -> Result<(), WorkError> {
        let now = Utc::now();
        let rows = self.conn.execute(
            "UPDATE tasks SET status = 'cancelled', close_reason = COALESCE(?1, close_reason), updated_at = ?2 WHERE id = ?3",
            params![close_reason, now.to_rfc3339(), id],
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
    
    /// Add a dependency: task_id is blocked by depends_on (default: blocks type)
    pub fn add_dependency(&mut self, task_id: &str, depends_on: &str) -> Result<(), WorkError> {
        self.add_dependency_typed(task_id, depends_on, DependencyType::Blocks)
    }
    
    /// Add a typed dependency between tasks
    pub fn add_dependency_typed(&mut self, task_id: &str, depends_on: &str, dep_type: DependencyType) -> Result<(), WorkError> {
        // Verify both tasks exist
        self.get(task_id)?.ok_or_else(|| WorkError::NotFound(task_id.to_string()))?;
        self.get(depends_on)?.ok_or_else(|| WorkError::NotFound(depends_on.to_string()))?;
        
        // Check for cycles only for blocking dependencies
        if dep_type.is_blocking() {
            let reverse_deps = self.get_all_dependencies(depends_on)?;
            if reverse_deps.iter().any(|d| d.depends_on == task_id && d.dep_type.is_blocking()) {
                return Err(WorkError::CycleDetected);
            }
        }
        
        let now = Utc::now();
        self.conn.execute(
            "INSERT OR REPLACE INTO dependencies (task_id, depends_on, dep_type, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![task_id, depends_on, dep_type.as_str(), now.to_rfc3339()],
        )?;
        
        // Update blocked status only if this is a blocking dependency
        if dep_type.is_blocking() {
            self.recompute_blocked_status()?;
        }
        
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
    
    /// Get tasks that block a given task (all dependency types)
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
    
    /// Get tasks that block a given task (only blocking dependency types)
    pub fn get_blocking_dependencies(&self, task_id: &str) -> Result<Vec<Task>, WorkError> {
        let sql = format!(
            "SELECT t.{} FROM tasks t JOIN dependencies d ON t.id = d.depends_on WHERE d.task_id = ?1 AND d.dep_type = 'blocks'",
            Self::TASK_COLUMNS.replace(", ", ", t.")
        );
        let mut stmt = self.conn.prepare(&sql)?;
        let tasks = stmt.query_map(params![task_id], |row| Self::row_to_task(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tasks)
    }
    
    /// Get all dependencies for a task
    pub fn get_all_dependencies(&self, task_id: &str) -> Result<Vec<Dependency>, WorkError> {
        let mut stmt = self.conn.prepare(
            "SELECT task_id, depends_on, dep_type, created_at FROM dependencies WHERE task_id = ?1"
        )?;
        
        let deps = stmt.query_map(params![task_id], |row| {
            let created_str: String = row.get(3)?;
            Ok(Dependency {
                task_id: row.get(0)?,
                depends_on: row.get(1)?,
                dep_type: DependencyType::from_str(&row.get::<_, String>(2).unwrap_or_default()).unwrap_or_default(),
                created_at: DateTime::parse_from_rfc3339(&created_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        
        Ok(deps)
    }
    
    /// Get dependencies by type for a task
    pub fn get_dependencies_by_type(&self, task_id: &str, dep_type: DependencyType) -> Result<Vec<Dependency>, WorkError> {
        let mut stmt = self.conn.prepare(
            "SELECT task_id, depends_on, dep_type, created_at FROM dependencies WHERE task_id = ?1 AND dep_type = ?2"
        )?;
        
        let deps = stmt.query_map(params![task_id, dep_type.as_str()], |row| {
            let created_str: String = row.get(3)?;
            Ok(Dependency {
                task_id: row.get(0)?,
                depends_on: row.get(1)?,
                dep_type: DependencyType::from_str(&row.get::<_, String>(2).unwrap_or_default()).unwrap_or_default(),
                created_at: DateTime::parse_from_rfc3339(&created_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        
        Ok(deps)
    }
    
    /// Recompute blocked status for all tasks (only considers 'blocks' type dependencies)
    fn recompute_blocked_status(&self) -> Result<(), WorkError> {
        // Find tasks with incomplete blocking dependencies
        self.conn.execute_batch(r#"
            -- Set to blocked if has incomplete blocking dependencies
            UPDATE tasks SET status = 'blocked'
            WHERE status IN ('ready', 'blocked')
            AND id IN (
                SELECT d.task_id FROM dependencies d
                JOIN tasks t ON d.depends_on = t.id
                WHERE d.dep_type = 'blocks'
                AND t.status NOT IN ('done', 'cancelled')
            );
            
            -- Set to ready if all blocking dependencies are complete
            UPDATE tasks SET status = 'ready'
            WHERE status = 'blocked'
            AND id NOT IN (
                SELECT d.task_id FROM dependencies d
                JOIN tasks t ON d.depends_on = t.id
                WHERE d.dep_type = 'blocks'
                AND t.status NOT IN ('done', 'cancelled')
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
    
    /// List tasks by repository
    pub fn list_by_repo(&self, repo: &str) -> Result<Vec<Task>, WorkError> {
        let sql = format!(
            "SELECT {} FROM tasks WHERE repo = ?1 ORDER BY created_at DESC",
            Self::TASK_COLUMNS
        );
        let mut stmt = self.conn.prepare(&sql)?;
        let tasks = stmt.query_map(params![repo], |row| Self::row_to_task(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tasks)
    }
    
    /// List tasks by issue type
    pub fn list_by_issue_type(&self, issue_type: IssueType) -> Result<Vec<Task>, WorkError> {
        let sql = format!(
            "SELECT {} FROM tasks WHERE issue_type = ?1 ORDER BY created_at DESC",
            Self::TASK_COLUMNS
        );
        let mut stmt = self.conn.prepare(&sql)?;
        let tasks = stmt.query_map(params![issue_type.as_str()], |row| Self::row_to_task(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tasks)
    }
    
    /// Update a task's issue type
    pub fn update_issue_type(&mut self, id: &str, issue_type: IssueType) -> Result<(), WorkError> {
        let now = Utc::now();
        let rows = self.conn.execute(
            "UPDATE tasks SET issue_type = ?1, updated_at = ?2 WHERE id = ?3",
            params![issue_type.as_str(), now.to_rfc3339(), id],
        )?;
        
        if rows == 0 {
            return Err(WorkError::NotFound(id.to_string()));
        }
        Ok(())
    }
    
    /// Set default repo for new tasks created via this store
    pub fn set_default_repo(&mut self, repo: Option<String>) {
        self.default_repo = repo;
    }
    
    /// Compact the database by removing old done/cancelled tasks
    /// Returns the number of tasks removed
    pub fn compact(&mut self, older_than_days: u32) -> Result<u32, WorkError> {
        let cutoff = Utc::now() - chrono::Duration::days(older_than_days as i64);
        let cutoff_str = cutoff.to_rfc3339();
        
        // First delete dependencies for tasks we're about to remove
        self.conn.execute(
            r#"DELETE FROM dependencies WHERE 
               task_id IN (SELECT id FROM tasks WHERE status IN ('done', 'cancelled') AND updated_at < ?1)
               OR depends_on IN (SELECT id FROM tasks WHERE status IN ('done', 'cancelled') AND updated_at < ?1)"#,
            params![cutoff_str],
        )?;
        
        // Then delete the tasks
        let rows = self.conn.execute(
            "DELETE FROM tasks WHERE status IN ('done', 'cancelled') AND updated_at < ?1",
            params![cutoff_str],
        )?;
        
        Ok(rows as u32)
    }
    
    /// Get unique repos in the store
    pub fn list_repos(&self) -> Result<Vec<String>, WorkError> {
        let mut stmt = self.conn.prepare(
            "SELECT DISTINCT repo FROM tasks WHERE repo IS NOT NULL ORDER BY repo"
        )?;
        let repos = stmt.query_map([], |row| row.get(0))?
            .collect::<Result<Vec<String>, _>>()?;
        Ok(repos)
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
